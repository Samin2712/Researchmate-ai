/**
 * Types for comparison matrix and literature review analysis.
 */

export type AnalysisKind = 'comparison' | 'literature_review' | 'gap_analysis' | 'disagreement'

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
  result?: ComparisonMatrixResult | LiteratureReviewResult | GapAnalysisResult | DisagreementResult | null
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

// ─── Gap Analysis Types ───────────────────────────────────────────────────────

export type GapCategory =
  | 'methodology'
  | 'population'
  | 'dataset'
  | 'outcome_measure'
  | 'theoretical'
  | 'replication'
  | 'other'

export type GapSource = 'author_stated' | 'model_inferred' | 'missing_reporting'

export interface FeasibleProject {
  bounded_question: string
  suggested_method: string
  data_sources: string
  skills_required: string
  concrete_steps: string[]
  success_criteria: string
  time_budget?: string | null
  resource_budget?: string | null
}

export interface GapCandidate {
  id: string
  title: string
  gap_category: GapCategory
  scope: string
  gap_source: GapSource
  supporting_quotes: EvidenceReference[]
  evidence_basis: string
  rationale: string
  uncertainty: string
  proposed_research_question: string
  suggested_search_terms: string[]
  feasible_project: FeasibleProject
  coverage_note?: string | null
}

export interface GapAnalysisResult {
  candidates: GapCandidate[]
  coverage: Record<number, 'included' | 'insufficient' | 'failed'>
  warnings: string[]
  analysis_scope: string
}

export type AnalysisKindExtended = AnalysisKind | 'gap_analysis' | 'disagreement'

export interface GapAnalysisRunCreate {
  kind: 'gap_analysis'
  document_ids: number[]
  parameters?: {
    research_question?: string
    scope?: string
    time_budget?: string
    resource_budget?: string
  } | null
}

// Candidate review state
export interface CandidateReviewState {
  candidate_id: string
  status: 'saved' | 'dismissed' | null
  comment?: string | null
}

// Project brief saved from a gap candidate
export interface ProjectBrief {
  id: number
    analysis_run_id: number | null
  candidate_id: string
  user_id: number
  title: string
  research_question: string
  method: string
  data_sources: string
  steps: string[]
  success_criteria: string
    skills_required?: string | null
    time_budget?: string | null
    resource_budget?: string | null
  assumptions: string[]
  linked_source_ids: string[]
  created_at: string
}

// ─── Disagreement Explorer Types ─────────────────────────────────────────────

export type RelationshipType =
  | 'agreement'
  | 'apparent_disagreement'
  | 'different_context'
  | 'insufficient_evidence'

export interface ClaimSide {
  document_id: number
  document_title: string
  claim: string
  metric_or_outcome?: string | null
  population_or_dataset?: string | null
  method_or_context?: string | null
  evidence: EvidenceReference[]
}

export interface ClaimRelationship {
  id: string
  relationship_type: RelationshipType
  outcome_theme: string
  left: ClaimSide
  right: ClaimSide
  rationale: string
  distinguishing_factors?: string | null
}

export interface DisagreementResult {
  relationships: ClaimRelationship[]
  coverage: Record<number, 'included' | 'insufficient' | 'failed'>
  warnings: string[]
  themes: string[]
}
