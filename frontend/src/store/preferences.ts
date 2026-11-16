import { create } from 'zustand'
import { persist } from 'zustand/middleware'
export const usePreferences = create(
  persist<{
    reduceMotion: boolean
    setReduceMotion: (value: boolean) => void
    defaultExplanationMode: 'standard' | 'simple'
    setDefaultExplanationMode: (mode: 'standard' | 'simple') => void
  }>(
    (set) => ({
      reduceMotion: false,
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      defaultExplanationMode: 'standard',
      setDefaultExplanationMode: (defaultExplanationMode) => set({ defaultExplanationMode }),
    }),
    { name: 'researchmate.preferences' },
  ),
)
