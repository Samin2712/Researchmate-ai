/**
 * Comparison matrix workspace component.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Play, X, Download, Loader2 } from 'lucide-react'
import { useAnalysisRun, useCreateAnalysisRun, useCancelAnalysisRun } from '../../services/queries'
import { useDocuments } from '../../services/queries'
import { DocumentSelector } from './DocumentSelector'
import { ComparisonMatrix } from './ComparisonMatrix'
import { exportAsMarkdown, exportAsCSV } from '../../services/analysisService'
import { Loading, ErrorState } from '../shared/Feedback'
import { useAnalysisStore } from '../../store/analysis'
import type { ComparisonMatrixResult } from '../../types/analysis'

interface ComparisonWorkspaceProps {
  runId?: number
  onBack: () => void
}

export function ComparisonWorkspace({ runId, onBack }: ComparisonWorkspaceProps) {
  const navigate = useNavigate()
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([])
  const [researchQuestion, setResearchQuestion] = useState('')
  const [showDocSelector, setShowDocSelector] = useState(!runId)

  const existingRun = useAnalysisRun(runId || null)
  const createRun = useCreateAnalysisRun()
  const cancelRun = useCancelAnalysisRun()
  const documents = useDocuments()
  const resetStore = useAnalysisStore((state) => state.reset)

  useEffect(() => {
    resetStore()
  }, [resetStore])

  useEffect(() => {
    if (existingRun.data) {
      setSelectedDocIds(existingRun.data.document_ids)
      if (existingRun.data.parameters && typeof existingRun.data.parameters === 'object' && 'research_question' in existingRun.data.parameters) {
        setResearchQuestion(existingRun.data.parameters.research_question as string)
      }
    }
  }, [existingRun.data])

  const handleStart = async () => {
    if (selectedDocIds.length < 2 || selectedDocIds.length > 5) {
      alert('Please select 2-5 documents')
      return
    }

    try {
      const run = await createRun.mutateAsync({
        kind: 'comparison',
        document_ids: selectedDocIds,
        parameters: researchQuestion ? { research_question: researchQuestion } : undefined,
      })

      // Navigate to the created run
      navigate(`/analysis?mode=comparison&runId=${run.id}`)
      setShowDocSelector(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start comparison'
      alert(message)
    }
  }

  const handleCancel = async () => {
    if (!runId || !confirm('Cancel this analysis?')) return
    try {
      await cancelRun.mutateAsync(runId)
    } catch {
      alert('Failed to cancel analysis')
    }
  }

  const handleExportMarkdown = () => {
    if (!existingRun.data) return
    const markdown = exportAsMarkdown(existingRun.data)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comparison-${existingRun.data.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    if (!existingRun.data) return
    const csv = exportAsCSV(existingRun.data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comparison-${existingRun.data.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Document selector view
  if (showDocSelector || !runId) {
    return (
      <div className="page comparison-workspace">
        <header className="page-header">
          <button className="button icon-only tertiary" onClick={onBack} aria-label="Back">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1>Comparison Matrix</h1>
            <p className="subtitle">Select 2-5 papers to compare side-by-side</p>
          </div>
        </header>

        <div className="comparison-setup">
          <div className="input-group">
            <label htmlFor="research-question">Research Question (optional)</label>
            <input
              id="research-question"
              type="text"
              value={researchQuestion}
              onChange={(e) => setResearchQuestion(e.target.value)}
              placeholder="What is the research focus for this comparison?"
              className="input"
            />
          </div>

          <DocumentSelector
            selectedIds={selectedDocIds}
            onSelectionChange={setSelectedDocIds}
            minSelection={2}
            maxSelection={5}
          />

          <div className="comparison-actions">
            <button className="button secondary" onClick={onBack}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => void handleStart()}
              disabled={selectedDocIds.length < 2 || selectedDocIds.length > 5 || createRun.isPending}
            >
              {createRun.isPending ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Start Comparison
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Results view
  if (existingRun.isPending) return <Loading label="Loading comparison" />
  if (existingRun.isError) {
    return <ErrorState message="Failed to load comparison" retry={() => void existingRun.refetch()} />
  }

  const run = existingRun.data!
  const isRunning = ['pending', 'extracting', 'synthesizing'].includes(run.status)
  const result = run.result as ComparisonMatrixResult | null

  return (
    <div className="page comparison-workspace">
      <header className="page-header">
        <button className="button icon-only tertiary" onClick={onBack} aria-label="Back">
          <ChevronLeft size={20} />
        </button>
        <div className="page-header-content">
          <h1>Comparison Matrix</h1>
          {typeof run.parameters?.research_question === 'string' && (
            <p className="subtitle">{String(run.parameters.research_question)}</p>
          )}
        </div>
        <div className="page-header-actions">
          {isRunning && (
            <button className="button secondary small" onClick={() => void handleCancel()}>
              <X size={16} />
              Cancel
            </button>
          )}
          {run.status === 'completed' && result && (
            <>
              <button className="button tertiary small" onClick={handleExportCSV}>
                <Download size={16} />
                Export CSV
              </button>
              <button className="button tertiary small" onClick={handleExportMarkdown}>
                <Download size={16} />
                Export Markdown
              </button>
            </>
          )}
        </div>
      </header>

      {isRunning && (
        <div className="comparison-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${run.progress_percent}%` }} />
          </div>
          <p className="progress-label" role="status" aria-live="polite">
            <Loader2 size={16} className="spin" />
            {run.stage || run.status} ({run.progress_percent}%)
          </p>
        </div>
      )}

      {run.status === 'failed' && <ErrorState message={run.error_message || 'Analysis failed'} retry={() => setShowDocSelector(true)} />}

      {run.status === 'cancelled' && (
        <div className="empty-state">
          <p>Analysis was cancelled</p>
          <button className="button primary" onClick={() => setShowDocSelector(true)}>
            Start New Comparison
          </button>
        </div>
      )}

      {run.status === 'completed' && result && (
        <ComparisonMatrix result={result} documents={documents.data?.documents || []} />
      )}
    </div>
  )
}
