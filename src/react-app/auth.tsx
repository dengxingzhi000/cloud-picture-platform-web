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
import { MenuProvider, useMenu, type MenuItem } from '@/react-app/menu'
import { PermissionProvider, usePermission } from '@/react-app/permission'

type AuthContextValue = {
  user: StoredUser | null
  isAuthed: boolean
  isAdmin: boolean
  ready: boolean
  refresh: () => Promise<void>
  applyAuth: (token: string, nextUser: StoredUser, menus?: MenuItem[], permissions?: string[]) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  return (
    <MenuProvider>
      <PermissionProvider>
        <AuthProviderInner>{children}</AuthProviderInner>
      </PermissionProvider>
    </MenuProvider>
  )
}

function AuthProviderInner({ children }: PropsWithChildren) {
  const { setMenus } = useMenu()
  const { setPermissions } = usePermission()
  const [user, setUserState] = useState<StoredUser | null>(() => getUser())
  const [ready, setReady] = useState(false)

  async function refresh() {
    if (!getToken()) {
      setUserState(null)
      setMenus([])
      setPermissions([])
      setReady(true)
      return
    }
    try {
      const me = await fetchMe()
      setUser(me.userInfo)
      setUserState(me.userInfo)
      setMenus(me.menus)
      setPermissions(me.userInfo.permissions ?? [])
    } catch {
      clearToken()
      clearUser()
      setUserState(null)
      setMenus([])
      setPermissions([])
    } finally {
      setReady(true)
    }
  }

  function applyAuth(token: string, nextUser: StoredUser, menus?: MenuItem[], permissions?: string[]) {
    setToken(token)
    setUser(nextUser)
    setUserState(nextUser)
    if (menus) setMenus(menus)
    if (permissions) setPermissions(permissions)
    setReady(true)
  }

  function logout() {
    clearToken()
    clearUser()
    setUserState(null)
    setMenus([])
    setPermissions([])
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
