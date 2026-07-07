import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type Album = {
  id: string
  name: string
  description?: string
  coverPictureId?: string
  coverPictureUrl?: string
  spaceId: string
  pictureCount: number
  createdAt: string
  updatedAt: string
}

export type AlbumPicture = {
  id: string
  name: string
  url: string
  thumbnailUrl?: string
  width: number
  height: number
  addedAt: string
}

export async function listAlbums(params: {
  spaceId: string
  page?: number
  size?: number
}) {
  const response = await api.get<ApiResponse<PageResponse<Album>>>(
    '/api/v1/albums',
    { params }
  )
  return unwrap(response.data)
}

export async function getAlbum(albumId: string) {
  const response = await api.get<ApiResponse<Album>>(
    `/api/v1/albums/${albumId}`
  )
  return unwrap(response.data)
}

export async function createAlbum(payload: {
  name: string
  description?: string
  spaceId: string
}) {
  const response = await api.post<ApiResponse<Album>>(
    '/api/v1/albums',
    payload
  )
  return unwrap(response.data)
}

export async function updateAlbum(
  albumId: string,
  payload: { name?: string; description?: string }
) {
  const response = await api.patch<ApiResponse<Album>>(
    `/api/v1/albums/${albumId}`,
    payload
  )
  return unwrap(response.data)
}

export async function deleteAlbum(albumId: string) {
  const response = await api.delete<ApiResponse<void>>(
    `/api/v1/albums/${albumId}`
  )
  return unwrap(response.data)
}

export async function listAlbumPictures(
  albumId: string,
  params?: { page?: number; size?: number }
) {
  const response = await api.get<ApiResponse<PageResponse<AlbumPicture>>>(
    `/api/v1/albums/${albumId}/pictures`,
    { params }
  )
  return unwrap(response.data)
}

export async function addPicturesToAlbum(
  albumId: string,
  pictureIds: string[]
) {
  const response = await api.post<ApiResponse<void>>(
    `/api/v1/albums/${albumId}/pictures`,
    { pictureIds }
  )
  return unwrap(response.data)
}

export async function removePictureFromAlbum(
  albumId: string,
  pictureId: string
) {
  const response = await api.delete<ApiResponse<void>>(
    `/api/v1/albums/${albumId}/pictures/${pictureId}`
  )
  return unwrap(response.data)
}

export async function setAlbumCover(albumId: string, pictureId: string) {
  const response = await api.patch<ApiResponse<void>>(
    `/api/v1/albums/${albumId}/cover`,
    { pictureId }
  )
  return unwrap(response.data)
}