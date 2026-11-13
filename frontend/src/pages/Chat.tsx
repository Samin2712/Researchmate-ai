import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import { useDocuments, useSessions } from '../services/queries'
import { chatService } from '../services/chatService'
import { errorMessage } from '../services/api'
import { ErrorState, Loading } from '../components/shared/Feedback'
import { toast } from '../store/toasts'
import { ChatInterface } from '../components/chat/ChatInterface'
import { Modal } from '../components/shared/Modal'
import type { Session } from '../types'

export default function Chat() {
  const [params, setParams] = useSearchParams()
  const sessionId = Number(params.get('session')) || undefined
  const documentId = Number(params.get('document')) || undefined
  const documents = useDocuments()
  const sessions = useSessions()
  const client = useQueryClient()
  const [deleting, setDeleting] = useState<Session | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const history = useQuery({
    queryKey: ['session', sessionId],
    queryFn: ({ signal }) => chatService.session(sessionId!, signal),
    enabled: !!sessionId,
  })
  const [newChat, setNewChat] = useState(0)
  async function remove() {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await chatService.remove(deleting.id)
      if (sessionId === deleting.id) setParams({})
      await client.invalidateQueries({ queryKey: ['sessions'] })
      client.removeQueries({ queryKey: ['session', deleting.id] })
      setDeleting(null)
      toast('Conversation deleted.')
    } catch (err) {
      setDeleteError(errorMessage(err))
    } finally {
      setDeleteBusy(false)
    }
  }
  return (
    <div className="chat-page">
      <header className="page-heading">
        <div>
          <h1>Research chat</h1>
          <p>Ask freely. Stay grounded in your sources.</p>
        </div>
        <button
          className="button secondary small"
          onClick={() => {
            setParams({})
            setNewChat((value) => value + 1)
          }}
        >
          <Plus size={17} />
          New chat
        </button>
      </header>
      <div className="chat-workspace">
        <aside className="chat-history" aria-label="Saved conversations">
          <div className="history-title">
            <h2>Conversations</h2>
            <span>{sessions.data?.length ?? '—'}</span>
          </div>
          {sessions.isPending ? (
            <Loading label="Loading chats" />
          ) : sessions.isError ? (
            <ErrorState
              message={errorMessage(sessions.error)}
              retry={() => void sessions.refetch()}
            />
          ) : sessions.data.length ? (
            <nav aria-label="Conversation history">
              {sessions.data.map((session) => (
                <div
                  className={`history-item ${sessionId === session.id ? 'selected' : ''}`}
                  key={session.id}
                >
                  <button
                    className="history-open"
                    onClick={() => setParams({ session: String(session.id) })}
                    aria-current={sessionId === session.id ? 'page' : undefined}
                  >
                    <MessageSquare size={16} />
                    <span>{session.title}</span>
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={`Delete conversation ${session.title}`}
                    onClick={() => {
                      setDeleting(session)
                      setDeleteError('')
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </nav>
          ) : (
            <p className="muted history-empty">Your saved conversations will appear here.</p>
          )}
          <div className="history-footnote">
            <BookNote />
            Your conversation history is saved to your account.
          </div>
        </aside>
        <section className="chat-panel" aria-label="Research conversation">
          {documents.isPending || (sessionId && history.isPending) ? (
            <Loading label="Preparing your workspace" />
          ) : documents.isError ? (
            <ErrorState
              message={errorMessage(documents.error)}
              retry={() => void documents.refetch()}
            />
          ) : sessionId && history.isError ? (
            <ErrorState
              message={errorMessage(history.error)}
              retry={() => void history.refetch()}
            />
          ) : (
            documents.data && (
              <ChatInterface
                key={`${sessionId || 'new'}-${documentId || 'all'}-${newChat}`}
                documents={documents.data.documents}
                initialMessages={sessionId ? history.data?.messages : []}
                sessionId={sessionId}
                documentId={documentId}
                onComplete={(id) => {
                  if (sessionId !== id)
                    setParams(
                      {
                        session: String(id),
                        ...(documentId ? { document: String(documentId) } : {}),
                      },
                      { replace: true },
                    )
                }}
              />
            )
          )}
        </section>
      </div>
      {deleting && (
        <Modal
          title="Delete conversation?"
          onClose={() => {
            if (!deleteBusy) setDeleting(null)
          }}
        >
          <p>“{deleting.title}” and its messages will be permanently removed.</p>
          {deleteError && <ErrorState message={deleteError} />}
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={deleteBusy}
              onClick={() => setDeleting(null)}
            >
              Keep conversation
            </button>
            <button
              className="button destructive"
              disabled={deleteBusy}
              onClick={() => void remove()}
            >
              {deleteBusy ? 'Deleting…' : 'Delete conversation'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
function BookNote() {
  return <MessageSquare size={16} aria-hidden="true" />
}
