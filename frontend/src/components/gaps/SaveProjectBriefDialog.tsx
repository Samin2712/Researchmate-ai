/**
 * Dialog to save a gap candidate as a project brief with explicit assumptions.
 */
import { useState, useRef, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { GapCandidate } from '../../types/analysis'
import { useDialogFocus } from '../evidence/useDialogFocus'

interface Props {
  candidate: GapCandidate | null
  onClose: () => void
  onSave: (data: {
    assumptions: string[]
    time_budget: string
    resource_budget: string
  }) => void
  isSaving: boolean
}

export function SaveProjectBriefDialog({ candidate, onClose, onSave, isSaving }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useDialogFocus(ref, candidate !== null, onClose)
  const [assumptions, setAssumptions] = useState<string[]>([''])
  const [timeBudget, setTimeBudget] = useState('')
  const [resourceBudget, setResourceBudget] = useState('')

  useEffect(() => {
    if (candidate) {
      setAssumptions([''])
      setTimeBudget(candidate.feasible_project.time_budget ?? '')
      setResourceBudget(candidate.feasible_project.resource_budget ?? '')
    }
  }, [candidate])

  const handleSave = () => {
    onSave({
      assumptions: assumptions.filter((a) => a.trim()),
      time_budget: timeBudget,
      resource_budget: resourceBudget,
    })
  }

  return (
    <AnimatePresence>
      {candidate && (
        <motion.div
          className="save-brief-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label="Save project brief"
            className="save-brief-dialog"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="save-brief-header">
              <div>
                <h2>Save project brief</h2>
                <p className="muted">{candidate.title}</p>
              </div>
              <button className="icon-button" onClick={onClose} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <div className="save-brief-body">
              <div className="input-group">
                <label htmlFor="brief-time-budget">Time budget</label>
                <input
                  id="brief-time-budget"
                  className="input"
                  value={timeBudget}
                  onChange={(e) => setTimeBudget(e.target.value)}
                  placeholder="e.g. 3 months, 1 semester"
                />
              </div>

              <div className="input-group">
                <label htmlFor="brief-resource-budget">Resource budget</label>
                <input
                  id="brief-resource-budget"
                  className="input"
                  value={resourceBudget}
                  onChange={(e) => setResourceBudget(e.target.value)}
                  placeholder="e.g. public datasets only, no lab equipment"
                />
              </div>

              <div className="input-group">
                <label>Explicit assumptions</label>
                <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  List assumptions not supported by the analyzed papers — things you are taking for
                  granted that require verification.
                </p>
                {assumptions.map((a, i) => (
                  <div key={i} className="brief-assumption-row">
                    <input
                      className="input"
                      value={a}
                      onChange={(e) => {
                        const next = [...assumptions]
                        next[i] = e.target.value
                        setAssumptions(next)
                      }}
                      placeholder={`Assumption ${i + 1}`}
                    />
                    {assumptions.length > 1 && (
                      <button
                        className="icon-button danger"
                        onClick={() => setAssumptions(assumptions.filter((_, j) => j !== i))}
                        aria-label="Remove assumption"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="text-button"
                  onClick={() => setAssumptions([...assumptions, ''])}
                >
                  <Plus size={14} /> Add assumption
                </button>
              </div>
            </div>

            <div className="save-brief-footer">
              <button className="button secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="button primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save project brief'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
