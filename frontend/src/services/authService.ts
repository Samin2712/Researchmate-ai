import { api } from './api'
import type { User } from '../types'
export const authService = {
  me: async () => (await api.get<User>('/auth/me')).data,
  updateProfile: async (data: {
    full_name: string
    institution: string
    bio: string
    research_interests: string
  }) => (await api.patch<User>('/auth/me', data)).data,
  uploadPhoto: async (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return (await api.post<User>('/auth/me/photo', body)).data
  },
  removePhoto: async () => (await api.delete<User>('/auth/me/photo')).data,
  login: async (email: string, password: string) =>
    (await api.post<{ access_token: string }>('/auth/login/json', { email, password })).data,
  register: async (email: string, password: string, full_name: string) =>
    (await api.post<User>('/auth/register', { email, password, full_name })).data,
}
