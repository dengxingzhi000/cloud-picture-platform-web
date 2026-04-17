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

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      try {
        const data = await getPictureDetail(pictureId)
        if (cancelled) return
        setDetail(data)
      } catch {
        if (!cancelled) setDetail(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (pictureId) void run()

    return () => {
      cancelled = true
    }
  }, [pictureId])

  const usesTeamWorkspace = detail?.spaceType === 'TEAM' && detail.canJoinCollaboration

  return (
    <div className="page picture-edit-page">
      <div className="page-header">
        <div className="picture-edit-heading">
          <h1 className="page-title">{detail?.name ?? 'Edit Picture'}</h1>
          <p className="page-subtitle">
            {usesTeamWorkspace
              ? 'Team workspace with live presence, shared annotations, and synchronized updates.'
              : 'Professional image editor for standalone public and personal assets.'}
          </p>
        </div>
        <div className="picture-edit-actions">
          <Button variant="plain" onClick={() => navigate(`/pictures/${pictureId}`)}>
            Back to detail
          </Button>
        </div>
      </div>

      {loading ? (
        <section className="panel">
          <div className="ui-skeleton" aria-label="loading">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="ui-skeleton-line" />
            ))}
          </div>
        </section>
      ) : !detail ? (
        <section className="panel soft">
          <div className="section-title">Picture not found</div>
          <p className="empty-copy">No editable picture detail was returned for this record.</p>
        </section>
      ) : usesTeamWorkspace ? (
        <section className="panel editor-shell">
          <CollabCanvas
            pictureId={pictureId}
            pictureUrl={detail.url}
          />
        </section>
      ) : detail.canEdit ? (
        <section className="panel editor-shell">
          <StandardPictureEditor
            pictureUrl={detail.url}
            pictureName={detail.name}
            pictureWidth={detail.width}
            pictureHeight={detail.height}
          />
        </section>
      ) : (
        <section className="panel soft">
          <div className="section-title">Editor unavailable</div>
          <p className="empty-copy">The current account does not have permission to open this editing interface.</p>
        </section>
      )}
    </div>
  )
}
