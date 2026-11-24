/**
 * Card showing a single claim relationship side-by-side.
 */
import { BookmarkPlus } from 'lucide-react'
import type { ClaimRelationship } from '../../types/analysis'
import { openAnalysisSource } from '../gaps/openAnalysisSource'

const RELATIONSHIP_CONFIG = {
  agreement: {
    label: 'Agreement',
    cls: 'rel--agreement',
    description: 'Both studies report comparable results under comparable conditions.',
  },
  apparent_disagreement: {
    label: 'Apparent disagreement',
    cls: 'rel--disagreement',
    description:
      'Studies report different results. Review context and methods before concluding contradiction.',
  },
  different_context: {
    label: 'Different context',
    cls: 'rel--context',
    description: 'Different populations, datasets, or settings — not a direct contradiction.',
  },
  insufficient_evidence: {
    label: 'Insufficient evidence',
    cls: 'rel--insufficient',
    description: 'One or both sides lack clear evidence to compare.',
  },
}

interface Props {
  relationship: ClaimRelationship
  onSaveToNotebook: (r: ClaimRelationship) => void
  onSendToReview: (r: ClaimRelationship) => void
}

export function RelationshipCard({ relationship: r, onSaveToNotebook, onSendToReview }: Props) {
  const config =
    RELATIONSHIP_CONFIG[r.relationship_type] ?? RELATIONSHIP_CONFIG.insufficient_evidence

  return (
    <article className={`rel-card ${config.cls}`} aria-label={r.outcome_theme}>
      {/* Header row */}
      <div className="rel-card-header">
        <div>
          <h2 className="rel-theme">{r.outcome_theme}</h2>
          <span className={`rel-type-badge ${config.cls}`}>{config.label}</span>
          <p className="rel-type-desc muted">{config.description}</p>
        </div>
        <div className="rel-card-actions">
          <button
            className="button tertiary small"
            onClick={() => onSaveToNotebook(r)}
            title="Save evidence to notebook"
            disabled={!r.left.evidence.length && !r.right.evidence.length}
          >
            <BookmarkPlus size={14} />
            Save evidence
          </button>
          <button
            className="button tertiary small"
            onClick={() => onSendToReview(r)}
            title="Send to literature review"
            disabled={!r.left.evidence.length || !r.right.evidence.length}
          >
            Send to review
          </button>
        </div>
      </div>

      <p className="rel-evidence-status">
        {r.left.evidence.length} source quotes for Study A · {r.right.evidence.length} for Study B
      </p>
      {(!r.left.evidence.length || !r.right.evidence.length) && (
        <p className="gap-uncertainty">
          Evidence is incomplete: at least one study has no direct quotes.
        </p>
      )}
      <details className="analysis-details">
        <summary>Supporting explanation and study claims</summary>
        {/* Rationale */}
        <div className="rel-rationale">
          <span className="gap-field-label">Rationale</span>
          <p>{r.rationale}</p>
          {r.distinguishing_factors && (
            <p className="rel-distinguishing">
              <strong>Distinguishing factors:</strong> {r.distinguishing_factors}
            </p>
          )}
        </div>

        {/* Side-by-side claims */}
        <div className="rel-sides">
          {/* Study A */}
          <div className="rel-side rel-side--a">
            <div className="rel-side-header">
              <span className="rel-side-label">Study A</span>
              <strong className="rel-side-title">{r.left.document_title}</strong>
            </div>
            <p className="rel-claim">"{r.left.claim}"</p>
            {r.left.metric_or_outcome && (
              <p className="rel-meta">
                <span className="gap-field-label">Outcome:</span> {r.left.metric_or_outcome}
              </p>
            )}
            {r.left.population_or_dataset && (
              <p className="rel-meta">
                <span className="gap-field-label">Population:</span> {r.left.population_or_dataset}
              </p>
            )}
            {r.left.method_or_context && (
              <p className="rel-meta">
                <span className="gap-field-label">Method:</span> {r.left.method_or_context}
              </p>
            )}
          </div>

          {/* Study B */}
          <div className="rel-side rel-side--b">
            <div className="rel-side-header">
              <span className="rel-side-label">Study B</span>
              <strong className="rel-side-title">{r.right.document_title}</strong>
            </div>
            <p className="rel-claim">"{r.right.claim}"</p>
            {r.right.metric_or_outcome && (
              <p className="rel-meta">
                <span className="gap-field-label">Outcome:</span> {r.right.metric_or_outcome}
              </p>
            )}
            {r.right.population_or_dataset && (
              <p className="rel-meta">
                <span className="gap-field-label">Population:</span> {r.right.population_or_dataset}
              </p>
            )}
            {r.right.method_or_context && (
              <p className="rel-meta">
                <span className="gap-field-label">Method:</span> {r.right.method_or_context}
              </p>
            )}
          </div>
        </div>
      </details>
      <details className="analysis-details">
        <summary>
          Show source evidence ({r.left.evidence.length + r.right.evidence.length} quotes)
        </summary>
        <div className="rel-evidence-body">
          <div className="rel-evidence-sides">
            <div>
              <p className="gap-field-label">{r.left.document_title}</p>
              {r.left.evidence.length === 0 ? (
                <p className="muted">No direct quotes.</p>
              ) : (
                r.left.evidence.map((q, i) => (
                  <blockquote key={i} className="rel-quote">
                    "{q.quote}"<cite>p.{q.page_label || q.page_number || '?'}</cite>
                    <button className="text-button" onClick={() => openAnalysisSource(q)}>
                      Open source paper
                    </button>
                  </blockquote>
                ))
              )}
            </div>
            <div>
              <p className="gap-field-label">{r.right.document_title}</p>
              {r.right.evidence.length === 0 ? (
                <p className="muted">No direct quotes.</p>
              ) : (
                r.right.evidence.map((q, i) => (
                  <blockquote key={i} className="rel-quote">
                    "{q.quote}"<cite>p.{q.page_label || q.page_number || '?'}</cite>
                    <button className="text-button" onClick={() => openAnalysisSource(q)}>
                      Open source paper
                    </button>
                  </blockquote>
                ))
              )}
            </div>
          </div>
        </div>
      </details>
    </article>
  )
}
