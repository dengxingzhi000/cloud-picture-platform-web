import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPublic, listRecommendations, type PictureSummary } from '@/api/pictures'
import { useAuth } from '@/react-app/auth'

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

type OrientationFilter = 'all' | 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE'

export default function GalleryPage() {
  const navigate = useNavigate()
  const { isAuthed } = useAuth()

  const [items, setItems] = useState<PictureSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [orientation, setOrientation] = useState<OrientationFilter>('all')
  const [sizeBucket, setSizeBucket] = useState<'all' | 'small' | 'medium' | 'large'>('all')
  const [mode, setMode] = useState<'recommendations' | 'browse'>('recommendations')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const SIZE = 18

  function sizeParams() {
    if (sizeBucket === 'small') return { minSizeBytes: undefined, maxSizeBytes: 1024 * 1024 }
    if (sizeBucket === 'medium') return { minSizeBytes: 1024 * 1024, maxSizeBytes: 5 * 1024 * 1024 }
    if (sizeBucket === 'large') return { minSizeBytes: 5 * 1024 * 1024, maxSizeBytes: undefined }
    return { minSizeBytes: undefined, maxSizeBytes: undefined }
  }

  const loadPage = async (pageIndex: number, append: boolean) => {
    if (pageIndex === 0 && !append) setLoading(true)
    else setLoadingMore(true)
    try {
      let res
      if (mode === 'recommendations' && !keyword && orientation === 'all' && sizeBucket === 'all') {
        res = await listRecommendations({ page: pageIndex, size: SIZE })
      } else {
        const { minSizeBytes, maxSizeBytes } = sizeParams()
        res = await listPublic({
          page: pageIndex,
          size: SIZE,
          keyword: keyword.trim() || undefined,
          orientation: orientation !== 'all' ? orientation : undefined,
          minSizeBytes,
          maxSizeBytes,
        })
      }
      if (append) {
        setItems((prev) => [...prev, ...res.items])
      } else {
        setItems(res.items)
      }
      setTotal(res.total)
      setPage(pageIndex)
    } catch { /* keep UI */ } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { void loadPage(0, false) }, [mode, orientation, sizeBucket]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce keyword search
  useEffect(() => {
    const t = setTimeout(() => loadPage(0, false), 350)
    return () => clearTimeout(t)
  }, [keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && !loading && items.length < total) {
          void loadPage(page + 1, true)
        }
      },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [items.length, total, page, loading, loadingMore]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      {/* Hero */}
      <div style={{
        padding: '28px 32px',
        borderRadius: 28,
        background: 'linear-gradient(135deg, rgba(239,107,47,0.12), rgba(31,138,112,0.1))',
        border: '1px solid var(--stroke-soft)',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: '2rem', fontWeight: 900, lineHeight: 1.1 }}>
              Public Gallery
            </h1>
            <p style={{ margin: 0, color: 'var(--ink-soft)' }}>
              Browse approved visuals from the community and teams.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(31,138,112,0.12)', color: '#116350', fontSize: '0.78rem', fontWeight: 700 }}>
              ✓ Approved Only
            </span>
            {isAuthed && (
              <span style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(239,107,47,0.12)', color: '#b84e1f', fontSize: '0.78rem', fontWeight: 700 }}>
                ⭐ Personalised
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="🔍 Search by name..."
            style={{
              flex: '1 1 200px',
              padding: '9px 14px',
              borderRadius: 12,
              border: '1px solid var(--stroke-soft)',
              fontSize: '0.9rem',
              background: 'var(--bg-elevated)',
              outline: 'none',
            }}
          />

          {/* Mode */}
          {isAuthed && (
            <div style={{ display: 'flex', gap: 4 }}>
              {(['recommendations', 'browse'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: mode === m ? 'var(--ink-strong)' : 'rgba(32,26,22,0.07)',
                    color: mode === m ? '#fff' : 'var(--ink-soft)',
                  }}
                >
                  {m === 'recommendations' ? '⭐ For you' : '🌐 Browse all'}
                </button>
              ))}
            </div>
          )}

          {/* Orientation */}
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as OrientationFilter)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--stroke-soft)', fontSize: '0.88rem', cursor: 'pointer' }}
          >
            <option value="all">All orientations</option>
            <option value="LANDSCAPE">Landscape</option>
            <option value="PORTRAIT">Portrait</option>
            <option value="SQUARE">Square</option>
          </select>

          {/* Size */}
          <select
            value={sizeBucket}
            onChange={(e) => setSizeBucket(e.target.value as typeof sizeBucket)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--stroke-soft)', fontSize: '0.88rem', cursor: 'pointer' }}
          >
            <option value="all">All sizes</option>
            <option value="small">Small (&lt;1MB)</option>
            <option value="medium">Medium (1-5MB)</option>
            <option value="large">Large (&gt;5MB)</option>
          </select>
        </div>

        {!loading && (
          <div style={{ marginTop: 10, color: 'var(--ink-soft)', fontSize: '0.82rem' }}>
            Showing {items.length} of {total} {total === 1 ? 'asset' : 'assets'}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ '--delay': `${i * 60}ms` } as React.CSSProperties}>
              <div style={{ borderRadius: 14, background: 'linear-gradient(90deg, #efe7dd 25%, #f5f0ea 50%, #efe7dd 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', aspectRatio: '4/3' }} />
              <div style={{ height: 16, borderRadius: 8, background: '#efe7dd', width: '70%' }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎨</div>
          <p style={{ color: 'var(--ink-soft)', margin: 0 }}>No pictures match your filters.</p>
        </section>
      ) : (
        <>
          <div className="grid cols-3">
            {items.map((p, i) => (
              <div
                key={p.id + '-' + i}
                className="card"
                style={{ cursor: 'pointer', '--delay': `${(i % 9) * 50}ms` } as React.CSSProperties}
                onClick={() => navigate(`/pictures/${p.id}`)}
              >
                <div className="card-image">
                  <img
                    src={p.url}
                    alt={p.name}
                    loading="lazy"
                    style={{ transition: 'transform 0.3s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                      {p.name}
                    </strong>
                    <span className="tag">{p.visibility}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, color: 'var(--ink-soft)', fontSize: '0.78rem' }}>
                    <span>{formatBytes(p.sizeBytes)}</span>
                    {p.width && p.height && <span>{p.width}×{p.height}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
              Loading more...
            </div>
          )}
          {!loadingMore && items.length >= total && total > 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
              — End of gallery —
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
