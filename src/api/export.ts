import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type WatermarkConfig = {
  enabled: boolean
  text?: string
  imageUrl?: string
  position: 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT' | 'CENTER'
  opacity: number
}

export type ExportPreset = {
  id: string
  name: string
  format: 'PNG' | 'JPEG' | 'WEBP'
  quality?: number
  maxWidth?: number
  maxHeight?: number
}

export type ExportTask = {
  id: string
  pictureId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  downloadUrl?: string
  createdAt: string
}

export async function getWatermark(teamId: string) {
  const response = await api.get<ApiResponse<WatermarkConfig>>(`/api/v1/teams/${teamId}/watermark`)
  return unwrap(response.data)
}

export async function updateWatermark(teamId: string, config: WatermarkConfig) {
  const response = await api.put<ApiResponse<WatermarkConfig>>(`/api/v1/teams/${teamId}/watermark`, config)
  return unwrap(response.data)
}

export async function listExportPresets(teamId: string) {
  const response = await api.get<ApiResponse<PageResponse<ExportPreset>>>(`/api/v1/teams/${teamId}/export-presets`)
  return unwrap(response.data)
}

export async function createExportPreset(teamId: string, preset: Omit<ExportPreset, 'id'>) {
  const response = await api.post<ApiResponse<ExportPreset>>(`/api/v1/teams/${teamId}/export-presets`, preset)
  return unwrap(response.data)
}

export async function deleteExportPreset(presetId: string) {
  const response = await api.delete<ApiResponse<void>>(`/api/v1/export-presets/${presetId}`)
  return unwrap(response.data)
}

export async function exportPicture(pictureId: string, payload: { presetId?: string; format?: string; quality?: number }) {
  const response = await api.post<ApiResponse<ExportTask>>(`/api/v1/pictures/${pictureId}/export`, payload)
  return unwrap(response.data)
}

export async function getExportTask(taskId: string) {
  const response = await api.get<ApiResponse<ExportTask>>(`/api/v1/export-tasks/${taskId}`)
  return unwrap(response.data)
}
