import { api } from './api'
import type { User } from '../types'
export const authService = {
  verifyEmail: async (token: string) =>
    (await api.post<{ message: string }>('/auth/verify-email', { token })).data,
  resendVerification: async (email: string) =>
    (await api.post<{ message: string }>('/auth/resend-verification', { email })).data,
  providers: async () =>
    (await api.get<{ google_client_id: string | null }>('/auth/providers')).data,
  google: async (credential: string) =>
    (await api.post<{ access_token: string }>('/auth/google', { credential })).data,
  forgotPassword: async (email: string) =>
    (await api.post<{ message: string }>('/auth/forgot-password', { email })).data,
  resetPassword: async (token: string, new_password: string) =>
    (await api.post<{ message: string }>('/auth/reset-password', { token, new_password })).data,
  changePassword: async (current_password: string, new_password: string) =>
    (
      await api.post<{ message: string }>('/auth/change-password', {
        current_password,
        new_password,
      })
    ).data,
  me: async () => (await api.get<User>('/auth/me')).data,
  updateProfile: async (data: {
    full_name: string
    institution?: string
    bio?: string
    research_interests?: string
    default_explanation_mode?: 'standard' | 'simple'
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
