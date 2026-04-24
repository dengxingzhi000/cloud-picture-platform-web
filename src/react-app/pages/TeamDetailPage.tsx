import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  cancelInvite,
  getTeamDetail,
  inviteMember,
  listMemberEvents,
  listTeamInvites,
  listTeamMembers,
  removeMember,
  updateMemberRole,
  updateTeam,
  type TeamDetail,
  type TeamMember,
  type TeamMemberEvent,
} from '@/api/teams'
import { useAuth } from '@/react-app/auth'
import { Button } from '@/react-app/ui/shadcn/button'
import { Input } from '@/react-app/ui/shadcn/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/react-app/ui/shadcn/dialog'

function RoleBadge({ role }: { role: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    OWNER: { bg: 'rgba(239,107,47,0.15)', color: '#b84e1f' },
    ADMIN: { bg: 'rgba(31,138,112,0.15)', color: '#116350' },
    MEMBER: { bg: 'rgba(90,82,76,0.1)', color: '#5a524c' },
  }
  const s = cfg[role] ?? cfg.MEMBER
  return (
    <span style={{ ...s, padding: '3px 10px', borderRadius: 999, fontSize: '0.73rem', fontWeight: 700 }}>
      {role}
    </span>
  )
}

function EventTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    JOINED: '#116350',
    INVITED: '#0369a1',
    INVITE_REJECTED: '#9a3412',
    INVITE_CANCELED: '#7c3aed',
    LEFT: '#57534e',
    MEMBER_REMOVED: '#9a3412',
    TEAM_UPDATED: '#0369a1',
  }
  return (
    <span style={{ color: colorMap[type] ?? '#57534e', fontWeight: 700, fontSize: '0.78rem' }}>
      {type.replace(/_/g, ' ')}
    </span>
  )
}

type Tab = 'members' | 'invites' | 'events' | 'settings'

export default function TeamDetailPage() {
  const { id: teamId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [detail, setDetail] = useState<TeamDetail | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<TeamMember[]>([])
  const [events, setEvents] = useState<TeamMemberEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('members')

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Edit team dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const myMember = members.find((m) => m.userId === user?.userId)
  const isOwner = myMember?.role === 'OWNER'
  const isAdmin = myMember?.role === 'OWNER' || myMember?.role === 'ADMIN'

  const loadAll = async () => {
    setLoading(true)
    try {
      const [d, m] = await Promise.all([getTeamDetail(teamId), listTeamMembers(teamId)])
      setDetail(d)
      setMembers(m)
      if (m.some((mem) => mem.userId === user?.userId && (mem.role === 'OWNER' || mem.role === 'ADMIN'))) {
        const [inv, ev] = await Promise.all([
          listTeamInvites(teamId),
          listMemberEvents(teamId, { page: 0, size: 30, sortBy: 'createdAt', sortDir: 'desc' }),
        ])
        setPendingInvites(inv)
        setEvents(ev.items)
      }
    } catch {
      navigate('/teams')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadAll() }, [teamId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return
    setInviting(true)
    setInviteError(null)
    try {
      await inviteMember(teamId, { username: inviteUsername.trim(), role: inviteRole })
      setInviteOpen(false)
      setInviteUsername('')
      await loadAll()
    } catch {
      setInviteError('User not found or already in team.')
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this member?')) return
    setActionLoading('remove-' + userId)
    try {
      await removeMember(teamId, userId)
      await loadAll()
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelInvite = async (userId: string) => {
    setActionLoading('cancel-' + userId)
    try {
      await cancelInvite(teamId, userId)
      await loadAll()
    } finally {
      setActionLoading(null)
    }
  }

  const handleRoleChange = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
    setActionLoading('role-' + userId)
    try {
      await updateMemberRole(teamId, userId, role)
      await loadAll()
    } finally {
      setActionLoading(null)
    }
  }

  const handleEditTeam = async () => {
    if (!editName.trim()) return
    setEditSaving(true)
    try {
      await updateTeam(teamId, { name: editName.trim(), description: editDesc.trim() || null })
      setEditOpen(false)
      await loadAll()
    } finally {
      setEditSaving(false)
    }
  }

  const openEdit = () => {
    setEditName(detail?.name ?? '')
    setEditDesc(detail?.description ?? '')
    setEditOpen(true)
  }

  if (loading) {
    return (
      <div className="page">
        <section className="panel" style={{ padding: 48, textAlign: 'center', color: 'var(--ink-soft)' }}>
          Loading team...
        </section>
      </div>
    )
  }

  if (!detail) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'members', label: `Members (${members.length})` },
    ...(isAdmin ? [{ key: 'invites' as Tab, label: `Pending (${pendingInvites.length})` }] : []),
    ...(isAdmin ? [{ key: 'events' as Tab, label: 'Activity' }] : []),
    ...(isOwner ? [{ key: 'settings' as Tab, label: 'Settings' }] : []),
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate('/teams')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 8, padding: 0 }}
          >
            ← Back to Teams
          </button>
          <h1 className="page-title">{detail.name}</h1>
          {detail.description && (
            <p className="page-subtitle">{detail.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <Button variant="primary" onClick={() => setInviteOpen(true)}>
              + Invite Member
            </Button>
          )}
          {isOwner && (
            <Button variant="plain" onClick={openEdit}>
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Members', value: members.length },
          { label: 'Your role', value: myMember?.role ?? '—' },
          { label: 'Created', value: new Date(detail.createdAt).toLocaleDateString() },
        ].map((stat) => (
          <div key={stat.label} className="panel" style={{ padding: '12px 18px', flex: '1 1 130px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              {stat.label}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 4 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
              background: tab === t.key ? 'var(--accent)' : 'rgba(32,26,22,0.07)',
              color: tab === t.key ? '#fff' : 'var(--ink-soft)',
              transition: 'all 0.18s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {tab === 'members' && (
        <section className="panel">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--stroke-soft)' }}>
                {['Member', 'Role', 'Joined', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-soft)', fontWeight: 700 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId} style={{ borderBottom: '1px solid var(--stroke-soft)' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: `hsl(${(m.username?.charCodeAt(0) ?? 65) * 47 % 360}, 55%, 65%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
                      }}>
                        {(m.displayName || m.username || '?').slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{m.displayName || m.username}</div>
                        {m.displayName && <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>@{m.username}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <RoleBadge role={m.role} />
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                    {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '—'}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {isOwner && m.userId !== user?.userId && m.role !== 'OWNER' && (
                          <select
                            value={m.role}
                            onChange={(e) => void handleRoleChange(m.userId, e.target.value as 'ADMIN' | 'MEMBER')}
                            disabled={actionLoading === 'role-' + m.userId}
                            style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--stroke-soft)', fontSize: '0.82rem', cursor: 'pointer' }}
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        )}
                        {m.userId !== user?.userId && m.role !== 'OWNER' && (
                          <Button
                            variant="plain"
                            onClick={() => void handleRemove(m.userId)}
                            disabled={actionLoading === 'remove-' + m.userId}
                            style={{ color: '#dc2626', fontSize: '0.82rem', padding: '4px 12px' }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Pending Invites Tab */}
      {tab === 'invites' && (
        <section className="panel">
          {pendingInvites.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-soft)' }}>No pending invitations.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--stroke-soft)' }}>
                  {['Invitee', 'Role', 'Invited At', 'Invited By', 'Actions'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-soft)', fontWeight: 700 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((inv) => (
                  <tr key={inv.userId} style={{ borderBottom: '1px solid var(--stroke-soft)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{inv.displayName || inv.username}</td>
                    <td style={{ padding: '12px 14px' }}><RoleBadge role={inv.role} /></td>
                    <td style={{ padding: '12px 14px', color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                      {inv.invitedAt ? new Date(inv.invitedAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                      {inv.inviterDisplayName || inv.inviterUsername || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Button
                        variant="plain"
                        onClick={() => void handleCancelInvite(inv.userId)}
                        disabled={actionLoading === 'cancel-' + inv.userId}
                        style={{ color: '#dc2626', fontSize: '0.82rem' }}
                      >
                        Cancel
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Events Tab */}
      {tab === 'events' && (
        <section className="panel">
          {events.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-soft)' }}>No activity yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 0 }}>
              {events.map((ev, i) => (
                <div key={ev.id} style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  padding: '14px 0',
                  borderBottom: i < events.length - 1 ? '1px solid var(--stroke-soft)' : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(31,138,112,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 800, color: '#116350', flexShrink: 0,
                  }}>
                    {(ev.username || ev.actorUsername || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600 }}>{ev.displayName || ev.username || '—'}</span>
                      <EventTypeBadge type={ev.type} />
                    </div>
                    {ev.actorUsername && ev.actorUsername !== ev.username && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
                        by {ev.actorDisplayName || ev.actorUsername}
                      </div>
                    )}
                    {ev.detail && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: 2, fontFamily: 'monospace' }}>
                        {ev.detail}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(ev.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <section className="panel">
          <div style={{ display: 'grid', gap: 16, maxWidth: 480 }}>
            <div>
              <h3 style={{ margin: '0 0 6px' }}>Team name</h3>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-soft)' }}>{detail.name}</p>
              <Button variant="plain" onClick={openEdit}>Edit team name & description</Button>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--stroke-soft)' }} />
            <div>
              <h3 style={{ margin: '0 0 6px', color: '#dc2626' }}>Danger zone</h3>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                These actions cannot be undone.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'grid', gap: 14, margin: '16px 0' }}>
            <label className="field">
              <span className="label">Username or email *</span>
              <Input
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="Enter username or email"
                onKeyDown={(e) => e.key === 'Enter' && void handleInvite()}
              />
            </label>
            <label className="field">
              <span className="label">Role</span>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'MEMBER' | 'ADMIN')}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--stroke-soft)', fontSize: '0.95rem' }}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            {inviteError && <div className="form-error">{inviteError}</div>}
          </div>
          <DialogFooter>
            <Button variant="plain" onClick={() => { setInviteOpen(false); setInviteError(null) }} disabled={inviting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleInvite()} disabled={inviting || !inviteUsername.trim()}>
              {inviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit team</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'grid', gap: 14, margin: '16px 0' }}>
            <label className="field">
              <span className="label">Team name *</span>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Description</span>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Optional description" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="plain" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
            <Button variant="primary" onClick={() => void handleEditTeam()} disabled={editSaving || !editName.trim()}>
              {editSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
