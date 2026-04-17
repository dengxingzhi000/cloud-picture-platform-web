import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listRecommendations, type PictureSummary } from '@/api/pictures'
import PageShell from './common/PageShell'

export default function GalleryPage() {
  const [items, setItems] = useState<PictureSummary[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await listRecommendations({ page: 0, size: 20 })
        if (cancelled) return
        setItems(data.items)
      } catch {
        // Keep placeholder UI if backend is unreachable.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageShell title="Public Gallery">
      {loading ? (
        <div>Loading...</div>
      ) : items.length === 0 ? (
        <div>No pictures yet.</div>
      ) : (
        <div className="grid cols-3">
          {items.map((p) => (
            <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/pictures/${p.id}`)}>
              <div className="card-image">
                <img src={p.url} alt={p.name} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</strong>
                <span className="tag">{p.visibility}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}

