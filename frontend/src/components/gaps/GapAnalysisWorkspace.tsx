/**
 * Gap Analysis workspace — select papers, run analysis, review candidates.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Play, X, Download, Loader2, Filter, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import {
  useAnalysisRun,
  useCreateAnalysisRun,
  useCancelAnalysisRun,
  useUpdateCandidateState,
  useSaveProjectBrief,
  useCandidateStates,
} from '../../services/queries'
import { DocumentSelector } from '../analysis/DocumentSelector'
import { GapCandidateCard } from './GapCandidateCard'
import { GapEvidencePanel } from './GapEvidencePanel'
import { SaveProjectBriefDialog } from './SaveProjectBriefDialog'
import { SavedProjectBriefs } from './SavedProjectBriefs'
import { exportGapAnalysisMarkdown } from '../../services/gapDisagreementService'
import { Loading, ErrorState } from '../shared/Feedback'
import { toast } from '../../store/toasts'
import type { GapAnalysisResult, GapCandidate, GapCategory } from '../../types/analysis'

interface Props {
  runId?: number
  onBack: () => void
}

const CATEGORY_OPTIONS: { value: GapCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'methodology', label: 'Method' },
  { value: 'population', label: 'Population' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'outcome_measure', label: 'Outcome' },
  { value: 'theoretical', label: 'Theoretical' },
  { value: 'replication', label: 'Replication' },
  { value: 'other', label: 'Other' },
]

export function GapAnalysisWorkspace({ runId, onBack }: Props) {
  const navigate = useNavigate()

  // Setup state
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([])
  const [researchQuestion, setResearchQuestion] = useState('')
  const [scope, setScope] = useState('')
  const [timeBudget, setTimeBudget] = useState('')
  const [resourceBudget, setResourceBudget] = useState('')
  const [showSetup, setShowSetup] = useState(!runId)

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<GapCategory | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [showDismissed, setShowDismissed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Local review state (optimistic UI)
  const [reviewStates, setReviewStates] = useState<Record<string, 'saved' | 'dismissed' | null>>({})

  // Panel state
  const [evidenceCandidate, setEvidenceCandidate] = useState<GapCandidate | null>(null)
  const [briefCandidate, setBriefCandidate] = useState<GapCandidate | null>(null)

  const existingRun = useAnalysisRun(runId ?? null)
  const createRun = useCreateAnalysisRun()
  const cancelRun = useCancelAnalysisRun()
  const updateState = useUpdateCandidateState()
  const saveBrief = useSaveProjectBrief()
  const savedStates = useCandidateStates(runId)

  useEffect(() => {
    setReviewStates(Object.fromEntries((savedStates.data ?? []).map(s => [s.candidate_id, s.status])))
  }, [savedStates.data, runId])

  useEffect(() => {
    if (existingRun.data) {
      setSelectedDocIds(existingRun.data.document_ids)
      const p = existingRun.data.parameters
      if (p && typeof p === 'object') {
        if ('research_question' in p) setResearchQuestion(String(p.research_question ?? ''))
        if ('scope' in p) setScope(String(p.scope ?? ''))
        if ('time_budget' in p) setTimeBudget(String(p.time_budget ?? ''))
        if ('resource_budget' in p) setResourceBudget(String(p.resource_budget ?? ''))
      }
    }
  }, [existingRun.data])

  const handleStart = async () => {
    if (selectedDocIds.length < 2) {
      toast('Select at least 2 papers', 'error')
      return
    }
    try {
      const run = await createRun.mutateAsync({
        kind: 'gap_analysis',
        document_ids: selectedDocIds,
        parameters: {
          research_question: researchQuestion || undefined,
          scope: scope || undefined,
          time_budget: timeBudget || undefined,
          resource_budget: resourceBudget || undefined,
        },
      })
      navigate(`/analysis?mode=gap_analysis&runId=${run.id}`)
      setShowSetup(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to start gap analysis', 'error')
    }
  }

  const handleCancel = async () => {
    if (!runId || !confirm('Cancel this analysis?')) return
    try {
      await cancelRun.mutateAsync(runId)
    } catch {
      toast('Failed to cancel analysis', 'error')
    }
  }

  const handleReviewState = async (
    candidateId: string,
    status: 'saved' | 'dismissed' | null,
  ) => {
    const previous = reviewStates[candidateId] ?? null
    setReviewStates((s) => ({ ...s, [candidateId]: status }))
    if (!runId) return
    try {
      await updateState.mutateAsync({ runId, candidateId, data: { status } })
    } catch {
      // revert optimistic
      setReviewStates((s) => ({ ...s, [candidateId]: previous }))
      toast('Could not update candidate state', 'error')
    }
  }

  const handleSaveBrief = async (data: {
    assumptions: string[]
    time_budget: string
    resource_budget: string
  }) => {
    if (!runId || !briefCandidate) return
    try {
      await saveBrief.mutateAsync({
        runId,
        candidateId: briefCandidate.id,
        data: {
          assumptions: data.assumptions,
          time_budget: data.time_budget || undefined,
          resource_budget: data.resource_budget || undefined,
        },
      })
      toast('Project brief saved')
      setBriefCandidate(null)
    } catch {
      toast('Failed to save project brief', 'error')
    }
  }

  const handleExportCandidate = (c: GapCandidate) => {
    if (!existingRun.data) return
    const result = existingRun.data.result as GapAnalysisResult
    const text = exportGapAnalysisMarkdown({ ...existingRun.data, result: { ...result, candidates: [c] } })
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gap-${c.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportAll = () => {
    if (!existingRun.data) return
    const md = exportGapAnalysisMarkdown(existingRun.data)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gap-analysis-${existingRun.data.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Setup view ───────────────────────────────────────────────────────────────
  if (showSetup || !runId) {
    return (
      <div className="page gap-workspace">
        <header className="page-header">
          <button className="button icon-only tertiary" onClick={onBack} aria-label="Back">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1>Research Gap Finder</h1>
            <p className="subtitle">
              Identify candidate gaps, proposed research questions, and feasible student projects
            </p>
          </div>
        </header>

        <div className="gap-setup">
          <div className="gap-setup-fields">
            <div className="input-group">
              <label htmlFor="gap-rq">Research question or focus area (optional)</label>
              <input
                id="gap-rq"
                className="input"
                value={researchQuestion}
                onChange={(e) => setResearchQuestion(e.target.value)}
                placeholder="e.g. What interventions improve reading in ELL students?"
              />
            </div>

            <div className="input-group">
              <label htmlFor="gap-scope">Scope description (optional)</label>
              <input
                id="gap-scope"
                className="input"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="e.g. K–12 classroom settings, 2010–2024"
              />
            </div>

            <div className="gap-budget-inputs">
              <div className="input-group">
                <label htmlFor="gap-time">Student time budget (optional)</label>
                <input
                  id="gap-time"
                  className="input"
                  value={timeBudget}
                  onChange={(e) => setTimeBudget(e.target.value)}
                  placeholder="e.g. 1 semester"
                />
              </div>
              <div className="input-group">
                <label htmlFor="gap-resource">Resource constraints (optional)</label>
                <input
                  id="gap-resource"
                  className="input"
                  value={resourceBudget}
                  onChange={(e) => setResourceBudget(e.target.value)}
                  placeholder="e.g. public datasets only"
                />
              </div>
            </div>
          </div>

          <DocumentSelector
            selectedIds={selectedDocIds}
            onSelectionChange={setSelectedDocIds}
            minSelection={2}
            maxSelection={10}
          />

          <div className="gap-setup-notice">
            <p>
              Gaps are drawn from selected papers only. The analysis distinguishes author-stated
              limitations from model-inferred gaps, and never claims worldwide novelty or proven
              absence.
            </p>
          </div>

          <div className="comparison-actions">
            <button className="button secondary" onClick={onBack}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => void handleStart()}
              disabled={selectedDocIds.length < 2 || createRun.isPending}
            >
              {createRun.isPending ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Play size={18} />
                  Find Gaps
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (existingRun.isPending) return <Loading label="Loading gap analysis" />
  if (existingRun.isError)
    return <ErrorState message="Failed to load gap analysis" retry={() => void existingRun.refetch()} />

  const run = existingRun.data!
  const isRunning = ['pending', 'extracting', 'synthesizing'].includes(run.status)
  const result = run.result as GapAnalysisResult | null

  // Apply filters
  const candidates = result?.candidates ?? []
  const filtered = candidates.filter((c) => {
    const st = reviewStates[c.id] ?? null
    if (!showDismissed && st === 'dismissed') return false
    if (categoryFilter !== 'all' && c.gap_category !== categoryFilter) return false
    if (sourceFilter !== 'all' && c.gap_source !== sourceFilter) return false
    if (
      searchQuery &&
      !c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.proposed_research_question.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false
    return true
  })

  return (
    <div className="page gap-workspace">
      <header className="page-header">
        <button className="button icon-only tertiary" onClick={onBack} aria-label="Back">
          <ChevronLeft size={20} />
        </button>
        <div className="page-header-content">
          <h1>Research Gap Finder</h1>
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
              <button className="button tertiary small" onClick={handleExportAll}>
                <Download size={16} />
                Export all
              </button>
            </>
          )}
        </div>
      </header>

      {/* Progress */}
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

      {run.status === 'failed' && (
        <ErrorState
          message={run.error_message || 'Analysis failed'}
          retry={() => setShowSetup(true)}
        />
      )}

      {run.status === 'cancelled' && (
        <div className="empty-state">
          <p>Analysis was cancelled.</p>
          <button className="button primary" onClick={() => setShowSetup(true)}>
            Start New Analysis
          </button>
        </div>
      )}

      {run.status === 'completed' && result && (
        <>
          {/* Coverage & warnings */}
          {result.warnings.length > 0 && (
            <div className="gap-warnings" role="note">
              {result.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}

          {/* Filters */}
          <p className="muted">Source coverage (analyzed excerpts): {Object.entries(result.coverage).map(([id, state]) => `Paper ${id}: ${state}`).join('; ')}</p>
          {savedStates.isError && <p role="alert">Saved candidate states could not be loaded. <button className="text-button" onClick={() => void savedStates.refetch()}>Retry</button></p>}
          <div className="gap-filters" role="search" aria-label="Filter gap candidates">
            <div className="gap-filter-search">
              <Search size={15} />
              <input
                className="gap-search-input"
                placeholder="Search candidates…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search gap candidates"
              />
            </div>
            <div className="gap-filter-controls">
              <Filter size={14} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as GapCategory | 'all')}
                aria-label="Filter by category"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                aria-label="Filter by source"
              >
                <option value="all">All sources</option>
                <option value="author_stated">Author-stated</option>
                <option value="model_inferred">Model-inferred</option>
                <option value="missing_reporting">Missing reporting</option>
              </select>
              <label className="gap-toggle-label">
                <input
                  type="checkbox"
                  checked={showDismissed}
                  onChange={(e) => setShowDismissed(e.target.checked)}
                />
                Show dismissed
              </label>
            </div>
          </div>

          {/* Results summary */}
          <p className="gap-results-count" role="status" aria-live="polite">
            {filtered.length} of {candidates.length} candidates
          </p>

          {/* Candidate list */}
          <AnimatePresence initial={false}>
            {filtered.length === 0 ? (
              <motion.div
                className="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p>{candidates.length ? 'No candidates match the current filters.' : 'No supported gap candidates were found in the analyzed evidence.'}</p>
                <button
                  className="button secondary"
                  onClick={() => {
                    setCategoryFilter('all')
                    setSourceFilter('all')
                    setSearchQuery('')
                    setShowDismissed(true)
                  }}
                >
                  Clear filters
                </button>
              </motion.div>
            ) : (
              <div className="gap-candidates-list">
                {filtered.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GapCandidateCard
                      candidate={c}
                      status={reviewStates[c.id] ?? null}
                      onSave={() => void handleReviewState(c.id, 'saved')}
                      onDismiss={() => void handleReviewState(c.id, 'dismissed')}
                      onRestore={() => void handleReviewState(c.id, null)}
                      onSaveProject={() => setBriefCandidate(c)}
                      onExport={() => handleExportCandidate(c)}
                      onViewEvidence={() => setEvidenceCandidate(c)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Evidence panel */}
      <SavedProjectBriefs />
      <GapEvidencePanel
        candidate={evidenceCandidate}
        onClose={() => setEvidenceCandidate(null)}
      />

      {/* Save project brief dialog */}
      <SaveProjectBriefDialog
        candidate={briefCandidate}
        onClose={() => setBriefCandidate(null)}
        onSave={(data) => void handleSaveBrief(data)}
        isSaving={saveBrief.isPending}
      />
    </div>
  )
}
