import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listComments, createComment, deleteComment, resolveComment, type Comment } from '@/api/comments'
import { useAuth } from '@/react-app/auth'
import { useToast } from '@/react-app/toast'
import { Button } from '@/react-app/ui/shadcn/button'
import { Textarea } from '@/react-app/ui/shadcn/textarea'

type Props = { pictureId: string }

export default function CommentSection({ pictureId }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const SIZE = 20

  const loadComments = async () => {
    setLoading(true)
    try {
      const res = await listComments(pictureId, { page: 0, size: SIZE })
      setComments(res.items)
      setTotal(res.total)
      setPage(0)
    } catch { addToast(t('common.error'), 'error') } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadComments() }, [pictureId])

  const handleCreate = async () => {
    if (!newContent.trim()) return
    setSubmitting(true)
    try {
      const comment = await createComment(pictureId, { content: newContent.trim() })
      setComments((prev) => [comment, ...prev])
      setTotal((prev) => prev + 1)
      setNewContent('')
    } catch { addToast(t('common.error'), 'error') } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(pictureId, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setTotal((prev) => prev - 1)
    } catch { addToast(t('common.error'), 'error') }
  }

  const handleResolve = async (commentId: string) => {
    try {
      const updated = await resolveComment(pictureId, commentId)
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)))
    } catch { addToast(t('common.error'), 'error') }
  }

  const loadMore = async () => {
    const nextPage = page + 1
    try {
      const res = await listComments(pictureId, { page: nextPage, size: SIZE })
      setComments((prev) => [...prev, ...res.items])
      setPage(nextPage)
      setTotal(res.total)
    } catch { addToast(t('common.error'), 'error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3>{t('comments.title')} ({total})</h3>

      <div style={{ display: 'flex', gap: 8 }}>
        <Textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder={t('comments.placeholder')}
          rows={2}
        />
        <Button variant="primary" onClick={handleCreate} disabled={submitting || !newContent.trim()}>
          {t('comments.post')}
        </Button>
      </div>

      {loading ? (
        <div className="shimmer" style={{ height: 100 }} />
      ) : comments.length === 0 ? (
        <p style={{ opacity: 0.5 }}>{t('comments.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {comments.map((c) => (
            <div
              key={c.id}
              className="panel"
              style={{
                padding: 12,
                opacity: c.resolved ? 0.5 : 1,
                borderLeft: c.resolved ? '3px solid #22c55e' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong>{c.username}</strong>
                  <span style={{ fontSize: 12, opacity: 0.5 }}>{new Date(c.createdAt).toLocaleString()}</span>
                  {c.resolved && <span className="badge" style={{ background: '#22c55e', color: '#fff' }}>{t('comments.resolved')}</span>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {!c.resolved && user?.userId === c.userId && (
                    <Button variant="plain" size="sm" onClick={() => handleResolve(c.id)}>
                      {t('comments.resolve')}
                    </Button>
                  )}
                  {user?.userId === c.userId && (
                    <Button variant="danger" size="sm" onClick={() => handleDelete(c.id)}>
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              </div>
              <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{c.content}</p>
            </div>
          ))}
          {comments.length < total && (
            <Button variant="plain" onClick={loadMore}>{t('common.loadMore')}</Button>
          )}
        </div>
      )}
    </div>
  )
}
