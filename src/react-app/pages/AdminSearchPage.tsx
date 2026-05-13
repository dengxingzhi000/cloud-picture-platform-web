import { useState } from 'react'
import { reindexAllPictures, reindexSinglePicture } from '@/api/pictures'
import { Button } from '@/react-app/ui/shadcn/button'
import { Input } from '@/react-app/ui/shadcn/input'

type LogEntry = {
  id: string
  timestamp: string
  scope: string
  queued: number
  pictureId?: string | null
  status: 'success' | 'error'
  message?: string
}

export default function AdminSearchPage() {
  const [loadingAll, setLoadingAll] = useState(false)
  const [loadingOne, setLoadingOne] = useState(false)
  const [pictureId, setPictureId] = useState('')
  const [log, setLog] = useState<LogEntry[]>([])

  const appendLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    setLog((prev) => [
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
      },
      ...prev.slice(0, 49),
    ])
  }

  const handleReindexAll = async () => {
    setLoadingAll(true)
    try {
      const result = await reindexAllPictures()
      appendLog({
        scope: 'all',
        queued: result.queued,
        status: 'success',
        message: `Successfully queued ${result.queued} picture${result.queued !== 1 ? 's' : ''} for reindexing.`,
      })
    } catch (err: unknown) {
      appendLog({
        scope: 'all',
        queued: 0,
        status: 'error',
        message: (err as Error)?.message ?? 'Failed to trigger full reindex.',
      })
    } finally {
      setLoadingAll(false)
    }
  }

  const handleReindexOne = async () => {
    const id = pictureId.trim()
    if (!id) return
    setLoadingOne(true)
    try {
      const result = await reindexSinglePicture(id)
      appendLog({
        scope: 'picture',
        queued: result.queued,
        pictureId: result.pictureId,
        status: 'success',
        message: `Queued picture ${id.slice(0, 8)}… for reindexing.`,
      })
      setPictureId('')
    } catch (err: unknown) {
      appendLog({
        scope: 'picture',
        queued: 0,
        pictureId: id,
        status: 'error',
        message: (err as Error)?.message ?? `Failed to reindex picture ${id.slice(0, 8)}….`,
      })
    } finally {
      setLoadingOne(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Search Index Management</h1>
          <p className="page-subtitle">
            Trigger rebuild jobs to keep the search document table consistent with picture assets.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {/* Full reindex card */}
        <section className="panel">
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Full Reindex</h2>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
              Queue all picture assets for search document rebuild. This is safe to run at any time —
              it uses the async task executor and does not block the API.
            </p>
          </div>
          <div style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(138,92,0,0.08)',
            border: '1px solid rgba(138,92,0,0.15)',
            fontSize: '0.82rem',
            color: '#8a5c00',
            marginBottom: 16,
            lineHeight: 1.5,
          }}>
            ⚠ On large datasets this may take several minutes. The queue will process in the background
            with up to 2 worker threads and 3 retry attempts per picture.
          </div>
          <Button
            variant="primary"
            onClick={() => void handleReindexAll()}
            disabled={loadingAll}
            style={{ width: '100%' }}
          >
            {loadingAll ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Queuing…
              </span>
            ) : '🔄 Reindex All Pictures'}
          </Button>
        </section>

        {/* Single picture reindex */}
        <section className="panel">
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Reindex Single Picture</h2>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
              Queue one specific picture by UUID. Useful after manual DB edits or to fix a broken
              search document without running a full rebuild.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Input
              value={pictureId}
              onChange={(e) => setPictureId(e.target.value)}
              placeholder="Picture UUID (e.g. 018f…)"
              onKeyDown={(e) => e.key === 'Enter' && void handleReindexOne()}
              style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <Button
              variant="primary"
              onClick={() => void handleReindexOne()}
              disabled={loadingOne || !pictureId.trim()}
            >
              {loadingOne ? '…' : 'Go'}
            </Button>
          </div>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.78rem' }}>
            Returns 404 if the picture does not exist.
          </p>
        </section>
      </div>

      {/* How it works */}
      <section className="panel soft">
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>How the search index works</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            {
              step: '1',
              title: 'Enqueue',
              desc: 'Each reindex call pushes picture IDs into the async task executor queue (capacity: 500).',
            },
            {
              step: '2',
              title: 'Build content',
              desc: 'Worker threads fetch the picture\'s name, filename, and tags, then join them into a text document.',
            },
            {
              step: '3',
              title: 'Upsert document',
              desc: 'The content is saved (or updated) in the picture_search_document table keyed by picture_id.',
            },
            {
              step: '4',
              title: 'Retry on failure',
              desc: 'Up to 3 attempts with 200ms × attempt back-off. Permanent failures are counted in metrics.',
            },
          ].map((item) => (
            <div key={item.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(239,107,47,0.15)', color: '#b84e1f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 800, flexShrink: 0,
              }}>
                {item.step}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 3 }}>{item.title}</div>
                <div style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Activity log */}
      {log.length > 0 && (
        <section className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Activity Log</h3>
            <Button variant="plain" onClick={() => setLog([])} style={{ fontSize: '0.82rem', padding: '4px 12px' }}>
              Clear
            </Button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {log.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: entry.status === 'success'
                    ? 'rgba(31,138,112,0.07)'
                    : 'rgba(220,38,38,0.07)',
                  border: `1px solid ${entry.status === 'success' ? 'rgba(31,138,112,0.15)' : 'rgba(220,38,38,0.15)'}`,
                }}
              >
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                  {entry.status === 'success' ? '✓' : '✕'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>
                    {entry.message}
                  </div>
                  {entry.pictureId && (
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                      {entry.pictureId}
                    </div>
                  )}
                </div>
                <time style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </time>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
