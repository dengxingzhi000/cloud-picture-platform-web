import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type TagInfo = {
  id: string
  name: string
  createdAt: string
}

export async function listTags(params: { page?: number; size?: number; keyword?: string }) {
  const response = await api.get<ApiResponse<PageResponse<TagInfo>>>('/api/v1/tags', { params })
  return unwrap(response.data)
}

export async function createTag(payload: { name: string }) {
  const response = await api.post<ApiResponse<TagInfo>>('/api/v1/tags', payload)
  return unwrap(response.data)
}

export async function updateTag(tagId: string, payload: { name: string }) {
  const response = await api.patch<ApiResponse<TagInfo>>(`/api/tags/${tagId}`, payload)
  return unwrap(response.data)
}

export async function deleteTag(tagId: string) {
  const response = await api.delete<ApiResponse<void>>(`/api/tags/${tagId}`)
  return unwrap(response.data)
}
