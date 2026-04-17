import { useEffect, useState } from 'react'
import { searchPictures, type PictureSummary } from '@/api/pictures'
import { listTags, type TagInfo } from '@/api/tags'
import PageShell from './common/PageShell'
import { Button } from '@/react-app/ui/shadcn/button'
import { Input } from '@/react-app/ui/shadcn/input'

export default function SearchPage() {
  const [items, setItems] = useState<PictureSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size] = useState(12)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Filters
  const [keyword, setKeyword] = useState('')
  const [tag, setTag] = useState('')
  const [tagId, setTagId] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [spaceId, setSpaceId] = useState('')
  const [orientation, setOrientation] = useState<'all' | 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE'>('all')
  const [visibility, setVisibility] = useState<'all' | 'PUBLIC' | 'PRIVATE' | 'TEAM'>('all')
  const [reviewStatus, setReviewStatus] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all')
  const [minSizeMb, setMinSizeMb] = useState('')
  const [maxSizeMb, setMaxSizeMb] = useState('')
  const [createdAfter, setCreatedAfter] = useState('')
  const [createdBefore, setCreatedBefore] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'sizeBytes'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Tag suggestions
  const [tagSuggestions, setTagSuggestions] = useState<TagInfo[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const hasMore = items.length < total

  const toBytes = (value: string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) return undefined
    return Math.round(parsed * 1024 * 1024)
  }

  const fetchTagSuggestions = async (queryString: string) => {
    const trimmed = queryString.trim()
    if (!trimmed) {
      setTagSuggestions([])
      setShowSuggestions(false)
      return
    }
    try {
      const data = await listTags({ page: 0, size: 8, keyword: trimmed })
      setTagSuggestions(data.items)
      setShowSuggestions(true)
    } catch {
      setTagSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleTagSelect = (tagName: string, id: string) => {
    setTag(tagName)
    setTagId(id)
    setShowSuggestions(false)
  }

  const buildParams = (pageIndex: number) => ({
    page: pageIndex,
    size,
    keyword: keyword.trim() || undefined,
    tag: tag.trim() || undefined,
    tagId: tagId.trim() || undefined,
    ownerId: ownerId.trim() || undefined,
    spaceId: spaceId.trim() || undefined,
    visibility: visibility === 'all' ? undefined : visibility,
    reviewStatus: reviewStatus === 'all' ? undefined : reviewStatus,
    minSizeBytes: toBytes(minSizeMb),
    maxSizeBytes: toBytes(maxSizeMb),
    createdAfter: createdAfter || undefined,
    createdBefore: createdBefore || undefined,
    orientation: orientation === 'all' ? undefined : orientation,
    sortBy,
    sortDir,
  })

  const load = async () => {
    setLoading(true)
    setPage(0)
    try {
      const data = await searchPictures(buildParams(0))
      setItems(data.items)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to load search results', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const data = await searchPictures(buildParams(nextPage))
      setItems((prev) => [...prev, ...data.items])
      setTotal(data.total)
      setPage(nextPage)
    } catch (error) {
      console.error('Failed to load more results', error)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (tag) {
        fetchTagSuggestions(tag)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [tag])

  const resetFilters = () => {
    setKeyword('')
    setTag('')
    setTagId('')
    setOwnerId('')
    setSpaceId('')
    setOrientation('all')
    setVisibility('all')
    setReviewStatus('all')
    setMinSizeMb('')
    setMaxSizeMb('')
    setCreatedAfter('')
    setCreatedBefore('')
    setSortBy('createdAt')
    setSortDir('desc')
  }

  return (
    <PageShell title="Search">
      <div style={{ display: 'grid', gap: 24 }}>
        {/* Filters */}
        <section className="panel">
          <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Filters</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Keyword</label>
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search keyword..." />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Tag</label>
                <Input
                  value={tag}
                  onChange={(e) => {
                    setTag(e.target.value)
                    setTagId('')
                  }}
                  placeholder="Tag name..."
                />
                {showSuggestions && tagSuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      marginTop: 4,
                      zIndex: 10,
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}
                  >
                    {tagSuggestions.map((t) => (
                      <div
                        key={t.id}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                        onMouseDown={() => handleTagSelect(t.name, t.id)}
                      >
                        {t.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Owner ID</label>
                <Input value={ownerId} onChange={(e) => setOwnerId(e.target.value)} placeholder="UUID..." />
              </div>
              <div>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Space ID</label>
                <Input value={spaceId} onChange={(e) => setSpaceId(e.target.value)} placeholder="UUID..." />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  <option value="all">All</option>
                  <option value="LANDSCAPE">Landscape</option>
                  <option value="PORTRAIT">Portrait</option>
                  <option value="SQUARE">Square</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  <option value="all">All</option>
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                  <option value="TEAM">Team</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Review Status</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  <option value="all">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Min Size (MB)</label>
                <Input type="number" value={minSizeMb} onChange={(e) => setMinSizeMb(e.target.value)} placeholder="0" min="0" step="0.1" />
              </div>
              <div>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Max Size (MB)</label>
                <Input type="number" value={maxSizeMb} onChange={(e) => setMaxSizeMb(e.target.value)} placeholder="100" min="0" step="0.1" />
              </div>
              <div>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Created After</label>
                <Input type="date" value={createdAfter} onChange={(e) => setCreatedAfter(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Created Before</label>
                <Input type="date" value={createdBefore} onChange={(e) => setCreatedBefore(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  <option value="createdAt">Created At</option>
                  <option value="updatedAt">Updated At</option>
                  <option value="sizeBytes">Size</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.9em', fontWeight: 500, display: 'block', marginBottom: 6 }}>Sort Direction</label>
                <select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Button variant="plain" onClick={() => { resetFilters(); load(); }}>
                Reset
              </Button>
              <Button variant="primary" onClick={() => void load()}>
                Search
              </Button>
            </div>
          </div>
        </section>

        {/* Results */}
        <section>
          <div style={{ marginBottom: 12, color: 'var(--ink-soft)' }}>
            {total > 0 ? `${total} results found` : 'No results'}
          </div>
          {loading ? (
            <div>Loading...</div>
          ) : items.length === 0 ? (
            <div className="empty-state">No pictures match your filters.</div>
          ) : (
            <>
              <div className="grid cols-3">
                {items.map((p, idx) => (
                  <div
                    key={p.id}
                    className="card"
                    style={{ '--delay': `${idx * 50}ms` } as React.CSSProperties}
                  >
                    <div className="card-image">
                      <img src={p.url} alt={p.name} />
                    </div>
                    <div>
                      <strong style={{ display: 'block', marginBottom: 6 }}>{p.name}</strong>
                      <div className="meta-row">
                        <span>{p.visibility}</span>
                        <span>{(p.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="load-more">
                  <Button variant="plain" onClick={() => void loadMore()} disabled={loadingMore}>
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </PageShell>
  )
}

