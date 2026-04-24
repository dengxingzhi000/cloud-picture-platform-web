import { type FormEvent, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login, register } from '@/api/auth'
import { useAuth } from '@/react-app/auth'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const { applyAuth, refresh } = useAuth()
  const nav = useNavigate()
  const location = useLocation()

  const redirect = useMemo(() => {
    const sp = new URLSearchParams(location.search)
    return sp.get('redirect') || '/gallery'
  }, [location.search])

  const [mode, setMode] = useState<Mode>('login')
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const auth = await login({ usernameOrEmail, password })
      applyAuth(auth.token, { userId: auth.userId, username: auth.username })
      await refresh()
      nav(redirect)
    } catch {
      setError('Invalid credentials. Please check your username/email and password.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    try {
      const auth = await register({
        username: username.trim(),
        email: email.trim() || undefined,
        password,
        displayName: displayName.trim() || undefined,
      })
      applyAuth(auth.token, { userId: auth.userId, username: auth.username })
      await refresh()
      nav(redirect)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Registration failed. The username or email may already be taken.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px', borderRadius: 14,
    border: '1px solid var(--stroke-soft)', fontSize: '0.95rem',
    background: 'rgba(255,255,255,0.85)', outline: 'none',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  }

  return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 20, margin: '0 auto 16px',
            background: 'conic-gradient(from 220deg, #ef6b2f, #f5b83d, #1f8a70, #ef6b2f)',
            boxShadow: '0 12px 30px rgba(239,107,47,0.25)',
          }} />
          <h1 style={{ margin: '0 0 6px', fontSize: '1.8rem', fontWeight: 900 }}>Cloud Canvas</h1>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.95rem' }}>
            {mode === 'login' ? 'Sign in to your workspace' : 'Create a new account'}
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 14, background: 'rgba(32,26,22,0.07)', padding: 4 }}>
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null) }}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 11, border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? 'var(--ink-strong)' : 'var(--ink-soft)',
                boxShadow: mode === m ? '0 2px 8px rgba(30,20,10,0.1)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        <section className="panel">
          {mode === 'login' ? (
            <form onSubmit={(e) => void handleLogin(e)} style={{ display: 'grid', gap: 14 }}>
              <label className="field">
                <span className="label">Username or email</span>
                <input
                  style={inputStyle}
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Enter username or email"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(239,107,47,0.5)'; e.target.style.boxShadow = '0 0 0 4px rgba(239,107,47,0.1)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--stroke-soft)'; e.target.style.boxShadow = 'none' }}
                />
              </label>
              <label className="field">
                <span className="label">Password</span>
                <input
                  style={inputStyle}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter password"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(239,107,47,0.5)'; e.target.style.boxShadow = '0 0 0 4px rgba(239,107,47,0.1)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--stroke-soft)'; e.target.style.boxShadow = 'none' }}
                />
              </label>
              {error && <div className="form-error">{error}</div>}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: 4, padding: '12px 0', borderRadius: 14, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontWeight: 700, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  transition: 'all 0.18s ease',
                }}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => void handleRegister(e)} style={{ display: 'grid', gap: 14 }}>
              <label className="field">
                <span className="label">Username *</span>
                <input
                  style={inputStyle}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="3–64 characters"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(239,107,47,0.5)'; e.target.style.boxShadow = '0 0 0 4px rgba(239,107,47,0.1)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--stroke-soft)'; e.target.style.boxShadow = 'none' }}
                />
              </label>
              <label className="field">
                <span className="label">Display name</span>
                <input
                  style={inputStyle}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How others see you (optional)"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(239,107,47,0.5)'; e.target.style.boxShadow = '0 0 0 4px rgba(239,107,47,0.1)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--stroke-soft)'; e.target.style.boxShadow = 'none' }}
                />
              </label>
              <label className="field">
                <span className="label">Email</span>
                <input
                  style={inputStyle}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="optional@example.com"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(239,107,47,0.5)'; e.target.style.boxShadow = '0 0 0 4px rgba(239,107,47,0.1)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--stroke-soft)'; e.target.style.boxShadow = 'none' }}
                />
              </label>
              <label className="field">
                <span className="label">Password *</span>
                <input
                  style={inputStyle}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(239,107,47,0.5)'; e.target.style.boxShadow = '0 0 0 4px rgba(239,107,47,0.1)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--stroke-soft)'; e.target.style.boxShadow = 'none' }}
                />
              </label>
              {error && <div className="form-error">{error}</div>}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: 4, padding: '12px 0', borderRadius: 14, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontWeight: 700, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  transition: 'all 0.18s ease',
                }}
              >
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}
        </section>

        <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button onClick={() => setMode('register')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: 'inherit' }}>
                Register
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: 'inherit' }}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
