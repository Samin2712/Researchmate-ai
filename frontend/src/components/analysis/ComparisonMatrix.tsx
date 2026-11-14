/**
 * Comparison matrix table component with evidence expansion.
 */
import { ChevronDown, ChevronUp, FileText, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useAnalysisStore } from '../../store/analysis'
import { useEvidenceStore } from '../../store/evidence'
import { usePreferences } from '../../store/preferences'
import type { ComparisonMatrixResult, EvidenceReference } from '../../types/analysis'

interface ComparisonMatrixProps {
  result: ComparisonMatrixResult
  documents: unknown[]
}

export function ComparisonMatrix({ result }: ComparisonMatrixProps) {
  const { rows, document_ids, document_titles, warnings } = result
  const expandedCells = useAnalysisStore((state) => state.expandedCells)
  const toggleCell = useAnalysisStore((state) => state.toggleCell)
  const openSourcePanel = useEvidenceStore((state) => state.openSourcePanel)
  const reduceMotion = usePreferences((state) => state.reduceMotion)

  const handleViewEvidence = (evidence: EvidenceReference) => {
    const source = {
      source_number: 1,
      document_id: evidence.document_id,
      chunk_id: evidence.chunk_id || undefined,
      title: evidence.title || 'Unknown',
      authors: evidence.authors || undefined,
      page_number: evidence.page_number || undefined,
      page_label: evidence.page_label || undefined,
      chunk_text: evidence.quote,
    }
    openSourcePanel(source, 0, 0)
  }

  return (
    <div className="comparison-matrix-container">
      {warnings.length > 0 && (
        <div className="comparison-warnings">
          <AlertTriangle size={18} />
          <div>
            {warnings.map((warning, i) => (
              <p key={i}>{warning}</p>
            ))}
          </div>
        </div>
      )}

      {/* Desktop table view */}
      <div className="comparison-matrix desktop">
        <table role="table" aria-label="Comparison matrix">
          <thead>
            <tr>
              <th className="sticky-header field-header">Field</th>
              {document_ids.map((docId) => (
                <th key={docId} className="sticky-header">
                  {document_titles[docId] || `Document ${docId}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field}>
                <th className="field-label">{row.label}</th>
                {document_ids.map((docId) => {
                  const cell = row.cells[docId]
                  const cellKey = `${row.field}-${docId}`
                  const isExpanded = expandedCells.has(cellKey)
                  const hasEvidence = cell && cell.evidence.length > 0

                  return (
                    <td key={docId} className="comparison-cell">
                      <div className="cell-value">
                        <p>{cell?.value || 'N/A'}</p>
                        {hasEvidence && (
                          <button
                            className="cell-expand-btn"
                            onClick={() => toggleCell(row.field, docId)}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Hide' : 'Show'} evidence: ${cell.evidence.length} source${cell.evidence.length !== 1 ? 's' : ''}`}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {cell.evidence.length} source{cell.evidence.length !== 1 ? 's' : ''}
                          </button>
                        )}
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded && hasEvidence && (
                          <motion.div
                            className="cell-evidence"
                            initial={reduceMotion ? {} : { height: 0, opacity: 0 }}
                            animate={reduceMotion ? {} : { height: 'auto', opacity: 1 }}
                            exit={reduceMotion ? {} : { height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {cell.evidence.map((evidence, i) => (
                              <div key={i} className="evidence-item">
                                <p className="evidence-quote">"{evidence.quote.substring(0, 200)}{evidence.quote.length > 200 ? '…' : ''}"</p>
                                <button
                                  className="button tertiary tiny"
                                  onClick={() => handleViewEvidence(evidence)}
                                >
                                  <FileText size={14} />
                                  View in document
                                </button>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked view */}
      <div className="comparison-matrix mobile">
        {rows.map((row) => (
          <div key={row.field} className="comparison-field-group">
            <h2 className="field-heading">{row.label}</h2>
            {document_ids.map((docId) => {
              const cell = row.cells[docId]
              const cellKey = `${row.field}-${docId}`
              const isExpanded = expandedCells.has(cellKey)
              const hasEvidence = cell && cell.evidence.length > 0

              return (
                <div key={docId} className="comparison-card">
                  <h3 className="card-title">{document_titles[docId] || `Document ${docId}`}</h3>
                  <p className="card-value">{cell?.value || 'N/A'}</p>

                  {hasEvidence && (
                    <div className="card-evidence-section">
                      <button
                        className="button tertiary small"
                        aria-expanded={isExpanded}
                        onClick={() => toggleCell(row.field, docId)}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isExpanded ? 'Hide' : 'Show'} {cell.evidence.length} source
                        {cell.evidence.length !== 1 ? 's' : ''}
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            className="card-evidence-list"
                            initial={reduceMotion ? {} : { height: 0, opacity: 0 }}
                            animate={reduceMotion ? {} : { height: 'auto', opacity: 1 }}
                            exit={reduceMotion ? {} : { height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {cell.evidence.map((evidence, i) => (
                              <div key={i} className="evidence-item">
                                <p className="evidence-quote">
                                  "{evidence.quote.substring(0, 150)}{evidence.quote.length > 150 ? '…' : ''}"
                                </p>
                                <button
                                  className="button tertiary tiny"
                                  onClick={() => handleViewEvidence(evidence)}
                                >
                                  <FileText size={14} />
                                  View
                                </button>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
