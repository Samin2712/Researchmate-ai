import { useMemo, useState } from 'react'
import { BookOpen, Search, SlidersHorizontal } from 'lucide-react'
import type { Document } from '../../types'
import { DocumentCard } from './DocumentCard'
import { EmptyState } from '../shared/Feedback'
export function DocumentList({
  documents,
  selected,
}: {
  documents: Document[]
  selected?: number
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('newest')
  const filtered = useMemo(
    () =>
      documents
        .filter(
          (document) =>
            (!search ||
              `${document.title} ${document.authors || ''} ${document.year || ''}`
                .toLowerCase()
                .includes(search.toLowerCase())) &&
            (status === 'all' || document.status === status),
        )
        .sort((a, b) =>
          sort === 'title'
            ? a.title.localeCompare(b.title)
            : Date.parse(b.created_at) - Date.parse(a.created_at),
        ),
    [documents, search, status, sort],
  )
  return (
    <>
      <div className="library-toolbar">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Search papers"
            placeholder="Search title, author, or year…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex gap-2 items-center">
          <SlidersHorizontal size={17} className="muted" />
          <select
            aria-label="Filter papers by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="completed">Ready</option>
            <option value="processing">Processing</option>
            <option value="uploading">Uploading</option>
            <option value="failed">Failed</option>
          </select>
          <select
            aria-label="Sort papers"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>
      <p className="results-count" role="status">
        {filtered.length} {filtered.length === 1 ? 'paper' : 'papers'}
        {search ? ` matching “${search}”` : ' in your library'}
      </p>
      {filtered.length ? (
        <div className="document-grid">
          {filtered.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              expanded={selected === document.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen size={30} />}
          title={
            documents.length
              ? 'No papers match your search.'
              : 'Your next discovery starts with a paper.'
          }
        >
          <p>
            {documents.length
              ? 'Try a different title, author, year, or status.'
              : 'Upload your first PDF above. Once it’s ready, you can ask questions and explore its sources.'}
          </p>
          {documents.length > 0 && (
            <button
              className="button secondary mt-4"
              onClick={() => {
                setSearch('')
                setStatus('all')
              }}
            >
              Clear filters
            </button>
          )}
        </EmptyState>
      )}
    </>
  )
}
