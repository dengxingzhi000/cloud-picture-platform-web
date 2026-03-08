import { computed, ref } from 'vue'
import { fetchMe } from '@/api/auth'
import type { StoredUser } from '@/utils/auth'
import { clearToken, clearUser, getToken, getUser, setUser } from '@/utils/auth'

const user = ref<StoredUser | null>(getUser())

async function refresh() {
  if (!getToken()) {
    user.value = null
    return
  }
  try {
    const me = await fetchMe()
    setUser(me)
    user.value = me
  } catch {
    user.value = null
  }
}

function logout() {
  clearToken()
  clearUser()
  user.value = null
}

export function useAuth() {
  const isAuthed = computed(() => Boolean(getToken()))
  return {
    user,
    isAuthed,
    refresh,
    logout,
  }
}
