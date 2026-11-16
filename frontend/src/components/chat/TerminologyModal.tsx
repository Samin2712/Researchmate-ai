import { useState, useEffect, useRef } from 'react'
import { BookA, Search, AlertCircle, CheckCircle2, BookOpen, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useReducedMotion } from 'motion/react'
import { learningService } from '../../services/learningService'
import { errorMessage } from '../../services/api'
import { useEvidenceStore } from '../../store/evidence'
import { usePreferences } from '../../store/preferences'
import type { Document, TermExplanationResponse } from '../../types'
import { useDialogFocus } from '../evidence/useDialogFocus'
import ReactMarkdown from 'react-markdown'

interface TerminologyModalProps {
  isOpen: boolean
  onClose: () => void
  documents: Document[]
  currentDocumentId?: number
  initialTerm?: string
}

export function TerminologyModal({
  isOpen,
  onClose,
  documents,
  currentDocumentId,
  initialTerm = '',
}: TerminologyModalProps) {
  const readyDocs = documents.filter((d) => d.status === 'completed')
  const defaultDocId =
    currentDocumentId && readyDocs.some((d) => d.id === currentDocumentId)
      ? currentDocumentId
      : readyDocs[0]?.id

  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(defaultDocId)
  const [term, setTerm] = useState(initialTerm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TermExplanationResponse | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogFocus(dialogRef, isOpen, onClose)
  const systemReduced = useReducedMotion()
  const appReduced = usePreferences((s) => s.reduceMotion)
  const reduced = systemReduced || appReduced
  const openSourcePanel = useEvidenceStore((s) => s.openSourcePanel)

  useEffect(() => {
    if (isOpen) {
      if (initialTerm) setTerm(initialTerm)
      if (defaultDocId) setSelectedDocId(defaultDocId)
      setError('')
      setResult(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, initialTerm, defaultDocId])

  async function handleExplain(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const cleanTerm = term.trim()
    if (!cleanTerm || !selectedDocId || busy) return

    setBusy(true)
    setError('')
    setResult(null)

    try {
      const data = await learningService.explainTerm({
        document_id: selectedDocId,
        term: cleanTerm,
      })
      setResult(data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function handleInspectSource() {
    if (result?.source_quote && selectedDocId) {
      const doc = documents.find((d) => d.id === selectedDocId)
      openSourcePanel(
        {
          document_id: selectedDocId,
          title: doc?.title || 'Paper Source',
          chunk_text: result.source_quote,
          page_number: result.page_number,
        },
        -1,
        0,
      )
      onClose()
    }
  }

  if (!isOpen) return null

  const selectedDoc = documents.find((d) => d.id === selectedDocId)

  return (
    <div
      className="terminology-backdrop"
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminology-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        className="terminology-dialog"
        initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
        transition={{ duration: 0.15 }}
      >
        <header className="terminology-header">
          <div className="flex items-center gap-2">
            <span className="terminology-icon" aria-hidden="true">
              <BookA size={20} />
            </span>
            <div>
              <h2 id="terminology-title" className="text-lg font-medium text-slate-900">
                Explain this term
              </h2>
              <p className="text-xs text-slate-500">
                Plain-language definitions grounded in your research papers
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close term explanation dialog"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleExplain} className="terminology-form">
          <div className="form-group mb-3">
            <label htmlFor="term-paper-select" className="text-xs font-medium text-slate-700 block mb-1">
              Context paper
            </label>
            <select
              id="term-paper-select"
              value={selectedDocId}
              disabled={busy || !readyDocs.length}
              onChange={(e) => setSelectedDocId(Number(e.target.value))}
              className="w-full text-sm rounded border border-slate-300 p-2 bg-white"
            >
              {readyDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group mb-4">
            <label htmlFor="term-input" className="text-xs font-medium text-slate-700 block mb-1">
              Technical term or phrase
            </label>
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                id="term-input"
                type="text"
                value={term}
                maxLength={150}
                placeholder="e.g. latent Dirichlet allocation, p-value, ROC AUC"
                disabled={busy}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full text-sm rounded border border-slate-300 p-2 pr-20 bg-white"
              />
              <button
                type="submit"
                disabled={!term.trim() || !selectedDocId || busy}
                className="button primary small absolute right-1"
                aria-label="Look up term explanation"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                <span className="ml-1">{busy ? 'Explaining…' : 'Explain'}</span>
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.term}
              className="terminology-result"
              initial={{ opacity: 0, y: reduced ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                <span className="text-sm font-semibold text-slate-900">{result.term}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                    result.grounded_in_paper
                      ? 'bg-teal-50 text-teal-800 border border-teal-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {result.grounded_in_paper ? (
                    <>
                      <CheckCircle2 size={12} className="text-teal-600" />
                      Grounded in paper {result.page_number ? `(p. ${result.page_number})` : ''}
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} className="text-amber-600" />
                      General scientific definition
                    </>
                  )}
                </span>
              </div>

              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">
                <ReactMarkdown>{result.explanation}</ReactMarkdown>
              </div>

              {result.source_quote && (
                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 mb-2 text-xs">
                  <div className="font-medium text-slate-600 mb-1 flex items-center justify-between">
                    <span>Paper quote {result.page_number ? `(Page ${result.page_number})` : ''}:</span>
                    <button
                      type="button"
                      onClick={handleInspectSource}
                      className="text-teal-700 hover:text-teal-800 font-medium inline-flex items-center gap-1"
                    >
                      <BookOpen size={13} />
                      Inspect in paper
                    </button>
                  </div>
                  <blockquote className="italic text-slate-600 border-l-2 border-teal-600 pl-2">
                    “{result.source_quote}”
                  </blockquote>
                </div>
              )}

              {selectedDoc && (
                <p className="text-[11px] text-slate-600 mt-2">
                  Paper context: {selectedDoc.title}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
