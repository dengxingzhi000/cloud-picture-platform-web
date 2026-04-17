import PageShell from './common/PageShell'
import { useEffect, useState } from 'react'
import { listTeams, type TeamSummary } from '@/api/teams'

export default function TeamsPage() {
  const [items, setItems] = useState<TeamSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await listTeams()
        if (cancelled) return
        setItems(res)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageShell title="Teams">
      {loading ? <div>Loading...</div> : items.length ? <div>{items.length} teams loaded.</div> : <div>No teams.</div>}
    </PageShell>
  )
}

