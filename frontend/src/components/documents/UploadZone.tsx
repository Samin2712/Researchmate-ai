import { useEffect, useRef, useState, type DragEvent } from 'react'
import { CheckCircle2, FileUp, UploadCloud, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useQueryClient } from '@tanstack/react-query'
import type { Document } from '../../types'
import { documentService, MAX_UPLOAD_BYTES, validateFile } from '../../services/documentService'
import { errorMessage } from '../../services/api'
import { toast } from '../../store/toasts'
import { StarterQuestions } from './StarterQuestions'
import { useDocuments } from '../../services/queries'

export function UploadZone() {
  const client = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const controller = useRef<AbortController>()
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastUploadedDoc, setLastUploadedDoc] = useState<Document | null>(null)
  const { data: library } = useDocuments()
  const uploadedDoc = library?.documents.find((doc) => doc.id === lastUploadedDoc?.id) || lastUploadedDoc
  useEffect(() => () => controller.current?.abort(), [])
  async function upload(selected: File) {
    if (busy) return
    setError('')
    setSuccess('')
    setFile(selected)
    const validation = validateFile(selected)
    if (validation) {
      setError(validation)
      return
    }
    // The extension and MIME type are insufficient to catch renamed files.
    setBusy(true)
    setProgress(0)
    const abort = new AbortController()
    controller.current = abort
    try {
      const signature = new TextDecoder().decode(await selected.slice(0, 5).arrayBuffer())
      if (signature !== '%PDF-') {
        setError('This file is not a valid PDF. Export it as a PDF and try again.')
        return
      }
      const uploaded = await documentService.upload(selected, setProgress, abort.signal)
      setLastUploadedDoc(uploaded)
      setSuccess(`${selected.name} uploaded. Processing will continue in your library.`)
      setFile(null)
      toast('Paper uploaded. We’re preparing it for research.')
      await client.invalidateQueries({ queryKey: ['documents'] })
    } catch (err) {
      if (!abort.signal.aborted) setError(errorMessage(err))
      else setError('Upload canceled. Choose the file again to retry.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  function drop(event: DragEvent) {
    event.preventDefault()
    setDrag(false)
    if (event.dataTransfer.files.length !== 1) {
      setError('Add one PDF at a time so you can track each upload.')
      return
    }
    const selected = event.dataTransfer.files[0]
    if (selected) void upload(selected)
  }
  return (
    <section className="upload-section" aria-label="Upload a paper">
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
            {busy ? `Uploading ${file?.name}` : 'Make your next paper part of the conversation.'}
          </h2>
          <p>
            {busy
              ? 'Keep this page open until the upload finishes.'
              : `Drop a PDF here, or choose a file. Up to ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB per paper.`}
          </p>
        </div>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          aria-label="Choose PDF file"
          tabIndex={-1}
          disabled={busy}
          onChange={(event) => {
            const selected = event.target.files?.[0]
            if (selected) void upload(selected)
          }}
        />
        <button className="button secondary" disabled={busy} onClick={() => input.current?.click()}>
          <FileUp size={18} />
          Choose PDF
        </button>
      </motion.div>
      {busy && (
        <div className="upload-progress" role="status">
          <div className="flex justify-between gap-4">
            <span>
              {progress < 100
                ? 'Transferring file'
                : 'Upload sent. Waiting for server confirmation…'}
            </span>
            <button className="text-button flex gap-1" onClick={() => controller.current?.abort()}>
              <X size={16} />
              Cancel
            </button>
          </div>
          <div
            role="progressbar"
            aria-label="File upload"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="progress-track"
          >
            <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.1 }} />
          </div>
          <span>{progress}% transferred</span>
        </div>
      )}
      {error && (
        <div role="alert" className="upload-error">
          <p>{error}</p>
          {file && !validateFile(file) && (
            <button className="text-button" onClick={() => void upload(file)}>
              Retry upload
            </button>
          )}
        </div>
      )}
      {success && (
        <p className="success-message" role="status">
          <CheckCircle2 size={17} />
          {success}
        </p>
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
