import { useEffect, useState, useCallback } from 'react'
import { Users, Search, Shield, Filter } from 'lucide-react'
import { listUsers, type AdminUserSummary } from '@/api/users'
import { listRoles, type RoleItem } from '@/api/roles'
import { getUserRoles, updateUserRoles } from '@/api/userRoles'
import { Button } from '@/react-app/ui/shadcn/button'
import { Badge } from '@/react-app/ui/shadcn/badge'
import { Input } from '@/react-app/ui/shadcn/input'
import { Select } from '@/react-app/ui/shadcn/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/react-app/ui/shadcn/dialog'
import { useToast } from '@/react-app/toast'

const STATUS_OPTIONS = ['', 'ACTIVE', 'DISABLED'] as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminUsersPage() {
  const { addToast } = useToast()

  const [items, setItems] = useState<AdminUserSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const [roleTarget, setRoleTarget] = useState<AdminUserSummary | null>(null)
  const [allRoles, setAllRoles] = useState<RoleItem[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set())
  const [roleLoading, setRoleLoading] = useState(false)
  const [roleSaving, setRoleSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listUsers(keyword || undefined, statusFilter || undefined, page, size)
      setItems(res.items)
      setTotal(res.total)
    } catch {
      addToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, size, keyword, statusFilter, addToast])

  useEffect(() => {
    void load()
  }, [load])

  const openRoleDialog = async (user: AdminUserSummary) => {
    setRoleTarget(user)
    setRoleLoading(true)
    try {
      const [rolePage, userRoles] = await Promise.all([
        listRoles(0, 100),
        getUserRoles(user.id),
      ])
      setAllRoles(rolePage.items)
      setSelectedRoleIds(new Set(userRoles.map((r) => r.roleId)))
    } catch {
      addToast('Failed to load roles', 'error')
      setRoleTarget(null)
    } finally {
      setRoleLoading(false)
    }
  }

  const toggleRole = (id: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSaveRoles = async () => {
    if (!roleTarget) return
    setRoleSaving(true)
    try {
      await updateUserRoles(roleTarget.id, Array.from(selectedRoleIds))
      addToast('Roles updated', 'success')
      setRoleTarget(null)
      await load()
    } catch {
      addToast('Failed to update roles', 'error')
    } finally {
      setRoleSaving(false)
    }
  }

  const totalPages = Math.ceil(total / size)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={24} /> Users
        </h1>
        <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
          Manage users and assign roles.
        </p>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          borderRadius: 14,
          background: 'var(--bg-surface)',
          border: '1px solid var(--stroke-soft)',
        }}
      >
        <Filter size={16} style={{ color: 'var(--ink-soft)', flexShrink: 0 }} />
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)' }} />
          <Input
            placeholder="Search username or email…"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(0) }}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
          style={{ maxWidth: 160 }}
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </Select>
        <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginLeft: 'auto' }}>
          {total} user{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--stroke-soft)',
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '44px 1.2fr 1.5fr 1fr 80px 1.5fr 100px 110px',
            padding: '12px 20px',
            borderBottom: '1px solid var(--stroke-soft)',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--ink-soft)',
            fontWeight: 700,
          }}
        >
          <span />
          <span>Username</span>
          <span>Email</span>
          <span>Display Name</span>
          <span>Status</span>
          <span>Roles</span>
          <span>Joined</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Users size={32} style={{ color: 'var(--ink-soft)', opacity: 0.4, marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No users found</div>
            <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginTop: 4 }}>
              {keyword || statusFilter ? 'Try a different filter.' : 'No users registered yet.'}
            </div>
          </div>
        ) : (
          items.map((user) => (
            <div
              key={user.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1.2fr 1.5fr 1fr 80px 1.5fr 100px 110px',
                padding: '12px 20px',
                borderBottom: '1px solid var(--stroke-soft)',
                alignItems: 'center',
                fontSize: '0.88rem',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Avatar */}
              <div>
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName || user.username}
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(239,107,47,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ef6b2f',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                    }}
                  >
                    {(user.displayName || user.username || 'U').slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Username */}
              <div style={{ fontWeight: 600, color: 'var(--ink-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username}
              </div>

              {/* Email */}
              <div style={{ color: 'var(--ink-soft)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>

              {/* Display Name */}
              <div style={{ color: user.displayName ? 'var(--ink-strong)' : 'var(--ink-soft)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName ?? '—'}
              </div>

              {/* Status */}
              <div>
                <Badge variant={user.status === 'ACTIVE' ? 'success' : 'warning'}>
                  {user.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                </Badge>
              </div>

              {/* Roles */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {user.roles.length === 0 ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>—</span>
                ) : (
                  user.roles.map((role) => (
                    <Badge key={role} variant="default">{role}</Badge>
                  ))
                )}
              </div>

              {/* Joined */}
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                {formatDate(user.createdAt)}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void openRoleDialog(user)}
                  title="Manage roles"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}
                >
                  <Shield size={13} /> Roles
                </Button>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              padding: '14px 20px',
            }}
          >
            <Button
              variant="plain"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', minWidth: 80, textAlign: 'center' }}>
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="plain"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Role Assignment Dialog */}
      <Dialog open={!!roleTarget} onOpenChange={(v) => { if (!v) setRoleTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roles — {roleTarget?.username}</DialogTitle>
          </DialogHeader>

          {roleLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading roles…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 420, overflowY: 'auto', padding: '2px 0' }}>
              {allRoles.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                  No roles available. Create roles first.
                </div>
              ) : (
                allRoles.map((role) => {
                  const checked = selectedRoleIds.has(role.id)
                  return (
                    <label
                      key={role.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: '0.84rem',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(role.id)}
                        style={{
                          width: 16,
                          height: 16,
                          accentColor: 'var(--accent, #1f8a70)',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600, flex: 1 }}>{role.name}</span>
                      {role.description && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {role.description}
                        </span>
                      )}
                      {role.isSystem && <Badge variant="warning">System</Badge>}
                    </label>
                  )
                })
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="plain" onClick={() => setRoleTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveRoles} disabled={roleSaving || roleLoading}>
              {roleSaving ? 'Saving…' : 'Save Roles'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
