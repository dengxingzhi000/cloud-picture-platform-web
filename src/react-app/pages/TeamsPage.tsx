import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  acceptInvite,
  createTeam,
  listMyInvites,
  listTeams,
  rejectInvite,
  type TeamInviteSummary,
  type TeamSummary,
} from '@/api/teams'
import { Button } from '@/react-app/ui/shadcn/button'
import { Input } from '@/react-app/ui/shadcn/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/react-app/ui/shadcn/dialog'

function RoleBadge({ role }: { role: 'OWNER' | 'ADMIN' | 'MEMBER' }) {
  const styles: Record<string, React.CSSProperties> = {
    OWNER: { background: 'rgba(239,107,47,0.15)', color: '#b84e1f' },
    ADMIN: { background: 'rgba(31,138,112,0.15)', color: '#116350' },
    MEMBER: { background: 'rgba(90,82,76,0.1)', color: '#5a524c' },
  }
  return (
    <span style={{ ...styles[role], padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
      {role}
    </span>
  )
}

export default function TeamsPage() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [invites, setInvites] = useState<TeamInviteSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<'teams' | 'invites'>('teams')

  const load = async () => {
    setLoading(true)
    try {
      const [t, i] = await Promise.all([listTeams(), listMyInvites()])
      setTeams(t)
      setInvites(i)
    } catch {
      // swallow
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const submitCreate = async () => {
    if (!createName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      await createTeam({ name: createName.trim(), description: createDesc.trim() || undefined })
      setCreateOpen(false)
      setCreateName('')
      setCreateDesc('')
      await load()
    } catch {
      setCreateError('Failed to create team. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleAccept = async (teamId: string) => {
    setActionLoading(teamId + '-accept')
    try {
      await acceptInvite(teamId)
      await load()
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (teamId: string) => {
    setActionLoading(teamId + '-reject')
    try {
      await rejectInvite(teamId)
      await load()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Teams</h1>
          <p className="page-subtitle">Manage your collaborative workspaces and pending invitations.</p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          + Create Team
        </Button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['teams', 'invites'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              background: tab === t ? 'var(--accent)' : 'rgba(32,26,22,0.07)',
              color: tab === t ? '#fff' : 'var(--ink-soft)',
              transition: 'all 0.18s ease',
            }}
          >
            {t === 'teams' ? `My Teams (${teams.length})` : `Invitations (${invites.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <section className="panel">
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading...</div>
        </section>
      ) : tab === 'teams' ? (
        teams.length === 0 ? (
          <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏢</div>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 20px' }}>
              You haven't joined any teams yet.
            </p>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              Create your first team
            </Button>
          </section>
        ) : (
          <div className="grid cols-3">
            {teams.map((team, i) => (
              <div
                key={team.id}
                className="card"
                style={{ cursor: 'pointer', '--delay': `${i * 60}ms` } as React.CSSProperties}
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                <div
                  style={{
                    height: 80,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, hsl(${(team.name.charCodeAt(0) * 37) % 360}, 60%, 70%), hsl(${(team.name.charCodeAt(0) * 73) % 360}, 70%, 55%))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 900,
                    color: 'rgba(255,255,255,0.9)',
                  }}
                >
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: '1rem' }}>{team.name}</strong>
                    <RoleBadge role={team.role} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, color: 'var(--ink-soft)', fontSize: '0.82rem' }}>
                    <span>👥 {team.memberCount} members</span>
                    <span>📅 {new Date(team.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Invitations tab */
        invites.length === 0 ? (
          <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📬</div>
            <p style={{ color: 'var(--ink-soft)', margin: 0 }}>No pending invitations.</p>
          </section>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {invites.map((inv) => (
              <section key={inv.teamId} className="panel" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <strong style={{ fontSize: '1.05rem' }}>{inv.teamName ?? 'Unknown Team'}</strong>
                      <RoleBadge role={inv.role} />
                    </div>
                    <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                      Invited by{' '}
                      <strong style={{ color: 'var(--ink-strong)' }}>
                        {inv.inviterDisplayName || inv.inviterUsername || 'someone'}
                      </strong>
                      {inv.invitedAt && ` · ${new Date(inv.invitedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Button
                      variant="plain"
                      disabled={actionLoading === inv.teamId + '-reject'}
                      onClick={() => void handleReject(inv.teamId)}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="primary"
                      disabled={actionLoading === inv.teamId + '-accept'}
                      onClick={() => void handleAccept(inv.teamId)}
                    >
                      {actionLoading === inv.teamId + '-accept' ? 'Accepting...' : 'Accept'}
                    </Button>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )
      )}

      {/* Create Team Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new team</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'grid', gap: 14, margin: '16px 0' }}>
            <label className="field">
              <span className="label">Team name *</span>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Design Team"
                onKeyDown={(e) => e.key === 'Enter' && void submitCreate()}
              />
            </label>
            <label className="field">
              <span className="label">Description</span>
              <Input
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="What does this team work on?"
              />
            </label>
            {createError && (
              <div className="form-error">{createError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="plain" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void submitCreate()} disabled={creating || !createName.trim()}>
              {creating ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
