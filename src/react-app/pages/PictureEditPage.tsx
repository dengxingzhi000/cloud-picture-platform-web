import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPictureDetail, type PictureDetail } from '@/api/pictures'
import CollabCanvas from '@/react-app/components/CollabCanvas'
import StandardPictureEditor from '@/react-app/components/StandardPictureEditor'
import { Button } from '@/react-app/ui/shadcn/button'
import './picture-edit.css'

export default function PictureEditPage() {
  const params = useParams()
  const navigate = useNavigate()
  const pictureId = String(params.id || '')

  const [detail, setDetail] = useState<PictureDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)
      try {
        const data = await getPictureDetail(pictureId)
        if (cancelled) return
        setDetail(data)
      } catch {
        if (!cancelled) {
          setError('Failed to load picture details. You may not have access.')
          setDetail(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (pictureId) void run()
    return () => { cancelled = true }
  }, [pictureId])

  const usesTeamWorkspace = detail?.spaceType === 'TEAM' && detail.canJoinCollaboration

  return (
    <div className="page picture-edit-page">
      <div className="page-header">
        <div className="picture-edit-heading">
          <h1 className="page-title">{detail?.name ?? 'Edit Picture'}</h1>
          <p className="page-subtitle">
            {loading
              ? 'Loading…'
              : usesTeamWorkspace
              ? 'Team workspace — live presence, shared annotations, and synchronized document updates.'
              : 'Professional image editor for standalone public and personal assets.'}
          </p>
        </div>
        <div className="picture-edit-actions">
          <Button variant="plain" onClick={() => navigate(`/pictures/${pictureId}`)}>
            ← Back to detail
          </Button>
        </div>
      </div>

      {loading ? (
        <section className="panel">
          <div style={{ display: 'grid', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                style={{
                  height: 18,
                  borderRadius: 9,
                  background: 'linear-gradient(90deg, #efe7dd 25%, #f5f0ea 50%, #efe7dd 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.4s infinite',
                  width: `${70 - index * 12}%`,
                }}
              />
            ))}
          </div>
        </section>
      ) : error ? (
        <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Access Error</div>
          <p style={{ color: 'var(--ink-soft)', margin: '0 0 20px' }}>{error}</p>
          <Button variant="plain" onClick={() => navigate(-1)}>Go back</Button>
        </section>
      ) : !detail ? (
        <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🖼️</div>
          <div style={{ fontWeight: 700 }}>Picture not found</div>
          <p style={{ color: 'var(--ink-soft)' }}>No editable picture detail was returned for this record.</p>
        </section>
      ) : usesTeamWorkspace ? (
        /* Team collaboration canvas */
        <section className="panel editor-shell">
          <CollabCanvas
            pictureId={pictureId}
            pictureUrl={detail.url}
          />
        </section>
      ) : detail.canEdit ? (
        /* Standard filerobot editor for personal/public assets */
        <section className="panel editor-shell">
          <StandardPictureEditor
            pictureUrl={detail.url}
            pictureName={detail.name}
            pictureWidth={detail.width}
            pictureHeight={detail.height}
          />
        </section>
      ) : (
        <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700 }}>Editor unavailable</div>
          <p style={{ color: 'var(--ink-soft)' }}>
            The current account does not have permission to edit this picture.
          </p>
          <Button variant="plain" onClick={() => navigate(`/pictures/${pictureId}`)}>
            View detail
          </Button>
        </section>
      )}
    </div>
  )
}
