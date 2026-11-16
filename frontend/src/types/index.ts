export interface User {
  id: number
  email: string
  full_name: string | null
  is_active: boolean
  created_at: string
  institution?: string | null
  bio?: string | null
  research_interests?: string | null
  avatar_url?: string | null
  default_explanation_mode?: 'standard' | 'simple'
}

export interface Document {
  id: number
  user_id: number
  title: string
  authors: string | null
  year: number | null
  abstract: string | null
  file_size: number | null
  page_count: number | null
  content_hash?: string | null
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  updated_at: string | null
}

export interface QuoteBounds {
  start: number
  end: number
}

export interface Source {
  source_number?: number
  document_id: number | string
  chunk_id?: number
  title: string
  authors?: string
  page_number?: number | string | null
  page_label?: string | null
  chunk_text?: string
  similarity_score?: number
  char_start?: number
  char_end?: number
  bbox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface EvidenceNote {
  id: number
  user_id: number
  collection_id: number | null
  document_id: number | null
  chunk_id: number | null
  page_number: number | null
  page_label: string | null
  source_quote: string
  document_title: string | null
  document_authors: string | null
  title: string | null
  note: string | null
  tags: string[] | null
  quote_bounds: QuoteBounds | null
  content_hash: string | null
  is_stale: number
  created_at: string
  updated_at: string | null
}

export interface EvidenceNoteCreate {
  document_id: number
  chunk_id?: number | null
  page_number?: number | null
  page_label?: string | null
  source_quote: string
  quote_bounds?: QuoteBounds | null
  title?: string | null
  note?: string | null
  tags?: string[] | null
  collection_id?: number | null
}

export interface EvidenceNoteUpdate {
  title?: string | null
  note?: string | null
  tags?: string[] | null
  collection_id?: number | null
}

export interface Message {
  /** Local state for a response interrupted before the server completed it. */
  incomplete?: boolean
  id: number
  session_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  sources: Source[] | null
  confidence_score: number | null
  explanation_mode?: 'standard' | 'simple' | string
  created_at: string
}

export interface Session {
  id: number
  user_id: number
  title: string
  created_at: string
  updated_at: string | null
}

export interface ChatRequest {
  message: string
  session_id?: number
  document_ids?: number[]
  explanation_mode?: 'standard' | 'simple'
}

export type QuestionCategory = 'comprehension' | 'methodology' | 'critical_thinking'

export interface StarterQuestion {
  category: QuestionCategory
  question: string
  evidence_quotes?: string[]
  page_numbers?: (number | null)[]
}

export interface DocumentQuestionSet {
  id?: number
  document_id: number
  status: 'pending' | 'ready' | 'unavailable' | 'failed'
  document_revision?: string | null
  prompt_version?: string
  model_provider?: string | null
  model_name?: string | null
  questions: StarterQuestion[]
  error_message?: string | null
  created_at?: string
  updated_at?: string | null
}

export interface TermExplanationRequest {
  document_id: number
  term: string
  context?: string
  page_number?: number
}

export interface TermExplanationResponse {
  term: string
  document_id: number
  explanation: string
  grounded_in_paper: boolean
  status: 'grounded' | 'general' | 'unavailable'
  source_quote?: string | null
  page_number?: number | null
}

export type StreamEvent =
  | { type: 'session'; session_id: number }
  | { type: 'answer'; content: string; done?: boolean }
  | { type: 'sources'; sources: Source[]; confidence?: number }
  | { type: 'metadata'; [key: string]: unknown }
  | { type: 'error'; error: string }
  | { type: 'complete' }
