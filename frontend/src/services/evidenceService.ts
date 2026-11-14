/**
 * Evidence notebook API service
 */
import { api } from './api'
import axios from 'axios'
import type { EvidenceNote, EvidenceNoteCreate, EvidenceNoteUpdate } from '../types'

export interface EvidenceNoteListResponse {
  items: EvidenceNote[]
  total: number
  page: number
  page_size: number
}

export interface EvidenceExportRequest {
  note_ids: number[]
  include_collection_info: boolean
}

/**
 * Create a new evidence note
 */
export const createEvidenceNote = async (
  data: EvidenceNoteCreate
): Promise<EvidenceNote> => {
  const response = await api.post('/evidence/notes', data)
  return response.data
}

/**
 * List evidence notes with pagination and filtering
 */
export const listEvidenceNotes = async (params: {
  page?: number
  page_size?: number
  collection_id?: number
  document_id?: number
  search?: string
}): Promise<EvidenceNoteListResponse> => {
  const response = await api.get('/evidence/notes', { params })
  return response.data
}

/**
 * Get a specific evidence note
 */
export const getEvidenceNote = async (noteId: number): Promise<EvidenceNote> => {
  const response = await api.get(`/evidence/notes/${noteId}`)
  return response.data
}

/**
 * Update an evidence note
 */
export const updateEvidenceNote = async (
  noteId: number,
  data: EvidenceNoteUpdate
): Promise<EvidenceNote> => {
  const response = await api.patch(`/evidence/notes/${noteId}`, data)
  return response.data
}

/**
 * Delete an evidence note
 */
export const deleteEvidenceNote = async (noteId: number): Promise<void> => {
  await api.delete(`/evidence/notes/${noteId}`)
}

/**
 * Export evidence notes as Markdown
 */
export const exportEvidenceNotes = async (
  data: EvidenceExportRequest
): Promise<Blob> => {
  const response = await api.post('/evidence/notes/export', data, {
    responseType: 'blob',
  })
  return response.data
}

export const fetchDocumentPdf = async (documentId: number, signal?: AbortSignal): Promise<Blob> => {
  try {
    const response = await api.get(`/evidence/documents/${documentId}/pdf`, { responseType: 'blob', signal })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const message = await error.response.data.text()
      try {
        const body: { detail?: unknown } = JSON.parse(message)
        if (typeof body.detail === 'string') throw new Error(body.detail)
      } catch (parsed) {
        if (parsed instanceof Error && !(parsed instanceof SyntaxError)) throw parsed
      }
    }
    throw error
  }
}

export interface EvidenceDetail {
  document_id: number
  document_title: string
  document_authors: string | null
  page_count: number | null
  content_hash: string | null
  page_number: number | null
  page_label: string | null
  chunk_id: number | null
  source_quote: string | null
  highlight_status: 'available' | 'unavailable' | 'ambiguous' | 'unknown_page' | 'no_extractable_text'
  rects: { x: number; y: number; width: number; height: number }[]
}

export const getEvidenceDetail = async (params: {
  document_id: number
  page_number?: number
  chunk_id?: number
  quote?: string
}, signal?: AbortSignal): Promise<EvidenceDetail> => {
  const { document_id, ...query } = params
  const response = await api.get(`/evidence/documents/${document_id}/evidence-detail`, { params: query, signal })
  return response.data
}
