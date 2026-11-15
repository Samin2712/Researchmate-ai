/**
 * Disagreement Explorer workspace — select papers, run analysis, explore claim relationships.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Play, X, Download, Loader2, Filter, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import {
  useAnalysisRun,
  useCreateAnalysisRun,
  useCancelAnalysisRun,
  useSaveRelationshipEvidence,
} from '../../services/queries'
import { DocumentSelector } from '../analysis/DocumentSelector'
import { RelationshipCard } from './RelationshipCard'
import { exportDisagreementMarkdown } from '../../services/gapDisagreementService'
import { Loading, ErrorState } from '../shared/Feedback'
import { toast } from '../../store/toasts'
import { useEvidenceStore } from '../../store/evidence'
import type { DisagreementResult, ClaimRelationship, RelationshipType } from '../../types/analysis'

interface Props {
  runId?: number
  onBack: () => void
}

const RELATIONSHIP_TYPES: { value: RelationshipType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'apparent_disagreement', label: 'Apparent disagreement' },
  { value: 'different_context', label: 'Different context' },
  { value: 'insufficient_evidence', label: 'Insufficient evidence' },
]

export function DisagreementWorkspace({ runId, onBack }: Props) {
  const navigate = useNavigate()
  const { openNotebook } = useEvidenceStore()

  // Setup state
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([])
  const [researchQuestion, setResearchQuestion] = useState('')
  const [showSetup, setShowSetup] = useState(!runId)

  // Filter state
  const [typeFilter, setTypeFilter] = useState<RelationshipType | 'all'>('all')
  const [themeFilter, setThemeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const existingRun = useAnalysisRun(runId ?? null)
  const createRun = useCreateAnalysisRun()
  const cancelRun = useCancelAnalysisRun()
  const saveEvidence = useSaveRelationshipEvidence()

  useEffect(() => {
    if (existingRun.data) {
      setSelectedDocIds(existingRun.data.document_ids)
      const p = existingRun.data.parameters
      if (p && typeof p === 'object' && 'research_question' in p) {
        setResearchQuestion(String(p.research_question ?? ''))
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
        kind: 'disagreement',
        document_ids: selectedDocIds,
        parameters: researchQuestion ? { research_question: researchQuestion } : undefined,
      })
      navigate(`/analysis?mode=disagreement&runId=${run.id}`)
      setShowSetup(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to start analysis', 'error')
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

  const handleSaveEvidence = async (r: ClaimRelationship) => {
    if (!runId) return
    try {
      await saveEvidence.mutateAsync({
        runId,
        relationshipId: r.id,
        data: { note: `${r.relationship_type}: ${r.rationale}` },
      })
      toast('Evidence saved to notebook')
      openNotebook()
    } catch {
      toast('Failed to save evidence', 'error')
    }
  }

  const handleSendToReview = (r: ClaimRelationship) => {
    // Copy relationship summary to clipboard for use in literature review
    const evidence = [...r.left.evidence, ...r.right.evidence].map(q => `[${q.source_id}] ${q.title}, p.${q.page_label || q.page_number || '?'}: "${q.quote}"`).join('\n')
    const text = `${r.outcome_theme} (${r.relationship_type})\n\nStudy A (${r.left.document_title}): ${r.left.claim}\n\nStudy B (${r.right.document_title}): ${r.right.claim}\n\nRationale: ${r.rationale}\n\nSource evidence:\n${evidence}`
    void navigator.clipboard.writeText(text).then(() => {
      toast('Relationship copied — paste into your literature review')
    }).catch(() => toast('Clipboard unavailable. Export the relationship evidence instead.', 'error'))
  }

  const handleExport = () => {
    if (!existingRun.data) return
    const md = exportDisagreementMarkdown(existingRun.data)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `disagreements-${existingRun.data.id}.md`
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
            <h1>Agreement & Disagreement Explorer</h1>
            <p className="subtitle">
              Compare claims across papers and understand where and why they differ
            </p>
          </div>
        </header>

        <div className="gap-setup">
          <div className="gap-setup-fields">
            <div className="input-group">
              <label htmlFor="dis-rq">Research question or outcome focus (optional)</label>
              <input
                id="dis-rq"
                className="input"
                value={researchQuestion}
                onChange={(e) => setResearchQuestion(e.target.value)}
                placeholder="e.g. Does intervention X improve outcome Y?"
              />
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
              The explorer requires evidence on both sides of a relationship. Different datasets or
              metrics are not automatically treated as contradictions.
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
                  Explore Relationships
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (existingRun.isPending) return <Loading label="Loading relationship explorer" />
  if (existingRun.isError)
    return (
      <ErrorState
        message="Failed to load relationship explorer"
        retry={() => void existingRun.refetch()}
      />
    )

  const run = existingRun.data!
  const isRunning = ['pending', 'extracting', 'synthesizing'].includes(run.status)
  const result = run.result as DisagreementResult | null

  // Unique themes for filter
  const themes = result ? ['all', ...new Set(result.relationships.map((r) => r.outcome_theme))] : ['all']

  // Apply filters
  const relationships = result?.relationships ?? []
  const filtered = relationships.filter((r) => {
    if (typeFilter !== 'all' && r.relationship_type !== typeFilter) return false
    if (themeFilter !== 'all' && r.outcome_theme !== themeFilter) return false
    if (
      searchQuery &&
      !r.outcome_theme.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.left.claim.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.right.claim.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1>Agreement & Disagreement Explorer</h1>
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
            <button className="button tertiary small" onClick={handleExport}>
              <Download size={16} />
              Export
            </button>
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
          {result.warnings.length > 0 && (
            <div className="gap-warnings" role="note">
              {result.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}

          {/* Filters */}
          <p className="muted">Source coverage (analyzed excerpts): {Object.entries(result.coverage).map(([id, state]) => `Paper ${id}: ${state}`).join('; ')}</p>
          <div className="gap-filters" role="search" aria-label="Filter relationships">
            <div className="gap-filter-search">
              <Search size={15} />
              <input
                className="gap-search-input"
                placeholder="Search relationships…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search relationships"
              />
            </div>
            <div className="gap-filter-controls">
              <Filter size={14} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as RelationshipType | 'all')}
                aria-label="Filter by relationship type"
              >
                {RELATIONSHIP_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {themes.length > 2 && (
                <select
                  value={themeFilter}
                  onChange={(e) => setThemeFilter(e.target.value)}
                  aria-label="Filter by outcome theme"
                >
                  {themes.map((t) => (
                    <option key={t} value={t}>
                      {t === 'all' ? 'All themes' : t}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Summary row */}
          <div className="rel-summary-row" role="status" aria-live="polite">
            <span>{filtered.length} of {relationships.length} relationships</span>
            <div className="rel-type-counts">
              {(['agreement', 'apparent_disagreement', 'different_context', 'insufficient_evidence'] as RelationshipType[]).map(
                (t) => {
                  const count = relationships.filter((r) => r.relationship_type === t).length
                  if (!count) return null
                  return (
                    <button
                      key={t}
                      className={`rel-count-chip rel-count-chip--${t.replace('_', '-')} ${typeFilter === t ? 'active' : ''}`}
                      onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
                      aria-pressed={typeFilter === t}
                    >
                      {count} {t.replace(/_/g, ' ')}
                    </button>
                  )
                },
              )}
            </div>
          </div>

          {/* Relationship list */}
          <AnimatePresence initial={false}>
            {filtered.length === 0 ? (
              <motion.div
                className="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p>{relationships.length ? 'No relationships match the current filters.' : 'No supported relationships were found in the analyzed evidence.'}</p>
                <button
                  className="button secondary"
                  onClick={() => {
                    setTypeFilter('all')
                    setThemeFilter('all')
                    setSearchQuery('')
                  }}
                >
                  Clear filters
                </button>
              </motion.div>
            ) : (
              <div className="rel-list">
                {filtered.map((r) => (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <RelationshipCard
                      relationship={r}
                      onSaveToNotebook={() => void handleSaveEvidence(r)}
                      onSendToReview={() => handleSendToReview(r)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
