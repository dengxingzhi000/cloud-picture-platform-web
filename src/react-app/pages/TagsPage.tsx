import { useEffect, useState } from 'react'
import { createTag, deleteTag, listTags, updateTag, type TagInfo } from '@/api/tags'
import PageShell from './common/PageShell'
import { Button } from '@/react-app/ui/shadcn/button'
import { Input } from '@/react-app/ui/shadcn/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/react-app/ui/shadcn/dialog'

export default function TagsPage() {
  const [items, setItems] = useState<TagInfo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size] = useState(20)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const [createName, setCreateName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')

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
    } catch (error) {
      console.error('Failed to load tags', error)
    } finally {
      setLoading(false)
    }
  }

  const search = () => {
    setPage(1)
  }

  useEffect(() => {
    load()
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (page === 1 && keyword) {
      load()
    }
  }, [keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitCreate = async () => {
    const name = createName.trim()
    if (!name) return
    setCreateLoading(true)
    try {
      await createTag({ name })
      setCreateName('')
      load()
    } catch (error) {
      console.error('Failed to create tag', error)
    } finally {
      setCreateLoading(false)
    }
  }

  const openEdit = (tag: TagInfo) => {
    setEditId(tag.id)
    setEditName(tag.name)
    setEditOpen(true)
  }

  const submitEdit = async () => {
    const name = editName.trim()
    if (!name) return
    setEditLoading(true)
    try {
      await updateTag(editId, { name })
      setEditOpen(false)
      load()
    } catch (error) {
      console.error('Failed to update tag', error)
    } finally {
      setEditLoading(false)
    }
  }

  const removeTag = async (tag: TagInfo) => {
    if (!confirm(`Delete tag "${tag.name}"? This will only remove the catalog entry.`)) {
      return
    }
    try {
      await deleteTag(tag.id)
      load()
    } catch (error) {
      console.error('Failed to delete tag', error)
    }
  }

  return (
    <PageShell title="Tags">
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="New tag name"
            onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
            style={{ maxWidth: 300 }}
          />
          <Button variant="primary" onClick={() => void submitCreate()} disabled={createLoading}>
            {createLoading ? 'Creating...' : 'Create'}
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search tags"
            onKeyDown={(e) => e.key === 'Enter' && search()}
            style={{ maxWidth: 300 }}
          />
          <Button variant="plain" onClick={() => void search()}>
            Search
          </Button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : items.length === 0 ? (
          <div>No tags found.</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Created</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tag) => (
                  <tr key={tag.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 12 }}>{tag.name}</td>
                    <td style={{ padding: 12, color: 'var(--ink-soft)' }}>
                      {new Date(tag.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: 12, fontFamily: 'monospace', fontSize: '0.85em' }}>{tag.id}</td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="plain" onClick={() => openEdit(tag)}>
                          Edit
                        </Button>
                        <Button variant="plain" onClick={() => void removeTag(tag)} style={{ color: '#dc2626' }}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button
                variant="plain"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span style={{ padding: '8px 12px' }}>
                Page {page} of {Math.ceil(total / size)}
              </span>
              <Button
                variant="plain"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / size)}
              >
                Next
              </Button>
            </div>
          </>
        )}

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit tag</DialogTitle>
            </DialogHeader>
            <div style={{ display: 'grid', gap: 12, margin: '16px 0' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: '0.9em', fontWeight: 500 }}>Tag name</span>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </label>
            </div>
            <DialogFooter>
              <Button variant="plain" onClick={() => setEditOpen(false)} disabled={editLoading}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void submitEdit()} disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

