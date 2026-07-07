import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listVersions, createVersion, type PictureVersion } from '@/api/versions'
import { useToast } from '@/react-app/toast'
import { Button } from '@/react-app/ui/shadcn/button'

type Props = { pictureId: string }

export default function VersionHistory({ pictureId }: Props) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [versions, setVersions] = useState<PictureVersion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const SIZE = 10

  const loadVersions = async () => {
    setLoading(true)
    try {
      const res = await listVersions(pictureId, { page: 0, size: SIZE })
      setVersions(res.items)
      setTotal(res.total)
      setPage(0)
    } catch { addToast(t('common.error'), 'error') } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadVersions() }, [pictureId])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const v = await createVersion(pictureId)
      setVersions((prev) => [v, ...prev])
      setTotal((prev) => prev + 1)
    } catch { addToast(t('common.error'), 'error') } finally {
      setCreating(false)
    }
  }

  const loadMore = async () => {
    const nextPage = page + 1
    try {
      const res = await listVersions(pictureId, { page: nextPage, size: SIZE })
      setVersions((prev) => [...prev, ...res.items])
      setPage(nextPage)
      setTotal(res.total)
    } catch { addToast(t('common.error'), 'error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{t('versions.title')} ({total})</h3>
        <Button variant="primary" onClick={handleCreate} disabled={creating}>
          {t('versions.createSnapshot')}
        </Button>
      </div>

      {loading ? (
        <div className="shimmer" style={{ height: 100 }} />
      ) : versions.length === 0 ? (
        <p style={{ opacity: 0.5 }}>{t('versions.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {versions.map((v) => (
            <div key={v.id} className="panel" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{t('versions.version')} {v.version}</strong>
                <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.5 }}>
                  {new Date(v.createdAt).toLocaleString()} — {v.createdBy}
                </span>
              </div>
              <a href={v.url} target="_blank" rel="noopener noreferrer">
                <Button variant="plain" size="sm">{t('versions.download')}</Button>
              </a>
            </div>
          ))}
          {versions.length < total && (
            <Button variant="plain" onClick={loadMore}>{t('common.loadMore')}</Button>
          )}
        </div>
      )}
    </div>
  )
}
