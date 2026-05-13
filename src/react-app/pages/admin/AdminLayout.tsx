import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/react-app/auth'
import NotificationBell from '@/react-app/pages/NotificationBell'

type NavItem = {
  key: string
  label: string
  icon: string
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '⊞', path: '/admin' },
  { key: 'reviews', label: 'Review Queue', icon: '◈', path: '/admin/reviews' },
  { key: 'search', label: 'Search Index', icon: '◎', path: '/admin/search-index' },
]

const SIDEBAR_WIDTH = 240

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        style={{
          width: collapsed ? 64 : SIDEBAR_WIDTH,
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #1a1614 0%, #141210 100%)',
          borderRight: '1px solid rgba(255,230,200,0.06)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          zIndex: 30,
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: collapsed ? '20px 11px' : '20px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid rgba(255,230,200,0.06)',
            minHeight: 72,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'conic-gradient(from 220deg, #ef6b2f, #f5b83d, #1f8a70, #ef6b2f)',
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#f0e8de',
                  letterSpacing: '0.3px',
                }}
              >
                Cloud Canvas
              </div>
              <div style={{ fontSize: '0.68rem', color: '#8a7f74', fontWeight: 500 }}>
                Admin Console
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/admin'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px 0' : '10px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 10,
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#f0e8de' : '#8a7f74',
                background: isActive ? 'rgba(239,107,47,0.12)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              })}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0, width: 20, textAlign: 'center' }}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div style={{ padding: '8px', borderTop: '1px solid rgba(255,230,200,0.06)' }}>
          <button
            onClick={() => setCollapsed((c) => !c)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 8,
              border: 'none',
              background: 'rgba(255,230,200,0.04)',
              color: '#8a7f74',
              cursor: 'pointer',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ transition: 'transform 0.2s ease', transform: collapsed ? 'rotate(180deg)' : 'none' }}>
              ◀
            </span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 28px',
            background: 'rgba(248,244,239,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--stroke-soft)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NavLink
              to="/gallery"
              style={{
                fontSize: '0.78rem',
                color: 'var(--ink-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 8,
                border: '1px solid var(--stroke-soft)',
                background: 'var(--bg-surface)',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              ← Back to Site
            </NavLink>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--accent)',
                background: 'rgba(239,107,47,0.08)',
                padding: '4px 10px',
                borderRadius: 6,
              }}
            >
              Admin
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <NotificationBell />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                borderRadius: 10,
                background: 'var(--bg-surface)',
                border: '1px solid var(--stroke-soft)',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(239,107,47,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef6b2f',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                }}
              >
                {(user?.displayName || user?.username || 'A').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.2 }}>
                  {user?.displayName || user?.username}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--ink-soft)' }}>Administrator</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--stroke-soft)',
                background: 'var(--bg-surface)',
                color: 'var(--ink-soft)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            padding: '28px 32px 60px',
            maxWidth: 1280,
            width: '100%',
            margin: '0 auto',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
