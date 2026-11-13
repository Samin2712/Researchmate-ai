import { create } from 'zustand'

const KEY = 'researchmate.token'
export const useAuth = create<{
  token: string | null
  expired: boolean
  setToken: (token: string) => void
  logout: (expired?: boolean) => void
}>((set) => ({
  token: localStorage.getItem(KEY),
  expired: false,
  setToken: (token) => {
    localStorage.setItem(KEY, token)
    set({ token, expired: false })
  },
  logout: (expired = false) => {
    localStorage.removeItem(KEY)
    set({ token: null, expired })
  },
}))

export function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: number
    }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}
