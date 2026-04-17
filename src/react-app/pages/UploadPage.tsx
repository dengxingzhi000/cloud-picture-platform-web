import { useState } from 'react'
import { uploadPicture, type PictureResponse } from '@/api/pictures'
import PageShell from './common/PageShell'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'TEAM'>('PRIVATE')
  const [loading, setLoading] = useState(false)
  const [resultName, setResultName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onUpload() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await uploadPicture({ file, visibility })
      setResultName((res as PictureResponse).name)
      setFile(null)
    } catch {
      setError('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title="Upload">
      <div style={{ display: 'grid', gap: 12 }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Visibility</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
            <option value="PUBLIC">PUBLIC</option>
            <option value="PRIVATE">PRIVATE</option>
            <option value="TEAM">TEAM</option>
          </select>
        </label>
        {error ? <div style={{ color: '#c84c2b' }}>{error}</div> : null}
        <button type="button" disabled={!file || loading} onClick={() => void onUpload()}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
        {resultName ? <div>Uploaded: {resultName}</div> : null}
      </div>
    </PageShell>
  )
}

