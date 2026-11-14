import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { resolvePaperSelection } from '../collections/selection'
import { BookOpen, Search, SlidersHorizontal, Tag as TagIcon } from 'lucide-react'
import type { Document } from '../../types'
import type { DocumentWithCollections } from '../../types/collections'
import { DocumentCard } from './DocumentCard'
import { EmptyState } from '../shared/Feedback'
import { BulkToolbar } from '../collections/BulkToolbar'
import { useTags } from '../../services/queries'

export function DocumentList({
  documents,
  selected,
  collectionId = null,
}: {
  documents: (Document | DocumentWithCollections)[]
  selected?: number
  collectionId?: number | null
}) {
  const [params, setParams] = useSearchParams()
  const search = params.get('q') || ''
  const status = params.get('status') || 'all'
  const sort = params.get('sort') || 'newest'
  const tagFilter: number | 'all' = Number(params.get('tag')) || 'all'
  function setFilter(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (!value || value === 'all' || (key === 'sort' && value === 'newest')) next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }
  const setSearch = (value: string) => setFilter('q', value)
  const setStatus = (value: string) => setFilter('status', value)
  const setSort = (value: string) => setFilter('sort', value)
  const setTagFilter = (value: number | 'all') => setFilter('tag', String(value))
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const { data: allTags = [] } = useTags()

  const filtered = useMemo(
    () =>
      documents
        .filter((document) => {
          const matchSearch =
            !search ||
            `${document.title} ${document.authors || ''} ${document.year || ''}`
              .toLowerCase()
              .includes(search.toLowerCase())
          const matchStatus = status === 'all' || document.status === status
          const matchTag =
            tagFilter === 'all' ||
            (document as DocumentWithCollections).tag_ids?.includes(tagFilter) === true
          return matchSearch && matchStatus && matchTag
        })
        .sort((a, b) =>
          sort === 'title'
            ? a.title.localeCompare(b.title)
            : Date.parse(b.created_at) - Date.parse(a.created_at),
        ),
    [documents, search, status, sort, tagFilter],
  )

  function toggleSelect(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(filtered.map((d) => d.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const validIds = new Set(resolvePaperSelection(documents, selectedIds).document_ids)

  const allSelected = filtered.length > 0 && filtered.every((d) => selectedIds.has(d.id))
  const someSelected = filtered.some((d) => selectedIds.has(d.id))

  return (
    <>
      <BulkToolbar
        selectedIds={validIds}
        collectionId={collectionId}
        onClear={() => setSelectedIds(new Set())}
      />

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
          {allTags.length > 0 && (
            <div className="flex items-center gap-1">
              <TagIcon size={15} className="muted" />
              <select
                aria-label="Filter by tag"
                value={tagFilter === 'all' ? 'all' : String(tagFilter)}
                onChange={(e) =>
                  setTagFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
              >
                <option value="all">All tags</option>
                {allTags.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <p className="results-count" role="status">
        {filtered.length} {filtered.length === 1 ? 'paper' : 'papers'}
        {search ? ` matching "${search}"` : ' in your library'}
      </p>

      {filtered.length ? (
        <>
          {/* Select-all header row */}
          <div className="document-select-header">
            <label className="document-select-all">
              <input
                type="checkbox"
                aria-label="Select all papers"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected
                }}
                onChange={(e) => toggleSelectAll(e.target.checked)}
              />
              <span>{allSelected ? 'Deselect all' : 'Select all'}</span>
            </label>
          </div>
          <div className="document-grid">
            {filtered.map((document) => (
              <DocumentCard
                key={document.id}
                document={document as DocumentWithCollections}
                expanded={selected === document.id}
                selected={selectedIds.has(document.id)}
                onSelect={toggleSelect}
              />
            ))}
          </div>
        </>
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
                setParams((previous) => {
                  const next = new URLSearchParams(previous)
                  for (const key of ['q', 'status', 'tag']) next.delete(key)
                  return next
                }, { replace: true })
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
