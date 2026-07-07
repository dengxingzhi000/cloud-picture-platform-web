import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { exportPicture, getExportTask, type ExportTask } from '@/api/export'
import { Button } from '@/react-app/ui/shadcn/button'

type Props = { pictureId: string }

export default function ExportPanel({ pictureId }: Props) {
  const { t } = useTranslation()
  const [format, setFormat] = useState<'PNG' | 'JPEG' | 'WEBP'>('PNG')
  const [quality, setQuality] = useState(90)
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<ExportTask | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const task = await exportPicture(pictureId, { format, quality })
      let pollCount = 0
      const poll = async () => {
        if (!mountedRef.current) return
        const updated = await getExportTask(task.id)
        if (updated.status === 'COMPLETED' || updated.status === 'FAILED' || pollCount > 30) {
          if (mountedRef.current) setResult(updated)
          if (mountedRef.current) setExporting(false)
          return
        }
        pollCount++
        timeoutRef.current = setTimeout(poll, 1000)
      }
      await poll()
    } catch {} finally {
      if (mountedRef.current) setExporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3>{t('export.title')}</h3>
      <label className="field">
        <span className="label">{t('export.format')}</span>
        <select className="select" value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
          <option value="PNG">PNG</option>
          <option value="JPEG">JPEG</option>
          <option value="WEBP">WEBP</option>
        </select>
      </label>
      {format !== 'PNG' && (
        <label className="field">
          <span className="label">{t('export.quality')} ({quality}%)</span>
          <input type="range" min="10" max="100" value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
        </label>
      )}
      <Button variant="primary" onClick={handleExport} disabled={exporting}>
        {exporting ? t('export.exporting') : t('export.download')}
      </Button>
      {result?.status === 'COMPLETED' && result.downloadUrl && (
        <a href={result.downloadUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="plain">{t('export.downloadFile')}</Button>
        </a>
      )}
      {result?.status === 'FAILED' && (
        <p style={{ color: '#ef4444' }}>{t('export.failed')}</p>
      )}
    </div>
  )
}
