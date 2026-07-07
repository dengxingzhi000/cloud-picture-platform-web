import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listApiKeys, createApiKey, deleteApiKey, type ApiKey } from '@/api/developer'
import { Button } from '@/react-app/ui/shadcn/button'
import { Input } from '@/react-app/ui/shadcn/input'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/react-app/ui/shadcn/dialog'

export default function DeveloperPage() {
  const { t } = useTranslation()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const loadKeys = async () => {
    setLoading(true)
    try {
      const res = await listApiKeys()
      setKeys(res.items)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadKeys() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const result = await createApiKey({ name: newName.trim() })
      setCreatedKey(result.fullKey)
      setNewName('')
      void loadKeys()
    } catch {} finally {
      setCreating(false)
    }
  }

  const handleDelete = async (keyId: string) => {
    if (!confirm(t('developer.confirmDelete'))) return
    try {
      await deleteApiKey(keyId)
      void loadKeys()
    } catch {}
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{t('developer.title')}</h1>
        <Button variant="primary" onClick={() => { setShowCreate(true); setCreatedKey(null) }}>
          {t('developer.create')}
        </Button>
      </div>

      {loading ? (
        <div className="panel shimmer" style={{ height: 200 }} />
      ) : keys.length === 0 ? (
        <section className="panel soft" style={{ textAlign: 'center', padding: 48 }}>
          <p>{t('developer.empty')}</p>
        </section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {keys.map((key) => (
            <div key={key.id} className="panel" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{key.name}</strong>
                <div style={{ fontSize: 13, opacity: 0.5 }}>
                  {key.keyPrefix}*** · {t('developer.created')} {new Date(key.createdAt).toLocaleDateString()}
                  {key.lastUsedAt && ` · ${t('developer.lastUsed')} ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={() => handleDelete(key.id)}>{t('common.delete')}</Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>{createdKey ? t('developer.keyCreated') : t('developer.createTitle')}</DialogHeader>
          {createdKey ? (
            <div>
              <p style={{ marginBottom: 8 }}>{t('developer.copyKey')}</p>
              <Input value={createdKey} readOnly />
              <p style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>{t('developer.keyWarning')}</p>
            </div>
          ) : (
            <label className="field">
              <span className="label">{t('developer.name')}</span>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </label>
          )}
          <DialogFooter>
            <Button variant="plain" onClick={() => setShowCreate(false)}>{createdKey ? t('common.close') : t('common.cancel')}</Button>
            {!createdKey && <Button variant="primary" onClick={handleCreate} disabled={creating}>{t('common.create')}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}