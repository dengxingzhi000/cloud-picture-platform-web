import { useEffect, useMemo, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import type { IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getToken, getUser } from '@/utils/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolId = 'select' | 'rect' | 'text'

export type RectElement = {
  id: string; type: 'rect'; x: number; y: number; width: number; height: number
}
export type TextElement = {
  id: string; type: 'text'; x: number; y: number; width: number; height: number; text: string
}
export type CanvasElement = RectElement | TextElement

type DragState =
  | { mode: 'none' }
  | { mode: 'draw-rect'; startX: number; startY: number }
  | { mode: 'drag'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { mode: 'resize'; id: string; startX: number; startY: number; origWidth: number; origHeight: number }

type Metrics = { offsetX: number; offsetY: number; width: number; height: number }

type Presence = { userId: string; username: string; joinedAt: string }
type LockInfo = { lockedByUserId: string; lockedByUsername: string; lockedAt: string; expiresAt: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uuid() {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function parseBody(body: string) {
  try { const p = JSON.parse(body); return typeof p === 'string' ? JSON.parse(p) : p } catch { return null }
}

function elementToShape(el: CanvasElement) {
  const base = { id: el.id, type: el.type, x: el.x, y: el.y, width: el.width, height: el.height }
  return el.type === 'text' ? { ...base, text: (el as TextElement).text } : base
}

const HANDLE = 10
const TEXT_PAD_X = 8
const TEXT_Y = 22
const TEXT_H = 26

// ─── Component ────────────────────────────────────────────────────────────────

export default function CollabCanvas({
  pictureId,
  pictureUrl,
  initialElements,
}: {
  pictureId: string
  pictureUrl: string
  initialElements?: CanvasElement[]
}) {
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const [imageMetrics, setImageMetrics] = useState<Metrics | null>(null)
  const [elements, setElements] = useState<CanvasElement[]>(() => initialElements ?? [])
  const elementsRef = useRef(elements)
  useEffect(() => { elementsRef.current = elements }, [elements])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIdRef = useRef(selectedId)
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

  const [tool, setTool] = useState<ToolId>('select')
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  // Collaboration state
  const [connected, setConnected] = useState(false)
  const [users, setUsers] = useState<Presence[]>([])
  const [lock, setLock] = useState<LockInfo | null>(null)
  const [myVersion, setMyVersion] = useState(0)
  const [statusMsg, setStatusMsg] = useState('Connecting…')

  const dragStateRef = useRef<DragState>({ mode: 'none' })
  const lastBroadcastAt = useRef(0)
  const clientRef = useRef<Client | null>(null)
  const clientIdRef = useRef(uuid())

  const user = useMemo(() => getUser(), [])
  const userId = user?.userId ?? ''
  const username = user?.username ?? ''
  const iLockHolder = lock?.lockedByUserId === userId

  useEffect(() => { if (initialElements) setElements(initialElements) }, [initialElements])

  // ── STOMP ─────────────────────────────────────────────────────────────────

  function broadcastOp(type: string, payload: unknown) {
    const c = clientRef.current
    if (!c?.connected) return
    c.publish({
      destination: `/app/pictures/${pictureId}/annotation`,
      body: JSON.stringify({ type, pictureId, clientId: clientIdRef.current, userId, username, timestamp: new Date().toISOString(), payload }),
    })
  }

  useEffect(() => {
    const token = getToken() ?? ''
    const apiBase = (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? ''
    const sock = new SockJS(apiBase + '/ws')
    const client = new Client({
      webSocketFactory: () => sock,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      debug: () => undefined,
    })

    client.onConnect = () => {
      setConnected(true)
      setStatusMsg('Live')

      // Subscribe to presence / collab topic
      client.subscribe(`/topic/pictures/${pictureId}/collab`, (frame: IMessage) => {
        const msg = parseBody(frame.body)
        if (!msg) return
        if (msg.clientId === clientIdRef.current) return

        const type: string = msg.type ?? ''

        if (type === 'PRESENCE_UPDATE') {
          const p = msg.payload as { users?: Presence[]; lock?: LockInfo | null }
          setUsers(p?.users ?? [])
          setLock(p?.lock ?? null)
          return
        }
        if (type === 'USER_JOINED' || type === 'USER_LEFT') return // handled via PRESENCE_UPDATE
        if (type === 'LOCK_ACQUIRED') {
          setLock(msg.payload as LockInfo ?? null)
          return
        }
        if (type === 'LOCK_RELEASED') {
          setLock(null)
          return
        }

        // Document mutations
        const el = (msg.payload as { element?: CanvasElement })?.element
        if (type === 'ELEMENT_ADD' && el) {
          setElements((prev) => prev.some((e) => e.id === el.id) ? prev : [...prev, el])
          if (msg.version != null) setMyVersion(msg.version as number)
          return
        }
        if (type === 'ELEMENT_UPDATE' && el) {
          setElements((prev) => prev.map((e) => e.id === el.id ? el : e))
          if (msg.version != null) setMyVersion(msg.version as number)
          return
        }
        if (type === 'ELEMENT_REMOVE') {
          const rid = (msg.payload as { id?: string })?.id ?? el?.id
          if (rid) {
            setElements((prev) => prev.filter((e) => e.id !== rid))
            if (msg.version != null) setMyVersion(msg.version as number)
          }
          return
        }
        if (type === 'VERSION_CONFLICT') {
          const snap = msg.payload as { elements?: CanvasElement[]; version?: number }
          if (snap?.elements) setElements(snap.elements)
          if (snap?.version != null) setMyVersion(snap.version)
          setStatusMsg('Conflict resolved — canvas refreshed')
          setTimeout(() => setStatusMsg('Live'), 3000)
        }
      })

      // Personal queue (lock denied, version conflict)
      client.subscribe(`/user/queue/collab`, (frame: IMessage) => {
        const msg = parseBody(frame.body)
        if (!msg) return
        if (msg.type === 'LOCK_DENIED') {
          const info = msg.payload as LockInfo
          setLock(info)
          setStatusMsg(`Lock held by ${info?.lockedByUsername ?? 'another user'}`)
          setTimeout(() => setStatusMsg('Live'), 3000)
        }
        if (msg.type === 'VERSION_CONFLICT') {
          const snap = msg.payload as { elements?: CanvasElement[]; version?: number }
          if (snap?.elements) setElements(snap.elements)
          if (snap?.version != null) setMyVersion(snap.version)
        }
      })

      // Join
      client.publish({ destination: `/app/pictures/${pictureId}/join`, body: '{}' })
    }

    client.onStompError = () => { setConnected(false); setStatusMsg('Connection error') }
    client.onWebSocketClose = () => { setConnected(false); setStatusMsg('Reconnecting…') }

    client.activate()
    clientRef.current = client

    return () => {
      if (client.connected) client.publish({ destination: `/app/pictures/${pictureId}/leave`, body: '{}' })
      void client.deactivate()
      clientRef.current = null
    }
  }, [pictureId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas helpers ─────────────────────────────────────────────────────────

  function getPoint(ev: { clientX: number; clientY: number }) {
    const host = canvasHostRef.current; const m = imageMetrics
    if (!host || !m) return null
    const r = host.getBoundingClientRect()
    const x = ev.clientX - r.left - m.offsetX; const y = ev.clientY - r.top - m.offsetY
    return (x < 0 || y < 0 || x > m.width || y > m.height) ? null : { x, y }
  }

  function hitTest(x: number, y: number): CanvasElement | null {
    const arr = elementsRef.current
    for (let i = arr.length - 1; i >= 0; i--) {
      const e = arr[i]
      if (x >= e.x && x <= e.x + e.width && y >= e.y && y <= e.y + e.height) return e
    }
    return null
  }

  function bringToTop(id: string) {
    setElements((prev) => {
      const idx = prev.findIndex((e) => e.id === id)
      if (idx < 0 || idx === prev.length - 1) return prev
      const next = prev.slice(); const [el] = next.splice(idx, 1); next.push(el)
      return next
    })
  }

  function maySend() {
    const now = Date.now()
    if (now - lastBroadcastAt.current < 60) return false
    lastBroadcastAt.current = now; return true
  }

  // ── Mouse events ────────────────────────────────────────────────────────────

  useEffect(() => {
    function onMove(ev: MouseEvent) {
      const state = dragStateRef.current; if (state.mode === 'none') return
      const pt = getPoint(ev); if (!pt) return

      if (state.mode === 'draw-rect') {
        setDraftRect({ x: Math.min(state.startX, pt.x), y: Math.min(state.startY, pt.y), width: Math.abs(pt.x - state.startX), height: Math.abs(pt.y - state.startY) })
        return
      }

      if (state.mode === 'drag') {
        const nx = state.origX + (pt.x - state.startX); const ny = state.origY + (pt.y - state.startY)
        setElements((prev) => prev.map((e) => e.id === state.id ? { ...e, x: nx, y: ny } : e))
        if (maySend()) {
          const t = elementsRef.current.find((e) => e.id === state.id)
          if (t) broadcastOp('ELEMENT_UPDATE', { opId: uuid(), element: elementToShape({ ...t, x: nx, y: ny }), baseVersion: myVersion })
        }
        return
      }

      if (state.mode === 'resize') {
        const nw = Math.max(10, state.origWidth + (pt.x - state.startX)); const nh = Math.max(10, state.origHeight + (pt.y - state.startY))
        setElements((prev) => prev.map((e) => e.id === state.id && e.type === 'rect' ? { ...e, width: nw, height: nh } : e))
        if (maySend()) {
          const t = elementsRef.current.find((e) => e.id === state.id)
          if (t) broadcastOp('ELEMENT_UPDATE', { opId: uuid(), element: elementToShape({ ...t, width: nw, height: nh }), baseVersion: myVersion })
        }
      }
    }

    function onUp() {
      const state = dragStateRef.current; if (state.mode === 'none') return
      if (state.mode === 'draw-rect' && draftRect && draftRect.width >= 10 && draftRect.height >= 10) {
        const el: RectElement = { id: uuid(), type: 'rect', x: draftRect.x, y: draftRect.y, width: draftRect.width, height: draftRect.height }
        setElements((prev) => [...prev, el]); setSelectedId(el.id); bringToTop(el.id)
        broadcastOp('ELEMENT_ADD', { opId: uuid(), element: elementToShape(el), baseVersion: myVersion })
      }
      dragStateRef.current = { mode: 'none' }; setDraftRect(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [draftRect, myVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Delete' || tool !== 'select' || !selectedIdRef.current) return
      const id = selectedIdRef.current
      setElements((prev) => prev.filter((x) => x.id !== id)); setSelectedId(null)
      broadcastOp('ELEMENT_REMOVE', { opId: uuid(), id, baseVersion: myVersion })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tool, myVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  function onCanvasMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    const pt = getPoint(e)
    if (!pt) { if (tool === 'select') setSelectedId(null); return }

    if (tool === 'rect') {
      setSelectedId(null); dragStateRef.current = { mode: 'draw-rect', startX: pt.x, startY: pt.y }
      setDraftRect({ x: pt.x, y: pt.y, width: 0, height: 0 }); return
    }

    if (tool === 'text') {
      const text = window.prompt('Enter text')?.trim()
      if (!text) return
      const el: TextElement = { id: uuid(), type: 'text', x: pt.x, y: pt.y, width: Math.max(10, text.length * 9 + 16), height: TEXT_H, text }
      setElements((prev) => [...prev, el]); setSelectedId(el.id); bringToTop(el.id)
      broadcastOp('ELEMENT_ADD', { opId: uuid(), element: elementToShape(el), baseVersion: myVersion })
      return
    }

    const target = hitTest(pt.x, pt.y)
    if (!target) { setSelectedId(null); return }

    if (target.type === 'rect' && target.id === selectedIdRef.current) {
      const rx = target.x + target.width - HANDLE; const ry = target.y + target.height - HANDLE
      if (pt.x >= rx && pt.x <= rx + HANDLE && pt.y >= ry && pt.y <= ry + HANDLE) {
        bringToTop(target.id)
        dragStateRef.current = { mode: 'resize', id: target.id, startX: pt.x, startY: pt.y, origWidth: target.width, origHeight: target.height }
        return
      }
    }

    bringToTop(target.id); setSelectedId(target.id)
    dragStateRef.current = { mode: 'drag', id: target.id, startX: pt.x, startY: pt.y, origX: target.x, origY: target.y }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const avatarColors = ['#0f766e', '#b84e1f', '#7c3aed', '#0369a1', '#a16207']

  return (
    <div style={{ display: 'grid', gap: 0, height: '100%' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        borderBottom: '1px solid var(--stroke-soft)',
        background: 'var(--bg-elevated)',
        borderRadius: '16px 16px 0 0',
        flexWrap: 'wrap',
      }}>
        {/* Tools */}
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { id: 'select' as ToolId, icon: '↖', label: 'Select' },
            { id: 'rect' as ToolId, icon: '□', label: 'Rectangle' },
            { id: 'text' as ToolId, icon: 'T', label: 'Text' },
          ]).map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              title={label}
              style={{
                padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700,
                background: tool === id ? 'var(--ink-strong)' : 'rgba(32,26,22,0.07)',
                color: tool === id ? '#fff' : 'var(--ink-soft)',
                fontSize: '0.88rem',
              }}
            >
              {icon}
            </button>
          ))}
          <button
            title="Delete selected (Delete)"
            disabled={!selectedId}
            onClick={() => {
              if (!selectedIdRef.current) return
              const id = selectedIdRef.current
              setElements((prev) => prev.filter((x) => x.id !== id)); setSelectedId(null)
              broadcastOp('ELEMENT_REMOVE', { opId: uuid(), id, baseVersion: myVersion })
            }}
            style={{
              padding: '6px 10px', borderRadius: 8, border: 'none', cursor: selectedId ? 'pointer' : 'not-allowed',
              fontWeight: 700, background: 'rgba(220,38,38,0.1)', color: '#dc2626',
              fontSize: '0.88rem', opacity: selectedId ? 1 : 0.4,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Lock */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {lock ? (
            <div style={{ fontSize: '0.78rem', color: iLockHolder ? '#116350' : '#8a5c00', fontWeight: 700, background: iLockHolder ? 'rgba(31,138,112,0.1)' : 'rgba(138,92,0,0.1)', padding: '4px 10px', borderRadius: 999 }}>
              🔒 {iLockHolder ? 'You have focus' : `${lock.lockedByUsername} has focus`}
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', fontWeight: 700 }}>No focus lock</div>
          )}

          {!lock && (
            <button
              onClick={() => clientRef.current?.publish({ destination: `/app/pictures/${pictureId}/lock`, body: '{}' })}
              style={{ padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', background: 'var(--ink-strong)', color: '#fff' }}
            >
              Request focus
            </button>
          )}
          {iLockHolder && (
            <button
              onClick={() => clientRef.current?.publish({ destination: `/app/pictures/${pictureId}/unlock`, body: '{}' })}
              style={{ padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}
            >
              Release
            </button>
          )}
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>{statusMsg}</span>
        </div>

        {/* Presence avatars */}
        <div style={{ display: 'flex', gap: -4 }}>
          {users.slice(0, 6).map((u, i) => (
            <div
              key={u.userId}
              title={u.username}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff',
                background: avatarColors[i % avatarColors.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '0.72rem',
                marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i,
              }}
            >
              {u.username.slice(0, 1).toUpperCase()}
            </div>
          ))}
          {users.length > 6 && (
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', background: 'rgba(32,26,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, marginLeft: -8 }}>
              +{users.length - 6}
            </div>
          )}
        </div>
      </div>

      {/* Canvas host */}
      <div
        ref={canvasHostRef}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '0 0 16px 16px',
          background: 'linear-gradient(135deg, rgba(15,118,110,0.08), rgba(232,93,4,0.06), #f3eee7)',
          minHeight: 520,
        }}
      >
        <img
          className="background-image"
          src={pictureUrl}
          alt={`Picture ${pictureId}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
          onLoad={(ev) => {
            const img = ev.currentTarget
            const host = canvasHostRef.current
            if (!host) return
            const { width: hw, height: hh } = host.getBoundingClientRect()
            const { naturalWidth: nw, naturalHeight: nh } = img
            if (!nw || !nh || hw <= 0 || hh <= 0) return
            const scale = Math.min(hw / nw, hh / nh)
            const dw = nw * scale; const dh = nh * scale
            setImageMetrics({ offsetX: (hw - dw) / 2, offsetY: (hh - dh) / 2, width: dw, height: dh })
          }}
        />

        {imageMetrics ? (
          <svg
            style={{ position: 'absolute', left: imageMetrics.offsetX, top: imageMetrics.offsetY, cursor: tool === 'rect' ? 'crosshair' : tool === 'text' ? 'text' : 'default' }}
            width={imageMetrics.width}
            height={imageMetrics.height}
            onMouseDown={onCanvasMouseDown}
          >
            {elements.map((el) => {
              const selected = el.id === selectedId
              if (el.type === 'rect') {
                return (
                  <g key={el.id}>
                    <rect
                      x={el.x} y={el.y} width={el.width} height={el.height}
                      fill="rgba(15,118,110,0.12)" stroke={selected ? '#0f766e' : 'rgba(15,118,110,0.5)'}
                      strokeWidth={selected ? 2 : 1.5} rx={3}
                    />
                    {selected && (
                      <rect
                        x={el.x + el.width - HANDLE / 2} y={el.y + el.height - HANDLE / 2}
                        width={HANDLE} height={HANDLE}
                        fill="#0f766e" rx={2} style={{ cursor: 'nwse-resize' }}
                      />
                    )}
                  </g>
                )
              }
              return (
                <g key={el.id}>
                  <rect
                    x={el.x} y={el.y} width={el.width} height={el.height}
                    fill={selected ? 'rgba(232,93,4,0.12)' : 'rgba(232,93,4,0.08)'}
                    stroke={selected ? '#e85d04' : 'rgba(232,93,4,0.4)'}
                    strokeWidth={selected ? 2 : 1.5} rx={3}
                  />
                  <text
                    x={el.x + TEXT_PAD_X} y={el.y + TEXT_Y}
                    fontFamily="'IBM Plex Sans', sans-serif" fontSize={14} fontWeight={600}
                    fill="#1f1b17"
                  >
                    {(el as TextElement).text}
                  </text>
                </g>
              )
            })}

            {draftRect && (
              <rect
                x={draftRect.x} y={draftRect.y} width={draftRect.width} height={draftRect.height}
                fill="rgba(15,118,110,0.06)" stroke="#0f766e" strokeWidth={1.5} strokeDasharray="6 3" rx={3}
              />
            )}
          </svg>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
            Loading image…
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--stroke-soft)', display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--ink-soft)', background: 'var(--bg-elevated)', borderRadius: '0 0 16px 16px' }}>
        <span>{elements.length} element{elements.length !== 1 ? 's' : ''}</span>
        <span>v{myVersion}</span>
        <span>{users.length} collaborator{users.length !== 1 ? 's' : ''} online</span>
        {selectedId && <span>Selected: {selectedId.slice(0, 8)}…</span>}
      </div>
    </div>
  )
}
