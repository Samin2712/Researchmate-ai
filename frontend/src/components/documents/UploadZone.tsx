import { useEffect, useRef, useState, type DragEvent } from 'react'
import { CheckCircle2, FileUp, UploadCloud, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useQueryClient } from '@tanstack/react-query'
import type { Document } from '../../types'
import { documentService, MAX_UPLOAD_BYTES, validateFile } from '../../services/documentService'
import { errorMessage } from '../../services/api'
import { StarterQuestions } from './StarterQuestions'
import { useDocuments } from '../../services/queries'

type UploadItem = {
  id: number
  file: File
  status: 'queued' | 'uploading' | 'uploaded' | 'failed' | 'canceled'
  progress: number
  error?: string
  retryable?: boolean
  document?: Document
}

const MAX_CONCURRENT_UPLOADS = 2

export function UploadZone() {
  const client = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const controllers = useRef(new Map<number, AbortController>())
  const nextId = useRef(0)
  const mounted = useRef(true)
  const [drag, setDrag] = useState(false)
  const [items, setItems] = useState<UploadItem[]>([])
  const [lastUploadedDoc, setLastUploadedDoc] = useState<Document | null>(null)
  const { data: library } = useDocuments()
  const uploadedDoc = library?.documents.find((doc) => doc.id === lastUploadedDoc?.id) || lastUploadedDoc
  const pending = items.filter((item) => item.status === 'queued' || item.status === 'uploading').length
  const uploaded = items.filter((item) => item.status === 'uploaded').length
  const failed = items.filter((item) => item.status === 'failed').length
  const canceled = items.filter((item) => item.status === 'canceled').length

  useEffect(() => {
    mounted.current = true
    const activeControllers = controllers.current
    return () => {
      mounted.current = false
      activeControllers.forEach((abort) => abort.abort())
    }
  }, [])

  useEffect(() => {
    function update(id: number, patch: Partial<UploadItem>) {
      if (mounted.current) setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
    }
    async function upload(item: UploadItem, abort: AbortController) {
      update(item.id, { status: 'uploading', progress: 0, error: undefined })
      try {
        // Validate every signature independently: one bad file cannot stop the queue.
        const signature = new TextDecoder().decode(await item.file.slice(0, 5).arrayBuffer())
        if (abort.signal.aborted) return
        if (signature !== '%PDF-') {
          update(item.id, { status: 'failed', error: 'This file is not a valid PDF. Export it as a PDF and try again.', retryable: false })
          return
        }
        const document = await documentService.upload(item.file, (progress) => update(item.id, { progress }), abort.signal)
        if (!mounted.current || abort.signal.aborted) return
        update(item.id, { status: 'uploaded', progress: 100, document })
        setLastUploadedDoc(document)
      } catch (err) {
        if (!abort.signal.aborted) update(item.id, { status: 'failed', error: errorMessage(err), retryable: true })
      } finally {
        controllers.current.delete(item.id)
        if (mounted.current) {
          // Refresh partial successes immediately, including active collection counts.
          void client.invalidateQueries({ queryKey: ['documents'] })
          void client.invalidateQueries({ queryKey: ['collection-documents'] })
          void client.invalidateQueries({ queryKey: ['collections'] })
          setItems((current) => [...current])
        }
      }
    }
    for (const item of items) {
      if (controllers.current.size >= MAX_CONCURRENT_UPLOADS) break
      if (item.status !== 'queued' || controllers.current.has(item.id)) continue
      const abort = new AbortController()
      controllers.current.set(item.id, abort)
      void upload(item, abort)
    }
  }, [items, client])

  function enqueue(files: FileList | File[]) {
    const additions: UploadItem[] = Array.from(files).map((file) => {
      const error = validateFile(file)
      return { id: ++nextId.current, file, status: error ? 'failed' : 'queued', progress: 0,
        error: error || undefined, retryable: false }
    })
    setItems((current) => [...current, ...additions])
    if (input.current) input.current.value = ''
  }
  function cancel(id: number) {
    const active = controllers.current.get(id)
    active?.abort()
    setItems((current) => current.map((item) => item.id === id ? {
      ...item, status: 'canceled', retryable: true,
      error: active ? 'Upload canceled on this device. Check the library before retrying; the server may already have received this file.' : 'Upload canceled before transfer.',
    } : item))
  }
  function retry(id: number) {
    setItems((current) => current.map((item) => item.id === id ? {
      ...item, status: 'queued', progress: 0, error: undefined,
    } : item))
  }
  function drop(event: DragEvent) {
    event.preventDefault()
    setDrag(false)
    enqueue(event.dataTransfer.files)
  }
  return (
    <section className="upload-section" aria-label="Upload papers">
      <motion.div
        className={`upload-zone ${drag ? 'dragging' : ''}`}
        animate={{ borderColor: drag ? '#116e64' : '#c8d6df' }}
        onDragOver={(event) => {
          event.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={drop}
      >
        <div className="upload-icon">
          <UploadCloud size={27} />
        </div>
        <div>
          <h2>
            {pending ? `Preparing ${pending} ${pending === 1 ? 'paper' : 'papers'} for your library.` : 'Make your next papers part of the conversation.'}
          </h2>
          <p>
            Drop PDFs here, or choose multiple files. Up to {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB per paper.
            {pending > 0 && ' Keep this page open until transfers finish. You can add more PDFs.'}
          </p>
        </div>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          aria-label="Choose PDF file"
          tabIndex={-1}
          onChange={(event) => {
            if (event.target.files) enqueue(event.target.files)
          }}
        />
        <button className="button secondary" onClick={() => input.current?.click()}>
          <FileUp size={18} />
          Choose PDFs
        </button>
      </motion.div>
      {items.length > 0 && (
        <div className="upload-queue">
          <div className="upload-queue-heading">
            <p role="status" aria-live="polite">
              {uploaded} uploaded · {pending} remaining · {failed} failed
              {canceled > 0 && ` · ${canceled} canceled`}
            </p>
            <button className="text-button" disabled={items.every((item) => item.status === 'queued' || item.status === 'uploading')}
              onClick={() => setItems((current) => current.filter((item) => item.status === 'queued' || item.status === 'uploading'))}>
              Clear finished
            </button>
          </div>
          <ul className="upload-queue-list" aria-label="File uploads">
            {items.map((item) => {
              const document = library?.documents.find((doc) => doc.id === item.document?.id) || item.document
              return (
                <li key={item.id} className="upload-queue-item" aria-label={item.file.name}>
                  <div className="upload-queue-heading">
                    <strong>{item.file.name}</strong>
                    {(item.status === 'queued' || item.status === 'uploading') && (
                      <button className="text-button" aria-label={`Cancel upload ${item.file.name}`} onClick={() => cancel(item.id)}>
                        <X size={14} /> Cancel
                      </button>
                    )}
                    {(item.status === 'failed' || item.status === 'canceled') && item.retryable && (
                      <button className="text-button" aria-label={`Retry upload ${item.file.name}`} onClick={() => retry(item.id)}>Retry upload</button>
                    )}
                  </div>
                  {item.status === 'queued' && <p>Queued</p>}
                  {item.status === 'uploading' && (
                    <div className="upload-progress">
                      <p>{item.progress < 100 ? `${item.progress}% transferred` : 'Upload sent. Waiting for server confirmation…'}</p>
                      <div role="progressbar" aria-label={`Upload ${item.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress} className="progress-track">
                        <motion.div animate={{ width: `${item.progress}%` }} transition={{ duration: 0.1 }} />
                      </div>
                    </div>
                  )}
                  {item.error && <p role={item.status === 'failed' ? 'alert' : undefined} className="upload-error">{item.error}</p>}
                  {item.status === 'uploaded' && document && (
                    <div className="upload-result">
                      <p className="success-message"><CheckCircle2 size={16} />Uploaded. {document.status === 'completed' ? 'Ready for questions.' : document.status === 'failed' ? 'Processing failed. Retry processing in the library.' : 'Processing will continue in your library.'}</p>
                      <Link className="text-link" to={`/library?document=${document.id}`}>View paper</Link>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {lastUploadedDoc && (
        <div className="mt-4 p-4 border border-teal-200 rounded-lg bg-white shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
                Paper starter questions
              </span>
              <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                {lastUploadedDoc.title}
              </h3>
            </div>
            <Link
              to={`/chat?document=${lastUploadedDoc.id}`}
              className="button secondary small inline-flex items-center gap-1"
            >
              <span>Chat about this paper</span>
            </Link>
          </div>
          {uploadedDoc?.status === 'completed' ? (
            <StarterQuestions documentId={uploadedDoc.id} documentTitle={uploadedDoc.title} />
          ) : (
            <p role="status" className="text-sm text-slate-600">
              {uploadedDoc?.status === 'failed'
                ? 'Paper processing failed. Retry processing in the library to prepare starter questions.'
                : 'Processing your paper. Starter questions will appear when it is ready.'}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
