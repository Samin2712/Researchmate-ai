/**
 * Analysis history list component.
 */
import { FileText, GitCompare, AlertCircle, CheckCircle, Loader2, Trash2, Telescope, Scale } from 'lucide-react'
import { useAnalysisRuns, useDeleteAnalysisRun } from '../../services/queries'
import { Loading, ErrorState } from '../shared/Feedback'
import type { AnalysisRun } from '../../types/analysis'

const KIND_LABELS: Record<string, string> = {
  comparison: 'Comparison Matrix',
  literature_review: 'Literature Review',
  gap_analysis: 'Research Gap Analysis',
  disagreement: 'Disagreement Explorer',
}

function KindIcon({ kind }: { kind: string }) {
  if (kind === 'comparison') return <GitCompare size={20} />
  if (kind === 'literature_review') return <FileText size={20} />
  if (kind === 'gap_analysis') return <Telescope size={20} />
  if (kind === 'disagreement') return <Scale size={20} />
  return <FileText size={20} />
}

interface AnalysisHistoryProps {
  onSelectRun: (run: AnalysisRun) => void
}

export function AnalysisHistory({ onSelectRun }: AnalysisHistoryProps) {
  const runs = useAnalysisRuns()
  const deleteRun = useDeleteAnalysisRun()

  const handleDelete = async (e: React.MouseEvent, runId: number) => {
    e.stopPropagation()
    if (!confirm('Delete this analysis? This cannot be undone.')) return
    try {
      await deleteRun.mutateAsync(runId)
    } catch {
      alert('Failed to delete analysis')
    }
  }

  if (runs.isPending) return <Loading label="Loading analyses" />
  if (runs.isError) return <ErrorState message="Failed to load analyses" retry={() => void runs.refetch()} />
  if (!runs.data || runs.data.length === 0) {
    return (
      <div className="empty-state">
        <p>No analyses yet</p>
        <p className="muted">Start a comparison, literature review, gap analysis, or disagreement explorer above</p>
      </div>
    )
  }

  return (
    <div className="analysis-history">
      {runs.data.map((run) => (
        <div
          key={run.id}
          className="analysis-history-item"
          onClick={() => onSelectRun(run)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onSelectRun(run) } }}
          aria-label={`Open ${run.kind} analysis`}
        >
          <div className="analysis-history-icon">
            <KindIcon kind={run.kind} />
          </div>

          <div className="analysis-history-content">
            <h3>{KIND_LABELS[run.kind] ?? run.kind}</h3>
            <p className="analysis-history-meta">
              {run.document_ids.length} documents • {new Date(run.created_at).toLocaleDateString()}
              {typeof run.parameters?.research_question === 'string' && ` • ${String(run.parameters.research_question)}`}
            </p>

            <div className="analysis-history-status">
              {run.status === 'completed' && (
                <>
                  <CheckCircle size={14} className="status-icon success" />
                  <span>Completed</span>
                </>
              )}
              {run.status === 'failed' && (
                <>
                  <AlertCircle size={14} className="status-icon error" />
                  <span>Failed</span>
                </>
              )}
              {['pending', 'extracting', 'synthesizing'].includes(run.status) && (
                <>
                  <Loader2 size={14} className="status-icon spin" />
                  <span>{run.stage || run.status} ({run.progress_percent}%)</span>
                </>
              )}
              {run.status === 'cancelled' && (
                <>
                  <AlertCircle size={14} className="status-icon muted" />
                  <span>Cancelled</span>
                </>
              )}
            </div>
          </div>

          <div className="analysis-history-actions">
            <button
              className="button icon-only tertiary small"
              onClick={(e) => void handleDelete(e, run.id)}
              aria-label="Delete analysis"
              disabled={deleteRun.isPending}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
