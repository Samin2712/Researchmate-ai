import { useState } from 'react'
import { FileText, MessageSquare, Trash2, Copy, Check, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Document } from '../../types'
import type { DocumentWithCollections } from '../../types/collections'
import { documentService } from '../../services/documentService'
import { collectionService } from '../../services/collectionService'
import { errorMessage } from '../../services/api'
import { Modal } from '../shared/Modal'
import { ErrorState } from '../shared/Feedback'
import { toast } from '../../store/toasts'
import { Summarizer } from '../tools/Summarizer'
import { formatCitation, formatBibTeX, type CitationStyle } from '../tools/citations'
import { TagChip } from '../collections/TagChip'
import { TagManager } from '../collections/TagManager'
import { useTags } from '../../services/queries'

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

const DOCUMENT_TYPES = ['article', 'book', 'inproceedings', 'misc'] as const

export function DocumentCard({
  document,
  expanded = false,
  selected = false,
  onSelect,
}: {
  document: DocumentWithCollections
  expanded?: boolean
  selected?: boolean
  onSelect?: (id: number, checked: boolean) => void
}) {
  const [details, setDetails] = useState(expanded)
  const [deleting, setDeleting] = useState(false)
  const [style, setStyle] = useState<CitationStyle>('APA')
  const [copied, setCopied] = useState(false)
  const [editMeta, setEditMeta] = useState(false)
  const [metaForm, setMetaForm] = useState<Record<string, string>>({})
  const client = useQueryClient()
  const { data: allTags = [] } = useTags()

  const tagIds = document.tag_ids ?? []
  const activeTags = allTags.filter((t) => tagIds.includes(t.id))

  const retry = useMutation({
    mutationFn: () => documentService.retry(document.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['documents'] })
      void client.invalidateQueries({ queryKey: ['collection-documents'] })
      toast('Paper queued for processing.')
    },
  })

  const remove = useMutation({
    mutationFn: () => documentService.remove(document.id),
    onSuccess: () => {
      toast('Paper deleted.')
      void client.invalidateQueries({ queryKey: ['documents'] })
      void client.invalidateQueries({ queryKey: ['collection-documents'] })
      void client.invalidateQueries({ queryKey: ['collections'] })
      setDeleting(false)
    },
  })

  const saveMeta = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      collectionService.updateDocumentMetadata(document.id, data),
    onSuccess: () => {
      toast('Metadata saved.')
      void client.invalidateQueries({ queryKey: ['documents'] })
      void client.invalidateQueries({ queryKey: ['collection-documents'] })
      setEditMeta(false)
    },
    onError: (error) => toast(errorMessage(error), 'error'),
  })

  async function copy() {
    try {
      const text =
        style === 'BibTeX' ? formatBibTeX(document) : formatCitation(document, style)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast('Citation copied.')
    } catch {
      toast('Copy is unavailable. Select the citation text to copy it.', 'error')
    }
  }

  async function downloadBib() {
    try {
      const blob = await collectionService.downloadBibtex(document.id)
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = `${document.title.slice(0, 40).replace(/[^a-z0-9]/gi, '_')}.bib`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast('Download failed.', 'error')
    }
  }

  function openMeta() {
    setMetaForm({
      title: document.title ?? '',
      authors: document.authors ?? '',
      structured_authors: document.structured_authors?.map((a) => `${a.family}; ${a.given}`).join('\n') ?? '',
      year: String(document.year ?? ''),
      doi: document.doi ?? '',
      journal: document.journal ?? '',
      volume: document.volume ?? '',
      issue: document.issue ?? '',
      pages: document.pages ?? '',
      publisher: document.publisher ?? '',
      url: document.url ?? '',
      document_type: document.document_type ?? 'article',
    })
    setEditMeta(true)
  }

  function handleMetaChange(field: string, value: string) {
    setMetaForm((prev) => ({ ...prev, [field]: value }))
  }

  function submitMeta(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, unknown> = { ...metaForm }
    payload.structured_authors = metaForm.structured_authors.trim() ? metaForm.structured_authors.split('\n').filter((line) => line.trim()).map((line) => { const [family, ...given] = line.split(';'); return { family: family.trim(), given: given.join(';').trim() } }) : null
    payload.year = metaForm.year.trim() ? Number(metaForm.year) : null
    for (const field of ['doi', 'journal', 'volume', 'issue', 'pages', 'publisher', 'url', 'authors']) {
      payload[field] = metaForm[field]?.trim() || null
    }
    saveMeta.mutate(payload)
  }

  const citationText =
    style === 'BibTeX' ? formatBibTeX(document) : formatCitation(document, style)

  return (
    <article
      id={`document-${document.id}`}
      className={`document-card ${expanded ? 'featured' : ''} ${selected ? 'document-row-selected' : ''}`}
    >
      <div className="document-top">
        {onSelect && (
          <input
            type="checkbox"
            aria-label={`Select ${document.title}`}
            checked={selected}
            onChange={(e) => onSelect(document.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            style={{ marginRight: 6 }}
          />
        )}
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
      {activeTags.length > 0 && (
        <div className="document-tags">
          {activeTags.map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
        </div>
      )}
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
          {document.error_message ||
            'Could not process this PDF. Retry processing or upload a readable PDF.'}
        </p>
      )}
      {document.status === 'failed' && (
        <button className="text-button" disabled={retry.isPending} onClick={() => retry.mutate()}>
          {retry.isPending ? 'Retrying…' : 'Retry processing'}
        </button>
      )}
      {retry.isError && <ErrorState message={errorMessage(retry.error)} />}
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

      {/* Detail modal */}
      {details && (
        <Modal title="Paper details" onClose={() => setDetails(false)} wide>
          <h3 className="text-xl mb-3">{document.title}</h3>
          <p className="muted mb-4">
            {document.authors || 'Unknown author'}
            {document.year ? ` · ${document.year}` : ''}
          </p>
          <StatusBadge status={document.status} />

          {/* Tags */}
          <h4 className="mt-6 mb-2 font-semibold">Tags</h4>
          <TagManager documentId={document.id} tagIds={tagIds} />

          <h4 className="mt-6 mb-2 font-semibold">Abstract</h4>
          <p className="leading-relaxed">
            {document.abstract || 'No abstract is available for this paper.'}
          </p>

          {/* Citation formatter */}
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
              <option value="APA">APA</option>
              <option value="MLA">MLA</option>
              <option value="Chicago">Chicago</option>
              <option value="BibTeX">BibTeX</option>
            </select>
            <p className="citation-text" style={style === 'BibTeX' ? { fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' } : {}}>
              {citationText}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="button secondary small" onClick={() => void copy()}>
                {copied ? <Check size={16} /> : <Copy size={16} />}Copy citation
              </button>
              {style === 'BibTeX' && (
                <button className="button secondary small" onClick={() => void downloadBib()}>
                  <Download size={16} />Download .bib
                </button>
              )}
            </div>
            <p className="muted text-xs mt-3">
              Draft citation from available metadata. Verify authors, publication, and DOI before
              submitting.
            </p>
          </div>

          {/* Metadata editor */}
          <div style={{ marginTop: 24 }}>
            {editMeta ? (
              <form onSubmit={submitMeta}>
                <h4 className="mb-3 font-semibold">Edit metadata</h4>
                <div className="meta-form-grid">
                  {(
                    [
                      ['title', 'Title'],
                      ['authors', 'Authors'],
                      ['year', 'Year'],
                      ['doi', 'DOI'],
                      ['journal', 'Journal'],
                      ['volume', 'Volume'],
                      ['issue', 'Issue'],
                      ['pages', 'Pages'],
                      ['publisher', 'Publisher'],
                      ['url', 'URL'],
                    ] as [string, string][]
                  ).map(([field, label]) => (
                    <div key={field} className="meta-form-row">
                      <label htmlFor={`meta-${field}-${document.id}`}>
                        {label}
                        {(field === 'doi' || field === 'journal') && !metaForm[field] && (
                          <span className="meta-hint"> (not provided)</span>
                        )}
                      </label>
                      <input
                        id={`meta-${field}-${document.id}`}
                        type={field === 'year' ? 'number' : field === 'url' ? 'url' : 'text'}
                        required={field === 'title'}
                        min={field === 'year' ? 1 : undefined}
                        max={field === 'year' ? 9999 : undefined}
                        pattern={field === 'doi' ? '10\\.[0-9]{4,9}/[^ ]+' : undefined}
                        value={metaForm[field] ?? ''}
                        onChange={(e) => handleMetaChange(field, e.target.value)}
                        placeholder={`Enter ${label.toLowerCase()}…`}
                      />
                    </div>
                  ))}
                  <div className="meta-form-row">
                    <label htmlFor={`meta-document_type-${document.id}`}>Document type</label>
                    <select
                      id={`meta-document_type-${document.id}`}
                      value={metaForm.document_type ?? 'article'}
                      onChange={(e) => handleMetaChange('document_type', e.target.value)}
                    >
                      {DOCUMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label htmlFor={`structured-authors-${document.id}`}>Ordered authors (one per line: family; given)</label>
                <textarea id={`structured-authors-${document.id}`} value={metaForm.structured_authors ?? ''} onChange={(e) => handleMetaChange('structured_authors', e.target.value)} />
                <p className="muted text-xs">Leave blank to preserve the legacy authors field as the citation source.</p>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setEditMeta(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="button primary" disabled={saveMeta.isPending}>
                    {saveMeta.isPending ? 'Saving…' : 'Save metadata'}
                  </button>
                </div>
              </form>
            ) : (
              <button className="button secondary small" onClick={openMeta}>
                Edit metadata
              </button>
            )}
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

      {/* Delete modal */}
      {deleting && (
        <Modal
          title="Delete this paper?"
          onClose={() => {
            if (!remove.isPending) setDeleting(false)
          }}
        >
          <p>
            "{document.title}" and its indexed text will be removed. Existing conversations will
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
