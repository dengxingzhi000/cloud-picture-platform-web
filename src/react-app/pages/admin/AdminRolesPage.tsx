import { useEffect, useState, useCallback, useMemo } from 'react'
import { Users, Plus, Pencil, Trash2, KeyRound, ChevronDown, ChevronRight, Check } from 'lucide-react'
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
  type RoleItem,
} from '@/api/roles'
import { listPermissions, type PermissionItem } from '@/api/permissions'
import { Button } from '@/react-app/ui/shadcn/button'
import { Badge } from '@/react-app/ui/shadcn/badge'
import { Input } from '@/react-app/ui/shadcn/input'
import { Textarea } from '@/react-app/ui/shadcn/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/react-app/ui/shadcn/dialog'
import { ConfirmDialog } from '@/react-app/ui/shadcn/confirm-dialog'
import { useToast } from '@/react-app/toast'

type FormData = {
  name: string
  description: string
}

const EMPTY_FORM: FormData = { name: '', description: '' }

export default function AdminRolesPage() {
  const { addToast } = useToast()

  // ─── Data ──────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<RoleItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [loading, setLoading] = useState(true)

  // ─── Dialogs ───────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RoleItem | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ─── Permission assignment ─────────────────────────────────────────────────
  const [permTarget, setPermTarget] = useState<RoleItem | null>(null)
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([])
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set())
  const [permLoading, setPermLoading] = useState(false)
  const [permSaving, setPermSaving] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // ─── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listRoles(page, size)
      setItems(res.items)
      setTotal(res.total)
    } catch {
      addToast('Failed to load roles', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, size, addToast])

  useEffect(() => {
    void load()
  }, [load])

  // ─── Form helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (item: RoleItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      description: item.description ?? '',
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('Name is required', 'warn')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateRole(editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        })
        addToast('Role updated', 'success')
      } else {
        await createRole({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        })
        addToast('Role created', 'success')
      }
      setFormOpen(false)
      await load()
    } catch {
      addToast(editing ? 'Failed to update role' : 'Failed to create role', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteRole(deleteTarget.id)
      addToast('Role deleted', 'success')
      setDeleteTarget(null)
      await load()
    } catch {
      addToast('Failed to delete role', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Permission assignment ─────────────────────────────────────────────────
  const openPermDialog = async (role: RoleItem) => {
    setPermTarget(role)
    setPermLoading(true)
    try {
      const [permPage, rolePermIds] = await Promise.all([
        listPermissions(0, 100),
        getRolePermissions(role.id),
      ])
      setAllPermissions(permPage.items)
      setSelectedPermIds(new Set(rolePermIds))
      // Expand all groups by default
      const resources = new Set(permPage.items.map((p) => p.resource))
      setExpandedGroups(resources)
    } catch {
      addToast('Failed to load permissions', 'error')
      setPermTarget(null)
    } finally {
      setPermLoading(false)
    }
  }

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionItem[]> = {}
    for (const p of allPermissions) {
      ;(groups[p.resource] ??= []).push(p)
    }
    return groups
  }, [allPermissions])

  const togglePerm = (id: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleGroup = (resource: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(resource)) next.delete(resource)
      else next.add(resource)
      return next
    })
  }

  const toggleAllInGroup = (resource: string) => {
    const groupIds = (groupedPermissions[resource] ?? []).map((p) => p.id)
    const allSelected = groupIds.every((id) => selectedPermIds.has(id))
    setSelectedPermIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id))
      } else {
        groupIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleSavePerms = async () => {
    if (!permTarget) return
    setPermSaving(true)
    try {
      await updateRolePermissions(permTarget.id, Array.from(selectedPermIds))
      addToast('Permissions updated', 'success')
      setPermTarget(null)
      await load()
    } catch {
      addToast('Failed to update permissions', 'error')
    } finally {
      setPermSaving(false)
    }
  }

  const totalPages = Math.ceil(total / size)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} /> Roles
          </h1>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
            Manage roles and assign permissions for RBAC.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Create
        </Button>
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
            gridTemplateColumns: '1.5fr 2fr 100px 130px 150px',
            padding: '12px 20px',
            borderBottom: '1px solid var(--stroke-soft)',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--ink-soft)',
            fontWeight: 700,
          }}
        >
          <span>Name</span>
          <span>Description</span>
          <span>System</span>
          <span>Permissions</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Users size={32} style={{ color: 'var(--ink-soft)', opacity: 0.4, marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No roles found</div>
            <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginTop: 4 }}>
              Create your first role to get started.
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 2fr 100px 130px 150px',
                padding: '14px 20px',
                borderBottom: '1px solid var(--stroke-soft)',
                alignItems: 'center',
                fontSize: '0.88rem',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontWeight: 600, color: 'var(--ink-strong)' }}>{item.name}</div>
              <div style={{ color: item.description ? 'var(--ink-soft)' : 'var(--ink-soft)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.description ?? '—'}
              </div>
              <div>
                {item.isSystem ? (
                  <Badge variant="warning">System</Badge>
                ) : (
                  <Badge variant="default">Custom</Badge>
                )}
              </div>
              <div>
                <Badge variant="default">{item.permissions.length}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openPermDialog(item)}
                  title="Manage permissions"
                  style={{ width: 34, height: 34 }}
                >
                  <KeyRound size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(item)}
                  title="Edit"
                  style={{ width: 34, height: 34 }}
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(item)}
                  disabled={item.isSystem}
                  title={item.isSystem ? 'System roles cannot be deleted' : 'Delete'}
                  style={{ width: 34, height: 34, color: item.isSystem ? undefined : '#c84c2b' }}
                >
                  <Trash2 size={15} />
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

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) setFormOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Role' : 'Create Role'}</DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, color: 'var(--ink-strong)' }}>
                Name <span style={{ color: '#c84c2b' }}>*</span>
              </label>
              <Input
                maxLength={100}
                placeholder="e.g. editor"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, color: 'var(--ink-strong)' }}>
                Description
              </label>
              <Textarea
                maxLength={200}
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={{ minHeight: 72 }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="plain" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Role"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Users with this role will lose its permissions.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Permission Assignment Dialog */}
      <Dialog open={!!permTarget} onOpenChange={(v) => { if (!v) setPermTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissions — {permTarget?.name}</DialogTitle>
          </DialogHeader>

          {permLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading permissions…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 420, overflowY: 'auto', padding: '2px 0' }}>
              {Object.entries(groupedPermissions).map(([resource, perms]) => {
                const expanded = expandedGroups.has(resource)
                const groupIds = perms.map((p) => p.id)
                const selectedCount = groupIds.filter((id) => selectedPermIds.has(id)).length
                const allSelected = groupIds.length > 0 && groupIds.every((id) => selectedPermIds.has(id))

                return (
                  <div key={resource} style={{ border: '1px solid var(--stroke-soft)', borderRadius: 10, overflow: 'hidden' }}>
                    {/* Group header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        cursor: 'pointer',
                        background: 'var(--bg-elevated)',
                        userSelect: 'none',
                      }}
                      onClick={() => toggleGroup(resource)}
                    >
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'capitalize', flex: 1 }}>
                        {resource}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                        {selectedCount}/{groupIds.length}
                      </span>
                      <button
                        type="button"
                        title={allSelected ? 'Deselect all' : 'Select all'}
                        onClick={(e) => { e.stopPropagation(); toggleAllInGroup(resource) }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 22,
                          height: 22,
                          borderRadius: 5,
                          border: '1.5px solid var(--stroke-soft)',
                          background: allSelected ? 'var(--accent, #1f8a70)' : 'transparent',
                          color: allSelected ? '#fff' : 'var(--ink-soft)',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {allSelected && <Check size={13} />}
                      </button>
                    </div>

                    {/* Permission checkboxes */}
                    {expanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {perms.map((perm) => {
                          const checked = selectedPermIds.has(perm.id)
                          return (
                            <label
                              key={perm.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '8px 14px 8px 38px',
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
                                onChange={() => togglePerm(perm.id)}
                                style={{
                                  width: 16,
                                  height: 16,
                                  accentColor: 'var(--accent, #1f8a70)',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                }}
                              />
                              <span style={{ fontWeight: 500, flex: 1 }}>{perm.name}</span>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                                {perm.action}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="plain" onClick={() => setPermTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSavePerms} disabled={permSaving || permLoading}>
              {permSaving ? 'Saving…' : 'Save Permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
