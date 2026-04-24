import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPictures, type PictureSummary } from '@/api/pictures'
import { listTags, type TagInfo } from '@/api/tags'
import { Button } from '@/react-app/ui/shadcn/button'

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type Visibility = 'PUBLIC' | 'PRIVATE' | 'TEAM'
type Orientation = 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE'

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function SearchPage() {
  const navigate = useNavigate()
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [items, setItems] = useState<PictureSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const SIZE = 18

  // Filters
  const [keyword, setKeyword] = useState('')
  const [tag, setTag] = useState('')
  const [tagId, setTagId] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [spaceId, setSpaceId] = useState('')
  const [visibility, setVisibility] = useState<Visibility | ''>('')
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | ''>('')
  const [orientation, setOrientation] = useState<Orientation | ''>('')
  const [minSizeMb, setMinSizeMb] = useState('')
  const [maxSizeMb, setMaxSizeMb] = useState('')
  const [createdAfter, setCreatedAfter] = useState('')
  const [createdBefore, setCreatedBefore] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'sizeBytes'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Tag autocomplete
  const [tagSuggestions, setTagSuggestions] = useState<TagInfo[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const toBytes = (v: string) => {
    const n = parseFloat(v)
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 1024 * 1024) : undefined
  }

  const buildParams = (pageIndex: number) => ({
    page: pageIndex,
    size: SIZE,
    keyword: keyword.trim() || undefined,
    tag: tag.trim() || undefined,
    tagId: tagId || undefined,
    ownerId: ownerId.trim() || undefined,
    spaceId: spaceId.trim() || undefined,
    visibility: visibility || undefined,
    reviewStatus: reviewStatus || undefined,
    orientation: orientation || undefined,
    minSizeBytes: toBytes(minSizeMb),
    maxSizeBytes: toBytes(maxSizeMb),
    createdAfter: createdAfter ? new Date(createdAfter).toISOString() : undefined,
    createdBefore: createdBefore ? new Date(createdBefore).toISOString() : undefined,
    sortBy,
    sortDir,
  })

  const doSearch = async (pageIndex: number, append: boolean) => {
    if (!append) { setLoading(true); setPage(0) }
    else setLoadingMore(true)
    setHasSearched(true)
    try {
      const data = await searchPictures(buildParams(pageIndex))
      if (append) setItems((prev) => [...prev, ...data.items])
      else setItems(data.items)
      setTotal(data.total)
      if (!append) setPage(0)
      else setPage(pageIndex)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleSearch = () => doSearch(0, false)

  const reset = () => {
    setKeyword(''); setTag(''); setTagId(''); setOwnerId(''); setSpaceId('')
    setVisibility(''); setReviewStatus(''); setOrientation('')
    setMinSizeMb(''); setMaxSizeMb(''); setCreatedAfter(''); setCreatedBefore('')
    setSortBy('createdAt'); setSortDir('desc')
    setItems([]); setTotal(0); setHasSearched(false)
  }

  // Tag suggestions
  useEffect(() => {
    const trimmed = tag.trim()
    if (!trimmed) { setTagSuggestions([]); setShowSuggestions(false); return }
    const t = setTimeout(async () => {
      try {
        const res = await listTags({ page: 0, size: 6, keyword: trimmed })
        setTagSuggestions(res.items)
        setShowSuggestions(res.items.length > 0)
      } catch { /* ignore */ }
    }, 300)
    return () => clearTimeout(t)
  }, [tag])

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && !loading && items.length < total) {
          void doSearch(page + 1, true)
        }
      },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [items.length, total, page, loading, loadingMore]) // eslint-disable-line react-hooks/exhaustive-deps

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px', borderRadius: 10,
    border: '1px solid var(--stroke-soft)', fontSize: '0.88rem',
    background: 'var(--bg-elevated)', outline: 'none',
  }

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Search</h1>
          <p className="page-subtitle">Filter pictures by keyword, tags, size, date, and more.</p>
        </div>
      </div>

      {/* Filters panel */}
      <section className="panel">
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Row 1: keyword + tag */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label className="field">
              <span className="label">Keyword</span>
              <input
                style={inputStyle}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                placeholder="Name, filename, or tag…"
              />
            </label>
            <label className="field" style={{ position: 'relative' }}>
              <span className="label">Tag</span>
              <input
                style={inputStyle}
                value={tag}
                onChange={(e) => { setTag(e.target.value); setTagId('') }}
                onKeyDown={(e) => e.key === 'Escape' && setShowSuggestions(false)}
                placeholder="Tag name…"
              />
              {showSuggestions && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--bg-surface)', border: '1px solid var(--stroke-soft)',
                  borderRadius: 10, marginTop: 4, zIndex: 20,
                  boxShadow: '0 8px 24px rgba(30,20,10,0.1)',
                }}>
                  {tagSuggestions.map((s) => (
                    <button
                      key={s.id}
                      onMouseDown={() => { setTag(s.name); setTagId(s.id); setShowSuggestions(false) }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '9px 14px', background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: '0.88rem', color: 'var(--ink-strong)',
                        borderBottom: '1px solid var(--stroke-soft)',
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label className="field">
              <span className="label">Owner ID</span>
              <input style={inputStyle} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} placeholder="UUID" />
            </label>
            <label className="field">
              <span className="label">Space ID</span>
              <input style={inputStyle} value={spaceId} onChange={(e) => setSpaceId(e.target.value)} placeholder="UUID" />
            </label>
          </div>

          {/* Row 2: enums + size */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label className="field">
              <span className="label">Visibility</span>
              <select style={selectStyle} value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility | '')}>
                <option value="">All</option>
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
                <option value="TEAM">Team</option>
              </select>
            </label>
            <label className="field">
              <span className="label">Review status</span>
              <select style={selectStyle} value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as ReviewStatus | '')}>
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <label className="field">
              <span className="label">Orientation</span>
              <select style={selectStyle} value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation | '')}>
                <option value="">All</option>
                <option value="LANDSCAPE">Landscape</option>
                <option value="PORTRAIT">Portrait</option>
                <option value="SQUARE">Square</option>
              </select>
            </label>
            <label className="field">
              <span className="label">Min size (MB)</span>
              <input style={inputStyle} type="number" value={minSizeMb} onChange={(e) => setMinSizeMb(e.target.value)} placeholder="0" min="0" step="0.1" />
            </label>
            <label className="field">
              <span className="label">Max size (MB)</span>
              <input style={inputStyle} type="number" value={maxSizeMb} onChange={(e) => setMaxSizeMb(e.target.value)} placeholder="100" min="0" step="0.1" />
            </label>
          </div>

          {/* Row 3: dates + sort */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label className="field">
              <span className="label">Created after</span>
              <input style={inputStyle} type="date" value={createdAfter} onChange={(e) => setCreatedAfter(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Created before</span>
              <input style={inputStyle} type="date" value={createdBefore} onChange={(e) => setCreatedBefore(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Sort by</span>
              <select style={selectStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                <option value="createdAt">Created at</option>
                <option value="updatedAt">Updated at</option>
                <option value="sizeBytes">File size</option>
              </select>
            </label>
            <label className="field">
              <span className="label">Direction</span>
              <select style={selectStyle} value={sortDir} onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}>
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="plain" onClick={reset}>Reset</Button>
            <Button variant="primary" onClick={() => void handleSearch()} disabled={loading}>
              {loading ? 'Searching…' : '🔍 Search'}
            </Button>
          </div>
        </div>
      </section>

      {/* Results */}
      {hasSearched && (
        <>
          <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
            {loading ? 'Searching…' : `${total} result${total !== 1 ? 's' : ''} found`}
          </div>

          {!loading && items.length === 0 ? (
            <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
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
                      <img src={p.url} alt={p.name} loading="lazy" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                          {p.name}
                        </strong>
                        <span className="tag" style={{ flexShrink: 0 }}>{p.visibility}</span>
                      </div>
                      <div style={{ marginTop: 4, color: 'var(--ink-soft)', fontSize: '0.75rem' }}>
                        {formatBytes(p.sizeBytes)}
                        {p.width && p.height && ` · ${p.width}×${p.height}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div ref={sentinelRef} style={{ height: 1 }} />
              {loadingMore && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                  Loading more...
                </div>
              )}
            </>
          )}
        </>
      )}

      {!hasSearched && (
        <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
          <p style={{ color: 'var(--ink-soft)', margin: 0 }}>Configure your filters and click Search to find pictures.</p>
        </section>
      )}
    </div>
  )
}
