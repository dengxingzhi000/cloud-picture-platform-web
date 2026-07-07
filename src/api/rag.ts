import api, { unwrap } from '@/api/client'
import type { ApiResponse } from '@/api/client'

export type RagDocument = {
  id: string
  name: string
  fileName: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  chunkCount: number
  createdAt: string
}

export type RagQueryResult = {
  answer: string
  sources: Array<{
    documentId: string
    documentName: string
    chunkIndex: number
    content: string
    score: number
  }>
}

export type RagChatResult = {
  sessionId: string
  answer: string
  sources: Array<{
    documentId: string
    documentName: string
    chunkIndex: number
    content: string
    score: number
  }>
}

export async function uploadDocument(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post<ApiResponse<RagDocument>>('/api/rag/documents/upload', formData)
  return unwrap(response.data)
}

export async function queryRag(payload: { query: string; documentIds?: string[] }) {
  const response = await api.post<ApiResponse<RagQueryResult>>('/api/rag/query', payload)
  return unwrap(response.data)
}

export async function chatRag(payload: { sessionId?: string; message: string; documentIds?: string[] }) {
  const response = await api.post<ApiResponse<RagChatResult>>('/api/rag/chat', payload)
  return unwrap(response.data)
}

export async function deleteDocument(documentId: string) {
  const response = await api.delete<ApiResponse<void>>(`/api/rag/documents/${documentId}`)
  return unwrap(response.data)
}
