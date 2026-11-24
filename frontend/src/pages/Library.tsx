import { useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { PanelLeft } from 'lucide-react'
import { UploadZone } from '../components/documents/UploadZone'
import { DocumentList } from '../components/documents/DocumentList'
import { CollectionSidebar } from '../components/collections/CollectionSidebar'
import { useDocuments, useCollectionDocuments, useCollections } from '../services/queries'
import { ErrorState, Skeleton } from '../components/shared/Feedback'
import { errorMessage } from '../services/api'
import type { DocumentWithCollections } from '../types/collections'

export default function Library() {
  const [params] = useSearchParams()
  const upload = useRef<HTMLDivElement>(null)
  const [collectionsOpen, setCollectionsOpen] = useState(() => window.innerWidth > 768)

  const selected = Number(params.get('document')) || undefined
  const activeCollection = Number(params.get('collection')) || null

  useEffect(() => {
    if (params.get('upload')) upload.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [params])

  const allDocuments = useDocuments()
  const collectionDocuments = useCollectionDocuments(activeCollection)
  const collections = useCollections()
  const collectionName = collections.data?.find(
    (collection) => collection.id === activeCollection,
  )?.name

  const isActive = activeCollection !== null
  const query = isActive ? collectionDocuments : allDocuments

  const documents: DocumentWithCollections[] = isActive
    ? ((collectionDocuments.data as DocumentWithCollections[]) ?? [])
    : ((allDocuments.data?.documents as DocumentWithCollections[]) ?? [])

  return (
    <div className={`library-layout ${collectionsOpen ? '' : 'collections-collapsed'}`}>
      <div id="library-collections" hidden={!collectionsOpen}>
        <CollectionSidebar />
      </div>
      <div className="library-main">
        <div className="page">
          <header className="page-heading">
            <div>
              <h1>Your paper library</h1>
              <p>A home for the research you're building on.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="button secondary small"
                aria-expanded={collectionsOpen}
                aria-controls="library-collections"
                onClick={() => setCollectionsOpen(!collectionsOpen)}
              >
                <PanelLeft size={17} /> {collectionsOpen ? 'Hide collections' : 'Show collections'}
              </button>
              <button
                className="text-button"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                Refresh
              </button>
            </div>
          </header>

          <div ref={upload}>
            <UploadZone />
          </div>

          <div className="section-heading">
            <h2>{isActive ? collectionName || 'Collection papers' : 'All papers'}</h2>
          </div>

          {query.isPending ? (
            <Skeleton />
          ) : query.isError ? (
            <ErrorState message={errorMessage(query.error)} retry={() => void query.refetch()} />
          ) : (
            <DocumentList
              key={activeCollection ?? 'all'}
              documents={documents}
              selected={selected}
              collectionId={activeCollection}
            />
          )}
        </div>
      </div>
    </div>
  )
}
