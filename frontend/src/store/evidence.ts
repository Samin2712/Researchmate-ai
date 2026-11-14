/**
 * Evidence notebook and source verification state
 */
import { create } from 'zustand'
import type { Source } from '../types'

interface SourcePanelState {
  isOpen: boolean
  source: Source | null
  messageId: number | null
  sourceIndex: number | null
}

interface EvidenceNotebookState {
  isOpen: boolean
  selectedNoteId: number | null
  filterCollectionId: number | null
  searchQuery: string
}

interface EvidenceStore {
  // Source verification panel
  sourcePanel: SourcePanelState
  openSourcePanel: (source: Source, messageId: number, sourceIndex: number) => void
  closeSourcePanel: () => void

  // Evidence notebook
  notebook: EvidenceNotebookState
  openNotebook: () => void
  closeNotebook: () => void
  setSelectedNote: (noteId: number | null) => void
  setNotebookFilter: (collectionId: number | null) => void
  setNotebookSearch: (query: string) => void

  // Evidence save flow
  isSavingEvidence: boolean
  evidenceToSave: {
    source: Source
    messageId: number
  } | null
  startSaveEvidence: (source: Source, messageId: number) => void
  cancelSaveEvidence: () => void
  setSavingStatus: (saving: boolean) => void
}

export const useEvidenceStore = create<EvidenceStore>((set) => ({
  // Source panel initial state
  sourcePanel: {
    isOpen: false,
    source: null,
    messageId: null,
    sourceIndex: null,
  },

  openSourcePanel: (source, messageId, sourceIndex) =>
    set({
      sourcePanel: {
        isOpen: true,
        source,
        messageId,
        sourceIndex,
      },
    }),

  closeSourcePanel: () =>
    set({
      sourcePanel: {
        isOpen: false,
        source: null,
        messageId: null,
        sourceIndex: null,
      },
    }),

  // Evidence notebook initial state
  notebook: {
    isOpen: false,
    selectedNoteId: null,
    filterCollectionId: null,
    searchQuery: '',
  },

  openNotebook: () =>
    set((state) => ({
      notebook: {
        ...state.notebook,
        isOpen: true,
      },
    })),

  closeNotebook: () =>
    set((state) => ({
      notebook: {
        ...state.notebook,
        isOpen: false,
      },
    })),

  setSelectedNote: (noteId) =>
    set((state) => ({
      notebook: {
        ...state.notebook,
        selectedNoteId: noteId,
      },
    })),

  setNotebookFilter: (collectionId) =>
    set((state) => ({
      notebook: {
        ...state.notebook,
        filterCollectionId: collectionId,
      },
    })),

  setNotebookSearch: (query) =>
    set((state) => ({
      notebook: {
        ...state.notebook,
        searchQuery: query,
      },
    })),

  // Evidence save flow
  isSavingEvidence: false,
  evidenceToSave: null,

  startSaveEvidence: (source, messageId) =>
    set({
      isSavingEvidence: true,
      evidenceToSave: { source, messageId },
    }),

  cancelSaveEvidence: () =>
    set({
      isSavingEvidence: false,
      evidenceToSave: null,
    }),

  setSavingStatus: (saving) =>
    set({
      isSavingEvidence: saving,
    }),
}))
