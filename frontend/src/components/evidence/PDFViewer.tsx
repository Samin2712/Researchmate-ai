import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { EvidenceDetail } from '../../services/evidenceService'

GlobalWorkerOptions.workerSrc = workerUrl

export default function PDFViewer({ pdfUrl, detail }: { pdfUrl: string; detail: EvidenceDetail }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(detail.page_number || 1)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState('')
  const [rendered, setRendered] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const task = getDocument({ url: pdfUrl, isEvalSupported: false })
    let active = true
    task.promise.then((document) => { if (active) setPdf(document) }).catch(() => {
      if (active) setError('Unable to render this PDF. The file may be damaged.')
    })
    return () => { active = false; void task.destroy() }
  }, [pdfUrl])
  useEffect(() => {
    if (!pdf || !canvas.current) return
    let active = true
    let cancel: (() => void) | undefined
    setRendered(false)
    setError('')
    pdf.getPage(page).then((pdfPage) => {
      if (!active || !canvas.current) return
      const viewport = pdfPage.getViewport({ scale: zoom })
      const element = canvas.current
      element.width = viewport.width
      element.height = viewport.height
      const task = pdfPage.render({ canvasContext: element.getContext('2d')!, viewport })
      cancel = () => task.cancel()
      return task.promise.then(() => { if (active) setRendered(true) })
    }).catch((reason: Error) => {
      if (active && reason.name !== 'RenderingCancelledException') setError('Unable to render this page.')
    })
    return () => { active = false; cancel?.() }
  }, [pdf, page, zoom])
  return <div className="pdf-viewer-container">
    <div className="pdf-toolbar" aria-label="PDF controls">
      <button aria-label="Previous PDF page" disabled={!pdf || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span aria-live="polite">Page {page} of {pdf?.numPages || '…'}</span>
      <button aria-label="Next PDF page" disabled={!pdf || page >= pdf.numPages} onClick={() => setPage(page + 1)}>Next</button>
      <button aria-label="Zoom out" disabled={zoom <= 0.5} onClick={() => setZoom(zoom - 0.25)}>−</button>
      <span>{Math.round(zoom * 100)}%</span>
      <button aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(zoom + 0.25)}>+</button>
    </div>
    {error ? <p role="alert">{error}</p> : <>
      {!rendered && <p role="status">Rendering PDF…</p>}
      <div className="pdf-canvas-scroll" tabIndex={0} role="region" aria-label="PDF page viewport"><div className="pdf-page" style={{ width: canvas.current?.width, height: canvas.current?.height }}>
        <canvas ref={canvas} aria-label={`PDF page ${page}`} role="img" />
        {rendered && page === detail.page_number && detail.rects.map((rect, index) => <span key={index} className="pdf-quote-highlight" style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }} />)}
      </div></div>
    </>}
    <p className="pdf-highlight-info">{!detail.page_number ? 'Citation page unknown; showing page 1.' : detail.highlight_status === 'available' ? 'Source passage highlighted on the cited page.' : detail.highlight_status === 'no_extractable_text' ? 'No extractable text. Scanned PDFs require OCR before quoting.' : detail.highlight_status === 'ambiguous' ? 'Repeated passage: exact highlight unavailable.' : 'Exact highlight unavailable; compare the quotation with the cited page.'}</p>
  </div>
}
