import { api } from './api'
import type {
  DocumentQuestionSet,
  TermExplanationRequest,
  TermExplanationResponse,
} from '../types'

export const learningService = {
  getQuestions: async (documentId: number, signal?: AbortSignal) =>
    (await api.get<DocumentQuestionSet>(`/documents/${documentId}/questions`, { signal })).data,

  regenerateQuestions: async (documentId: number) =>
    (await api.post<DocumentQuestionSet>(`/documents/${documentId}/questions/regenerate`)).data,

  explainTerm: async (request: TermExplanationRequest, signal?: AbortSignal) =>
    (await api.post<TermExplanationResponse>('/chat/explain-term', request, { signal, timeout: 90000 })).data,
}
