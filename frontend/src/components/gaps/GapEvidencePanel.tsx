/**
 * Modal panel showing full evidence for a gap candidate.
 */
import { useRef } from 'react'
import { X, Quote } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { GapCandidate } from '../../types/analysis'
import { useDialogFocus } from '../evidence/useDialogFocus'
import { openAnalysisSource } from './openAnalysisSource'

interface Props {
  candidate: GapCandidate | null
  onClose: () => void
}

export function GapEvidencePanel({ candidate, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useDialogFocus(ref, candidate !== null, onClose)

  return (
    <AnimatePresence>
      {candidate && (
        <>
          <motion.div
            className="evidence-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={`Evidence for: ${candidate.title}`}
            className="gap-evidence-panel"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.2 }}
            tabIndex={-1}
          >
            <div className="gap-evidence-panel-header">
              <div>
                <h2>{candidate.title}</h2>
                <p className="muted">Supporting evidence from selected papers</p>
              </div>
              <button className="icon-button" onClick={onClose} aria-label="Close evidence panel">
                <X size={18} />
              </button>
            </div>

            <div className="gap-evidence-panel-body">
              {candidate.supporting_quotes.length === 0 ? (
                <p className="muted">
                  No direct quotes found in the analyzed evidence. This gap may be model-inferred.
                </p>
              ) : (
                candidate.supporting_quotes.map((q, i) => (
                  <div key={i} className="gap-evidence-quote">
                    <Quote size={14} className="gap-evidence-quote-icon" />
                    <div>
                      <p className="gap-evidence-quote-text">"{q.quote}"</p>
                      <p className="gap-evidence-source">
                        {q.title || 'Unknown source'} · p.{q.page_label || q.page_number || '?'}
                        {q.authors && ` · ${q.authors}`}
                      </p>
                      <button className="text-button" onClick={() => { onClose(); openAnalysisSource(q) }}>Open source paper</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
