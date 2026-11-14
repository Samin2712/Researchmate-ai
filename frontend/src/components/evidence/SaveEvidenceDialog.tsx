/**
 * Save Evidence Dialog - Compose and save evidence notes
 */
import { useState, useEffect, useRef } from 'react'
import { X, Save, Tag as TagIcon, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEvidenceStore } from '../../store/evidence'
import { createEvidenceNote } from '../../services/evidenceService'
import { collectionService } from '../../services/collectionService'
import { toast } from '../../store/toasts'
import { errorMessage } from '../../services/api'
import { useDialogFocus } from './useDialogFocus'
import type { EvidenceNoteCreate } from '../../types'

export function SaveEvidenceDialog() {
  const { isSavingEvidence, evidenceToSave, cancelSaveEvidence } =
    useEvidenceStore()
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogFocus(dialogRef, isSavingEvidence, cancelSaveEvidence)
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null)

  // Fetch collections for dropdown
  const { data: collectionsData } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionService.listCollections(),
    enabled: isSavingEvidence,
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (isSavingEvidence && evidenceToSave) {
      setTitle('')
      setNote('')
      setTags([])
      setTagInput('')
      setSelectedCollectionId(null)
    }
  }, [isSavingEvidence, evidenceToSave])

  const saveMutation = useMutation({
    mutationFn: (data: EvidenceNoteCreate) => createEvidenceNote(data),
    onSuccess: () => {
      toast('Evidence saved successfully')
      queryClient.invalidateQueries({ queryKey: ['evidence-notes'] })
      cancelSaveEvidence()
    },
    onError: (error: unknown) => {
      toast(errorMessage(error), 'error')
    },
  })

  const handleSave = () => {
    if (!evidenceToSave) return

    const { source } = evidenceToSave
    const docId =
      typeof source.document_id === 'string'
        ? parseInt(source.document_id)
        : source.document_id

    const evidenceData: EvidenceNoteCreate = {
      document_id: docId,
      chunk_id: source.chunk_id || null,
      page_number:
        typeof source.page_number === 'string'
          ? parseInt(source.page_number)
          : source.page_number || null,
      page_label: source.page_label || null,
      source_quote: source.chunk_text || '',
      quote_bounds: source.char_start !== undefined && source.char_end !== undefined
        ? { start: source.char_start, end: source.char_end }
        : null,
      title: title.trim() || null,
      note: note.trim() || null,
      tags: tags.length > 0 ? tags : null,
      collection_id: selectedCollectionId,
    }

    saveMutation.mutate(evidenceData)
  }

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  if (!isSavingEvidence || !evidenceToSave) {
    return null
  }

  const { source } = evidenceToSave

  return (
    <AnimatePresence>
      <motion.div
        className="dialog-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={cancelSaveEvidence}
      >
        <motion.div
          className="dialog-content save-evidence-dialog"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          ref={dialogRef}
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
          aria-labelledby="save-evidence-title"
        >
          <div className="dialog-header">
            <h2 id="save-evidence-title">Save Evidence</h2>
            <button
              onClick={cancelSaveEvidence}
              className="btn-icon"
              aria-label="Close dialog"
              disabled={saveMutation.isPending}
            >
              <X size={20} />
            </button>
          </div>

          <div className="dialog-body">
            {/* Source preview */}
            <div className="evidence-source-preview">
              <h3>{source.title || 'Source Document'}</h3>
              {source.page_number && (
                <p className="source-page">
                  {source.page_label || `Page ${source.page_number}`}
                </p>
              )}
              <blockquote tabIndex={0} className="source-quote-preview">
                {source.chunk_text || 'No excerpt available'}
              </blockquote>
            </div>

            {/* Evidence form */}
            <div className="evidence-form">
              <div className="form-group">
                <label htmlFor="evidence-title">Title (optional)</label>
                <input
                  id="evidence-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give this evidence a memorable title"
                  disabled={saveMutation.isPending}
                />
              </div>

              <div className="form-group">
                <label htmlFor="evidence-note">Your Note (optional)</label>
                <textarea
                  id="evidence-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add your thoughts, analysis, or context..."
                  rows={4}
                  disabled={saveMutation.isPending}
                />
              </div>

              <div className="form-group">
                <label htmlFor="evidence-collection">Collection (optional)</label>
                <select
                  id="evidence-collection"
                  value={selectedCollectionId || ''}
                  onChange={(e) =>
                    setSelectedCollectionId(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  disabled={saveMutation.isPending}
                >
                  <option value="">No collection</option>
                  {collectionsData?.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="evidence-tags">Tags (optional)</label>
                <div className="tag-input-container">
                  <input
                    id="evidence-tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add tags (press Enter)"
                    disabled={saveMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="btn-icon"
                    disabled={!tagInput.trim() || saveMutation.isPending}
                    aria-label="Add tag"
                  >
                    <TagIcon size={16} />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="tag-list">
                    {tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          aria-label={`Remove tag ${tag}`}
                          disabled={saveMutation.isPending}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dialog-footer">
            <button
              onClick={cancelSaveEvidence}
              className="btn-secondary"
              disabled={saveMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={saveMutation.isPending || !source.chunk_text}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Evidence
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
