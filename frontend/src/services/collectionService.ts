import { api } from './api'
import type { Collection, Tag } from '../types/collections'
import type { Document } from '../types'

export const collectionService = {
  listCollections: async () => (await api.get<Collection[]>('/collections')).data,
  createCollection: async (name: string, description?: string) =>
    (await api.post<Collection>('/collections', { name, description })).data,
  updateCollection: async (id: number, data: { name?: string; description?: string }) =>
    (await api.patch<Collection>(`/collections/${id}`, data)).data,
  deleteCollection: async (id: number) => {
    await api.delete(`/collections/${id}`)
  },
  getCollectionDocuments: async (id: number) =>
    (await api.get<Document[]>(`/collections/${id}/documents`)).data,
  addDocumentsToCollection: async (collectionId: number, documentIds: number[]) =>
    (await api.post(`/collections/${collectionId}/documents`, { document_ids: documentIds })).data,
  removeDocumentsFromCollection: async (collectionId: number, documentIds: number[]) =>
    (
      await api.delete(`/collections/${collectionId}/documents`, {
        data: { document_ids: documentIds },
      })
    ).data,

  listTags: async () => (await api.get<Tag[]>('/tags')).data,
  createTag: async (name: string, color?: string) =>
    (await api.post<Tag>('/tags', { name, color })).data,
  updateTag: async (id: number, data: { name?: string; color?: string }) =>
    (await api.patch<Tag>(`/tags/${id}`, data)).data,
  deleteTag: async (id: number) => {
    await api.delete(`/tags/${id}`)
  },
  addTagToDocument: async (documentId: number, tagId: number) =>
    (await api.post(`/documents/${documentId}/tags`, { tag_id: tagId })).data,
  removeTagFromDocument: async (documentId: number, tagId: number) =>
    (await api.delete(`/documents/${documentId}/tags/${tagId}`)).data,

  downloadBibtex: async (documentId: number) => {
    const res = await api.get(`/documents/${documentId}/bibtex`, { responseType: 'blob' })
    return res.data as Blob
  },
  bulkExportBibtex: async (documentIds: number[]) => {
    const res = await api.post(
      '/documents/bibtex-export',
      { document_ids: documentIds },
      { responseType: 'blob' },
    )
    return res.data as Blob
  },

  updateDocumentMetadata: async (id: number, data: Record<string, unknown>) =>
    (await api.patch(`/documents/${id}`, data)).data,
}
