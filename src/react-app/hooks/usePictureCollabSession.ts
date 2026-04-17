import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import SockJS from 'sockjs-client'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import {
  getPictureEditorSession,
  refreshPictureCollaborationRoom,
  type PictureCollaborationRoom,
  type PictureDocument,
  type PictureDocumentElement,
} from '@/api/pictures'
import {
  normalizeElement,
  isWorkspaceDocEmpty,
  readWorkspaceElements,
  removeWorkspaceElement as removeWorkspaceElementFromDoc,
  replaceWorkspaceFromSnapshot,
  type WorkspaceElement,
  upsertWorkspaceElement,
} from '@/react-app/collab/yjsPictureDocument'
import type { CollabMessage, CursorPayload, PresenceSnapshot, SelectionPayload } from '@/collab-types'
import { getToken, getUser } from '@/utils/auth'

type UserPresence = {
  userId: string
  username: string
  joinedAt: string
}

type LockInfo = {
  lockedByUserId: string
  lockedByUsername: string
  lockedAt: string
  expiresAt: string
}

type AwarenessUserState = {
  userId: string
  username: string
  displayName?: string | null
  joinedAt: string
}

type AwarenessCursorState = {
  x: number
  y: number
  updatedAt: string
}

type AwarenessSelectionState = {
  activeElementId?: string | null
  elementIds?: string[]
  updatedAt: string
}

type AwarenessPeerState = Map<number, Record<string, unknown>>

type RoomProviderController = {
  setAwarenessField: (field: 'user' | 'cursor' | 'selection', value: unknown) => void
  destroy: () => void
}

export type ActivityEntry = {
  id: string
  title: string
  detail?: string
  tone: 'neutral' | 'accent' | 'warn'
  at: string
}

export type CollaboratorCursor = {
  userId: string
  username: string
  x: number
  y: number
  updatedAt: string
}

export type CollaboratorSelection = {
  userId: string
  username: string
  activeElementId?: string | null
  elementIds: string[]
  updatedAt: string
}

type SessionState = {
  loading: boolean
  connected: boolean
  statusLabel: string
  error: string | null
  conflictMessage: string | null
  users: UserPresence[]
  lock: LockInfo | null
  elements: WorkspaceElement[]
  version: number
  updatedAt?: string | null
  lastUpdatedByUserId?: string | null
  cursors: Record<string, CollaboratorCursor>
  selections: Record<string, CollaboratorSelection>
  activity: ActivityEntry[]
  contract: {
    schemaVersion: string
    websocketEndpoint: string
    topicDestination: string
    userQueueDestination: string
    joinDestination: string
    leaveDestination: string
    lockDestination: string
    lockRefreshDestination?: string
    unlockDestination: string
    eventDestination: string
  } | null
  room: PictureCollaborationRoom | null
  roomStatusLabel: string
  roomConnected: boolean
  roomSynced: boolean
}

type OperationPayload = {
  id: string
  type?: 'rect' | 'text'
  x?: number
  y?: number
  width?: number
  height?: number
  text?: string
  baseVersion?: number
}

const MAX_ACTIVITY = 14
const ROOM_REFRESH_SKEW_MS = 60_000

function toElements(document: PictureDocument): WorkspaceElement[] {
  return (document.elements ?? []).map(normalizeElement)
}

function upsertElement(elements: WorkspaceElement[], next: WorkspaceElement) {
  const index = elements.findIndex((element) => element.id === next.id)
  if (index === -1) return [...elements, next]
  const clone = elements.slice()
  clone[index] = next
  return clone
}

function removeElement(elements: WorkspaceElement[], id: string) {
  return elements.filter((element) => element.id !== id)
}

function nextActivity(title: string, detail: string | undefined, tone: ActivityEntry['tone']): ActivityEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    detail,
    tone,
    at: new Date().toISOString(),
  }
}

function wsEndpoint(endpoint: string) {
  if (/^https?:\/\//.test(endpoint)) {
    return endpoint
  }
  if (import.meta.env.VITE_API_BASE) {
    return `${String(import.meta.env.VITE_API_BASE).replace(/\/$/, '')}${endpoint}`
  }
  return `${window.location.origin}${endpoint}`
}

function supportsRoomProvider(room: PictureCollaborationRoom | null) {
  if (!room) return false
  return room.provider === 'hocuspocus' || room.provider === 'yjs-websocket'
}

function deriveAwarenessState(states: Map<number, Record<string, unknown>>) {
  const users: UserPresence[] = []
  const cursors: Record<string, CollaboratorCursor> = {}
  const selections: Record<string, CollaboratorSelection> = {}

  states.forEach((rawState) => {
    const user = rawState.user as AwarenessUserState | undefined
    if (!user?.userId || !user.username) return
    users.push({
      userId: user.userId,
      username: user.username,
      joinedAt: user.joinedAt,
    })

    const cursor = rawState.cursor as AwarenessCursorState | undefined
    if (cursor && typeof cursor.x === 'number' && typeof cursor.y === 'number') {
      cursors[user.userId] = {
        userId: user.userId,
        username: user.username,
        x: cursor.x,
        y: cursor.y,
        updatedAt: cursor.updatedAt,
      }
    }

    const selection = rawState.selection as AwarenessSelectionState | undefined
    if (selection) {
      selections[user.userId] = {
        userId: user.userId,
        username: user.username,
        activeElementId: selection.activeElementId ?? null,
        elementIds: selection.elementIds ?? [],
        updatedAt: selection.updatedAt,
      }
    }
  })

  users.sort((left, right) => left.username.localeCompare(right.username))

  return { users, cursors, selections }
}

export function usePictureCollabSession(pictureId: string) {
  const token = getToken()
  const storedUser = getUser()
  const clientRef = useRef<Client | null>(null)
  const roomProviderRef = useRef<RoomProviderController | null>(null)
  const roomDocRef = useRef<Y.Doc | null>(null)
  const roomTokenRef = useRef<string | null>(null)
  const pendingSnapshotRef = useRef<PictureDocument | null>(null)
  const lastCursorSentAt = useRef(0)
  const [state, setState] = useState<SessionState>({
    loading: true,
    connected: false,
    statusLabel: 'Loading session',
    error: null,
    conflictMessage: null,
    users: [],
    lock: null,
    elements: [],
    version: 0,
    updatedAt: null,
    lastUpdatedByUserId: null,
    cursors: {},
    selections: {},
    activity: [],
    contract: null,
    room: null,
    roomStatusLabel: 'Room bootstrap unavailable',
    roomConnected: false,
    roomSynced: false,
  })

  const appendActivity = useEffectEvent((title: string, detail: string | undefined, tone: ActivityEntry['tone']) => {
    setState((current) => ({
      ...current,
      activity: [nextActivity(title, detail, tone), ...current.activity].slice(0, MAX_ACTIVITY),
    }))
  })

  const fetchFreshRoomBootstrap = useEffectEvent(async (mode: 'scheduled' | 'manual') => {
    const room = await refreshPictureCollaborationRoom(pictureId)
    setState((current) => ({
      ...current,
      room,
      error:
        mode === 'manual' && current.error === 'The collaboration room token could not be refreshed.'
          ? null
          : current.error,
      roomStatusLabel:
        mode === 'manual'
          ? `${room.provider} room token refreshed manually`
          : `${room.provider} room token refreshed`,
    }))
    appendActivity(
      mode === 'manual' ? 'Room token refreshed manually' : 'Room token refreshed',
      `The ${room.provider} collaboration token was renewed.`,
      'neutral'
    )
    return room
  })

  const applySnapshot = useEffectEvent((snapshot: PictureDocument) => {
    pendingSnapshotRef.current = snapshot
    if (roomDocRef.current) {
      replaceWorkspaceFromSnapshot(roomDocRef.current, snapshot, 'server-conflict')
    }
    setState((current) => ({
      ...current,
      elements: toElements(snapshot),
      version: snapshot.version,
      updatedAt: snapshot.updatedAt,
      lastUpdatedByUserId: snapshot.lastUpdatedByUserId,
    }))
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
        connected: false,
        statusLabel: 'Loading session',
      }))
      try {
        const session = await getPictureEditorSession(pictureId)
        if (cancelled) return
        pendingSnapshotRef.current = session.document
        setState((current) => ({
          ...current,
          loading: false,
          statusLabel: token ? 'Connecting live session' : 'Read-only snapshot',
          users: session.presence.users ?? [],
          lock: session.presence.lock ?? null,
          elements: toElements(session.document),
          version: session.document.version,
          updatedAt: session.document.updatedAt,
          lastUpdatedByUserId: session.document.lastUpdatedByUserId,
          contract: {
            schemaVersion: session.realtime.eventSchemaVersion,
            websocketEndpoint: session.realtime.websocketEndpoint,
            topicDestination: session.realtime.topicDestination,
            userQueueDestination: session.realtime.userQueueDestination,
            joinDestination: session.realtime.joinDestination,
            leaveDestination: session.realtime.leaveDestination,
            lockDestination: session.realtime.lockDestination,
            lockRefreshDestination: session.realtime.lockRefreshDestination,
            unlockDestination: session.realtime.unlockDestination,
            eventDestination: session.realtime.eventDestination,
          },
          room: session.room,
          roomStatusLabel: session.room
            ? `${session.room.provider} room ready`
            : 'Room bootstrap unavailable',
          roomConnected: false,
          roomSynced: false,
        }))
      } catch {
        if (cancelled) return
        setState((current) => ({
          ...current,
          loading: false,
          statusLabel: 'Session unavailable',
          error: 'Could not load the collaboration session.',
        }))
      }
    }

    if (pictureId) {
      void load()
    }

    return () => {
      cancelled = true
    }
  }, [pictureId, token])

  useEffect(() => {
    roomTokenRef.current = state.room?.token ?? null
  }, [state.room])

  useEffect(() => {
    if (!pictureId || !state.room?.tokenExpiresAt) return

    const expiresAt = new Date(state.room.tokenExpiresAt).getTime()
    const now = Date.now()
    const delay = Math.max(1_000, expiresAt - now - ROOM_REFRESH_SKEW_MS)

    const timeout = window.setTimeout(() => {
      void fetchFreshRoomBootstrap('scheduled')
        .catch(() => {
          setState((current) => ({
            ...current,
            roomStatusLabel: 'Room token refresh failed',
            error: current.error ?? 'The collaboration room token could not be refreshed.',
          }))
        })
    }, delay)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [fetchFreshRoomBootstrap, pictureId, state.room])

  useEffect(() => {
    if (!pictureId || !state.room || !token || !supportsRoomProvider(state.room)) {
      return
    }

    const room = state.room
    const doc = new Y.Doc()
    const indexedDb = new IndexeddbPersistence(room.roomId, doc)
    roomDocRef.current = doc

    let destroyed = false
    let indexedReady = false
    let roomSynced = false
    let snapshotSeeded = false
    let getAwarenessStates = (): AwarenessPeerState | undefined => undefined

    const syncElementsFromDoc = () => {
      if (destroyed) return
      setState((current) => ({
        ...current,
        elements: readWorkspaceElements(doc),
      }))
    }

    const syncAwarenessFromRoom = () => {
      if (destroyed) return
      const awarenessStates = getAwarenessStates()
      if (!awarenessStates) return
      const nextAwareness = deriveAwarenessState(awarenessStates)
      setState((current) => ({
        ...current,
        users: nextAwareness.users,
        cursors: nextAwareness.cursors,
        selections: nextAwareness.selections,
      }))
    }

    const seedSnapshotIfNeeded = () => {
      if (destroyed || snapshotSeeded || !indexedReady || !roomSynced) {
        return
      }
      if (pendingSnapshotRef.current && isWorkspaceDocEmpty(doc)) {
        replaceWorkspaceFromSnapshot(doc, pendingSnapshotRef.current)
      }
      snapshotSeeded = true
      syncElementsFromDoc()
    }

    doc.on('update', syncElementsFromDoc)
    indexedDb.on('synced', () => {
      indexedReady = true
      seedSnapshotIfNeeded()
    })

    if (room.provider === 'hocuspocus') {
      const provider = new HocuspocusProvider({
        url: room.serverUrl,
        name: room.roomId,
        document: doc,
        token: async () => roomTokenRef.current ?? room.token,
        onStatus: ({ status }) => {
          setState((current) => ({
            ...current,
            roomConnected: status !== 'disconnected',
            roomStatusLabel:
              status === 'connected'
                ? `${room.provider} room connected`
                : status === 'connecting'
                  ? `${room.provider} room connecting`
                  : `${room.provider} room disconnected`,
          }))
        },
        onSynced: ({ state: synced }) => {
          roomSynced = synced
          seedSnapshotIfNeeded()
          setState((current) => ({
            ...current,
            roomSynced: synced,
            roomStatusLabel: synced
              ? `${room.provider} room synced`
              : current.roomStatusLabel,
          }))
          syncAwarenessFromRoom()
        },
        onAuthenticationFailed: ({ reason }) => {
          setState((current) => ({
            ...current,
            roomConnected: false,
            roomStatusLabel: `${room.provider} authentication failed`,
            error: current.error ?? `Collaboration room authentication failed: ${reason}`,
          }))
        },
        onDisconnect: () => {
          setState((current) => ({
            ...current,
            roomConnected: false,
            roomStatusLabel: `${room.provider} room disconnected`,
          }))
        },
      })

      getAwarenessStates = () => provider.awareness?.getStates() as AwarenessPeerState | undefined
      provider.on('awarenessUpdate', syncAwarenessFromRoom)
      roomProviderRef.current = {
        setAwarenessField(field, value) {
          provider.setAwarenessField(field, value)
        },
        destroy() {
          provider.destroy()
        },
      }
    } else {
      const provider = new WebsocketProvider(room.serverUrl, room.roomId, doc, {
        params: {
          token: roomTokenRef.current ?? room.token,
        },
      })
      const awareness = provider.awareness as {
        getStates: () => AwarenessPeerState
        on: (eventName: string, handler: () => void) => void
        setLocalStateField: (field: string, value: unknown) => void
      }

      provider.on('status', ({ status }: { status: 'connected' | 'connecting' | 'disconnected' }) => {
        setState((current) => ({
          ...current,
          roomConnected: status !== 'disconnected',
          roomStatusLabel:
            status === 'connected'
              ? `${room.provider} room connected`
              : status === 'connecting'
                ? `${room.provider} room connecting`
                : `${room.provider} room disconnected`,
        }))
      })
      provider.on('sync', (synced: boolean) => {
        roomSynced = synced
        seedSnapshotIfNeeded()
        setState((current) => ({
          ...current,
          roomSynced: synced,
          roomStatusLabel: synced
            ? `${room.provider} room synced`
            : current.roomStatusLabel,
        }))
        syncAwarenessFromRoom()
      })
      provider.on('connection-error', () => {
        setState((current) => ({
          ...current,
          roomConnected: false,
          roomStatusLabel: `${room.provider} connection error`,
          error: current.error ?? 'The collaboration room websocket reported a connection error.',
        }))
      })
      awareness.on('change', syncAwarenessFromRoom)

      getAwarenessStates = () => awareness.getStates()
      roomProviderRef.current = {
        setAwarenessField(field, value) {
          awareness.setLocalStateField(field, value)
        },
        destroy() {
          provider.destroy()
        },
      }
    }

    roomProviderRef.current?.setAwarenessField('user', {
      userId: storedUser?.userId ?? 'anonymous',
      username: storedUser?.username ?? 'anonymous',
      displayName: storedUser?.displayName ?? null,
      joinedAt: new Date().toISOString(),
    })

    return () => {
      destroyed = true
      roomDocRef.current = null
      setState((current) => ({
        ...current,
        roomConnected: false,
        roomSynced: false,
      }))
      roomProviderRef.current?.destroy()
      roomProviderRef.current = null
      void indexedDb.destroy()
      doc.destroy()
    }
  }, [pictureId, state.room, storedUser?.displayName, storedUser?.userId, storedUser?.username, token])

  useEffect(() => {
    if (!pictureId || !token || !state.contract) return

    const client = new Client({
      webSocketFactory: () => new SockJS(wsEndpoint(state.contract!.websocketEndpoint)),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 3000,
      debug: () => undefined,
      onConnect: () => {
        setState((current) => ({
          ...current,
          connected: true,
          statusLabel: 'Live session connected',
          error: null,
        }))
        appendActivity('Live session connected', 'Presence, cursors, and document changes are now syncing.', 'accent')

        client.subscribe(state.contract!.topicDestination, (message) => {
          const event = JSON.parse(message.body) as CollabMessage
          const userLabel = event.username || 'Collaborator'

          switch (event.type) {
            case 'USER_JOINED':
              if (roomDocRef.current) return
              appendActivity(`${userLabel} joined`, 'Now visible in the active roster.', 'accent')
              return
            case 'USER_LEFT':
              if (roomDocRef.current) return
              setState((current) => {
                if (!event.userId) return current
                const nextCursors = { ...current.cursors }
                const nextSelections = { ...current.selections }
                delete nextCursors[event.userId]
                delete nextSelections[event.userId]
                return { ...current, cursors: nextCursors, selections: nextSelections }
              })
              appendActivity(`${userLabel} left`, 'Their live markers were removed.', 'neutral')
              return
            case 'PRESENCE_UPDATE': {
              if (roomDocRef.current) return
              const payload = event.payload as PresenceSnapshot
              const activeIds = new Set((payload.users ?? []).map((user) => user.userId))
              setState((current) => {
                const nextCursors = Object.fromEntries(
                  Object.entries(current.cursors).filter(([userId]) => activeIds.has(userId))
                )
                const nextSelections = Object.fromEntries(
                  Object.entries(current.selections).filter(([userId]) => activeIds.has(userId))
                )
                return {
                  ...current,
                  users: payload.users ?? [],
                  lock: payload.lock ?? null,
                  cursors: nextCursors,
                  selections: nextSelections,
                }
              })
              return
            }
            case 'LOCK_ACQUIRED':
              setState((current) => ({ ...current, lock: (event.payload as LockInfo) ?? null }))
              appendActivity(`${userLabel} reserved focus`, 'The optional coordination lock is active.', 'neutral')
              return
            case 'LOCK_RELEASED':
              setState((current) => ({ ...current, lock: null }))
              appendActivity(`${userLabel} released focus`, 'The optional coordination lock is now clear.', 'neutral')
              return
            case 'CURSOR_UPDATE': {
              if (roomDocRef.current) return
              const payload = event.payload as CursorPayload
              if (!event.userId || typeof payload?.x !== 'number' || typeof payload?.y !== 'number') return
              const userId = event.userId
              setState((current) => ({
                ...current,
                cursors: {
                  ...current.cursors,
                  [userId]: {
                    userId,
                    username: userLabel,
                    x: payload.x,
                    y: payload.y,
                    updatedAt: event.timestamp ?? new Date().toISOString(),
                  },
                },
              }))
              return
            }
            case 'SELECTION_UPDATE': {
              if (roomDocRef.current) return
              const payload = event.payload as SelectionPayload
              if (!event.userId) return
              const userId = event.userId
              setState((current) => ({
                ...current,
                selections: {
                  ...current.selections,
                  [userId]: {
                    userId,
                    username: userLabel,
                    activeElementId: payload.activeElementId ?? null,
                    elementIds: payload.elementIds ?? [],
                    updatedAt: event.timestamp ?? new Date().toISOString(),
                  },
                },
              }))
              return
            }
            case 'ELEMENT_ADD': {
              if (roomDocRef.current) return
              const payload = normalizeElement(event.payload as PictureDocumentElement)
              setState((current) => ({
                ...current,
                conflictMessage: null,
                elements: upsertElement(current.elements, payload),
                version: event.version ?? current.version,
              }))
              appendActivity(`${userLabel} added an element`, payload.type === 'text' ? payload.text : 'New region added.', 'accent')
              return
            }
            case 'ELEMENT_UPDATE': {
              if (roomDocRef.current) return
              const payload = normalizeElement(event.payload as PictureDocumentElement)
              setState((current) => ({
                ...current,
                conflictMessage: null,
                elements: upsertElement(current.elements, payload),
                version: event.version ?? current.version,
              }))
              appendActivity(`${userLabel} updated ${payload.id}`, payload.type === 'text' ? payload.text : 'Annotation geometry changed.', 'neutral')
              return
            }
            case 'ELEMENT_REMOVE': {
              if (roomDocRef.current) return
              const payload = event.payload as PictureDocumentElement
              setState((current) => ({
                ...current,
                conflictMessage: null,
                elements: removeElement(current.elements, payload.id),
                version: event.version ?? current.version,
              }))
              appendActivity(`${userLabel} removed ${payload.id}`, 'The annotation was deleted from the shared document.', 'warn')
              return
            }
            case 'REVIEW_DECISION':
              appendActivity('Moderation event', 'Picture review state changed during the live session.', 'warn')
              return
            default:
              return
          }
        })

        client.subscribe(state.contract!.userQueueDestination, (message) => {
          const event = JSON.parse(message.body) as CollabMessage
          if (event.type === 'LOCK_DENIED') {
            const payload = event.payload as LockInfo
            setState((current) => ({ ...current, lock: payload ?? current.lock }))
            appendActivity('Focus request denied', payload?.lockedByUsername ? `${payload.lockedByUsername} is already coordinating this canvas.` : 'Another user currently holds the optional focus lock.', 'warn')
            return
          }
          if (event.type === 'VERSION_CONFLICT') {
            const payload = event.payload as PictureDocument
            applySnapshot(payload)
            setState((current) => ({
              ...current,
              conflictMessage: 'A concurrent change landed first. The canvas was refreshed to the latest shared state.',
            }))
            appendActivity('Version conflict resolved', 'The workspace reloaded the latest shared document.', 'warn')
          }
        })

        client.publish({
          destination: state.contract!.joinDestination,
          body: '{}',
        })
      },
      onStompError: () => {
        setState((current) => ({
          ...current,
          connected: false,
          statusLabel: 'Connection error',
          error: 'The collaboration socket reported an error.',
        }))
      },
      onWebSocketClose: () => {
        setState((current) => ({
          ...current,
          connected: false,
          statusLabel: current.loading ? current.statusLabel : 'Reconnecting',
        }))
      },
    })

    clientRef.current = client
    client.activate()

    return () => {
      if (client.connected) {
        client.publish({
          destination: state.contract!.leaveDestination,
          body: '{}',
        })
      }
      void client.deactivate()
      clientRef.current = null
    }
  }, [appendActivity, applySnapshot, pictureId, state.contract, token])

  const publish = useEffectEvent((type: CollabMessage['type'], payload?: unknown) => {
    const client = clientRef.current
    if (!client?.connected || !state.contract) return false
    client.publish({
      destination: state.contract.eventDestination,
      body: JSON.stringify({
        type,
        schemaVersion: state.contract.schemaVersion,
        pictureId,
        payload,
      }),
    })
    return true
  })

  const actions = useMemo(
    () => ({
      acquireLock() {
        const client = clientRef.current
        if (!client?.connected || !state.contract) return
        client.publish({ destination: state.contract.lockDestination, body: '{}' })
      },
      refreshLock() {
        const client = clientRef.current
        if (!client?.connected || !state.contract) return
        if (!state.contract.lockRefreshDestination) {
          client.publish({ destination: state.contract.lockDestination, body: '{}' })
          return
        }
        client.publish({ destination: state.contract.lockRefreshDestination, body: '{}' })
      },
      releaseLock() {
        const client = clientRef.current
        if (!client?.connected || !state.contract) return
        client.publish({ destination: state.contract.unlockDestination, body: '{}' })
      },
      async refreshRoom() {
        try {
          await fetchFreshRoomBootstrap('manual')
        } catch {
          setState((current) => ({
            ...current,
            roomStatusLabel: 'Room token refresh failed',
            error: current.error ?? 'The collaboration room token could not be refreshed.',
          }))
        }
      },
      clearConflict() {
        setState((current) => ({ ...current, conflictMessage: null }))
      },
      sendCursor(x: number, y: number) {
        const now = Date.now()
        if (now - lastCursorSentAt.current < 60) return
        lastCursorSentAt.current = now
        if (roomProviderRef.current) {
          roomProviderRef.current.setAwarenessField('cursor', {
            x,
            y,
            updatedAt: new Date().toISOString(),
          })
          return
        }
        publish('CURSOR_UPDATE', { x, y })
      },
      sendSelection(elementIds: string[], activeElementId?: string | null) {
        if (roomProviderRef.current) {
          roomProviderRef.current.setAwarenessField('selection', {
            elementIds,
            activeElementId,
            updatedAt: new Date().toISOString(),
          })
          return
        }
        publish('SELECTION_UPDATE', { elementIds, activeElementId })
      },
      addElement(payload: Omit<OperationPayload, 'baseVersion'>) {
        if (roomDocRef.current && payload.type) {
          const element = normalizeElement({
            id: payload.id,
            type: payload.type,
            x: payload.x ?? 0,
            y: payload.y ?? 0,
            width: payload.width ?? 0,
            height: payload.height ?? 0,
            text: payload.text,
          } satisfies PictureDocumentElement)
          upsertWorkspaceElement(roomDocRef.current, element)
        }
        publish('ELEMENT_ADD', { ...payload, baseVersion: state.version })
      },
      updateElement(payload: Omit<OperationPayload, 'baseVersion'>) {
        if (roomDocRef.current && payload.type) {
          const element = normalizeElement({
            id: payload.id,
            type: payload.type,
            x: payload.x ?? 0,
            y: payload.y ?? 0,
            width: payload.width ?? 0,
            height: payload.height ?? 0,
            text: payload.text,
          } satisfies PictureDocumentElement)
          upsertWorkspaceElement(roomDocRef.current, element)
        }
        publish('ELEMENT_UPDATE', { ...payload, baseVersion: state.version })
      },
      removeElement(id: string) {
        if (roomDocRef.current) {
          removeWorkspaceElementFromDoc(roomDocRef.current, id)
        }
        publish('ELEMENT_REMOVE', { id, baseVersion: state.version })
      },
    }),
    [fetchFreshRoomBootstrap, pictureId, publish, state.contract, state.version]
  )

  return {
    ...state,
    actions,
  }
}
