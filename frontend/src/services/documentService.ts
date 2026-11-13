import { api } from './api'
import type { Document } from '../types'
export const MAX_UPLOAD_BYTES = Number(import.meta.env.VITE_MAX_UPLOAD_BYTES) || 10485760
export function validateFile(file: Pick<File, 'name' | 'size' | 'type'>): string | null {
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf'))
    return 'Choose a PDF file (.pdf).'
  if (file.size === 0) return 'This file is empty. Choose a PDF with content.'
  if (file.size > MAX_UPLOAD_BYTES)
    return `Choose a PDF smaller than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`
  return null
}
export const documentService = {
  list: async (signal?: AbortSignal) => {
    const documents: Document[] = []
    let total = 0
    do {
      const { data } = await api.get<{ documents: Document[]; total: number }>('/documents', {
        params: { skip: documents.length, limit: 100 },
        signal,
      })
      documents.push(...data.documents)
      total = data.total
      if (!data.documents.length) break
    } while (documents.length < total)
    return { documents, total }
  },
  get: async (id: number) => (await api.get<Document>(`/documents/${id}`)).data,
  retry: async (id: number) => (await api.post<Document>(`/documents/${id}/retry`)).data,
  remove: async (id: number) => {
    await api.delete(`/documents/${id}`)
  },
  upload: async (file: File, onProgress: (percent: number) => void, signal?: AbortSignal) => {
    const body = new FormData()
    body.append('file', file)
    return (
      await api.post<Document>('/documents/upload', body, {
        signal,
        timeout: 120000,
        onUploadProgress: (event) => {
          if (event.total) onProgress(Math.round((event.loaded * 100) / event.total))
        },
      })
    ).data
  },
}
