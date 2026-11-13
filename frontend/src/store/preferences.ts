import { create } from 'zustand'
import { persist } from 'zustand/middleware'
export const usePreferences = create(
  persist<{ reduceMotion: boolean; setReduceMotion: (value: boolean) => void }>(
    (set) => ({ reduceMotion: false, setReduceMotion: (reduceMotion) => set({ reduceMotion }) }),
    { name: 'researchmate.preferences' },
  ),
)
