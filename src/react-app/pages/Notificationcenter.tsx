import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useNavigate } from 'react-router-dom'
import { getToken } from '@/utils/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationKind =
  | 'PICTURE_APPROVED'
  | 'PICTURE_REJECTED'
  | 'REVIEW_PENDING'
  | 'TEAM_INVITE'
  | 'UPLOAD_COMPLETE'
  | 'TEAM_PICTURE_UPLOADED'

type IncomingNotification = {
  title?: string
  body?: string
  kind?: NotificationKind
  targetId?: string
  timestamp?: string
}

type StoredNotification = IncomingNotification & {
  id: string
  receivedAt: string
  read: boolean
}

// ─── Icons / styling per kind ─────────────────────────────────────────────────

const KIND_META: Record<NotificationKind, { icon: string; accent: string; routeFn?: (id?: string) => string }> = {
  PICTURE_APPROVED:        { icon: '✅', accent: '#116350', routeFn: (id) => id ? `/pictures/${id}` : '/gallery' },
  PICTURE_REJECTED:        { icon: '❌', accent: '#9a3412', routeFn: (id) => id ? `/pictures/${id}` : '/gallery' },
  REVIEW_PENDING:          { icon: '🕐', accent: '#8a5c00', routeFn: () => '/admin/reviews' },
  TEAM_INVITE:             { icon: '👥', accent: '#0369a1', routeFn: () => '/teams' },
  UPLOAD_COMPLETE:         { icon: '⬆️', accent: '#116350', routeFn: (id) => id ? `/pictures/${id}` : '/gallery' },
  TEAM_PICTURE_UPLOADED:   { icon: '🖼️', accent: '#7c3aed', routeFn: (id) => id ? `/pictures/${id}` : '/gallery' },
}

function meta(kind?: NotificationKind) {
  return kind ? KIND_META[kind] : { icon: 'ℹ️', accent: 'var(--ink-soft)' }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

const MAX_NOTIFICATIONS = 40

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationCenter() {
  const navigate = useNavigate()
  const token = getToken()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<StoredNotification[]>([])
  const [connected, setConnected] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const clientRef = useRef<Client | null>(null)

  const unread = items.filter((n) => !n.read).length

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // STOMP connection for live notifications
  useEffect(() => {
    if (!token) return

    const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''
    const client = new Client({
      webSocketFactory: () => new SockJS(`${apiBase}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      debug: () => undefined,
      onConnect: () => {
        setConnected(true)
        // Personal notification queue
        client.subscribe('/user/queue/notifications', (frame) => {
          try {
            const payload = JSON.parse(frame.body) as IncomingNotification
            setItems((prev) => {
              const next: StoredNotification = {
                ...payload,
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                receivedAt: new Date().toISOString(),
                read: false,
              }
              return [next, ...prev].slice(0, MAX_NOTIFICATIONS)
            })
          } catch { /* ignore malformed */ }
        })
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    })

    clientRef.current = client
    client.activate()

    return () => {
      void client.deactivate()
      clientRef.current = null
      setConnected(false)
    }
  }, [token])

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markRead = (id: string) => {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  const clearAll = () => setItems([])

  const handleClick = (n: StoredNotification) => {
    markRead(n.id)
    const m = meta(n.kind)
    if (m.routeFn) {
      navigate(m.routeFn(n.targetId))
    }
    setOpen(false)
  }

  if (!token) return null

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => { setOpen((v) => !v); if (!open && unread > 0) {} }}
        aria-label="Notifications"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid var(--stroke-soft)',
          background: open 
            ? 'linear-gradient(135deg, rgba(239,107,47,0.15), rgba(239,107,47,0.08))' 
            : 'linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))',
          cursor: 'pointer',
          fontSize: '1rem',
          color: 'var(--ink-soft)',
          transition: 'all 0.2s ease',
          boxShadow: open 
            ? '0 4px 12px rgba(239,107,47,0.15)' 
            : '0 2px 8px rgba(0,0,0,0.04)',
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239,107,47,0.12)'
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--stroke-soft)'
            e.currentTarget.style.color = 'var(--ink-soft)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
          }
        }}
      >
        🔔
        {/* Unread badge */}
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: 999,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
        {/* Connection dot */}
        <span style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: connected ? '#22c55e' : '#94a3b8',
          border: '1.5px solid var(--bg-surface)',
        }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 380,
            maxHeight: 520,
            background: 'var(--bg-surface)',
            borderRadius: 20,
            border: '1px solid var(--stroke-soft)',
            boxShadow: '0 24px 60px rgba(30,20,10,0.18), 0 0 0 1px rgba(239,107,47,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 100,
            animation: 'slideDown 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 18px 12px',
            borderBottom: '1px solid var(--stroke-soft)',
            background: 'linear-gradient(180deg, var(--bg-elevated), var(--bg-surface))',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: '0.95rem', fontWeight: 700 }}>Notifications</strong>
              {unread > 0 && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, #ef6b2f, #d6571f)',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(239,107,47,0.25)',
                }}>
                  {unread} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: '0.78rem', 
                    color: 'var(--accent)', 
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 8,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239,107,47,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                  }}
                >
                  Mark all read
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: '0.78rem', 
                    color: 'var(--ink-soft)',
                    padding: '4px 8px',
                    borderRadius: 8,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Items */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {items.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.88rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
                No notifications yet.
                {!connected && (
                  <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#94a3b8' }}>
                    Connecting to live updates…
                  </div>
                )}
              </div>
            ) : (
              items.map((n) => {
                const m = meta(n.kind)
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      width: '100%',
                      padding: '14px 18px',
                      background: n.read ? 'transparent' : 'linear-gradient(90deg, rgba(239,107,47,0.04), transparent)',
                      border: 'none',
                      borderBottom: '1px solid var(--stroke-soft)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-elevated)'
                      e.currentTarget.style.transform = 'translateX(2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = n.read ? 'transparent' : 'linear-gradient(90deg, rgba(239,107,47,0.04), transparent)'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: `${m.accent}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', flexShrink: 0,
                    }}>
                      {m.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {n.title && (
                        <div style={{ fontWeight: n.read ? 500 : 700, fontSize: '0.88rem', marginBottom: 2, color: 'var(--ink-strong)' }}>
                          {n.title}
                        </div>
                      )}
                      {n.body && (
                        <div style={{
                          fontSize: '0.8rem', color: 'var(--ink-soft)',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                        {timeAgo(n.receivedAt)}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--accent)', flexShrink: 0, marginTop: 4,
                      }} />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--stroke-soft)',
            background: 'var(--bg-elevated)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.72rem',
            color: '#94a3b8',
          }}>
            <span style={{
              display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#22c55e' : '#94a3b8',
            }} />
            {connected ? 'Live updates active' : 'Connecting…'}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { 
            opacity: 0; 
            transform: translateY(-8px) scale(0.96); 
          }
          to   { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
      `}</style>
    </div>
  )
}