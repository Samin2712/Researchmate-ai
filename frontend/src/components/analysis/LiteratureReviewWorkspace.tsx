/**
 * Literature review generation workspace.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useBlocker } from 'react-router-dom'
import { ChevronLeft, Play, X, Download, Loader2, Save, Edit3 } from 'lucide-react'
import {
  useAnalysisRun,
  useCreateAnalysisRun,
  useCancelAnalysisRun,
  useSaveReviewEdit,
  useLatestReviewEdit,
} from '../../services/queries'
import { Exporter } from '../tools/Exporter'
import { DocumentSelector } from './DocumentSelector'
import { LiteratureReview } from './LiteratureReview'
import { exportAsMarkdown } from '../../services/analysisService'
import { Loading, ErrorState } from '../shared/Feedback'
import { useAnalysisStore } from '../../store/analysis'
import type { LiteratureReviewResult } from '../../types/analysis'

interface LiteratureReviewWorkspaceProps {
  runId?: number
  onBack: () => void
}

export function LiteratureReviewWorkspace({ runId, onBack }: LiteratureReviewWorkspaceProps) {
  const navigate = useNavigate()
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([])
  const [researchQuestion, setResearchQuestion] = useState('')
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [showDocSelector, setShowDocSelector] = useState(!runId)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')

  const existingRun = useAnalysisRun(runId || null)
  const latestEdit = useLatestReviewEdit(runId || null)
  const createRun = useCreateAnalysisRun()
  const cancelRun = useCancelAnalysisRun()
  const saveEdit = useSaveReviewEdit()
  const resetStore = useAnalysisStore((state) => state.reset)
  const hasUnsavedEdits = useAnalysisStore((state) => state.hasUnsavedEdits)
  const setHasUnsavedEdits = useAnalysisStore((state) => state.setHasUnsavedEdits)

  useEffect(() => {
    resetStore()
  }, [resetStore])

  useEffect(() => {
    if (existingRun.data) {
      setSelectedDocIds(existingRun.data.document_ids)
      if (existingRun.data.parameters && typeof existingRun.data.parameters === 'object') {
        if ('research_question' in existingRun.data.parameters) {
          setResearchQuestion(existingRun.data.parameters.research_question as string)
        }
        if ('length' in existingRun.data.parameters) {
          setLength(existingRun.data.parameters.length as 'short' | 'medium' | 'long')
        }
      }
    }
  }, [existingRun.data])

  useEffect(() => {
    if (latestEdit.data && !isEditing) {
      setEditedContent(latestEdit.data.edited_content)
    }
  }, [latestEdit.data, isEditing])

  const blocker = useBlocker(hasUnsavedEdits)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (confirm('Discard unsaved changes?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])
  useEffect(() => {
    if (!hasUnsavedEdits) return
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', unload)
    return () => window.removeEventListener('beforeunload', unload)
  }, [hasUnsavedEdits])

  const handleStart = async () => {
    if (selectedDocIds.length < 2 || selectedDocIds.length > 10) {
      alert('Please select 2-10 documents')
      return
    }


    try {
      const run = await createRun.mutateAsync({
        kind: 'literature_review',
        document_ids: selectedDocIds,
        parameters: { research_question: researchQuestion, length },
      })

      navigate(`/analysis?mode=literature_review&runId=${run.id}`)
      setShowDocSelector(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start literature review'
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

  const handleSaveEdit = async () => {
    if (!runId) return
    try {
      await saveEdit.mutateAsync({
        runId,
        data: { edited_content: editedContent },
      })
      setHasUnsavedEdits(false)
      setIsEditing(false)
      alert('Review saved successfully')
    } catch {
      alert('Failed to save review')
    }
  }

  const handleExportMarkdown = () => {
    if (!existingRun.data) return
    const markdown = exportAsMarkdown(existingRun.data, latestEdit.data?.edited_content)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `literature-review-${existingRun.data.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleStartEditing = () => {
    const result = existingRun.data?.result as LiteratureReviewResult | undefined
    if (!result) return

    // Build initial content from result
    let content = `# ${result.title}\n\n${result.abstract}\n\n`
    for (const section of result.sections) {
      content += `## ${section.heading}\n\n${section.content}\n\n`
    }
    setEditedContent(latestEdit.data?.edited_content ?? content)
    setIsEditing(true)
  }

  const handleCancelEditing = () => {
    if (hasUnsavedEdits && !confirm('Discard unsaved changes?')) return
    setIsEditing(false)
    setHasUnsavedEdits(false)
  }

  // Document selector view
  if (showDocSelector || !runId) {
    return (
      <div className="page review-workspace">
        <header className="page-header">
          <button className="button icon-only tertiary" onClick={onBack} aria-label="Back">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1>Literature Review</h1>
            <p className="subtitle">Generate a thematic synthesis from 2-10 papers</p>
          </div>
        </header>

        <div className="review-setup">
          <div className="input-group">
            <label htmlFor="research-question-review">Research Question (Optional)</label>
            <input
              id="research-question-review"
              type="text"
              value={researchQuestion}
              onChange={(e) => setResearchQuestion(e.target.value)}
              placeholder="What research question should guide this review?"
              className="input"
            />
          </div>

          <div className="input-group">
            <label htmlFor="review-length">Review Length</label>
            <select
              id="review-length"
              value={length}
              onChange={(e) => setLength(e.target.value as 'short' | 'medium' | 'long')}
              className="input"
            >
              <option value="short">Short (2-3 paragraphs)</option>
              <option value="medium">Medium (4-6 paragraphs)</option>
              <option value="long">Long (7-10 paragraphs)</option>
            </select>
          </div>

          <DocumentSelector
            selectedIds={selectedDocIds}
            onSelectionChange={setSelectedDocIds}
            minSelection={2}
            maxSelection={10}
          />

          <div className="review-actions">
            <button className="button secondary" onClick={onBack}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => void handleStart()}
              disabled={
                selectedDocIds.length < 2 ||
                selectedDocIds.length > 10 ||
                createRun.isPending
              }
            >
              {createRun.isPending ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Generate Review
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Results view
  if (existingRun.isPending) return <Loading label="Loading review" />
  if (existingRun.isError) {
    return <ErrorState message="Failed to load review" retry={() => void existingRun.refetch()} />
  }

  const run = existingRun.data!
  const isRunning = ['pending', 'extracting', 'synthesizing'].includes(run.status)
  const result = run.result as LiteratureReviewResult | null

  return (
    <div className="page review-workspace">
      <header className="page-header">
        <button className="button icon-only tertiary" onClick={onBack} aria-label="Back">
          <ChevronLeft size={20} />
        </button>
        <div className="page-header-content">
          <h1>Literature Review</h1>
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
          {run.status === 'completed' && result && !isEditing && (
            <>
              <button className="button tertiary small" disabled={createRun.isPending} onClick={() => {
                if (!confirm('Generate a new draft? Saved edits will remain in this review.')) return
                void createRun.mutateAsync({kind:'literature_review',document_ids:run.document_ids,parameters:run.parameters,force:true})
                  .then(next => navigate(`/analysis?mode=literature_review&runId=${next.id}`))
                  .catch(() => alert('Could not regenerate. Try again.'))
              }}>Regenerate</button>
              <button className="button tertiary small" onClick={handleStartEditing}>
                <Edit3 size={16} />
                Edit
              </button>
              <Exporter title={result.title} content={exportAsMarkdown(run, latestEdit.data?.edited_content)} />
              <button className="button tertiary small" onClick={handleExportMarkdown}>
                <Download size={16} />
                Export Markdown
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button className="button secondary small" onClick={handleCancelEditing}>
                Cancel
              </button>
              <button
                className="button primary small"
                onClick={() => void handleSaveEdit()}
                disabled={!hasUnsavedEdits || saveEdit.isPending}
              >
                <Save size={16} />
                Save
              </button>
            </>
          )}
        </div>
      </header>

      {isRunning && (
        <div className="review-progress">
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
            Start New Review
          </button>
        </div>
      )}

      {run.status === 'completed' && result && (
        <>
          {isEditing ? (
            <div className="review-editor">
              <textarea
                value={editedContent}
                onChange={(e) => {
                  setEditedContent(e.target.value)
                  setHasUnsavedEdits(true)
                }}
                aria-label="Review draft"
                className="review-editor-textarea"
                placeholder="Edit your literature review..."
              />
            </div>
          ) : (
            <LiteratureReview result={result} editedContent={latestEdit.data?.edited_content} />
          )}
        </>
      )}
    </div>
  )
}
