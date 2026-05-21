import { useEffect, useState, useCallback } from 'react'
import { Shield, Plus, Pencil, Trash2, Filter } from 'lucide-react'
import {
  listPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  type PermissionItem,
  type PermissionCreateRequest,
} from '@/api/permissions'
import { Button } from '@/react-app/ui/shadcn/button'
import { Badge } from '@/react-app/ui/shadcn/badge'
import { Input } from '@/react-app/ui/shadcn/input'
import { Textarea } from '@/react-app/ui/shadcn/textarea'
import { Select } from '@/react-app/ui/shadcn/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/react-app/ui/shadcn/dialog'
import { ConfirmDialog } from '@/react-app/ui/shadcn/confirm-dialog'
import { useToast } from '@/react-app/toast'

const RESOURCE_OPTIONS = ['', 'picture', 'tag', 'team', 'admin'] as const
const ACTION_OPTIONS = ['', 'create', 'read', 'update', 'delete'] as const

type FormData = {
  name: string
  description: string
  resource: string
  action: string
}

const EMPTY_FORM: FormData = { name: '', description: '', resource: '', action: '' }

export default function AdminPermissionsPage() {
  const { addToast } = useToast()

  // ─── Data ──────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<PermissionItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [resourceFilter, setResourceFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // ─── Dialogs ───────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PermissionItem | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<PermissionItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ─── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listPermissions(page, size, resourceFilter || undefined)
      setItems(res.items)
      setTotal(res.total)
    } catch {
      addToast('Failed to load permissions', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, size, resourceFilter, addToast])

  useEffect(() => {
    void load()
  }, [load])

  // ─── Form helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (item: PermissionItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      description: item.description ?? '',
      resource: item.resource,
      action: item.action,
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.resource.trim() || !form.action.trim()) {
      addToast('Name, Resource and Action are required', 'warn')
      return
    }
    setSaving(true)
    try {
      const payload: PermissionCreateRequest = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        resource: form.resource.trim(),
        action: form.action.trim(),
      }
      if (editing) {
        await updatePermission(editing.id, payload)
        addToast('Permission updated', 'success')
      } else {
        await createPermission(payload)
        addToast('Permission created', 'success')
      }
      setFormOpen(false)
      await load()
    } catch {
      addToast(editing ? 'Failed to update permission' : 'Failed to create permission', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePermission(deleteTarget.id)
      addToast('Permission deleted', 'success')
      setDeleteTarget(null)
      await load()
    } catch {
      addToast('Failed to delete permission', 'error')
    } finally {
      setDeleting(false)
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
            <Shield size={24} /> Permissions
          </h1>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
            Manage system permissions for RBAC.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Create
        </Button>
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
        <Select
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setPage(0) }}
          style={{ maxWidth: 200 }}
        >
          <option value="">All Resources</option>
          {RESOURCE_OPTIONS.filter(Boolean).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>
        <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginLeft: 'auto' }}>
          {total} permission{total !== 1 ? 's' : ''}
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
            gridTemplateColumns: '1.5fr 1fr 1fr 100px 120px',
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
          <span>Resource</span>
          <span>Action</span>
          <span>System</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Shield size={32} style={{ color: 'var(--ink-soft)', opacity: 0.4, marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No permissions found</div>
            <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginTop: 4 }}>
              {resourceFilter ? 'Try a different filter.' : 'Create your first permission.'}
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr 1fr 100px 120px',
                padding: '14px 20px',
                borderBottom: '1px solid var(--stroke-soft)',
                alignItems: 'center',
                fontSize: '0.88rem',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--ink-strong)' }}>{item.name}</div>
                {item.description && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.description}
                  </div>
                )}
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{item.resource}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{item.action}</span>
              <div>
                {item.isSystem ? (
                  <Badge variant="warning">System</Badge>
                ) : (
                  <Badge variant="default">Custom</Badge>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
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
                  title={item.isSystem ? 'System permissions cannot be deleted' : 'Delete'}
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
            <DialogTitle>{editing ? 'Edit Permission' : 'Create Permission'}</DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, color: 'var(--ink-strong)' }}>
                Name <span style={{ color: '#c84c2b' }}>*</span>
              </label>
              <Input
                maxLength={100}
                placeholder="e.g. picture:create"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Description */}
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

            {/* Resource + Action row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, color: 'var(--ink-strong)' }}>
                  Resource <span style={{ color: '#c84c2b' }}>*</span>
                </label>
                <Input
                  maxLength={50}
                  placeholder="picture, tag, team…"
                  list="resource-suggestions"
                  value={form.resource}
                  onChange={(e) => setForm((f) => ({ ...f, resource: e.target.value }))}
                />
                <datalist id="resource-suggestions">
                  {RESOURCE_OPTIONS.filter(Boolean).map((r) => <option key={r} value={r} />)}
                </datalist>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, color: 'var(--ink-strong)' }}>
                  Action <span style={{ color: '#c84c2b' }}>*</span>
                </label>
                <Input
                  maxLength={50}
                  placeholder="create, read, update…"
                  list="action-suggestions"
                  value={form.action}
                  onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                />
                <datalist id="action-suggestions">
                  {ACTION_OPTIONS.filter(Boolean).map((a) => <option key={a} value={a} />)}
                </datalist>
              </div>
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
        title="Delete Permission"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
