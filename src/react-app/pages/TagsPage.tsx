import { useEffect, useState } from 'react'
import { createTag, deleteTag, listTags, updateTag, type TagInfo } from '@/api/tags'
import { Button } from '@/react-app/ui/shadcn/button'
import { Input } from '@/react-app/ui/shadcn/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/react-app/ui/shadcn/dialog'
import { useAuth } from '@/react-app/auth'

export default function TagsPage() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState<TagInfo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size] = useState(20)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const [createName, setCreateName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listTags({
        page: page - 1,
        size,
        keyword: keyword.trim() || undefined,
      })
      setItems(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced keyword search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); void load() }, 300)
    return () => clearTimeout(t)
  }, [keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitCreate = async () => {
    const name = createName.trim()
    if (!name) return
    setCreateLoading(true)
    setCreateError(null)
    try {
      await createTag({ name })
      setCreateName('')
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCreateError(msg || 'Failed to create tag.')
    } finally {
      setCreateLoading(false)
    }
  }

  const openEdit = (tag: TagInfo) => {
    setEditId(tag.id)
    setEditName(tag.name)
    setEditError(null)
    setEditOpen(true)
  }

  const submitEdit = async () => {
    const name = editName.trim()
    if (!name) return
    setEditLoading(true)
    setEditError(null)
    try {
      await updateTag(editId, { name })
      setEditOpen(false)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setEditError(msg || 'Failed to update tag.')
    } finally {
      setEditLoading(false)
    }
  }

  const confirmDelete = async (tagId: string) => {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await deleteTag(tagId)
      setDeleteConfirmId(null)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setDeleteError(msg || 'Cannot delete tag — it may still be in use.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalPages = Math.ceil(total / size)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tag Catalog</h1>
          <p className="page-subtitle">Manage the global tag library used to classify pictures.</p>
        </div>
      </div>

      {/* Stats + Create */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'start' }}>
        <div className="panel" style={{ padding: '14px 20px', textAlign: 'center', minWidth: 100 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Total Tags</div>
          <div style={{ fontWeight: 900, fontSize: '2rem', marginTop: 2, color: 'var(--accent)' }}>{total}</div>
        </div>

        {isAdmin && (
          <section className="panel">
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)', fontWeight: 700 }}>
              Create New Tag
            </h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Tag name (max 80 chars)"
                maxLength={80}
                onKeyDown={(e) => e.key === 'Enter' && void submitCreate()}
                style={{ flex: 1 }}
              />
              <Button variant="primary" onClick={() => void submitCreate()} disabled={createLoading || !createName.trim()}>
                {createLoading ? 'Creating…' : '+ Create'}
              </Button>
            </div>
            {createError && <div className="form-error" style={{ marginTop: 8 }}>{createError}</div>}
          </section>
        )}
      </div>

      {/* Search + table */}
      <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Search bar */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--stroke-soft)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="🔍 Search tags…"
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 10,
              border: '1px solid var(--stroke-soft)', fontSize: '0.88rem',
              background: 'var(--bg-elevated)', outline: 'none',
            }}
          />
          {keyword && (
            <button
              onClick={() => setKeyword('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: '0.85rem' }}
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏷️</div>
            <p style={{ color: 'var(--ink-soft)', margin: 0 }}>
              {keyword ? 'No tags match your search.' : 'No tags yet. Create one above!'}
            </p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--stroke-soft)', background: 'var(--bg-elevated)' }}>
                  {['Name', 'Created', 'ID', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)', fontWeight: 700 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((tag, i) => (
                  <tr
                    key={tag.id}
                    style={{
                      borderBottom: '1px solid var(--stroke-soft)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(32,26,22,0.015)',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '4px 12px', borderRadius: 999,
                        background: 'rgba(31,138,112,0.1)', color: '#116350',
                        fontSize: '0.88rem', fontWeight: 600,
                      }}>
                        🏷️ {tag.name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                      {new Date(tag.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                      {tag.id.slice(0, 18)}…
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button
                            variant="plain"
                            onClick={() => openEdit(tag)}
                            style={{ fontSize: '0.82rem', padding: '4px 12px' }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="plain"
                            onClick={() => { setDeleteConfirmId(tag.id); setDeleteError(null) }}
                            style={{ color: '#dc2626', fontSize: '0.82rem', padding: '4px 12px' }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--stroke-soft)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
                {(page - 1) * size + 1}–{Math.min(page * size, total)} of {total} tags
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="plain" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  ← Prev
                </Button>
                <span style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  {page} / {totalPages || 1}
                </span>
                <Button variant="plain" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next →
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit tag</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'grid', gap: 12, margin: '16px 0' }}>
            <label className="field">
              <span className="label">Tag name</span>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={80}
                onKeyDown={(e) => e.key === 'Enter' && void submitEdit()}
              />
            </label>
            {editError && <div className="form-error">{editError}</div>}
          </div>
          <DialogFooter>
            <Button variant="plain" onClick={() => setEditOpen(false)} disabled={editLoading}>Cancel</Button>
            <Button variant="primary" onClick={() => void submitEdit()} disabled={editLoading || !editName.trim()}>
              {editLoading ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tag?</DialogTitle>
          </DialogHeader>
          <p style={{ margin: '16px 0', color: 'var(--ink-soft)' }}>
            This will permanently remove the tag from the catalog. Tags that are still assigned to pictures cannot be deleted.
          </p>
          {deleteError && <div className="form-error" style={{ marginBottom: 12 }}>{deleteError}</div>}
          <DialogFooter>
            <Button variant="plain" onClick={() => setDeleteConfirmId(null)} disabled={deleteLoading}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmId && void confirmDelete(deleteConfirmId)}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
