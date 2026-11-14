import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTags } from '../../services/queries'
import { collectionService } from '../../services/collectionService'
import type { Tag } from '../../types/collections'
import { TagChip } from './TagChip'
import { toast } from '../../store/toasts'

interface TagManagerProps {
  documentId: number
  tagIds: number[]
}

export function TagManager({ documentId, tagIds }: TagManagerProps) {
  const { data: allTags = [] } = useTags()
  const [open, setOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const client = useQueryClient()

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['documents'] })
      void client.invalidateQueries({ queryKey: ['collection-documents'] })
    void client.invalidateQueries({ queryKey: ['tags'] })
  }

  const addTag = useMutation({
    mutationFn: (tagId: number) => collectionService.addTagToDocument(documentId, tagId),
    onSuccess: () => {
      invalidate()
      setOpen(false)
    },
    onError: () => toast('Could not add tag.', 'error'),
  })

  const removeTag = useMutation({
    mutationFn: (tagId: number) => collectionService.removeTagFromDocument(documentId, tagId),
    onSuccess: invalidate,
    onError: () => toast('Could not remove tag.', 'error'),
  })

  const renameTag = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => collectionService.updateTag(id, { name }),
    onSuccess: invalidate,
    onError: () => toast('Could not rename tag.', 'error'),
  })
  const deleteTag = useMutation({
    mutationFn: collectionService.deleteTag,
    onSuccess: invalidate,
    onError: () => toast('Could not delete tag.', 'error'),
  })

  const createTag = useMutation({
    mutationFn: (name: string) => collectionService.createTag(name),
    onSuccess: (tag) => {
      addTag.mutate(tag.id)
      setNewTagName('')
      invalidate()
    },
    onError: () => toast('Could not create tag.', 'error'),
  })

  const activeTags: Tag[] = allTags.filter((t) => tagIds.includes(t.id))
  const availableTags = allTags.filter((t) => !tagIds.includes(t.id))

  return (
    <div className="tag-manager">
      <div className="tag-manager-chips">
        {activeTags.map((tag) => (
          <span key={tag.id} className="tag-manager-chips">
            <TagChip tag={tag} onRemove={(id) => removeTag.mutate(id)} />
            <button type="button" className="text-button" aria-label={`Rename tag ${tag.name}`} onClick={() => {
              const name = window.prompt('Tag name', tag.name)?.trim()
              if (name) renameTag.mutate({ id: tag.id, name })
            }}>Rename</button>
            <button type="button" className="text-button" aria-label={`Delete tag ${tag.name}`} onClick={() => {
              if (window.confirm(`Delete tag "${tag.name}" from all papers?`)) deleteTag.mutate(tag.id)
            }}>Delete</button>
          </span>
        ))}
        <button
          className="tag-add-btn"
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Add tag"
        >
          <Plus size={13} /> Add tag
        </button>
      </div>
      {open && (
        <div className="tag-dropdown" role="dialog" aria-label="Tag selector">
          {availableTags.length > 0 && (
            <ul className="tag-dropdown-list">
              {availableTags.map((tag) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    className="tag-dropdown-item"
                    onClick={() => addTag.mutate(tag.id)}
                    disabled={addTag.isPending}
                  >
                    <span
                      className="tag-swatch"
                      style={{ background: tag.color || '#116e64' }}
                    />
                    {tag.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="tag-new-form"
            onSubmit={(e) => {
              e.preventDefault()
              const name = newTagName.trim()
              if (name) createTag.mutate(name)
            }}
          >
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              aria-label="New tag name"
              placeholder="New tag name…"
              className="tag-new-input"
              autoFocus
            />
            <button
              type="submit"
              className="button primary small"
              disabled={!newTagName.trim() || createTag.isPending}
            >
              Create
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
