import api, { unwrap } from '@/api/client'

export interface ExcalidrawSceneResponse {
  id: string
  pictureId: string | null
  sceneName: string
  snapshotData: string | null
  version: number
  lastSeq: number
  lastUpdatedByUserId: string
  createdAt: string
  updatedAt: string
}

export interface CreateExcalidrawSceneRequest {
  pictureId?: string
  sceneName?: string
}

export interface UpdateSnapshotRequest {
  snapshotData: string
}

export async function createScene(req: CreateExcalidrawSceneRequest): Promise<ExcalidrawSceneResponse> {
  return unwrap((await api.post<{ data: ExcalidrawSceneResponse }>('/api/v1/scenes', req)).data as any)
}

export async function getScene(sceneId: string): Promise<ExcalidrawSceneResponse> {
  return unwrap((await api.get<{ data: ExcalidrawSceneResponse }>(`/api/scenes/${sceneId}`)).data as any)
}

export async function getSceneByPictureId(pictureId: string): Promise<ExcalidrawSceneResponse> {
  return unwrap((await api.get<{ data: ExcalidrawSceneResponse }>(`/api/scenes/by-picture/${pictureId}`)).data as any)
}

export async function getSnapshot(sceneId: string): Promise<ExcalidrawSceneResponse> {
  return unwrap((await api.get<{ data: ExcalidrawSceneResponse }>(`/api/scenes/${sceneId}/snapshot`)).data as any)
}

export async function deleteScene(sceneId: string): Promise<void> {
  return unwrap((await api.delete<{ data: void }>(`/api/scenes/${sceneId}`)).data as any)
}

export async function updateSnapshot(sceneId: string, snapshotData: string): Promise<ExcalidrawSceneResponse> {
  return unwrap((await api.put<{ data: ExcalidrawSceneResponse }>(`/api/scenes/${sceneId}/snapshot`, { snapshotData })).data as any)
}
