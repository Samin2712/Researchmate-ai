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
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  updated_at: string | null
}
export interface Source {
  source_number?: number
  document_id: number | string
  title: string
  authors?: string
  page_number?: number | string | null
  chunk_text?: string
  similarity_score?: number
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
}
export type StreamEvent =
  | { type: 'session'; session_id: number }
  | { type: 'answer'; content: string; done?: boolean }
  | { type: 'sources'; sources: Source[]; confidence?: number }
  | { type: 'metadata'; [key: string]: unknown }
  | { type: 'error'; error: string }
  | { type: 'complete' }
