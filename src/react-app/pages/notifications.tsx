/**
 * useNotifications — subscribes to /user/queue/notifications and /topic/admin/notifications
 * over the existing STOMP connection and surfaces them via the toast system.
 *
 * Place <NotificationProvider> inside <AuthProvider> and <ToastProvider> in App.tsx.
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getToken } from '@/utils/auth'
import { useToast } from '../toast'
import { useAuth } from '@/react-app/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationKind =
  | 'PICTURE_APPROVED'
  | 'PICTURE_REJECTED'
  | 'REVIEW_PENDING'
  | 'TEAM_INVITE'
  | 'UPLOAD_COMPLETE'
  | 'TEAM_PICTURE_UPLOADED'
  | 'TEAM_MEMBER_JOINED'

export type AppNotification = {
  id: string
  title?: string
  body?: string
  kind?: NotificationKind
  targetId?: string
  timestamp: string
  read: boolean
}

type NotificationCtx = {
  notifications: AppNotification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationCtx | null>(null)

const KIND_TOAST: Record<NotificationKind, 'success' | 'info' | 'warn' | 'error'> = {
  PICTURE_APPROVED:      'success',
  PICTURE_REJECTED:      'error',
  REVIEW_PENDING:        'info',
  TEAM_INVITE:           'info',
  UPLOAD_COMPLETE:       'success',
  TEAM_PICTURE_UPLOADED: 'info',
  TEAM_MEMBER_JOINED:    'info',
}

const KIND_EMOJI: Record<NotificationKind, string> = {
  PICTURE_APPROVED:      '✅',
  PICTURE_REJECTED:      '❌',
  REVIEW_PENDING:        '🔍',
  TEAM_INVITE:           '📨',
  UPLOAD_COMPLETE:       '📤',
  TEAM_PICTURE_UPLOADED: '🖼️',
  TEAM_MEMBER_JOINED:    '👥',
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function wsEndpoint() {
  const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''
  return `${base}/ws`
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthed, isAdmin } = useAuth()
  const { addToast } = useToast()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const clientRef = useRef<Client | null>(null)

  function addNotification(raw: {
    title?: string
    body?: string
    kind?: NotificationKind
    targetId?: string
    timestamp?: string
  }) {
    const notif: AppNotification = {
      id: makeId(),
      title: raw.title,
      body: raw.body,
      kind: raw.kind,
      targetId: raw.targetId,
      timestamp: raw.timestamp ?? new Date().toISOString(),
      read: false,
    }

    setNotifications((prev) => [notif, ...prev].slice(0, 50))

    // Toast the user
    const kind = raw.kind ? KIND_TOAST[raw.kind] : 'info'
    const emoji = raw.kind ? KIND_EMOJI[raw.kind] : 'ℹ️'
    const msg = raw.body ? `${emoji} ${raw.body}` : raw.title ?? 'New notification'
    addToast(msg, kind, 5000)
  }

  useEffect(() => {
    const token = getToken()
    if (!token || !isAuthed) return

    const client = new Client({
      webSocketFactory: () => new SockJS(wsEndpoint()),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      debug: () => undefined,
      onConnect: () => {
        // Personal notification queue
        client.subscribe('/user/queue/notifications', (frame) => {
          try {
            const payload = JSON.parse(frame.body) as {
              title?: string
              body?: string
              kind?: NotificationKind
              targetId?: string
              timestamp?: string
            }
            addNotification(payload)
          } catch { /* ignore malformed */ }
        })

        // Admin broadcast topic
        if (isAdmin) {
          client.subscribe('/topic/admin/notifications', (frame) => {
            try {
              const payload = JSON.parse(frame.body) as {
                title?: string
                body?: string
                kind?: NotificationKind
                targetId?: string
                timestamp?: string
              }
              addNotification({ ...payload, kind: payload.kind ?? 'REVIEW_PENDING' })
            } catch { /* ignore malformed */ }
          })
        }
      },
      onStompError: () => { /* silent — handled by reconnect */ },
      onWebSocketClose: () => { /* silent */ },
    })

    clientRef.current = client
    client.activate()

    return () => {
      void client.deactivate()
      clientRef.current = null
    }
  }, [isAuthed, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

  const clearAll = () => setNotifications([])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}