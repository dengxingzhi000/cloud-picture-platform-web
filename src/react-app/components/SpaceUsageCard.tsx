import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSpaceUsage, type SpaceUsage } from '@/api/spaces'
import { formatBytes } from '@/utils/format'

type Props = { spaceId: string }

export default function SpaceUsageCard({ spaceId }: Props) {
  const { t } = useTranslation()
  const [usage, setUsage] = useState<SpaceUsage | null>(null)

  useEffect(() => {
    void getSpaceUsage(spaceId).then(setUsage).catch(() => {})
  }, [spaceId])

  if (!usage) return null

  const percent = usage.quotaBytes > 0 ? (usage.usedBytes / usage.quotaBytes) * 100 : 0

  return (
    <div className="panel" style={{ padding: 16 }}>
      <h4>{t('space.usage')}</h4>
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>{formatBytes(usage.usedBytes)}</span>
          <span>{formatBytes(usage.quotaBytes)}</span>
        </div>
        <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(percent, 100)}%`, background: percent > 90 ? '#ef4444' : percent > 70 ? '#f59e0b' : '#3b82f6', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
          {t('space.fileCount', { count: usage.fileCount })}
        </div>
      </div>
    </div>
  )
}
