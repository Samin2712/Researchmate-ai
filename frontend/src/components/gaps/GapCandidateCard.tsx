/**
 * Card showing a single gap candidate with its evidence basis and feasible project.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronDown,
  BookmarkCheck,
  EyeOff,
  Eye,
  Download,
  RotateCcw,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react'
import type { GapCandidate } from '../../types/analysis'

const GAP_CATEGORY_LABELS: Record<string, string> = {
  methodology: 'Method',
  population: 'Population',
  dataset: 'Dataset',
  outcome_measure: 'Outcome measure',
  theoretical: 'Theoretical',
  replication: 'Replication',
  other: 'Other',
}

const GAP_SOURCE_CONFIG = {
  author_stated: {
    label: 'Author-stated limitation',
    icon: <BookmarkCheck size={13} />,
    cls: 'gap-source--stated',
  },
  model_inferred: {
    label: 'Model-inferred gap',
    icon: <Lightbulb size={13} />,
    cls: 'gap-source--inferred',
  },
  missing_reporting: {
    label: 'Missing from reporting',
    icon: <HelpCircle size={13} />,
    cls: 'gap-source--missing',
  },
}

interface Props {
  candidate: GapCandidate
  status: 'saved' | 'dismissed' | null
  onSave: () => void
  onDismiss: () => void
  onRestore: () => void
  onSaveProject: () => void
  onExport: () => void
  onViewEvidence: (candidate: GapCandidate) => void
}

export function GapCandidateCard({
  candidate: c,
  status,
  onSave,
  onDismiss,
  onRestore,
  onSaveProject,
  onExport,
  onViewEvidence,
}: Props) {
  const [projectOpen, setProjectOpen] = useState(false)
  const sourceConfig = GAP_SOURCE_CONFIG[c.gap_source] ?? GAP_SOURCE_CONFIG.model_inferred

  return (
    <article
      className={`gap-card ${status === 'dismissed' ? 'gap-card--dismissed' : ''} ${status === 'saved' ? 'gap-card--saved' : ''}`}
      aria-label={c.title}
    >
      {/* Header */}
      <div className="gap-card-header">
        <div className="gap-card-meta">
          <span className="gap-category-badge">{GAP_CATEGORY_LABELS[c.gap_category] ?? c.gap_category}</span>
          <span className={`gap-source-badge ${sourceConfig.cls}`}>
            {sourceConfig.icon}
            {sourceConfig.label}
          </span>
          <span className="gap-scope-label">{c.scope}</span>
        </div>
        <div className="gap-card-actions">
          {status === 'dismissed' ? (
            <button className="button tertiary small" onClick={onRestore} title="Restore candidate">
              <RotateCcw size={14} />
              Restore
            </button>
          ) : (
            <>
              <button
                className={`button tertiary small ${status === 'saved' ? 'gap-action--active' : ''}`}
                onClick={status === 'saved' ? onRestore : onSave}
                title={status === 'saved' ? 'Saved' : 'Save candidate'}
              >
                <BookmarkCheck size={14} />
                {status === 'saved' ? 'Saved' : 'Save'}
              </button>
              <button className="button tertiary small" onClick={onDismiss} title="Dismiss candidate">
                <EyeOff size={14} />
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>

      <h2 className="gap-card-title">{c.title}</h2>

      {/* Evidence basis — shown before the project */}
      <div className="gap-evidence-section">
        <div className="gap-evidence-row">
          <div className="gap-evidence-block">
            <span className="gap-field-label">Evidence basis</span>
            <p>{c.evidence_basis}</p>
          </div>
          <div className="gap-evidence-block">
            <span className="gap-field-label">Rationale</span>
            <p>{c.rationale}</p>
          </div>
        </div>

        {c.uncertainty && (
          <div className="gap-uncertainty">
            <AlertTriangle size={14} />
            <span>
              <strong>Uncertainty:</strong> {c.uncertainty}
            </span>
          </div>
        )}

        {c.coverage_note && (
          <p className="gap-coverage-note">
            <HelpCircle size={13} /> {c.coverage_note}
          </p>
        )}

        <div className="gap-evidence-actions">
          <button
            className="text-button"
            onClick={() => onViewEvidence(c)}
            aria-label={`View evidence for ${c.title}`}
          >
            <Eye size={14} /> View evidence ({c.supporting_quotes.length})
          </button>
        </div>
      </div>

      {/* Research question */}
      <div className="gap-rq">
        <span className="gap-field-label">Proposed research question</span>
        <p className="gap-rq-text">"{c.proposed_research_question}"</p>
      </div>

      {/* Feasible project — collapsed by default */}
      <div className="gap-project-section">
        <button
          className="gap-project-toggle"
          onClick={() => setProjectOpen((o) => !o)}
          aria-expanded={projectOpen}
        >
          <Lightbulb size={15} />
          <span>Feasible student investigation</span>
          <motion.span
            animate={{ rotate: projectOpen ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex' }}
          >
            <ChevronDown size={15} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {projectOpen && (
            <motion.div
              className="gap-project-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >
              <div className="gap-project-grid">
                <div>
                  <span className="gap-field-label">Bounded question</span>
                  <p>{c.feasible_project.bounded_question}</p>
                </div>
                <div>
                  <span className="gap-field-label">Suggested method</span>
                  <p>{c.feasible_project.suggested_method}</p>
                </div>
                <div>
                  <span className="gap-field-label">Data sources</span>
                  <p>{c.feasible_project.data_sources}</p>
                </div>
                <div>
                  <span className="gap-field-label">Skills required</span>
                  <p>{c.feasible_project.skills_required}</p>
                </div>
              </div>

              {c.feasible_project.concrete_steps.length > 0 && (
                <div className="gap-steps">
                  <span className="gap-field-label">Steps</span>
                  <ol>
                    {c.feasible_project.concrete_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              <div>
                <span className="gap-field-label">Success criteria</span>
                <p>{c.feasible_project.success_criteria}</p>
              </div>

              {(c.feasible_project.time_budget || c.feasible_project.resource_budget) && (
                <div className="gap-budget-row">
                  {c.feasible_project.time_budget && (
                    <span className="subtle-tag">⏱ {c.feasible_project.time_budget}</span>
                  )}
                  {c.feasible_project.resource_budget && (
                    <span className="subtle-tag">🧰 {c.feasible_project.resource_budget}</span>
                  )}
                </div>
              )}

              <div className="gap-project-actions">
                <button className="button secondary small" onClick={onSaveProject}>
                  <BookmarkCheck size={14} />
                  Save as project brief
                </button>
                <button className="button tertiary small" onClick={onExport}>
                  <Download size={14} />
                  Export
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search terms */}
      {c.suggested_search_terms.length > 0 && (
        <div className="gap-search-terms">
          <span className="gap-field-label">Suggested search terms</span>
          <div className="gap-tags-row">
            {c.suggested_search_terms.map((t) => (
              <span key={t} className="subtle-tag">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
