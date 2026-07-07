import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { batchDelete, batchUpdateVisibility } from '@/api/batch'
import { useToast } from '@/react-app/toast'
import { Button } from '@/react-app/ui/shadcn/button'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/react-app/ui/shadcn/dialog'

type Props = {
  selectedIds: string[]
  onClearSelection: () => void
  onComplete: () => void
}

export default function BatchActions({ selectedIds, onClearSelection, onComplete }: Props) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [showVisibility, setShowVisibility] = useState(false)
  const [newVisibility, setNewVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'TEAM'>('PRIVATE')
  const [processing, setProcessing] = useState(false)

  if (selectedIds.length === 0) return null

  const handleDelete = async () => {
    if (!confirm(t('batch.confirmDelete', { count: selectedIds.length }))) return
    setProcessing(true)
    try {
      await batchDelete(selectedIds)
      onClearSelection()
      onComplete()
    } catch { addToast(t('common.error'), 'error') } finally {
      setProcessing(false)
    }
  }

  const handleVisibility = async () => {
    setProcessing(true)
    try {
      await batchUpdateVisibility(selectedIds, newVisibility)
      setShowVisibility(false)
      onClearSelection()
      onComplete()
    } catch { addToast(t('common.error'), 'error') } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      <div className="panel" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <span>{t('batch.selected', { count: selectedIds.length })}</span>
        <Button variant="plain" size="sm" onClick={() => setShowVisibility(true)}>
          {t('batch.changeVisibility')}
        </Button>
        <Button variant="danger" size="sm" onClick={handleDelete} disabled={processing}>
          {t('batch.delete')}
        </Button>
        <Button variant="plain" size="sm" onClick={onClearSelection}>
          {t('batch.clearSelection')}
        </Button>
      </div>

      <Dialog open={showVisibility} onOpenChange={setShowVisibility}>
        <DialogContent>
          <DialogHeader>{t('batch.setVisibility')}</DialogHeader>
          <select
            className="select"
            value={newVisibility}
            onChange={(e) => setNewVisibility(e.target.value as typeof newVisibility)}
          >
            <option value="PUBLIC">{t('visibility.PUBLIC')}</option>
            <option value="PRIVATE">{t('visibility.PRIVATE')}</option>
            <option value="TEAM">{t('visibility.TEAM')}</option>
          </select>
          <DialogFooter>
            <Button variant="plain" onClick={() => setShowVisibility(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleVisibility} disabled={processing}>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}