/**
 * Analysis history list component.
 */
import { FileText, GitCompare, AlertCircle, CheckCircle, Loader2, Trash2 } from 'lucide-react'
import { useAnalysisRuns, useDeleteAnalysisRun } from '../../services/queries'
import { Loading, ErrorState } from '../shared/Feedback'
import type { AnalysisRun } from '../../types/analysis'

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
        <p className="muted">Start a comparison or literature review above</p>
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
            {run.kind === 'comparison' ? <GitCompare size={20} /> : <FileText size={20} />}
          </div>

          <div className="analysis-history-content">
            <h3>{run.kind === 'comparison' ? 'Comparison Matrix' : 'Literature Review'}</h3>
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
