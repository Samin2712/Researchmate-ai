import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { X, BookmarkPlus } from 'lucide-react'
import { useEvidenceStore } from '../../store/evidence'
import { fetchDocumentPdf, getEvidenceDetail, type EvidenceDetail } from '../../services/evidenceService'
import { errorMessage } from '../../services/api'
import { useDialogFocus } from './useDialogFocus'
const PDFViewer = lazy(() => import('./PDFViewer'))

export function SourceVerificationPanel() {
  const { sourcePanel: { isOpen, source, messageId }, closeSourcePanel, startSaveEvidence, isSavingEvidence } = useEvidenceStore()
  const [loaded, setLoaded] = useState<{ url: string; detail: EvidenceDetail } | null>(null)
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogFocus(panelRef, isOpen, closeSourcePanel, isSavingEvidence)
  useEffect(() => {
    if (!isOpen || !source) return
    const controller = new AbortController()
    let url: string | undefined
    setLoaded(null)
    setError('')
    const page = Number(source.page_number)
    Promise.all([
      getEvidenceDetail({ document_id: Number(source.document_id), page_number: Number.isInteger(page) && page > 0 ? page : undefined, chunk_id: source.chunk_id, quote: source.chunk_text }, controller.signal),
      fetchDocumentPdf(Number(source.document_id), controller.signal),
    ]).then(([detail, blob]) => {
      if (controller.signal.aborted) return
      url = URL.createObjectURL(blob)
      setLoaded({ url, detail })
    }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(errorMessage(reason)) })
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url) }
  }, [isOpen, source])
  if (!isOpen || !source) return null
  const detail = loaded?.detail
  return <div className="source-verification-panel" ref={panelRef} tabIndex={-1} role="dialog" aria-label="Source verification">
    <div className="source-panel-header">
      <div><h2>{detail?.document_title || source.title}</h2><p>{detail?.document_authors || source.authors}</p></div>
      <div className="source-panel-actions">
        <button className="btn-icon" aria-label="Save as evidence" disabled={!detail?.source_quote || !detail.page_number} onClick={() => {
          if (detail) startSaveEvidence({ ...source, title: detail.document_title, chunk_id: detail.chunk_id || undefined, page_number: detail.page_number, page_label: detail.page_label, chunk_text: detail.source_quote || undefined }, messageId || 0)
        }}><BookmarkPlus size={20} /></button>
        <button className="btn-text" aria-label="Return to chat" onClick={closeSourcePanel}><X size={20} /> Back</button>
      </div>
    </div>
    <div className="source-panel-content">
      {error ? <p role="alert">{error}</p> : !loaded ? <p role="status">Loading source…</p> : <>
        <section className="source-quote-section"><h3>Source quotation</h3>{detail?.source_quote ? <blockquote tabIndex={0} className="source-quote">{detail.source_quote}</blockquote> : <p>No verified quotation available.</p>}<p>Compare this quotation with the generated claim. A citation does not establish correctness.</p></section>
        <Suspense fallback={<p role="status">Loading PDF viewer…</p>}><PDFViewer key={loaded.url} pdfUrl={loaded.url} detail={loaded.detail} /></Suspense>
      </>}
    </div>
  </div>
}
