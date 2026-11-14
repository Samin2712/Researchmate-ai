/**
 * Evidence Notebook - Persistent saved evidence view
 */
import { useState, useEffect, useRef } from 'react'
import { Search, Filter, Download, Edit2, Trash2, BookOpen, AlertTriangle, Loader2, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { useEvidenceStore } from '../../store/evidence'
import { listEvidenceNotes, deleteEvidenceNote, exportEvidenceNotes, updateEvidenceNote } from '../../services/evidenceService'
import { collectionService } from '../../services/collectionService'
import { toast } from '../../store/toasts'
import { errorMessage } from '../../services/api'
import { useDialogFocus } from './useDialogFocus'
import type { EvidenceNote, EvidenceNoteUpdate } from '../../types'

export function EvidenceNotebook() {
  const {
    notebook,
    closeNotebook,
    setNotebookFilter,
    setNotebookSearch,
    openSourcePanel,
  } = useEvidenceStore()
  const { filterCollectionId, searchQuery } = notebook

  const panelRef = useRef<HTMLDivElement>(null)
  const sourceOpen = useEvidenceStore(state => state.sourcePanel.isOpen)
  const saving = useEvidenceStore(state => state.isSavingEvidence)
  useDialogFocus(panelRef, notebook.isOpen, closeNotebook, sourceOpen || saving)
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [editingNote, setEditingNote] = useState<EvidenceNote | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNoteText, setEditNoteText] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editCollection, setEditCollection] = useState('')
  useEffect(() => { setPage(1); setSelectedNotes([]) }, [filterCollectionId, searchQuery])
  const [selectedNotes, setSelectedNotes] = useState<number[]>([])

  // Fetch evidence notes
  const { data: notesData, isLoading, error: listError } = useQuery({
    queryKey: ['evidence-notes', page, filterCollectionId, searchQuery],
    queryFn: () =>
      listEvidenceNotes({
        page,
        page_size: 20,
        collection_id: filterCollectionId || undefined,
        search: searchQuery || undefined,
      }),
    enabled: notebook.isOpen,
  })

  // Fetch collections for filter
  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionService.listCollections(),
    enabled: notebook.isOpen,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (noteId: number) => deleteEvidenceNote(noteId),
    onSuccess: () => {
      setSelectedNotes(ids => ids.filter(id => id !== deleteMutation.variables))
      toast('Evidence deleted')
      queryClient.invalidateQueries({ queryKey: ['evidence-notes'] })
    },
    onError: (error: unknown) => {
      toast(errorMessage(error), 'error')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ noteId, data }: { noteId: number; data: EvidenceNoteUpdate }) =>
      updateEvidenceNote(noteId, data),
    onSuccess: () => {
      toast('Evidence updated')
      queryClient.invalidateQueries({ queryKey: ['evidence-notes'] })
      setEditingNote(null)
    },
    onError: (error: unknown) => {
      toast(errorMessage(error), 'error')
    },
  })

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: (noteIds: number[]) =>
      exportEvidenceNotes({ note_ids: noteIds, include_collection_info: true }),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `evidence_export_${new Date().toISOString().split('T')[0]}.md`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast('Evidence exported')
      setSelectedNotes([])
    },
    onError: (error: unknown) => {
      toast(errorMessage(error), 'error')
    },
  })

  const handleDelete = (noteId: number) => {
    if (confirm('Are you sure you want to delete this evidence?')) {
      deleteMutation.mutate(noteId)
    }
  }

  const handleEdit = (note: EvidenceNote) => {
    setEditingNote(note)
    setEditTitle(note.title || '')
    setEditNoteText(note.note || '')
    setEditTags(note.tags?.join(', ') || '')
    setEditCollection(note.collection_id?.toString() || '')
  }

  const handleSaveEdit = () => {
    if (!editingNote) return

    updateMutation.mutate({
      noteId: editingNote.id,
      data: {
        title: editTitle.trim() || null,
        note: editNoteText.trim() || null,
        tags: editTags.split(',').map(tag => tag.trim()).filter(Boolean),
        collection_id: editCollection ? Number(editCollection) : null,
      },
    })
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
    setEditTitle('')
    setEditNoteText('')
  }

  const handleToggleSelect = (noteId: number) => {
    setSelectedNotes((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    )
  }

  const handleExport = () => {
    if (selectedNotes.length === 0) {
      toast('Select notes to export')
      return
    }
    exportMutation.mutate(selectedNotes)
  }

  const handleViewSource = (note: EvidenceNote) => {
    if (note.document_id) {
      const source = {
        document_id: note.document_id,
        chunk_id: note.chunk_id || undefined,
        title: note.document_title || 'Source Document',
        authors: note.document_authors || undefined,
        page_number: note.page_number || undefined,
        page_label: note.page_label || undefined,
        chunk_text: note.source_quote,
      }
      closeNotebook()
      openSourcePanel(source, 0, 0) // messageId and sourceIndex not relevant here
    }
  }

  if (!notebook.isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="evidence-notebook-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeNotebook}
      >
        <motion.div
          className="evidence-notebook-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Evidence notebook"
        >
          <div className="notebook-header">
            <h2>
              <BookOpen size={24} />
              Evidence Notebook
            </h2>
            <button onClick={closeNotebook} className="btn-icon" aria-label="Close notebook">
              <X size={20} />
            </button>
          </div>

          <div className="notebook-toolbar">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                aria-label="Search evidence"
                placeholder="Search evidence..."
                value={searchQuery}
                onChange={(e) => setNotebookSearch(e.target.value)}
              />
            </div>

            <div className="filter-controls">
              <Filter size={16} />
              <select
                aria-label="Filter evidence by collection"
                value={filterCollectionId || ''}
                onChange={(e) =>
                  setNotebookFilter(e.target.value ? parseInt(e.target.value) : null)
                }
              >
                <option value="">All collections</option>
                {collections?.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedNotes.length > 0 && (
              <button
                onClick={handleExport}
                className="btn-secondary btn-sm"
                disabled={exportMutation.isPending}
              >
                <Download size={16} />
                Export ({selectedNotes.length})
              </button>
            )}
          </div>

          <div className="notebook-content">
            {listError ? <p role="alert">{errorMessage(listError)}</p> : isLoading ? (
              <div className="notebook-loading">
                <Loader2 className="spinner" size={32} />
                <p>Loading evidence...</p>
              </div>
            ) : !notesData || notesData.items.length === 0 ? (
              <div className="notebook-empty">
                <BookOpen size={48} />
                <h3>No Evidence Yet</h3>
                <p>
                  Save evidence from source citations to build your research notebook.
                </p>
              </div>
            ) : (
              <div className="evidence-list">
                {notesData.items.map((note) => (
                  <div
                    key={note.id}
                    className={`evidence-card ${selectedNotes.includes(note.id) ? 'selected' : ''}`}
                  >
                    <div className="evidence-card-header">
                      <input
                        type="checkbox"
                        checked={selectedNotes.includes(note.id)}
                        onChange={() => handleToggleSelect(note.id)}
                        aria-label="Select evidence"
                      />
                      <h3>{note.title || 'Untitled Evidence'}</h3>
                      {!note.document_id && <span>Source unavailable</span>}
                      {note.is_stale === 1 && (
                        <span className="stale-indicator" title="Source may have changed">
                          <AlertTriangle size={14} />
                        </span>
                      )}
                    </div>

                    {editingNote?.id === note.id ? (
                      <div className="evidence-edit-form">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          aria-label="Evidence title"
                          placeholder="Title"
                        />
                        <textarea
                          value={editNoteText}
                          onChange={(e) => setEditNoteText(e.target.value)}
                          aria-label="Personal note"
                          placeholder="Your note"
                          rows={3}
                        />
                        <label>Tags (comma separated)<input aria-label="Edit evidence tags" value={editTags} onChange={e => setEditTags(e.target.value)} /></label>
                        <label>Collection<select aria-label="Edit evidence collection" value={editCollection} onChange={e => setEditCollection(e.target.value)}><option value="">No collection</option>{collections?.map(collection => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
                        <div className="edit-actions">
                          <button onClick={handleCancelEdit} className="btn-text">
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="btn-primary btn-sm"
                            disabled={updateMutation.isPending}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="evidence-source-info">
                          <p className="source-title">{note.document_title || 'Unknown Source'}</p>
                          {note.page_number && (
                            <p className="source-page">
                              {note.page_label || `Page ${note.page_number}`}
                            </p>
                          )}
                        </div>

                        <blockquote tabIndex={0} className="evidence-quote">
                          {note.source_quote}
                        </blockquote>

                        {note.note && (
                          <div className="evidence-note">
                            <strong>Note:</strong>
                            <p>{note.note}</p>
                          </div>
                        )}

                        {note.tags && note.tags.length > 0 && (
                          <div className="evidence-tags">
                            {note.tags.map((tag) => (
                              <span key={tag} className="tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="evidence-card-actions">
                          <button
                            onClick={() => handleViewSource(note)}
                            className="btn-text"
                            disabled={!note.document_id}
                          >
                            View Source
                          </button>
                          <button aria-label="Edit evidence" onClick={() => handleEdit(note)} className="btn-icon">
                            <Edit2 size={14} />
                          </button>
                          <button
                            aria-label="Delete evidence"
                            onClick={() => handleDelete(note.id)}
                            className="btn-icon"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {notesData && notesData.total > 20 && (
              <div className="notebook-pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <span>
                  Page {page} of {Math.ceil(notesData.total / 20)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(notesData.total / 20)}
                  className="btn-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
