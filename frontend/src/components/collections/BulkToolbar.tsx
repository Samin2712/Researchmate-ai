import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FolderPlus, Download, FolderMinus, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCollections } from '../../services/queries'
import { collectionService } from '../../services/collectionService'
import { toast } from '../../store/toasts'

interface BulkToolbarProps {
  selectedIds: Set<number>
  collectionId: number | null
  onClear: () => void
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

export function BulkToolbar({ selectedIds, collectionId, onClear }: BulkToolbarProps) {
  const { data: collections = [] } = useCollections()
  const [addOpen, setAddOpen] = useState(false)
  const client = useQueryClient()
  const reducedMotion = usePrefersReducedMotion()
  const count = selectedIds.size
  const ids = Array.from(selectedIds)

  const invalidate = (cid?: number) => {
    void client.invalidateQueries({ queryKey: ['documents'] })
    void client.invalidateQueries({ queryKey: ['collections'] })
    if (cid != null) void client.invalidateQueries({ queryKey: ['collection-documents', cid] })
    if (collectionId != null)
      void client.invalidateQueries({ queryKey: ['collection-documents', collectionId] })
  }

  const addToCollection = useMutation({
    mutationFn: (cid: number) => collectionService.addDocumentsToCollection(cid, ids),
    onSuccess: (_, cid) => {
      toast(`Added ${count} paper${count > 1 ? 's' : ''} to collection.`)
      invalidate(cid)
      setAddOpen(false)
      onClear()
    },
    onError: () => toast('Could not add to collection.', 'error'),
  })

  const removeFromCollection = useMutation({
    mutationFn: () => collectionService.removeDocumentsFromCollection(collectionId!, ids),
    onSuccess: () => {
      toast(`Removed ${count} paper${count > 1 ? 's' : ''} from collection.`)
      invalidate(collectionId!)
      onClear()
    },
    onError: () => toast('Could not remove from collection.', 'error'),
  })

  async function exportBib() {
    try {
      const blob = await collectionService.bulkExportBibtex(ids)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `references-${Date.now()}.bib`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast('Export failed.', 'error')
    }
  }

  const motionProps = reducedMotion
    ? {}
    : { initial: { y: -48, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -48, opacity: 0 }, transition: { duration: 0.2 } }

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          className="bulk-toolbar"
          role="toolbar"
          aria-label="Bulk actions"
          {...motionProps}
        >
          <span className="bulk-count">
            <strong>{count}</strong> {count === 1 ? 'paper' : 'papers'} selected
          </span>

          <div className="bulk-actions">
            {/* Add to collection */}
            <div className="bulk-dropdown-wrap">
              <button
                type="button"
                className="button secondary small"
                onClick={() => setAddOpen((o) => !o)}
                aria-expanded={addOpen}
                aria-controls="collection-choices"
              >
                <FolderPlus size={15} />
                Add to collection
              </button>
              {addOpen && (
                <ul id="collection-choices" className="bulk-dropdown" aria-label="Choose collection">
                  {collections.length === 0 && (
                    <li className="bulk-dropdown-empty">No collections yet</li>
                  )}
                  {collections.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="bulk-dropdown-item"
                        onClick={() => addToCollection.mutate(c.id)}
                        disabled={addToCollection.isPending}
                      >
                        {c.name}
                        <span className="bulk-dropdown-count">{c.document_count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              className="button secondary small"
              onClick={() => void exportBib()}
            >
              <Download size={15} />
              Export .bib
            </button>

            {collectionId != null && (
              <button
                type="button"
                className="button secondary small"
                disabled={removeFromCollection.isPending}
                onClick={() => removeFromCollection.mutate()}
              >
                <FolderMinus size={15} />
                Remove from collection
              </button>
            )}

            <button
              type="button"
              className="icon-button"
              aria-label="Clear selection"
              onClick={onClear}
            >
              <X size={17} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
