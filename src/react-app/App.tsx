import { FormEvent, Suspense, lazy, useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { BrowserRouter, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/react-app/auth'
import { updateProfile } from '@/api/auth'
import { ThemeProvider, useTheme } from '@/react-app/theme'
import {
  AdminReviewDetailPage,
  AdminReviewListPage,
  GalleryPage,
  LoginPage,
  PictureDetailPage,
  SearchPage,
  TagsPage,
  TeamDetailPage,
  TeamsPage,
  UploadPage,
} from '@/react-app/pages'
import { useTranslation } from 'react-i18next'
import { Button } from '@/react-app/ui/shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/react-app/ui/shadcn/dialog'
import { Input } from '@/react-app/ui/shadcn/input'
import { Select } from '@/react-app/ui/shadcn/select'

const PictureEditPage = lazy(() => import('@/react-app/pages/PictureEditPage'))

function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, refresh } = useAuth()
  const { i18n, t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDisplayName(user?.displayName ?? '')
    setAvatarUrl(user?.avatarUrl ?? '')
    setError(null)
  }, [open, user?.avatarUrl, user?.displayName])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        avatarUrl: avatarUrl.trim() || null,
      })
      await refresh()
      onOpenChange(false)
    } catch {
      setError(t('app.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('common.settings')}</DialogTitle>
        </DialogHeader>
        <form className="profile-form" onSubmit={(event) => void onSubmit(event)}>
          <label className="field">
            <span className="label">{t('app.displayName')}</span>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={user?.username || 'Display name'}
            />
          </label>
          <label className="field">
            <span className="label">{t('app.avatarUrl')}</span>
            <Input
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </label>
          <div className="profile-preview">
            {avatarUrl.trim() ? (
              <img src={avatarUrl.trim()} alt="Avatar preview" className="profile-avatar profile-avatar-lg" />
            ) : (
              <div className="profile-avatar profile-avatar-lg profile-avatar-fallback">
                {(displayName || user?.username || 'U').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="profile-preview-copy">
              <strong>{displayName.trim() || user?.displayName || user?.username || 'User'}</strong>
              <span>{user?.email || user?.username || 'No email available'}</span>
            </div>
          </div>
          <div className="settings-grid">
            <label className="field">
              <span className="label">{t('app.language')}</span>
              <Select
                value={i18n.language}
                onChange={(event) => void i18n.changeLanguage(event.target.value)}
              >
                <option value="zh-CN">中文</option>
                <option value="en">English</option>
              </Select>
            </label>
            <label className="field">
              <span className="label">{t('app.appearance')}</span>
              <Select
                value={theme}
                onChange={(event) => setTheme(event.target.value as 'light' | 'dark' | 'system')}
              >
                <option value="light">{t('app.themeLight')}</option>
                <option value="dark">{t('app.themeDark')}</option>
                <option value="system">{t('app.themeSystem')}</option>
              </Select>
            </label>
          </div>
          {error ? <div className="form-error">{error}</div> : null}
          <DialogFooter>
            <Button variant="plain" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? `${t('common.loading')}` : t('app.saveChanges')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ShellLayout() {
  const { user, isAuthed, isAdmin, logout } = useAuth()
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)

  const navItems = [
    { label: t('nav.gallery'), path: '/gallery' },
    { label: t('nav.search'), path: '/search', auth: true },
    { label: t('nav.upload'), path: '/upload', auth: true },
    { label: t('nav.teams'), path: '/teams', auth: true },
    { label: t('nav.tags'), path: '/tags', auth: true },
    { label: t('nav.adminReview'), path: '/admin/reviews', auth: true, admin: true },
  ]

  const visibleNavItems = navItems.filter(
    (item) => (!item.auth || isAuthed) && (!item.admin || isAdmin)
  )

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={() => navigate('/gallery')}>
          <span className="brand-mark"></span>
          <span className="brand-text">
            <span className="brand-title">{t('app.brandTitle')}</span>
            <span className="brand-sub">{t('app.brandSubtitle')}</span>
          </span>
        </button>
        <nav className="nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link${isActive || location.pathname.startsWith(item.path + '/') ? ' active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="auth-actions">
          <button
            type="button"
            className="theme-icon-button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label={resolvedTheme === 'dark' ? t('app.themeLight') : t('app.themeDark')}
            title={resolvedTheme === 'dark' ? t('app.themeLight') : t('app.themeDark')}
          >
            {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {isAuthed ? (
            <>
              <button type="button" className="user-pill user-card" onClick={() => setProfileOpen(true)}>
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user?.displayName || user?.username || 'User'} className="profile-avatar" />
                ) : (
                  <span className="profile-avatar profile-avatar-fallback">
                    {(user?.displayName || user?.username || 'U').slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="user-pill-copy">
                  <strong>{user?.displayName || user?.username || 'User'}</strong>
                  <span>{isAdmin ? t('app.roleAdmin') : t('app.roleMember')}</span>
                </span>
              </button>
              <Button variant="plain" onClick={() => setProfileOpen(true)}>
                {t('common.settings')}
              </Button>
              <Button
                variant="plain"
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
              >
                {t('common.logout')}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => navigate('/login')}>
              {t('common.login')}
            </Button>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <SettingsDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  )
}

function RequireAuth() {
  const { isAuthed, ready } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  if (!ready) {
    return <div className="page"><section className="panel">{t('common.loading')}</section></div>
  }
  if (!isAuthed) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  return <Outlet />
}

function RequireAdmin() {
  const { isAdmin, ready } = useAuth()
  const { t } = useTranslation()
  if (!ready) {
    return <div className="page"><section className="panel">{t('common.loading')}</section></div>
  }
  if (!isAdmin) {
    return <Navigate to="/gallery" replace />
  }
  return <Outlet />
}

function AppRoutes() {
  const { t } = useTranslation()
  return (
    <Suspense fallback={<div className="page"><section className="panel">{t('common.loading')}</section></div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/gallery" replace />} />
        <Route element={<ShellLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/search" element={<SearchPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/teams/:id" element={<TeamDetailPage />} />
            <Route path="/pictures/:id" element={<PictureDetailPage />} />
            <Route path="/pictures/:id/edit" element={<PictureEditPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="/admin/reviews" element={<AdminReviewListPage />} />
              <Route path="/admin/reviews/:id" element={<AdminReviewDetailPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/gallery" replace />} />
      </Routes>
    </Suspense>
  )
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
