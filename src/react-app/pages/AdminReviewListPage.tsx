import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exportReviews, listPending, type AdminPictureSummary } from '@/api/pictures'
import PageShell from './common/PageShell'
import { Button } from '@/react-app/ui/shadcn/button'
import { Input } from '@/react-app/ui/shadcn/input'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export default function AdminReviewListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AdminPictureSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size] = useState(10)
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportPictureId, setExportPictureId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await listPending(page - 1, size)
      setItems(data.items)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to load pending list', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = (item: AdminPictureSummary) => {
    sessionStorage.setItem('cpp:admin:selected', JSON.stringify(item))
    navigate(`/admin/reviews/${item.id}`)
  }

  const exportCsv = async () => {
    setExportLoading(true)
    try {
      const blob = await exportReviews({
        pictureId: exportPictureId || undefined,
        sortBy: 'reviewedAt',
        sortDir: 'desc',
        limit: 5000,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'moderation_reviews.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed', error)
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <PageShell title="Review Queue">
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            value={exportPictureId}
            onChange={(e) => setExportPictureId(e.target.value)}
            placeholder="Filter by picture id"
            style={{ maxWidth: 300 }}
          />
          <Button variant="primary" onClick={() => void exportCsv()} disabled={exportLoading}>
            {exportLoading ? 'Exporting...' : 'Export Reviews CSV'}
          </Button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : items.length === 0 ? (
          <div>No pending reviews.</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>Preview</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Owner</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Size</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Visibility</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Last Review</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 12 }}>
                      <div
                        style={{
                          width: 110,
                          height: 80,
                          borderRadius: 12,
                          overflow: 'hidden',
                          background: '#efe7dd',
                        }}
                      >
                        <img src={row.url} alt={row.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </td>
                    <td style={{ padding: 12 }}>{row.name}</td>
                    <td style={{ padding: 12 }}>
                      <strong>{row.ownerDisplayName || row.ownerUsername || '—'}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>{row.ownerId}</div>
                    </td>
                    <td style={{ padding: 12 }}>{formatBytes(row.sizeBytes)}</td>
                    <td style={{ padding: 12 }}>
                      <span
                        className="tag"
                        style={{
                          background: row.visibility === 'PUBLIC' ? 'rgba(31, 138, 112, 0.14)' : 'rgba(100, 116, 139, 0.14)',
                        }}
                      >
                        {row.visibility}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <div>{row.lastReviewerDisplayName || row.lastReviewerUsername || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                        {row.lastReviewedAt ? new Date(row.lastReviewedAt).toLocaleString() : ''}
                      </div>
                    </td>
                    <td style={{ padding: 12 }}>
                      <Button variant="plain" onClick={() => openDetail(row)}>
                        Review
                      </Button>
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
      </div>
    </PageShell>
  )
}

