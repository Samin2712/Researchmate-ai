import { create } from 'zustand'
export const useToasts = create<{
  items: { id: number; text: string; kind: 'success' | 'error' }[]
  dismiss: (id: number) => void
}>((set) => ({
  items: [],
  dismiss: (id) => set((s) => ({ items: s.items.filter((item) => item.id !== id) })),
}))
let toastId = 0
export function toast(text: string, kind: 'success' | 'error' = 'success') {
  const id = ++toastId
  useToasts.setState((s) => ({ items: [...s.items.slice(-3), { id, text, kind }] }))
  window.setTimeout(() => useToasts.getState().dismiss(id), kind === 'error' ? 12000 : 6000)
}
