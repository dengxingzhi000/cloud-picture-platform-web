import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPictures, type PictureSummary } from '@/api/pictures'
import { listTags, type TagInfo } from '@/api/tags'
import { Button } from '@/react-app/ui/shadcn/button'
import { SelectCustom } from '@/react-app/ui/shadcn/select-custom'
import { TiltedCard, LazyWrapper } from '@/react-app/components'
import { formatBytes } from '@/utils/format'

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type Visibility = 'PUBLIC' | 'PRIVATE' | 'TEAM'
type Orientation = 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE'

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

  // 页面加载时自动执行一次搜索
  useEffect(() => {
    if (!hasSearched) {
      void doSearch(0, false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
                aria-label="Search keyword"
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
                aria-label="Filter by tag name"
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
              <input style={inputStyle} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} placeholder="UUID" aria-label="Filter by owner ID" />
            </label>
            <label className="field">
              <span className="label">Space ID</span>
              <input style={inputStyle} value={spaceId} onChange={(e) => setSpaceId(e.target.value)} placeholder="UUID" aria-label="Filter by space ID" />
            </label>
          </div>

          {/* Row 2: enums + size */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label className="field">
              <span className="label">Visibility</span>
              <SelectCustom
                value={visibility}
                onChange={(value) => setVisibility(value as Visibility | '')}
                options={[
                  { value: '', label: 'All' },
                  { value: 'PUBLIC', label: 'Public' },
                  { value: 'PRIVATE', label: 'Private' },
                  { value: 'TEAM', label: 'Team' },
                ]}
              />
            </label>
            <label className="field">
              <span className="label">Review status</span>
              <SelectCustom
                value={reviewStatus}
                onChange={(value) => setReviewStatus(value as ReviewStatus | '')}
                options={[
                  { value: '', label: 'All' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
              />
            </label>
            <label className="field">
              <span className="label">Orientation</span>
              <SelectCustom
                value={orientation}
                onChange={(value) => setOrientation(value as Orientation | '')}
                options={[
                  { value: '', label: 'All' },
                  { value: 'LANDSCAPE', label: 'Landscape' },
                  { value: 'PORTRAIT', label: 'Portrait' },
                  { value: 'SQUARE', label: 'Square' },
                ]}
              />
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

          {/* Row 3: sort */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label className="field">
              <span className="label">Sort by</span>
              <SelectCustom
                value={sortBy}
                onChange={(value) => setSortBy(value as typeof sortBy)}
                options={[
                  { value: 'createdAt', label: 'Created date' },
                  { value: 'updatedAt', label: 'Updated date' },
                  { value: 'sizeBytes', label: 'File size' },
                ]}
              />
            </label>
            <label className="field">
              <span className="label">Direction</span>
              <SelectCustom
                value={sortDir}
                onChange={(value) => setSortDir(value as 'asc' | 'desc')}
                options={[
                  { value: 'asc', label: 'Ascending' },
                  { value: 'desc', label: 'Descending' },
                ]}
              />
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
                  <button
                    key={p.id}
                    className="card"
                    style={{ cursor: 'pointer', '--delay': `${(i % 9) * 50}ms`, textAlign: 'left', width: '100%' } as React.CSSProperties}
                    onClick={() => navigate(`/pictures/${p.id}`)}
                  >
                    <LazyWrapper>
                      <TiltedCard
                        imageSrc={p.url}
                        altText={p.name}
                        captionText={p.name}
                        containerHeight="240px"
                        containerWidth="100%"
                        imageHeight="240px"
                        imageWidth="100%"
                        rotateAmplitude={8}
                        scaleOnHover={1.05}
                        showMobileWarning={false}
                        showTooltip={true}
                      />
                    </LazyWrapper>
                    <div style={{ padding: '12px 0 0' }}>
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
                  </button>
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
