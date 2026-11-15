/**
 * Service for Gap Analysis and Disagreement Explorer features.
 */
import { api } from './api'
import type {
  AnalysisRun,
  GapAnalysisResult,
  DisagreementResult,
  CandidateReviewState,
  ProjectBrief,
} from '../types/analysis'

// ─── Gap Analysis API ─────────────────────────────────────────────────────────

export async function listCandidateStates(runId: number): Promise<CandidateReviewState[]> {
  return (await api.get(`/analysis/runs/${runId}/gaps`)).data
}

/**
 * Update the review state (saved/dismissed) of a gap candidate.
 */
export async function updateCandidateState(
  runId: number,
  candidateId: string,
  data: { status: 'saved' | 'dismissed' | null; comment?: string },
): Promise<CandidateReviewState> {
  const response = await api.patch(`/analysis/runs/${runId}/gaps/${candidateId}`, data)
  return response.data
}

/**
 * Save a gap candidate as a project brief.
 */
export async function saveProjectBrief(
  runId: number,
  candidateId: string,
  data: {
    assumptions?: string[]
    time_budget?: string
    resource_budget?: string
  },
): Promise<ProjectBrief> {
  const response = await api.post(`/analysis/runs/${runId}/gaps/${candidateId}/brief`, data)
  return response.data
}

/**
 * List project briefs for the current user.
 */
export async function listProjectBriefs(): Promise<ProjectBrief[]> {
  const response = await api.get('/analysis/briefs')
  return response.data
}

/**
 * Delete a project brief.
 */
export async function deleteProjectBrief(id: number): Promise<void> {
  await api.delete(`/analysis/briefs/${id}`)
}

// ─── Disagreement Explorer API ────────────────────────────────────────────────

/**
 * Save a claim relationship to the evidence notebook.
 */
export async function saveRelationshipEvidence(
  runId: number,
  relationshipId: string,
  data: { note?: string },
): Promise<{ saved: boolean }> {
  const response = await api.post(
    `/analysis/runs/${runId}/relationships/${relationshipId}/save`,
    data,
  )
  return response.data
}

// ─── Export Helpers ───────────────────────────────────────────────────────────

export function exportGapAnalysisMarkdown(run: AnalysisRun): string {
  if (!run.result || run.kind !== 'gap_analysis') return ''
  const result = run.result as GapAnalysisResult
  let text = '# Research Gap Analysis\n\n'
  if (run.parameters?.research_question) {
    text += `**Research question:** ${String(run.parameters.research_question)}\n\n`
  }
  text += `**Scope:** ${result.analysis_scope}\n\n`
  if (result.warnings.length) text += result.warnings.map((w) => `> ⚠ ${w}`).join('\n') + '\n\n'
  for (const c of result.candidates) {
    text += `## ${c.title}\n\n`
    text += `**Category:** ${c.gap_category} | **Source:** ${c.gap_source} | **Scope:** ${c.scope}\n\n`
    text += `**Evidence basis:** ${c.evidence_basis}\n\n`
    text += `**Rationale:** ${c.rationale}\n\n`
    text += `**Uncertainty:** ${c.uncertainty}\n\n`
    if (c.supporting_quotes.length) {
      text += '**Supporting evidence:**\n'
      for (const q of c.supporting_quotes) {
        text += `- [${q.source_id}] ${q.title || 'Unknown'}, p.${q.page_label || q.page_number || '?'}: "${q.quote}"\n`
      }
      text += '\n'
    }
    text += `**Proposed research question:** ${c.proposed_research_question}\n\n`
    const p = c.feasible_project
    text += `### Feasible student investigation\n\n`
    text += `**Bounded question:** ${p.bounded_question}\n\n`
    text += `**Method:** ${p.suggested_method}\n\n`
    text += `**Data sources:** ${p.data_sources}\n\n`
    text += `**Skills required:** ${p.skills_required}\n\n`
    if (p.concrete_steps.length) {
      text += '**Steps:**\n'
      p.concrete_steps.forEach((s, i) => {
        text += `${i + 1}. ${s}\n`
      })
      text += '\n'
    }
    text += `**Success criteria:** ${p.success_criteria}\n\n`
    text += `**Time budget:** ${p.time_budget || 'Requires verification'}\n\n`
    text += `**Resources:** ${p.resource_budget || 'Requires verification'}\n\n`
    text += `**Coverage:** ${c.coverage_note || 'Not found in the analyzed evidence.'}\n\n`
    text += `**Next searches:** ${c.suggested_search_terms.join(', ')}\n\n`
    text += '---\n\n'
  }
  return text
}

export function exportDisagreementMarkdown(run: AnalysisRun): string {
  if (!run.result || run.kind !== 'disagreement') return ''
  const result = run.result as DisagreementResult
  let text = '# Agreement & Disagreement Explorer\n\n'
  if (result.warnings.length) text += result.warnings.map((w) => `> ⚠ ${w}`).join('\n') + '\n\n'
  for (const r of result.relationships) {
    text += `## ${r.outcome_theme}\n\n`
    text += `**Relationship:** ${r.relationship_type}\n\n`
    text += `**Rationale:** ${r.rationale}\n\n`
    if (r.distinguishing_factors)
      text += `**Distinguishing factors:** ${r.distinguishing_factors}\n\n`
    text += `### Study A — ${r.left.document_title}\n\n`
    text += `Claim: ${r.left.claim}\n\n`
    if (r.left.evidence.length) {
      for (const q of r.left.evidence) {
        text += `- [${q.source_id}] p.${q.page_label || q.page_number || '?'}: "${q.quote}"\n`
      }
      text += '\n'
    }
    text += `### Study B — ${r.right.document_title}\n\n`
    text += `Claim: ${r.right.claim}\n\n`
    if (r.right.evidence.length) {
      for (const q of r.right.evidence) {
        text += `- [${q.source_id}] p.${q.page_label || q.page_number || '?'}: "${q.quote}"\n`
      }
      text += '\n'
    }
    text += '---\n\n'
  }
  return text
}
