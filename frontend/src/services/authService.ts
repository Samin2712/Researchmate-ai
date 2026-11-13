import { api } from './api'
import type { User } from '../types'
export const authService = {
  me: async () => (await api.get<User>('/auth/me')).data,
  login: async (email: string, password: string) =>
    (await api.post<{ access_token: string }>('/auth/login/json', { email, password })).data,
  register: async (email: string, password: string, full_name: string) =>
    (await api.post<User>('/auth/register', { email, password, full_name })).data,
}
