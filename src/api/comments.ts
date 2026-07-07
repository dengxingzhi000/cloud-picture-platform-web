import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type Comment = {
  id: string
  pictureId: string
  userId: string
  username: string
  avatarUrl?: string
  content: string
  resolved: boolean
  createdAt: string
  updatedAt: string
}

export async function listComments(
  pictureId: string,
  params?: { page?: number; size?: number }
) {
  const response = await api.get<ApiResponse<PageResponse<Comment>>>(
    `/api/v1/pictures/${pictureId}/comments`,
    { params }
  )
  return unwrap(response.data)
}

export async function createComment(
  pictureId: string,
  payload: { content: string }
) {
  const response = await api.post<ApiResponse<Comment>>(
    `/api/v1/pictures/${pictureId}/comments`,
    payload
  )
  return unwrap(response.data)
}

export async function updateComment(
  pictureId: string,
  commentId: string,
  payload: { content: string }
) {
  const response = await api.patch<ApiResponse<Comment>>(
    `/api/v1/pictures/${pictureId}/comments/${commentId}`,
    payload
  )
  return unwrap(response.data)
}

export async function deleteComment(pictureId: string, commentId: string) {
  const response = await api.delete<ApiResponse<void>>(
    `/api/v1/pictures/${pictureId}/comments/${commentId}`
  )
  return unwrap(response.data)
}

export async function resolveComment(pictureId: string, commentId: string) {
  const response = await api.post<ApiResponse<Comment>>(
    `/api/v1/pictures/${pictureId}/comments/${commentId}/resolve`
  )
  return unwrap(response.data)
}
