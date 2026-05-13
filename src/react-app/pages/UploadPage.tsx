import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  checkDuplicatePicture,
  uploadPicture,
  uploadPictureWithDeduplication,
  type PictureResponse,
} from '@/api/pictures'
import { listTeams, type TeamSummary } from '@/api/teams'
import { Button } from '@/react-app/ui/shadcn/button'
import { formatBytes } from '@/utils/format'

type VisibilityOption = 'PUBLIC' | 'PRIVATE' | 'TEAM'

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export default function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<VisibilityOption>('PRIVATE')
  const [customName, setCustomName] = useState('')
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('')
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [useDedup, setUseDedup] = useState(true)

  const [checking, setChecking] = useState(false)
  const [duplicateInfo, setDuplicateInfo] = useState<{ exists: boolean; pictureId?: string | null; message: string } | null>(null)

  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<PictureResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    listTeams().then(setTeams).catch(() => {})
  }, [])

  const processFile = async (f: File) => {
    setFile(f)
    setResult(null)
    setError(null)
    setDuplicateInfo(null)
    setCustomName(f.name.replace(/\.[^/.]+$/, ''))

    // Generate preview for images
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPreview(url)
    } else {
      setPreview(null)
    }

    // Quick SHA-256 dedup check
    if (useDedup) {
      setChecking(true)
      try {
        const hash = await sha256Hex(f)
        const res = await checkDuplicatePicture(hash)
        setDuplicateInfo(res)
      } catch { /* ignore */ } finally {
        setChecking(false)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void processFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) void processFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setProgress(0)

    const fakeProgress = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 88))
    }, 200)

    try {
      const payload = {
        file,
        visibility,
        name: customName.trim() || undefined,
        spaceId: selectedSpaceId || undefined,
      }
      const res = useDedup
        ? await uploadPictureWithDeduplication(payload)
        : await uploadPicture(payload)
      setProgress(100)
      setResult(res as PictureResponse)
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Upload failed. Please try again.')
    } finally {
      clearInterval(fakeProgress)
      setUploading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setDuplicateInfo(null)
    setProgress(0)
    setCustomName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const visibilityLabels: Record<VisibilityOption, { icon: string; label: string; desc: string }> = {
    PRIVATE: { icon: '🔒', label: 'Private', desc: 'Only you can see this' },
    PUBLIC: { icon: '🌐', label: 'Public', desc: 'Visible to everyone, requires review' },
    TEAM: { icon: '👥', label: 'Team', desc: 'Visible to your team members' },
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload Picture</h1>
          <p className="page-subtitle">
            Supported formats: JPG, PNG, GIF, WebP, SVG — up to 50 MB
          </p>
        </div>
      </div>

      {result ? (
        /* Success state */
        <section className="panel" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: '0 0 8px' }}>Upload Successful!</h2>
          <p style={{ color: 'var(--ink-soft)', margin: '0 0 24px' }}>
            <strong>{result.name}</strong> has been uploaded as{' '}
            <strong>{result.visibility}</strong>
          </p>
          {result.reviewStatus === 'PENDING' && (
            <div style={{
              padding: '12px 18px', borderRadius: 14,
              background: 'rgba(138,92,0,0.1)', color: '#8a5c00',
              fontSize: '0.88rem', marginBottom: 20, fontWeight: 600,
            }}>
              🕐 This public image is pending review before it appears in the gallery.
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => navigate(`/pictures/${result.id}`)}>
              View Picture
            </Button>
            <Button variant="plain" onClick={reset}>
              Upload Another
            </Button>
          </div>
        </section>
      ) : (
        <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
          {/* Drop zone */}
          <div>
            <div
              ref={dropRef}
              onClick={() => !file && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'rgba(31,138,112,0.5)' : 'var(--stroke-soft)'}`,
                borderRadius: 24,
                background: dragging ? 'rgba(239,107,47,0.05)' : file ? 'rgba(31,138,112,0.04)' : 'var(--bg-elevated)',
                minHeight: 280,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: file ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {preview ? (
                <>
                  <img src={preview} alt="Preview" style={{ maxHeight: 280, maxWidth: '100%', objectFit: 'contain' }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); reset() }}
                    style={{
                      position: 'absolute', top: 12, right: 12,
                      background: 'rgba(32,26,22,0.7)', border: 'none',
                      borderRadius: '50%', width: 28, height: 28,
                      cursor: 'pointer', color: '#fff', fontSize: '1rem', lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>{dragging ? '📂' : '🖼️'}</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {dragging ? 'Release to upload' : 'Drop image here'}
                  </div>
                  <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: 16 }}>
                    or click to browse files
                  </div>
                  <Button variant="primary" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
                    Browse Files
                  </Button>
                </div>
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} aria-label="Upload picture file" style={{ display: 'none' }} />

            {/* File info */}
            {file && (
              <div className="panel soft" style={{ marginTop: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                    {file.name}
                  </div>
                  <div style={{ color: 'var(--ink-soft)', fontSize: '0.78rem' }}>
                    {formatBytes(file.size)} · {file.type || 'unknown type'}
                  </div>
                </div>
                {checking && <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Checking...</span>}
                {!checking && duplicateInfo?.exists && (
                  <span style={{ fontSize: '0.78rem', color: '#b84e1f', fontWeight: 700, background: 'rgba(239,107,47,0.1)', padding: '4px 10px', borderRadius: 8 }}>
                    ⚡ Instant upload available
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <section className="panel">
            <h3 style={{ margin: '0 0 18px', fontSize: '1rem' }}>Upload Settings</h3>

            {/* Name */}
            <label className="field" style={{ marginBottom: 14 }}>
              <span className="label">Name</span>
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Picture name (leave blank to use filename)"
                style={{ padding: '9px 12px', borderRadius: 12, border: '1px solid var(--stroke-soft)', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
              />
            </label>

            {/* Visibility */}
            <div style={{ marginBottom: 14 }}>
              <div className="label" style={{ marginBottom: 8 }}>Visibility</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(Object.keys(visibilityLabels) as VisibilityOption[]).map((v) => {
                  const { icon, label, desc } = visibilityLabels[v]
                  return (
                    <label
                      key={v}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px',
                        borderRadius: 14,
                        border: `2px solid ${visibility === v ? 'var(--accent)' : 'var(--stroke-soft)'}`,
                        background: visibility === v ? 'rgba(239,107,47,0.06)' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        value={v}
                        checked={visibility === v}
                        onChange={() => setVisibility(v)}
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>{desc}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Team space selection */}
            {visibility === 'TEAM' && teams.length > 0 && (
              <label className="field" style={{ marginBottom: 14 }}>
                <span className="label">Target team space</span>
                <select
                  value={selectedSpaceId}
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: 12, border: '1px solid var(--stroke-soft)', fontSize: '0.9rem', width: '100%' }}
                >
                  <option value="">Select a team...</option>
                  {teams.map((t) => (
                    <option key={t.spaceId ?? t.id} value={t.spaceId ?? ''}>{t.name}</option>
                  ))}
                </select>
              </label>
            )}

            {/* Dedup toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 18 }}>
              <input
                type="checkbox"
                checked={useDedup}
                onChange={(e) => setUseDedup(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>⚡ Smart deduplication</div>
                <div style={{ color: 'var(--ink-soft)', fontSize: '0.75rem' }}>
                  Instantly upload if this file already exists in the system
                </div>
              </div>
            </label>

            {/* Duplicate notice */}
            {duplicateInfo?.exists && (
              <div style={{
                padding: '10px 14px', borderRadius: 12, marginBottom: 14,
                background: 'rgba(239,107,47,0.1)', color: '#b84e1f',
                fontSize: '0.85rem', fontWeight: 600,
              }}>
                ⚡ {duplicateInfo.message}
                {duplicateInfo.pictureId && (
                  <button
                    onClick={() => navigate(`/pictures/${duplicateInfo.pictureId}`)}
                    style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: 'inherit', fontSize: 'inherit' }}
                  >
                    View existing →
                  </button>
                )}
              </div>
            )}

            {/* Progress bar */}
            {uploading && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--stroke-soft)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, var(--accent), rgba(239,107,47,0.6))',
                    transition: 'width 0.2s ease',
                  }} />
                </div>
                <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--ink-soft)', textAlign: 'right' }}>
                  {Math.round(progress)}%
                </div>
              </div>
            )}

            {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

            <Button
              variant="primary"
              onClick={() => void handleUpload()}
              disabled={!file || uploading}
              style={{ width: '100%', height: 44, fontSize: '0.95rem' }}
            >
              {uploading ? `Uploading... ${Math.round(progress)}%` : '⬆ Upload Picture'}
            </Button>
          </section>
        </div>
      )}
    </div>
  )
}
