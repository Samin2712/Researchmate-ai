import { formatCitation } from '../components/tools/citations'
/**
 * Service for analysis operations (comparison matrix, literature review, gap analysis, disagreement explorer).
 */
import { api } from './api'
import type {
  AnalysisKind,
  AnalysisRun,
  AnalysisRunCreate,
  ReviewEdit,
  ReviewEditCreate,
} from '../types/analysis'

/**
 * Create a new analysis run (comparison or literature review).
 */
export async function createAnalysisRun(data: AnalysisRunCreate): Promise<AnalysisRun> {
  const response = await api.post('/analysis/runs', data)
  return response.data
}

/**
 * Get a list of analysis runs.
 */
export async function listAnalysisRuns(kind?: AnalysisKind, limit = 50): Promise<AnalysisRun[]> {
  const params = new URLSearchParams()
  if (kind) params.set('kind', kind)
  params.set('limit', String(limit))

  const response = await api.get(`/analysis/runs?${params.toString()}`)
  return response.data
}

/**
 * Get a single analysis run by ID.
 */
export async function getAnalysisRun(id: number): Promise<AnalysisRun> {
  const response = await api.get(`/analysis/runs/${id}`)
  return response.data
}

/**
 * Cancel a running analysis.
 */
export async function cancelAnalysisRun(id: number): Promise<void> {
  await api.post(`/analysis/runs/${id}/cancel`)
}

/**
 * Delete an analysis run.
 */
export async function deleteAnalysisRun(id: number): Promise<void> {
  await api.delete(`/analysis/runs/${id}`)
}

/**
 * Save an edit to a literature review.
 */
export async function saveReviewEdit(runId: number, data: ReviewEditCreate): Promise<ReviewEdit> {
  const response = await api.post(`/analysis/runs/${runId}/edits`, data)
  return response.data
}

/**
 * Get the latest edit for a literature review.
 */
export async function getLatestReviewEdit(runId: number): Promise<ReviewEdit | null> {
  const response = await api.get(`/analysis/runs/${runId}/edits/latest`)
  return response.data
}

const tableText = (value: string) => value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')

export function exportAsMarkdown(run: AnalysisRun, editedContent?: string): string {
  if (!run.result) return ''
  if (run.kind === 'comparison') {
    const result = run.result as import('../types/analysis').ComparisonMatrixResult
    let text = '# Comparison matrix\n\n'
    text += '| Field | ' + result.document_ids.map(id => tableText(result.document_titles[id])).join(' | ') + ' |\n'
    text += '|' + '---|'.repeat(result.document_ids.length + 1) + '\n'
    for (const row of result.rows) {
      text += '| ' + tableText(row.label) + ' | ' + result.document_ids.map(id => tableText(row.cells[id]?.value || 'Not reported')).join(' | ') + ' |\n'
    }
    text += '\n## Evidence\n\n'
    for (const row of result.rows) for (const id of result.document_ids) for (const ref of row.cells[id]?.evidence || []) {
      text += `- ${row.label}, ${ref.title}: [${ref.source_id}], page ${ref.page_label || ref.page_number || '?'}: “${ref.quote}”\n`
    }
    return text + '\n## Coverage\n\n' + JSON.stringify(result.coverage, null, 2) + '\n\n' + result.warnings.join('\n')
  }
  const result = run.result as import('../types/analysis').LiteratureReviewResult
  const content = editedContent ?? `# ${result.title}\n\n${result.abstract}\n\n${result.sections.map(section => `## ${section.heading}\n\n${section.content}`).join('\n\n')}`
  const citations = [...content.matchAll(/\[(doc\d+_chunk\d+|\d+)\](?!\()/g)].map(match => match[1])
  if (citations.some(id => !result.bibliography[id])) throw new Error('Unresolved citations: save and correct the draft before exporting')
  return 'Draft based on selected papers.\n\n' + (editedContent !== undefined ? 'Edited claims have not been revalidated.\n\n' : '') + content + '\n\n## References\n\n' +
    Object.entries(result.bibliography).map(([id, ref]) => `[${id}] ${formatCitation({title:ref.title || 'Unknown',authors:ref.authors ?? null,year:null,...ref.metadata}, 'APA')} Page ${ref.page_label || ref.page_number || '?'}. “${ref.quote}”`).join('\n\n') +
    '\n\n## Document coverage\n\n' + Object.entries(result.coverage).map(([id, status]) => `- Document ${id}: ${status}`).join('\n')
}

export function exportAsCSV(run: AnalysisRun): string {
  if (run.kind !== 'comparison' || !run.result) return ''
  const result = run.result as import('../types/analysis').ComparisonMatrixResult
  const escape = (value: string) => {
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : value
    return '"' + safe.replace(/"/g, '""') + '"'
  }
  const rows = [
    ['Field', ...result.document_ids.map(id => result.document_titles[id])],
    ...result.rows.map(row => [row.label, ...result.document_ids.map(id => row.cells[id]?.value || 'Not reported')]),
    ...result.rows.map(row => [row.label + ' — evidence', ...result.document_ids.map(id =>
      (row.cells[id]?.evidence || []).map(ref => `[${ref.source_id}] page ${ref.page_number}: ${ref.quote}`).join('; '))]),
  ]
  return rows.map(row => row.map(escape).join(',')).join('\r\n') + '\r\n'
}
