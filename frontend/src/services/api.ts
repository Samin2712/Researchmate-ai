import axios from 'axios'
import { useAuth } from '../store/auth'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(
  /\/$/,
  '',
)
export const api = axios.create({ baseURL: API_URL, timeout: 30000 })
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login')
    ) {
      useAuth.getState().logout(true)
    }
    return Promise.reject(error)
  },
)
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail: unknown = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail))
      return detail.map((item: { msg?: string }) => item.msg || 'Invalid value').join('. ')
    if (!error.response) return 'Cannot reach the server. Check your connection and try again.'
    return `The request failed (${error.response.status}). Please try again.`
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
