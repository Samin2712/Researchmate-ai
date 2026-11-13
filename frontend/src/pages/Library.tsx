import { useSearchParams } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { UploadZone } from '../components/documents/UploadZone'
import { DocumentList } from '../components/documents/DocumentList'
import { useDocuments } from '../services/queries'
import { ErrorState, Skeleton } from '../components/shared/Feedback'
import { errorMessage } from '../services/api'
export default function Library() {
  const documents = useDocuments()
  const [params] = useSearchParams()
  const upload = useRef<HTMLDivElement>(null)
  const selected = Number(params.get('document')) || undefined
  useEffect(() => {
    if (params.get('upload')) upload.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [params])
  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <h1>Your paper library</h1>
          <p>A home for the research you’re building on.</p>
        </div>
        <span className="subtle-tag">PDF workspace</span>
      </header>
      <div ref={upload}>
        <UploadZone />
      </div>
      <div className="section-heading">
        <h2>All papers</h2>
        <button
          className="text-button"
          onClick={() => void documents.refetch()}
          disabled={documents.isFetching}
        >
          Refresh library
        </button>
      </div>
      {documents.isPending ? (
        <Skeleton />
      ) : documents.isError ? (
        <ErrorState
          message={errorMessage(documents.error)}
          retry={() => void documents.refetch()}
        />
      ) : (
        <DocumentList documents={documents.data.documents} selected={selected} />
      )}
    </div>
  )
}
