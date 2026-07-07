import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listWebhooks, createWebhook, deleteWebhook, testWebhook, type Webhook } from '@/api/webhooks'
import { useToast } from '@/react-app/toast'
import { Button } from '@/react-app/ui/shadcn/button'
import { Input } from '@/react-app/ui/shadcn/input'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/react-app/ui/shadcn/dialog'

const AVAILABLE_EVENTS = ['PICTURE_UPLOADED', 'PICTURE_APPROVED', 'PICTURE_REJECTED', 'TEAM_MEMBER_JOINED', 'TEAM_MEMBER_LEFT']

export default function WebhooksPage() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newEvents, setNewEvents] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const loadWebhooks = async () => {
    setLoading(true)
    try {
      const res = await listWebhooks()
      setWebhooks(res.items)
    } catch { addToast(t('common.error'), 'error') } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadWebhooks() }, [])

  const handleCreate = async () => {
    if (!newUrl.trim() || newEvents.length === 0) return
    setCreating(true)
    try {
      await createWebhook({ url: newUrl.trim(), events: newEvents })
      setShowCreate(false)
      setNewUrl('')
      setNewEvents([])
      void loadWebhooks()
    } catch { addToast(t('common.error'), 'error') } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('webhooks.confirmDelete'))) return
    try {
      await deleteWebhook(id)
      void loadWebhooks()
    } catch { addToast(t('common.error'), 'error') }
  }

  const handleTest = async (id: string) => {
    try {
      await testWebhook(id)
      addToast(t('webhooks.testSuccess'), 'success')
    } catch {
      addToast(t('webhooks.testFailed'), 'error')
    }
  }

  const toggleEvent = (event: string) => {
    setNewEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event])
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{t('webhooks.title')}</h1>
        <Button variant="primary" onClick={() => setShowCreate(true)}>{t('webhooks.create')}</Button>
      </div>

      {loading ? (
        <div className="panel shimmer" style={{ height: 200 }} />
      ) : webhooks.length === 0 ? (
        <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
          <p>{t('webhooks.empty')}</p>
        </section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {webhooks.map((wh) => (
            <div key={wh.id} className="panel" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{wh.url}</strong>
                  <div style={{ fontSize: 13, opacity: 0.5 }}>
                    {wh.events.join(', ')} · {wh.active ? t('webhooks.active') : t('webhooks.inactive')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="plain" size="sm" onClick={() => handleTest(wh.id)}>{t('webhooks.test')}</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(wh.id)}>{t('common.delete')}</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>{t('webhooks.createTitle')}</DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="field">
              <span className="label">{t('webhooks.url')}</span>
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
            </label>
            <div>
              <span className="label">{t('webhooks.events')}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {AVAILABLE_EVENTS.map((event) => (
                  <button key={event} className={`badge ${newEvents.includes(event) ? 'badge-primary' : ''}`} onClick={() => toggleEvent(event)} style={{ cursor: 'pointer' }}>
                    {event}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="plain" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating}>{t('common.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
