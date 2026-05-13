import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exportReviews, listPending, type AdminPictureSummary } from '@/api/pictures'
import { Button } from '@/react-app/ui/shadcn/button'
import { Input } from '@/react-app/ui/shadcn/input'
import { formatBytes } from '@/utils/format'
import { useToast } from '@/react-app/toast'

type StatusFilter = '' | 'PENDING' | 'APPROVED' | 'REJECTED'

export default function AdminReviewListPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [items, setItems] = useState<AdminPictureSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size] = useState(10)
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  // Export filters
  const [exportPictureId, setExportPictureId] = useState('')
  const [exportReviewerId, setExportReviewerId] = useState('')
  const [exportFromStatus, setExportFromStatus] = useState<StatusFilter>('')
  const [exportToStatus, setExportToStatus] = useState<StatusFilter>('')
  const [exportAfter, setExportAfter] = useState('')
  const [exportBefore, setExportBefore] = useState('')
  const [showExportPanel, setShowExportPanel] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listPending(page - 1, size)
      setItems(data.items)
      setTotal(data.total)
    } catch {
      addToast('Failed to load pending list', 'error')
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
        reviewerId: exportReviewerId || undefined,
        fromStatus: exportFromStatus || undefined,
        toStatus: exportToStatus || undefined,
        reviewedAfter: exportAfter ? new Date(exportAfter).toISOString() : undefined,
        reviewedBefore: exportBefore ? new Date(exportBefore).toISOString() : undefined,
        sortBy: 'reviewedAt',
        sortDir: 'desc',
        limit: 5000,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `moderation_reviews_${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      addToast('Export failed. Please try again.', 'error')
    } finally {
      setExportLoading(false)
    }
  }

  const totalPages = Math.ceil(total / size)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Review Queue</h1>
          <p className="page-subtitle">Moderate public picture submissions before they appear in the gallery.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="plain" onClick={() => setShowExportPanel((v) => !v)}>
            {showExportPanel ? 'Hide Export' : '⬇ Export CSV'}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="panel" style={{ padding: '12px 18px', flex: '1 1 120px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Pending</div>
          <div style={{ fontWeight: 700, fontSize: '1.4rem', marginTop: 2, color: 'var(--accent)' }}>{total}</div>
        </div>
        <div className="panel" style={{ padding: '12px 18px', flex: '1 1 120px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Showing</div>
          <div style={{ fontWeight: 700, fontSize: '1.4rem', marginTop: 2 }}>{items.length}</div>
        </div>
        <div className="panel" style={{ padding: '12px 18px', flex: '1 1 120px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Page</div>
          <div style={{ fontWeight: 700, fontSize: '1.4rem', marginTop: 2 }}>{page} / {totalPages || 1}</div>
        </div>
      </div>

      {/* Export panel */}
      {showExportPanel && (
        <section className="panel soft">
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>Export Moderation Records</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <label className="field">
              <span className="label">Picture ID (optional)</span>
              <Input value={exportPictureId} onChange={(e) => setExportPictureId(e.target.value)} placeholder="UUID" />
            </label>
            <label className="field">
              <span className="label">Reviewer ID (optional)</span>
              <Input value={exportReviewerId} onChange={(e) => setExportReviewerId(e.target.value)} placeholder="UUID" />
            </label>
            <label className="field">
              <span className="label">From status</span>
              <select
                value={exportFromStatus}
                onChange={(e) => setExportFromStatus(e.target.value as StatusFilter)}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--stroke-soft)', fontSize: '0.88rem' }}
              >
                <option value="">Any</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <label className="field">
              <span className="label">To status</span>
              <select
                value={exportToStatus}
                onChange={(e) => setExportToStatus(e.target.value as StatusFilter)}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--stroke-soft)', fontSize: '0.88rem' }}
              >
                <option value="">Any</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <label className="field">
              <span className="label">Reviewed after</span>
              <Input type="date" value={exportAfter} onChange={(e) => setExportAfter(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Reviewed before</span>
              <Input type="date" value={exportBefore} onChange={(e) => setExportBefore(e.target.value)} />
            </label>
          </div>
          <div style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={() => void exportCsv()} disabled={exportLoading}>
              {exportLoading ? 'Exporting…' : '⬇ Download CSV (up to 5 000 rows)'}
            </Button>
          </div>
        </section>
      )}

      {/* Table */}
      <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
            <p style={{ color: 'var(--ink-soft)' }}>No pending reviews — queue is clear!</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--stroke-soft)', background: 'var(--bg-elevated)' }}>
                  {['Preview', 'Name', 'Owner', 'Size', 'Visibility', 'Last Review', 'Action'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)', fontWeight: 700 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid var(--stroke-soft)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(32,26,22,0.015)',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,107,47,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(32,26,22,0.015)')}
                    onClick={() => openDetail(row)}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ width: 90, height: 64, borderRadius: 10, overflow: 'hidden', background: '#efe7dd', flexShrink: 0 }}>
                        <img src={row.url} alt={row.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', maxWidth: 200 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.name}
                      </div>
                      {row.width && row.height && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: 2 }}>
                          {row.width} × {row.height}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        {row.ownerDisplayName || row.ownerUsername || '—'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', fontFamily: 'monospace' }}>
                        {row.ownerId.slice(0, 8)}…
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                      {formatBytes(row.sizeBytes)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className="tag" style={{
                        background: row.visibility === 'PUBLIC' ? 'rgba(31,138,112,0.14)' : 'rgba(100,116,139,0.14)',
                        color: row.visibility === 'PUBLIC' ? '#116350' : '#475569',
                      }}>
                        {row.visibility}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {row.lastReviewerUsername ? (
                        <>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{row.lastReviewerDisplayName || row.lastReviewerUsername}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
                            {row.lastReviewedAt ? new Date(row.lastReviewedAt).toLocaleString() : ''}
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="primary"
                        onClick={() => openDetail(row)}
                        style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                      >
                        Review →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderTop: '1px solid var(--stroke-soft)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                {(page - 1) * size + 1}–{Math.min(page * size, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="plain" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
                  ← Prev
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const p = start + i
                  if (p > totalPages) return null
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none',
                        background: p === page ? 'var(--accent)' : 'rgba(32,26,22,0.07)',
                        color: p === page ? '#fff' : 'var(--ink-strong)',
                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  )
                })}
                <Button variant="plain" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                  Next →
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
