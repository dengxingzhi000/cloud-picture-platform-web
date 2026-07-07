import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { semanticSearch, type SemanticResult } from '@/api/semantic'
import { Input } from '@/react-app/ui/shadcn/input'
import { Button } from '@/react-app/ui/shadcn/button'

export default function SemanticSearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SemanticResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await semanticSearch({ query: query.trim(), size: 20 })
      setResults(res.items)
    } catch {} finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t('semantic.title')}</h1>
      </div>
      <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('semantic.placeholder')} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} style={{ flex: 1 }} />
          <Button variant="primary" onClick={handleSearch} disabled={loading}>{loading ? t('common.searching') : t('common.search')}</Button>
        </div>
      </div>
      {loading ? (
        <div className="grid cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card shimmer" style={{ height: 200 }} />
          ))}
        </div>
      ) : searched && results.length === 0 ? (
        <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
          <p>{t('semantic.noResults')}</p>
        </section>
      ) : (
        <div className="grid cols-3">
          {results.map((r) => (
            <button key={r.id} className="card" onClick={() => navigate(`/pictures/${r.id}`)}>
              <img src={r.thumbnailUrl || r.url} alt={r.name} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 }} />
              <div style={{ padding: '12px 0 0' }}>
                <strong>{r.name}</strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.6 }}>
                  <span>{r.ownerUsername}</span>
                  <span>{t('semantic.score')}: {(r.score * 100).toFixed(0)}%</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}