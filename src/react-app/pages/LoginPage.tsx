import { FormEvent, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { useAuth } from '@/react-app/auth'

export default function LoginPage() {
  const { applyAuth, refresh } = useAuth()
  const nav = useNavigate()
  const location = useLocation()

  const redirect = useMemo(() => {
    const sp = new URLSearchParams(location.search)
    return sp.get('redirect') || '/gallery'
  }, [location.search])

  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const auth = await login({ usernameOrEmail, password })
      applyAuth(auth.token, { userId: auth.userId, username: auth.username })
      await refresh()
      nav(redirect)
    } catch {
      setError('Login failed. Please check your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <section className="panel">
        <h1 className="page-title">Login</h1>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Username or Email</span>
            <input value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} required />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error ? <div style={{ color: '#c84c2b' }}>{error}</div> : null}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </section>
    </div>
  )
}

