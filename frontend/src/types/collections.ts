import type { Document } from './index'

export interface Collection {
  id: number
  user_id: number
  name: string
  description?: string | null
  created_at: string
  updated_at?: string | null
  document_count: number
}

export interface Tag {
  id: number
  user_id: number
  name: string
  color?: string | null
}

export interface DocumentWithCollections extends Document {
  structured_authors?: { given: string; family: string }[] | null
  tag_ids?: number[]
  collection_ids?: number[]
  doi?: string | null
  journal?: string | null
  volume?: string | null
  issue?: string | null
  pages?: string | null
  publisher?: string | null
  url?: string | null
  document_type?: string | null
}
