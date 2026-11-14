import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FolderOpen, Folder, MoreHorizontal, Plus, Check, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCollections } from '../../services/queries'
import { collectionService } from '../../services/collectionService'
import type { Collection } from '../../types/collections'
import { toast } from '../../store/toasts'

export function CollectionSidebar() {
  const collectionsQuery = useCollections()
  const { data: collections = [] } = collectionsQuery
  const [params, setParams] = useSearchParams()
  const activeId = Number(params.get('collection')) || null
  const client = useQueryClient()

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [menuOpen, setMenuOpen] = useState<number | null>(null)
  const [renaming, setRenaming] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['collections'] })
    void client.invalidateQueries({ queryKey: ['documents'] })
      void client.invalidateQueries({ queryKey: ['collection-documents'] })
  }

  const createCollection = useMutation({
    mutationFn: (name: string) => collectionService.createCollection(name),
    onSuccess: (col) => {
      toast(`Collection "${col.name}" created.`)
      invalidate()
      setCreating(false)
      setNewName('')
      setParams((previous) => { const next = new URLSearchParams(previous); next.set('collection', String(col.id)); return next })
    },
    onError: () => toast('Could not create collection.', 'error'),
  })

  const updateCollection = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      collectionService.updateCollection(id, { name }),
    onSuccess: () => {
      toast('Collection renamed.')
      invalidate()
      setRenaming(null)
    },
    onError: () => toast('Could not rename collection.', 'error'),
  })

  const deleteCollection = useMutation({
    mutationFn: (id: number) => collectionService.deleteCollection(id),
    onSuccess: (_, id) => {
      toast('Collection deleted.')
      invalidate()
      if (activeId === id) {
        const p = new URLSearchParams(params)
        p.delete('collection')
        setParams(p)
      }
    },
    onError: () => toast('Could not delete collection.', 'error'),
  })

  function selectCollection(id: number | null) {
    if (id === null) {
      const p = new URLSearchParams(params)
      p.delete('collection')
      setParams(p)
    } else {
      setParams((previous) => { const next = new URLSearchParams(previous); next.set('collection', String(id)); return next })
    }
    setMenuOpen(null)
  }

  function startRename(col: Collection) {
    setRenaming(col.id)
    setRenameValue(col.name)
    setMenuOpen(null)
  }

  function confirmDelete(col: Collection) {
    setMenuOpen(null)
    const msg =
      col.document_count > 0
        ? `Delete "${col.name}"? This removes the collection but not the papers inside it.`
        : `Delete "${col.name}"?`
    if (window.confirm(msg)) deleteCollection.mutate(col.id)
  }

  return (
    <nav className="collection-sidebar" aria-label="Collections">
      {collectionsQuery.isError && <p role="alert">Could not load collections. <button className="text-button" onClick={() => void collectionsQuery.refetch()}>Retry</button></p>}
      {/* All papers */}
      <button
        type="button"
        className={`collection-nav-item ${activeId === null ? 'active' : ''}`}
        onClick={() => selectCollection(null)}
        aria-current={activeId === null ? 'page' : undefined}
      >
        <FolderOpen size={16} />
        <span>All papers</span>
      </button>

      {/* Collection list */}
      {collections.map((col) =>
        renaming === col.id ? (
          <form
            key={col.id}
            className="collection-rename-form"
            onSubmit={(e) => {
              e.preventDefault()
              const name = renameValue.trim()
              if (name) updateCollection.mutate({ id: col.id, name })
            }}
          >
            <input
              className="collection-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              aria-label="Collection name"
            />
            <button type="submit" className="icon-button" aria-label="Save name">
              <Check size={14} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Cancel rename"
              onClick={() => setRenaming(null)}
            >
              <X size={14} />
            </button>
          </form>
        ) : (
          <div key={col.id} className="collection-nav-item-wrap">
            <button
              type="button"
              className={`collection-nav-item ${activeId === col.id ? 'active' : ''}`}
              onClick={() => selectCollection(col.id)}
              aria-current={activeId === col.id ? 'page' : undefined}
            >
              <Folder size={16} />
              <span className="collection-nav-name">{col.name}</span>
              <span className="collection-nav-count">{col.document_count}</span>
            </button>
            <div className="collection-menu-wrap">
              <button
                type="button"
                className="icon-button collection-menu-btn"
                aria-label={`Options for ${col.name}`}
                aria-expanded={menuOpen === col.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(menuOpen === col.id ? null : col.id)
                }}
              >
                <MoreHorizontal size={15} />
              </button>
              {menuOpen === col.id && (
                <ul className="collection-context-menu" role="menu">
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => startRename(col)}
                    >
                      Rename
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      className="danger"
                      onClick={() => confirmDelete(col)}
                    >
                      Delete
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        ),
      )}

      {/* New collection */}
      {creating ? (
        <form
          className="collection-new-form"
          onSubmit={(e) => {
            e.preventDefault()
            const name = newName.trim()
            if (name) createCollection.mutate(name)
          }}
        >
          <input
            className="collection-new-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Collection name…"
            autoFocus
            aria-label="New collection name"
          />
          <div className="collection-new-actions">
            <button
              type="submit"
              className="button primary small"
              disabled={!newName.trim() || createCollection.isPending}
            >
              Save
            </button>
            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                setCreating(false)
                setNewName('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="collection-new-btn"
          onClick={() => setCreating(true)}
        >
          <Plus size={15} />
          New collection
        </button>
      )}
    </nav>
  )
}
