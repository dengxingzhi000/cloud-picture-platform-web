import type { CollaboratorCursor, CollaboratorSelection, ActivityEntry } from '@/react-app/hooks/usePictureCollabSession'
import type { PresenceSnapshot } from '@/collab-types'

type UserPresence = PresenceSnapshot['users'][0]

type LockInfo = {
  lockedByUserId: string
  lockedByUsername: string
  lockedAt: string
  expiresAt: string
}

type Props = {
  users: UserPresence[]
  lock: LockInfo | null
  cursors: Record<string, CollaboratorCursor>
  selections: Record<string, CollaboratorSelection>
  activity: ActivityEntry[]
  connected: boolean
  statusLabel: string
  roomConnected: boolean
  roomStatusLabel: string
  currentUserId?: string
  lockTtlSeconds?: number
  onAcquireLock: () => void
  onReleaseLock: () => void
  conflictMessage: string | null
  onClearConflict: () => void
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

const AVATAR_COLORS = [
  '#ef6b2f', '#1f8a70', '#7c3aed', '#0369a1', '#d97706', '#be123c',
]

function avatarColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function CollabPresencePanel({
  users,
  lock,
  cursors,
  selections,
  activity,
  connected,
  statusLabel,
  roomConnected,
  roomStatusLabel,
  currentUserId,
  onAcquireLock,
  onReleaseLock,
  conflictMessage,
  onClearConflict,
}: Props) {
  const iHoldLock = lock?.lockedByUserId === currentUserId
  const someoneLocks = lock != null

  return (
    <div style={{ display: 'grid', gap: 14 }}>

      {/* Connection status */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        padding: '10px 14px', borderRadius: 14,
        background: connected ? 'rgba(31,138,112,0.08)' : 'rgba(148,163,184,0.1)',
        border: `1px solid ${connected ? 'rgba(31,138,112,0.2)' : 'rgba(148,163,184,0.2)'}`,
        fontSize: '0.8rem',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: connected ? '#22c55e' : '#94a3b8',
          boxShadow: connected ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: connected ? '#116350' : 'var(--ink-soft)' }}>
            {statusLabel}
          </div>
          {roomStatusLabel && (
            <div style={{ color: roomConnected ? '#0369a1' : '#94a3b8', fontSize: '0.72rem', marginTop: 1 }}>
              {roomStatusLabel}
            </div>
          )}
        </div>
      </div>

      {/* Conflict notice */}
      {conflictMessage && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          padding: '10px 14px', borderRadius: 14,
          background: 'rgba(217,119,6,0.1)',
          border: '1px solid rgba(217,119,6,0.25)',
          fontSize: '0.8rem',
        }}>
          <span style={{ flexShrink: 0 }}>⚡</span>
          <div style={{ flex: 1, color: '#92400e', lineHeight: 1.4 }}>{conflictMessage}</div>
          <button
            onClick={onClearConflict}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '1rem', flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Lock control */}
      <div style={{ padding: '14px', borderRadius: 16, border: '1px solid var(--stroke-soft)', background: 'var(--bg-elevated)' }}>
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)', fontWeight: 700, marginBottom: 10 }}>
          Focus Lock
        </div>

        {lock ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: avatarColor(lock.lockedByUsername),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0,
              }}>
                {lock.lockedByUsername.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{lock.lockedByUsername}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
                  Locked {timeAgo(lock.lockedAt)}
                </div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '1rem' }}>🔒</span>
            </div>
            {iHoldLock && (
              <button
                onClick={onReleaseLock}
                style={{
                  padding: '7px 12px', borderRadius: 10, border: '1px solid rgba(200,60,40,0.3)',
                  background: 'rgba(200,60,40,0.08)', color: '#9a3412',
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                }}
              >
                Release lock
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
              No one holds the focus lock. Acquire it to signal you're actively editing.
            </div>
            <button
              onClick={onAcquireLock}
              style={{
                padding: '7px 12px', borderRadius: 10, border: '1px solid rgba(31,138,112,0.3)',
                background: 'rgba(31,138,112,0.08)', color: '#116350',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
              }}
            >
              🔓 Acquire lock
            </button>
          </div>
        )}
      </div>

      {/* Active collaborators */}
      <div style={{ padding: '14px', borderRadius: 16, border: '1px solid var(--stroke-soft)', background: 'var(--bg-elevated)' }}>
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)', fontWeight: 700, marginBottom: 10 }}>
          Collaborators ({users.length})
        </div>

        {users.length === 0 ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>Only you are here.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {users.map((u) => {
              const cursor = cursors[u.userId]
              const sel = selections[u.userId]
              const isMe = u.userId === currentUserId
              return (
                <div key={u.userId} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: avatarColor(u.username),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0,
                    outline: isMe ? '2px solid var(--accent)' : 'none',
                    outlineOffset: 2,
                  }}>
                    {u.username.slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {u.username}
                      {isMe && <span style={{ fontSize: '0.68rem', color: 'var(--ink-soft)' }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {cursor
                        ? `cursor (${Math.round(cursor.x)}, ${Math.round(cursor.y)})`
                        : sel?.activeElementId
                        ? `selecting ${sel.activeElementId.slice(0, 6)}…`
                        : `joined ${timeAgo(u.joinedAt)}`}
                    </div>
                  </div>
                  {u.userId === lock?.lockedByUserId && (
                    <span style={{ fontSize: '0.75rem' }}>🔒</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Activity feed */}
      {activity.length > 0 && (
        <div style={{ padding: '14px', borderRadius: 16, border: '1px solid var(--stroke-soft)', background: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)', fontWeight: 700, marginBottom: 10 }}>
            Activity
          </div>
          <div style={{ display: 'grid', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
            {activity.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'grid', gap: 2,
                  paddingLeft: 12,
                  borderLeft: `3px solid ${
                    entry.tone === 'accent' ? 'rgba(31,138,112,0.6)'
                    : entry.tone === 'warn' ? 'rgba(217,119,6,0.6)'
                    : 'rgba(30,20,10,0.15)'
                  }`,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--ink-strong)' }}>
                  {entry.title}
                </div>
                {entry.detail && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                    {entry.detail}
                  </div>
                )}
                <time style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  {timeAgo(entry.at)}
                </time>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}