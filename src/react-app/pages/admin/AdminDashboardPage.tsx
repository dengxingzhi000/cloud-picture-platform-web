import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPending, reindexAllPictures, type AdminPictureSummary } from '@/api/pictures'
import { Button } from '@/react-app/ui/shadcn/button'

type StatCard = {
  label: string
  value: string | number
  icon: string
  accent: string
  bg: string
}

function StatCard({ card }: { card: StatCard }) {
  return (
      <div
        className="responsive-two-col"
        style={{
        padding: '20px 22px',
        borderRadius: 16,
        background: 'var(--bg-surface)',
        border: '1px solid var(--stroke-soft)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        transition: 'all 0.15s ease',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: card.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          flexShrink: 0,
        }}
      >
        {card.icon}
      </div>
      <div>
        <div
          style={{
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--ink-soft)',
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          {card.label}
        </div>
        <div style={{ fontWeight: 800, fontSize: '1.6rem', lineHeight: 1.1, color: card.accent }}>
          {card.value}
        </div>
      </div>
    </div>
  )
}

type QuickAction = {
  label: string
  description: string
  icon: string
  path: string
  accent: string
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(action.path)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '18px 20px',
        borderRadius: 14,
        background: 'var(--bg-surface)',
        border: '1px solid var(--stroke-soft)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = action.accent
        e.currentTarget.style.boxShadow = `0 4px 20px ${action.accent}15`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--stroke-soft)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${action.accent}12`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          flexShrink: 0,
        }}
      >
        {action.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink-strong)' }}>{action.label}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: 2 }}>{action.description}</div>
      </div>
      <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>→</span>
    </button>
  )
}

function PendingReviewItem({ item }: { item: AdminPictureSummary }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => {
        sessionStorage.setItem('cpp:admin:selected', JSON.stringify(item))
        navigate(`/admin/reviews/${item.id}`)
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        borderRadius: 12,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          overflow: 'hidden',
          background: '#efe7dd',
          flexShrink: 0,
        }}
      >
        <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.85rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: 2 }}>
          by {item.ownerDisplayName || item.ownerUsername || 'Unknown'}
        </div>
      </div>
      <span
        style={{
          padding: '3px 10px',
          borderRadius: 999,
          fontSize: '0.72rem',
          fontWeight: 700,
          background: 'rgba(138,92,0,0.1)',
          color: '#8a5c00',
          flexShrink: 0,
        }}
      >
        PENDING
      </span>
    </button>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [pendingItems, setPendingItems] = useState<AdminPictureSummary[]>([])
  const [pendingTotal, setPendingTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reindexing, setReindexing] = useState(false)
  const [reindexMsg, setReindexMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await listPending(0, 5)
        if (!cancelled) {
          setPendingItems(data.items)
          setPendingTotal(data.total)
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleReindex = async () => {
    setReindexing(true)
    setReindexMsg(null)
    try {
      const res = await reindexAllPictures()
      setReindexMsg(`Queued ${res.queued} pictures for reindexing.`)
    } catch {
      setReindexMsg('Reindex failed. Check server logs.')
    } finally {
      setReindexing(false)
    }
  }

  const stats: StatCard[] = [
    {
      label: 'Pending Reviews',
      value: loading ? '—' : pendingTotal,
      icon: '◈',
      accent: '#b84e1f',
      bg: 'rgba(239,107,47,0.1)',
    },
    {
      label: 'Queue Status',
      value: pendingTotal > 0 ? 'Active' : 'Clear',
      icon: '◉',
      accent: pendingTotal > 0 ? '#d97706' : '#116350',
      bg: pendingTotal > 0 ? 'rgba(217,119,6,0.1)' : 'rgba(31,138,112,0.1)',
    },
    {
      label: 'System',
      value: 'Online',
      icon: '●',
      accent: '#116350',
      bg: 'rgba(31,138,112,0.1)',
    },
  ]

  const quickActions: QuickAction[] = [
    {
      label: 'Review Queue',
      description: 'Moderate pending picture submissions',
      icon: '◈',
      path: '/admin/reviews',
      accent: '#ef6b2f',
    },
    {
      label: 'Search Index',
      description: 'Rebuild search documents for pictures',
      icon: '◎',
      path: '/admin/search-index',
      accent: '#1f8a70',
    },
    {
      label: 'Public Gallery',
      description: 'View the public-facing gallery',
      icon: '⊞',
      path: '/gallery',
      accent: '#0369a1',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 800 }}>Dashboard</h1>
        <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
          Overview of system status and pending moderation tasks.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {stats.map((card) => (
          <StatCard key={card.label} card={card} />
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left: Pending reviews */}
        <section
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--stroke-soft)',
            borderRadius: 18,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 20px',
              borderBottom: '1px solid var(--stroke-soft)',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Pending Reviews</h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                {loading ? 'Loading…' : `${pendingTotal} picture${pendingTotal !== 1 ? 's' : ''} awaiting moderation`}
              </p>
            </div>
            {pendingTotal > 0 && (
              <Button
                variant="primary"
                onClick={() => navigate('/admin/reviews')}
                style={{ fontSize: '0.82rem', padding: '7px 14px' }}
              >
                View All →
              </Button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-soft)' }}>Loading…</div>
          ) : pendingItems.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✓</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>All clear</div>
              <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                No pictures are pending review right now.
              </div>
            </div>
          ) : (
            <div style={{ padding: '8px 6px' }}>
              {pendingItems.map((item) => (
                <PendingReviewItem key={item.id} item={item} />
              ))}
              {pendingTotal > 5 && (
                <div style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <button
                    onClick={() => navigate('/admin/reviews')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--accent)',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                    }}
                  >
                    View all {pendingTotal} pending →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right: Quick actions + system */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick actions */}
          <section
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--stroke-soft)',
              borderRadius: 18,
              padding: '18px 16px',
            }}
          >
            <h2
              style={{
                margin: '0 0 14px',
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--ink-soft)',
                fontWeight: 700,
              }}
            >
              Quick Actions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {quickActions.map((action) => (
                <QuickActionCard key={action.label} action={action} />
              ))}
            </div>
          </section>

          {/* System actions */}
          <section
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--stroke-soft)',
              borderRadius: 18,
              padding: '18px 16px',
            }}
          >
            <h2
              style={{
                margin: '0 0 14px',
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--ink-soft)',
                fontWeight: 700,
              }}
            >
              System
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--stroke-soft)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 4 }}>Search Reindex</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginBottom: 10, lineHeight: 1.5 }}>
                  Rebuild all search documents. Safe to run at any time.
                </div>
                <Button
                  variant="plain"
                  onClick={() => void handleReindex()}
                  disabled={reindexing}
                  style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                >
                  {reindexing ? 'Queuing…' : '🔄 Reindex All'}
                </Button>
                {reindexMsg && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: '0.78rem',
                      color: '#116350',
                      fontWeight: 600,
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: 'rgba(31,138,112,0.08)',
                    }}
                  >
                    {reindexMsg}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
