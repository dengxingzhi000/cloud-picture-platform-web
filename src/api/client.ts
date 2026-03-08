import axios from 'axios'
import { clearToken, clearUser, getToken } from '@/utils/auth'

export type ApiResponse<T> = {
  success: boolean
  code: string
  message: string
  data: T
}

export type PageResponse<T> = {
  items: T[]
  total: number
  page: number
  size: number
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      clearToken()
      clearUser()
    }
    return Promise.reject(error)
  }
)

export function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.message || 'Request failed')
  }
  return response.data
}

export default api
