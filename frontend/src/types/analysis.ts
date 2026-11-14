/**
 * Types for comparison matrix and literature review analysis.
 */

export type AnalysisKind = 'comparison' | 'literature_review'

export type AnalysisStatus =
  | 'pending'
  | 'extracting'
  | 'synthesizing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface EvidenceReference {
  source_id: string
  document_id: number
  chunk_id?: number | null
  page_number?: number | null
  page_label?: string | null
  quote: string
  title?: string | null
  metadata?: Partial<import('./collections').DocumentWithCollections>
  authors?: string | null
}

// Comparison Matrix Types
export interface ComparisonCellValue {
  value: string
  evidence: EvidenceReference[]
  confidence?: 'high' | 'medium' | 'low' | null
}

export interface ComparisonRow {
  field: string
  label: string
  cells: Record<number, ComparisonCellValue>
}

export interface ComparisonMatrixResult {
  rows: ComparisonRow[]
  document_ids: number[]
  document_titles: Record<number, string>
  coverage: Record<number, Record<string, boolean>>
  warnings: string[]
}

// Literature Review Types
export interface ReviewSection {
  heading: string
  content: string
  citations: string[]
}

export interface LiteratureReviewResult {
  title: string
  abstract: string
  sections: ReviewSection[]
  bibliography: Record<string, EvidenceReference>
  coverage: Record<number, 'included' | 'insufficient' | 'failed'>
  themes: string[]
  research_question?: string | null
}

// Analysis Run Types
export interface AnalysisRunCreate {
  force?: boolean
  kind: AnalysisKind
  document_ids: number[]
  parameters?: Record<string, unknown> | null
}

export interface AnalysisRun {
  id: number
  user_id: number
  kind: AnalysisKind
  status: AnalysisStatus
  document_ids: number[]
  document_revisions?: Record<string, string> | null
  parameters?: Record<string, unknown> | null
  stage?: string | null
  progress_percent: number
  result?: ComparisonMatrixResult | LiteratureReviewResult | null
  error_message?: string | null
  prompt_version?: string | null
  schema_version?: string | null
  model_provider?: string | null
  model_name?: string | null
  created_at: string
  updated_at?: string | null
  completed_at?: string | null
}

// Review Edit Types
export interface ReviewEditCreate {
  edited_content: string
  citation_ids?: string[] | null
  user_modified_citations?: string[] | null
}

export interface ReviewEdit {
  id: number
  analysis_run_id: number
  user_id: number
  edited_content: string
  citation_ids?: string[] | null
  user_modified_citations?: string[] | null
  version: number
  created_at: string
}

// Export Types
export interface ExportFormat {
  format: 'markdown' | 'csv' | 'pdf'
  include_evidence?: boolean
  include_bibliography?: boolean
}
