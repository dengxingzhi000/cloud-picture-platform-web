import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { uploadDocument, chatRag, deleteDocument, listDocuments, type RagDocument, type RagChatResult } from '@/api/rag'
import { Button } from '@/react-app/ui/shadcn/button'
import { Textarea } from '@/react-app/ui/shadcn/textarea'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: RagChatResult['sources']
}

export default function RagPage() {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState<RagDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    listDocuments().then(setDocuments).catch(() => {})
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const doc = await uploadDocument(file)
      setDocuments((prev) => [doc, ...prev])
    } catch {} finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const userMessage = input.trim()
    setInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setSending(true)
    try {
      const result = await chatRag({ sessionId, message: userMessage })
      setSessionId(result.sessionId)
      setChatMessages((prev) => [...prev, { role: 'assistant', content: result.answer, sources: result.sources }])
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: t('rag.error') }])
    } finally {
      setSending(false)
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    try {
      await deleteDocument(docId)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch {}
  }

  return (
    <div className="page" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, height: 'calc(100vh - 120px)' }}>
      <div className="panel" style={{ padding: 16, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>{t('rag.documents')}</h3>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" style={{ display: 'none' }} onChange={handleUpload} />
          <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? t('common.uploading') : t('rag.upload')}
          </Button>
        </div>
        {documents.length === 0 ? (
          <p style={{ opacity: 0.5, textAlign: 'center', padding: 24 }}>{t('rag.noDocuments')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {documents.map((doc) => (
              <div key={doc.id} className="panel" style={{ padding: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{doc.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.5 }}>{doc.chunkCount} chunks · {doc.status}</div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteDoc(doc.id)}>×</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginBottom: 12 }}>{t('rag.chat')}</h3>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
          {chatMessages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              {t('rag.welcome')}
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '8px 12px', borderRadius: 8, background: msg.role === 'user' ? '#3b82f6' : '#f3f4f6', color: msg.role === 'user' ? '#fff' : '#000' }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7, borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 8 }}>
                  <div style={{ fontWeight: 500 }}>{t('rag.sources')}:</div>
                  {msg.sources.map((s, j) => (
                    <div key={j}>· {s.documentName} (chunk {s.chunkIndex}, score: {s.score.toFixed(2)})</div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('rag.placeholder')} rows={1} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} />
          <Button variant="primary" onClick={handleSend} disabled={sending || !input.trim()}>{t('rag.send')}</Button>
        </div>
      </div>
    </div>
  )
}
