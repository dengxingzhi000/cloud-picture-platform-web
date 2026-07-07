import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  getAlbum,
  listAlbumPictures,
  removePictureFromAlbum,
  setAlbumCover,
  type Album,
  type AlbumPicture,
} from '@/api/albums'
import { useToast } from '@/react-app/toast'
import { Button } from '@/react-app/ui/shadcn/button'

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [album, setAlbum] = useState<Album | null>(null)
  const [pictures, setPictures] = useState<AlbumPicture[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  const SIZE = 20

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const [albumData, picturesData] = await Promise.all([
          getAlbum(id),
          listAlbumPictures(id, { page: 0, size: SIZE }),
        ])
        setAlbum(albumData)
        setPictures(picturesData.items)
        setTotal(picturesData.total)
        setPage(0)
      } catch { addToast(t('common.error'), 'error') } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  const handleRemove = async (pictureId: string) => {
    if (!id) return
    try {
      await removePictureFromAlbum(id, pictureId)
      setPictures((prev) => prev.filter((p) => p.id !== pictureId))
      setTotal((prev) => prev - 1)
    } catch { addToast(t('common.error'), 'error') }
  }

  const handleSetCover = async (pictureId: string) => {
    if (!id) return
    try {
      await setAlbumCover(id, pictureId)
      setAlbum((prev) => prev ? { ...prev, coverPictureId: pictureId } : prev)
    } catch { addToast(t('common.error'), 'error') }
  }

  const loadMore = async () => {
    if (!id) return
    const nextPage = page + 1
    try {
      const res = await listAlbumPictures(id, { page: nextPage, size: SIZE })
      setPictures((prev) => [...prev, ...res.items])
      setPage(nextPage)
      setTotal(res.total)
    } catch { addToast(t('common.error'), 'error') }
  }

  if (loading) return <div className="page"><div className="panel" style={{ height: 400, borderRadius: 14, background: 'linear-gradient(90deg, #efe7dd 25%, #f5f0ea 50%, #efe7dd 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} /></div>
  if (!album) return <div className="page"><div className="panel soft">{t('common.notFound')}</div></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>{album.name}</h1>
        <span style={{ opacity: 0.6 }}>{t('albums.pictureCount', { count: total })}</span>
      </div>

      {pictures.length === 0 ? (
        <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
          <p>{t('albums.noPictures')}</p>
        </section>
      ) : (
        <div className="grid cols-4">
          {pictures.map((pic) => (
            <div key={pic.id} className="card" style={{ position: 'relative' }}>
              <img
                src={pic.thumbnailUrl || pic.url}
                alt={pic.name}
                style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => navigate(`/pictures/${pic.id}`)}
              />
              <div style={{ padding: '8px 0', display: 'flex', gap: 4 }}>
                <Button variant="plain" size="sm" onClick={() => handleSetCover(pic.id)}>
                  {t('albums.setCover')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleRemove(pic.id)}>
                  {t('common.remove')}
                </Button>
              </div>
            </div>
          ))}
          {pictures.length < total && (
            <Button variant="plain" onClick={loadMore}>{t('common.loadMore')}</Button>
          )}
        </div>
      )}
    </div>
  )
}