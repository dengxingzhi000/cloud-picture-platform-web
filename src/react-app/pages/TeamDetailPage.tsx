import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageShell from './common/PageShell'
import { getTeamDetail, type TeamDetail } from '@/api/teams'

export default function TeamDetailPage() {
  const params = useParams()
  const teamId = String(params.id || '')
  const [detail, setDetail] = useState<TeamDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await getTeamDetail(teamId)
        if (!cancelled) setDetail(res)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (teamId) void run()
    return () => {
      cancelled = true
    }
  }, [teamId])

  return (
    <PageShell title="Team Detail">
      {loading ? <div>Loading...</div> : detail ? <div>{detail.name}</div> : <div>Team not found.</div>}
    </PageShell>
  )
}

