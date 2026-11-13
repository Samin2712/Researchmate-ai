import { useState } from 'react'
import { FileText, MessageSquare, Trash2, Copy, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Document } from '../../types'
import { documentService } from '../../services/documentService'
import { errorMessage } from '../../services/api'
import { Modal } from '../shared/Modal'
import { ErrorState } from '../shared/Feedback'
import { toast } from '../../store/toasts'
import { Summarizer } from '../tools/Summarizer'
import { formatCitation, type CitationStyle } from '../tools/citations'

export function StatusBadge({ status }: { status: Document['status'] }) {
  return (
    <span className={`status-badge ${status}`}>
      <span />
      {status === 'completed'
        ? 'Ready to explore'
        : status === 'failed'
          ? 'Processing failed'
          : 'Processing'}
    </span>
  )
}
export function DocumentCard({
  document,
  expanded = false,
}: {
  document: Document
  expanded?: boolean
}) {
  const [details, setDetails] = useState(expanded)
  const [deleting, setDeleting] = useState(false)
  const [style, setStyle] = useState<CitationStyle>('APA')
  const [copied, setCopied] = useState(false)
  const client = useQueryClient()
  const remove = useMutation({
    mutationFn: () => documentService.remove(document.id),
    onSuccess: () => {
      toast('Paper deleted.')
      void client.invalidateQueries({ queryKey: ['documents'] })
      setDeleting(false)
    },
  })
  async function copy() {
    try {
      await navigator.clipboard.writeText(formatCitation(document, style))
      setCopied(true)
      toast('Citation copied.')
    } catch {
      toast('Copy is unavailable. Select the citation text to copy it.', 'error')
    }
  }
  return (
    <article
      id={`document-${document.id}`}
      className={`document-card ${expanded ? 'featured' : ''}`}
    >
      <div className="document-top">
        <span className="file-icon">
          <FileText size={23} />
        </span>
        <StatusBadge status={document.status} />
      </div>
      <button className="document-title" onClick={() => setDetails(true)}>
        {document.title}
      </button>
      <p className="document-authors">
        {document.authors || 'Author information pending'}
        {document.year ? ` · ${document.year}` : ''}
      </p>
      <p className="document-abstract">
        {document.abstract ||
          (document.status === 'completed'
            ? 'Your paper is indexed and ready. Open a conversation to explore the findings.'
            : 'Extracting the text and preparing your paper for questions.')}
      </p>
      <div className="document-meta">
        <span>{document.page_count ? `${document.page_count} pages` : 'PDF document'}</span>
        <span>
          {new Date(document.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
      {document.status === 'failed' && (
        <p className="document-failure" role="status">
          {document.error_message || 'Could not process this PDF.'} Delete this paper and upload a
          readable PDF to try again.
        </p>
      )}
      <div className="document-actions">
        <Summarizer document={document} />
        <div className="flex items-center gap-1">
          {document.status === 'completed' && (
            <Link
              className="icon-button"
              aria-label={`Chat about ${document.title}`}
              to={`/chat?document=${document.id}`}
            >
              <MessageSquare size={17} />
            </Link>
          )}
          <button
            className="icon-button danger"
            aria-label={`Delete ${document.title}`}
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      {details && (
        <Modal title="Paper details" onClose={() => setDetails(false)} wide>
          <h3 className="text-xl mb-3">{document.title}</h3>
          <p className="muted mb-4">
            {document.authors || 'Unknown author'}
            {document.year ? ` · ${document.year}` : ''}
          </p>
          <StatusBadge status={document.status} />
          <h4 className="mt-6 mb-2 font-semibold">Abstract</h4>
          <p className="leading-relaxed">
            {document.abstract || 'No abstract is available for this paper.'}
          </p>
          <div className="citation-formatter">
            <label htmlFor={`citation-style-${document.id}`}>Citation style</label>
            <select
              id={`citation-style-${document.id}`}
              value={style}
              onChange={(event) => {
                setStyle(event.target.value as CitationStyle)
                setCopied(false)
              }}
            >
              <option>APA</option>
              <option>MLA</option>
              <option>Chicago</option>
            </select>
            <p className="citation-text">{formatCitation(document, style)}</p>
            <button className="button secondary small" onClick={() => void copy()}>
              {copied ? <Check size={16} /> : <Copy size={16} />}Copy citation
            </button>
            <p className="muted text-xs mt-3">
              Draft citation from available metadata. Verify authors, publication, and DOI before
              submitting.
            </p>
          </div>
          <div className="modal-actions">
            <Summarizer document={document} />
            {document.status === 'completed' && (
              <Link className="button primary small" to={`/chat?document=${document.id}`}>
                Chat about this paper
              </Link>
            )}
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Delete this paper?"
          onClose={() => {
            if (!remove.isPending) setDeleting(false)
          }}
        >
          <p>
            “{document.title}” and its indexed text will be removed. Existing conversations will
            remain.
          </p>
          {remove.isError && <ErrorState message={errorMessage(remove.error)} />}
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={remove.isPending}
              onClick={() => setDeleting(false)}
            >
              Keep paper
            </button>
            <button
              className="button destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              {remove.isPending ? 'Deleting…' : 'Delete paper'}
            </button>
          </div>
        </Modal>
      )}
    </article>
  )
}
