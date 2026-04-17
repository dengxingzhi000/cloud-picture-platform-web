import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
}

const STORAGE_KEY = 'cpp:theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme !== 'system') return theme
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system'
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
    return 'system'
  })
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(theme))

  useEffect(() => {
    const next = resolveTheme(theme)
    setResolvedTheme(next)
    document.documentElement.dataset.theme = next
    window.localStorage.setItem(STORAGE_KEY, theme)

    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => {
      const mode = media.matches ? 'dark' : 'light'
      setResolvedTheme(mode)
      document.documentElement.dataset.theme = mode
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [theme])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
