/**
 * Zustand store for analysis UI state.
 */
import { create } from 'zustand'

interface AnalysisState {
  // Comparison matrix state
  expandedCells: Set<string> // Format: "rowField-docId"
  expandCell: (rowField: string, docId: number) => void
  collapseCell: (rowField: string, docId: number) => void
  toggleCell: (rowField: string, docId: number) => void
  collapseCells: () => void

  // Literature review state
  selectedCitation: string | null
  setSelectedCitation: (citationId: string | null) => void

  // Review editor state
  hasUnsavedEdits: boolean
  setHasUnsavedEdits: (hasEdits: boolean) => void

  // General
  reset: () => void
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  // Comparison matrix
  expandedCells: new Set(),

  expandCell: (rowField, docId) => {
    const key = `${rowField}-${docId}`
    const expanded = new Set(get().expandedCells)
    expanded.add(key)
    set({ expandedCells: expanded })
  },

  collapseCell: (rowField, docId) => {
    const key = `${rowField}-${docId}`
    const expanded = new Set(get().expandedCells)
    expanded.delete(key)
    set({ expandedCells: expanded })
  },

  toggleCell: (rowField, docId) => {
    const key = `${rowField}-${docId}`
    const expanded = get().expandedCells
    if (expanded.has(key)) {
      get().collapseCell(rowField, docId)
    } else {
      get().expandCell(rowField, docId)
    }
  },

  collapseCells: () => {
    set({ expandedCells: new Set() })
  },

  // Literature review
  selectedCitation: null,
  setSelectedCitation: (citationId) => set({ selectedCitation: citationId }),

  // Review editor
  hasUnsavedEdits: false,
  setHasUnsavedEdits: (hasEdits) => set({ hasUnsavedEdits: hasEdits }),

  // General
  reset: () => {
    set({
      expandedCells: new Set(),
      selectedCitation: null,
      hasUnsavedEdits: false,
    })
  },
}))
