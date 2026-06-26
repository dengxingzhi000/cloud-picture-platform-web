import api, { unwrap } from '@/api/client'
import type { ApiResponse } from '@/api/client'
import type { MenuItem } from '@/react-app/menu'

export type AuthResponse = {
  userId: string
  username: string
  token: string
  expiresAt: string
}

export type UserInfo = {
  userId: string
  username: string
  displayName?: string | null
  email?: string | null
  avatarUrl?: string | null
  roles?: string[]
  permissions?: string[]
}

export type LoginResponse = {
  token: string
  expiresAt: string
  userInfo: UserInfo
  menus: MenuItem[]
}

export type UserInfoWithMenusResponse = {
  userInfo: UserInfo
  menus: MenuItem[]
}

export async function login(payload: { usernameOrEmail: string; password: string }) {
  const response = await api.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', payload)
  return unwrap(response.data)
}

export async function register(payload: {
  username: string
  email?: string
  password: string
  displayName?: string
}) {
  const response = await api.post<ApiResponse<AuthResponse>>('/api/v1/auth/register', payload)
  return unwrap(response.data)
}

export async function fetchMe() {
  const response = await api.get<ApiResponse<UserInfoWithMenusResponse>>('/api/v1/auth/me')
  return unwrap(response.data)
}

export async function updateProfile(payload: { displayName?: string; avatarUrl?: string | null }) {
  const response = await api.patch<ApiResponse<UserInfo>>('/api/v1/auth/me', payload)
  return unwrap(response.data)
}
