import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageShell from './common/PageShell'
import CollabCanvas, { type CanvasElement } from '@/react-app/components/CollabCanvas'
import { getPictureDetail, getPictureDocument, type PictureDetail } from '@/api/pictures'

export default function PictureDetailPage() {
  const params = useParams()
  const pictureId = String(params.id || '')

  const [detail, setDetail] = useState<PictureDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [elements, setElements] = useState<CanvasElement[]>([])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const [d, doc] = await Promise.all([getPictureDetail(pictureId), getPictureDocument(pictureId)])
        if (cancelled) return
        setDetail(d)
        const nextElements: CanvasElement[] = (doc?.elements ?? []).map((e) => {
          if (e.type === 'rect') {
            return { id: e.id, type: 'rect', x: e.x, y: e.y, width: e.width, height: e.height }
          }
          return {
            id: e.id,
            type: 'text',
            x: e.x,
            y: e.y,
            width: e.width,
            height: e.height,
            text: e.text ?? '',
          }
        })
        setElements(nextElements)
      } catch {
        // Keep placeholder UI.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (pictureId) void run()
    return () => {
      cancelled = true
    }
  }, [pictureId])

  return (
    <PageShell title="Picture Detail">
      {loading ? (
        <div>Loading...</div>
      ) : !detail ? (
        <div>Picture not found.</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card-image" style={{ aspectRatio: '16/9' }}>
            <img src={detail.url} alt={detail.name} />
          </div>

          <div className="grid" style={{ gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{detail.name}</strong>
                <div style={{ color: 'var(--ink-soft)', marginTop: 6 }}>{detail.visibility}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="tag">{detail.reviewStatus}</span>
                {detail.canEdit ? <span className="tag" style={{ background: 'rgba(31, 138, 112, 0.14)' }}>Editable</span> : null}
              </div>
            </div>
          </div>

          <CollabCanvas pictureId={pictureId} pictureUrl={detail.url} initialElements={elements} />
        </div>
      )}
    </PageShell>
  )
}

