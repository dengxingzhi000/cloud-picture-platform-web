/**
 * NotificationBell — header icon + dropdown for in-app notifications.
 * Reads from NotificationProvider context (useNotifications).
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useNotifications, type AppNotification, type NotificationKind } from './notifications'

const KIND_ICON: Record<NotificationKind, React.ReactNode> = {
  PICTURE_APPROVED:      '✅',
  PICTURE_REJECTED:      '❌',
  REVIEW_PENDING:        '🔍',
  TEAM_INVITE:           '📨',
  UPLOAD_COMPLETE:       '📤',
  TEAM_PICTURE_UPLOADED: '🖼️',
  TEAM_MEMBER_JOINED:    <UserPlus size={16} />,
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

function NotificationItem({ notif, onClick }: { notif: AppNotification; onClick: () => void }) {
  const icon = notif.kind ? KIND_ICON[notif.kind] : 'ℹ️'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '11px 14px',
        cursor: 'pointer',
        background: notif.read ? 'transparent' : 'rgba(239,107,47,0.05)',
        borderBottom: '1px solid var(--stroke-soft)',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(239,107,47,0.05)')}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {notif.title && (
          <div style={{ fontWeight: notif.read ? 500 : 700, fontSize: '0.85rem', marginBottom: 2, lineHeight: 1.3 }}>
            {notif.title}
          </div>
        )}
        {notif.body && (
          <div style={{
            color: 'var(--ink-soft)',
            fontSize: '0.78rem',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
          }}>
            {notif.body}
          </div>
        )}
        <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: 4, opacity: 0.7 }}>
          {relativeTime(notif.timestamp)}
        </div>
      </div>
      {!notif.read && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent)', flexShrink: 0, marginTop: 6,
        }} />
      )}
    </div>
  )
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleClick(notif: AppNotification) {
    markRead(notif.id)
    setOpen(false)
    if (notif.targetId) {
      if (notif.kind === 'TEAM_INVITE') {
        navigate('/teams')
      } else if (notif.kind === 'TEAM_MEMBER_JOINED') {
        navigate(`/teams/${notif.targetId}`)
      } else if (notif.kind === 'REVIEW_PENDING') {
        navigate(`/admin/reviews`)
      } else {
        navigate(`/pictures/${notif.targetId}`)
      }
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen((o) => !o) }}
        style={{
          position: 'relative',
          width: 40, height: 40,
          borderRadius: '50%',
          border: '1px solid var(--stroke-soft)',
          background: 'var(--bg-surface)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
          transition: 'all 0.2s ease',
        }}
        title="Notifications"
        aria-label={`${unreadCount} unread notifications`}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 18, height: 18,
            borderRadius: 999,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid var(--bg-base)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 48, right: 0,
          width: 340,
          maxHeight: 480,
          background: 'var(--bg-surface)',
          border: '1px solid var(--stroke-soft)',
          borderRadius: 18,
          boxShadow: '0 20px 60px rgba(30,20,10,0.16)',
          overflow: 'hidden',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          animation: 'dropdownIn 0.18s ease both',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px',
            borderBottom: '1px solid var(--stroke-soft)',
            background: 'var(--bg-elevated)',
          }}>
            <strong style={{ fontSize: '0.9rem' }}>Notifications</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllRead}
                    style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                  <button
                    onClick={clearAll}
                    style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-soft)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔕</div>
                <div style={{ fontSize: '0.85rem' }}>No notifications yet</div>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notif={n} onClick={() => handleClick(n)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}