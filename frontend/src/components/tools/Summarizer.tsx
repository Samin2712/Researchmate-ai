import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useQueryClient } from '@tanstack/react-query'
import type { Document } from '../../types'
import { chatService } from '../../services/chatService'
import { errorMessage } from '../../services/api'
import { Modal } from '../shared/Modal'
import { ErrorState, Loading } from '../shared/Feedback'
import { Exporter } from './Exporter'

export function Summarizer({ document }: { document: Document }) {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const controller = useRef<AbortController>()
  const client = useQueryClient()
  useEffect(() => () => controller.current?.abort(), [])
  async function summarize() {
    setBusy(true)
    setError('')
    setSummary('')
    const abort = new AbortController()
    controller.current = abort
    const timeout = window.setTimeout(() => abort.abort('timeout'), 180000)
    let answer = ''
    try {
      await chatService.stream(
        {
          message:
            'Summarize this paper. Explain its research question, methods, key findings, and limitations. Cite the relevant pages. State clearly when the available evidence is insufficient.',
          document_ids: [document.id],
        },
        (event) => {
          if (event.type === 'answer') {
            answer += event.content
            setSummary(answer)
          }
        },
        abort.signal,
      )
      if (!answer.trim())
        throw new Error('No summary was returned. Try again when the paper is fully processed.')
      void client.invalidateQueries({ queryKey: ['sessions'] })
    } catch (err) {
      if (!abort.signal.aborted) setError(errorMessage(err))
      else if (abort.signal.reason === 'timeout')
        setError('The summary timed out. Try again shortly.')
    } finally {
      clearTimeout(timeout)
      if (controller.current === abort) setBusy(false)
    }
  }
  function close() {
    controller.current?.abort()
    setOpen(false)
    if (busy) {
      setSummary('')
      setBusy(false)
    }
  }
  return (
    <>
      <button
        className="text-button flex items-center gap-1.5"
        disabled={document.status !== 'completed'}
        onClick={() => {
          setOpen(true)
          if (!summary) void summarize()
        }}
      >
        <Sparkles size={15} />
        Summarize<span className="sr-only"> {document.title}</span>
      </button>
      {open && (
        <Modal title="Paper summary" onClose={close} wide>
          <h3 className="mb-4">{document.title}</h3>
          {busy && !summary && <Loading label="Reading your paper" />}
          {summary && (
            <div className="markdown">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          )}
          {error && <ErrorState message={error} retry={() => void summarize()} />}
          <div className="modal-actions">
            <span className="muted text-sm">
              Summaries use the paper’s indexed text. Check cited pages.
            </span>
            <Exporter
              title={`Summary - ${document.title}`}
              content={summary}
              disabled={busy || !!error}
            />
          </div>
        </Modal>
      )}
    </>
  )
}
