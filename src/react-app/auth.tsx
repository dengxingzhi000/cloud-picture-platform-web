import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { fetchMe } from '@/api/auth'
import {
  clearToken,
  clearUser,
  getToken,
  getUser,
  setToken,
  setUser,
  type StoredUser,
} from '@/utils/auth'

type AuthContextValue = {
  user: StoredUser | null
  isAuthed: boolean
  isAdmin: boolean
  ready: boolean
  refresh: () => Promise<void>
  applyAuth: (token: string, nextUser: StoredUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUserState] = useState<StoredUser | null>(() => getUser())
  const [ready, setReady] = useState(false)

  async function refresh() {
    if (!getToken()) {
      setUserState(null)
      setReady(true)
      return
    }
    try {
      const me = await fetchMe()
      setUser(me)
      setUserState(me)
    } catch {
      clearToken()
      clearUser()
      setUserState(null)
    } finally {
      setReady(true)
    }
  }

  function applyAuth(token: string, nextUser: StoredUser) {
    setToken(token)
    setUser(nextUser)
    setUserState(nextUser)
    setReady(true)
  }

  function logout() {
    clearToken()
    clearUser()
    setUserState(null)
    setReady(true)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthed: Boolean(getToken()),
      isAdmin: user?.role === 'ADMIN',
      ready,
      refresh,
      applyAuth,
      logout,
    }),
    [ready, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
