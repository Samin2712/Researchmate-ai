/**
 * Document selector component for analysis.
 */
import { collectionService } from '../../services/collectionService'
import { Check } from 'lucide-react'
import { useDocuments, useCollections } from '../../services/queries'
import { Loading, ErrorState } from '../shared/Feedback'

interface DocumentSelectorProps {
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
  minSelection: number
  maxSelection: number
}

interface DocCollection {
  id: number
  name: string
}

interface SimpleDocument {
  id: number
  title: string
  authors?: string | null
  year?: number | null
  status: string
  collections?: DocCollection[]
}

export function DocumentSelector({
  selectedIds,
  onSelectionChange,
  minSelection,
  maxSelection,
}: DocumentSelectorProps) {
  const documents = useDocuments()
  const collections = useCollections()

  const handleToggle = (docId: number) => {
    if (selectedIds.includes(docId)) {
      onSelectionChange(selectedIds.filter((id) => id !== docId))
    } else if (selectedIds.length < maxSelection) {
      onSelectionChange([...selectedIds, docId])
    }
  }

  const handleSelectCollection = async (collectionId: number) => {
    const collection = collections.data?.find((c) => c.id === collectionId)
    if (!collection) return

    try {
      const papers = await collectionService.getCollectionDocuments(collectionId)
      onSelectionChange(papers.filter(d => d.status === 'completed').map(d => d.id).slice(0, maxSelection))
    } catch { alert('Could not load the collection. Try again.') }
  }

  if (documents.isPending) return <Loading label="Loading documents" />
  if (documents.isError) {
    return <ErrorState message="Failed to load documents" retry={() => void documents.refetch()} />
  }

  const availableDocs: SimpleDocument[] = (documents.data?.documents.filter((d: SimpleDocument) => d.status === 'completed') || []) as SimpleDocument[]

  if (availableDocs.length === 0) {
    return (
      <div className="empty-state">
        <p>No documents available</p>
        <p className="muted">Upload and process some documents first</p>
      </div>
    )
  }

  return (
    <div className="document-selector">
      <div className="selector-header">
        <h3>
          Select Documents ({selectedIds.length}/{maxSelection})
        </h3>
        {minSelection && selectedIds.length < minSelection && (
          <p className="selection-hint">Select at least {minSelection} documents</p>
        )}
        {selectedIds.length === maxSelection && (
          <p className="selection-hint warning">Maximum {maxSelection} documents reached</p>
        )}
      </div>

      {collections.data && collections.data.length > 0 && (
        <div className="quick-select">
          <label>Quick select from collection:</label>
          <div className="quick-select-buttons">
            {collections.data.slice(0, 5).map((collection) => (
              <button
                key={collection.id}
                className="button tertiary small"
                onClick={() => void handleSelectCollection(collection.id)}
              >
                {collection.name} ({collection.document_count})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="document-list">
        {availableDocs.map((doc) => {
          const isSelected = selectedIds.includes(doc.id)
          const canSelect = !isSelected && selectedIds.length < maxSelection

          return (
            <button
              key={doc.id}
              className={`document-item ${isSelected ? 'selected' : ''} ${!canSelect && !isSelected ? 'disabled' : ''}`}
              onClick={() => handleToggle(doc.id)}
              disabled={!canSelect && !isSelected}
              aria-pressed={isSelected}
            >
              <div className="document-checkbox">
                {isSelected && <Check size={16} />}
              </div>
              <div className="document-info">
                <h4>{doc.title}</h4>
                {doc.authors && <p className="document-authors">{doc.authors}</p>}
                {doc.year && <p className="document-year">{doc.year}</p>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
