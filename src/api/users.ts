import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type AdminUserSummary = {
  id: string
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  status: string
  roles: string[]
  createdAt: string
}

export async function listUsers(keyword?: string, status?: string, page = 0, size = 20) {
  const params: Record<string, string | number> = { page, size }
  if (keyword) params.keyword = keyword
  if (status) params.status = status
  const response = await api.get<ApiResponse<PageResponse<AdminUserSummary>>>('/api/admin/users', { params })
  return unwrap(response.data)
}
