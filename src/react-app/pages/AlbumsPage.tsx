import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  listAlbums,
  createAlbum,
  deleteAlbum,
  type Album,
} from '@/api/albums'
import { useToast } from '@/react-app/toast'
import { Button } from '@/react-app/ui/shadcn/button'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/react-app/ui/shadcn/dialog'
import { Input } from '@/react-app/ui/shadcn/input'
import { Textarea } from '@/react-app/ui/shadcn/textarea'

export default function AlbumsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [albums, setAlbums] = useState<Album[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const SIZE = 12

  const loadAlbums = async (pageIndex: number) => {
    setLoading(true)
    try {
      const res = await listAlbums({ spaceId: '', page: pageIndex, size: SIZE })
      setAlbums(res.items)
      setPage(pageIndex)
    } catch { addToast(t('common.error'), 'error') } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadAlbums(0) }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createAlbum({ name: newName.trim(), description: newDesc.trim() || undefined, spaceId: '' })
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      void loadAlbums(0)
    } catch { addToast(t('common.error'), 'error') } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('albums.confirmDelete'))) return
    try {
      await deleteAlbum(id)
      void loadAlbums(page)
    } catch { addToast(t('common.error'), 'error') }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{t('albums.title')}</h1>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          {t('albums.create')}
        </Button>
      </div>

      {loading ? (
        <div className="grid cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 200, borderRadius: 14, background: 'linear-gradient(90deg, #efe7dd 25%, #f5f0ea 50%, #efe7dd 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
          <p>{t('albums.empty')}</p>
        </section>
      ) : (
        <div className="grid cols-3">
          {albums.map((album) => (
            <div key={album.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/albums/${album.id}`)}>
              <div style={{ height: 160, background: '#f0f0f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {album.coverPictureUrl ? (
                  <img src={album.coverPictureUrl} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <span style={{ fontSize: 48, opacity: 0.3 }}>📁</span>
                )}
              </div>
              <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{album.name}</strong>
                  <div style={{ fontSize: 13, opacity: 0.6 }}>
                    {t('albums.pictureCount', { count: album.pictureCount })}
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); void handleDelete(album.id) }}>
                  {t('common.remove')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>{t('albums.createTitle')}</DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="field">
              <span className="label">{t('albums.name')}</span>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">{t('albums.description')}</span>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="plain" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating}>
              {creating ? t('common.creating') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}