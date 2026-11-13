import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, BookOpen, MessageSquarePlus, Square, Sparkles } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import type { Document, Message } from '../../types'
import { chatService } from '../../services/chatService'
import { errorMessage } from '../../services/api'
import { ErrorState } from '../shared/Feedback'
import { toast } from '../../store/toasts'
import { usePreferences } from '../../store/preferences'
import { Exporter } from '../tools/Exporter'
import { sourceCitation } from '../tools/citations'
import { MessageBubble } from './MessageBubble'

export function ChatInterface({
  documents,
  initialMessages = [],
  sessionId: initialSession,
  documentId,
  onComplete,
}: {
  documents: Document[]
  initialMessages?: Message[]
  sessionId?: number
  documentId?: number
  onComplete: (id: number) => void
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState(initialSession)
  const [scope, setScope] = useState(documentId ? String(documentId) : 'all')
  const [streamingId, setStreamingId] = useState<number>()
  const [follow, setFollow] = useState(true)
  const controller = useRef<AbortController>()
  const bottom = useRef<HTMLDivElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const client = useQueryClient()
  const systemReduced = useReducedMotion()
  const appReduced = usePreferences((state) => state.reduceMotion)
  const reduced = systemReduced || appReduced
  const ready = documents.filter((document) => document.status === 'completed')
  const scopeValid = scope === 'all' || ready.some((document) => String(document.id) === scope)
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    if (follow && messages.length)
      bottom.current?.scrollIntoView({
        behavior: reduced || busy ? 'auto' : 'smooth',
        block: 'nearest',
      })
  }, [messages, follow, reduced, busy])
  const exportContent = messages
    .map(
      (message) =>
        `## ${message.role === 'user' ? 'You' : 'ResearchMate'}\n\n${message.content}${message.sources?.length ? '\n\nSources:\n' + message.sources.map((source) => `- ${sourceCitation(source)}\n  ${source.chunk_text || ''}`).join('\n') : ''}`,
    )
    .join('\n\n')
  async function send(event: FormEvent) {
    event.preventDefault()
    const question = input.trim()
    if (busy || !question || !ready.length || !scopeValid) return
    const abort = new AbortController()
    controller.current = abort
    setInput('')
    setError('')
    setBusy(true)
    setFollow(true)
    const userId = -Date.now()
    const assistantId = userId - 1
    const base = {
      session_id: sessionId || 0,
      created_at: new Date().toISOString(),
      sources: null,
      confidence_score: null,
    }
    setMessages((previous) => [
      ...previous,
      { ...base, id: userId, role: 'user', content: question },
      { ...base, id: assistantId, role: 'assistant', content: '' },
    ])
    setStreamingId(assistantId)
    let receivedId = sessionId
    let answer = ''
    const timeout = window.setTimeout(() => abort.abort('timeout'), 180000)
    try {
      await chatService.stream(
        {
          message: question,
          session_id: sessionId,
          document_ids: scope === 'all' ? undefined : [Number(scope)],
        },
        (event) => {
          if (event.type === 'session') {
            receivedId = event.session_id
            setSessionId(event.session_id)
          }
          if (event.type === 'answer') {
            answer += event.content
            setMessages((previous) =>
              previous.map((message) =>
                message.id === assistantId ? { ...message, content: answer } : message,
              ),
            )
          }
          if (event.type === 'sources')
            setMessages((previous) =>
              previous.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      sources: event.sources,
                      confidence_score: event.confidence == null ? null : event.confidence * 100,
                    }
                  : message,
              ),
            )
        },
        abort.signal,
      )
      if (!answer.trim())
        throw new Error(
          'The server returned an empty answer. Try a more specific question, or check that the paper has finished processing.',
        )
      await client.invalidateQueries({ queryKey: ['sessions'] })
      if (receivedId) {
        await client.invalidateQueries({ queryKey: ['session', receivedId] })
        onComplete(receivedId)
      }
    } catch (err) {
      if (abort.signal.aborted)
        setError(
          abort.signal.reason === 'timeout'
            ? 'The response timed out. Your question is saved. Try again shortly.'
            : 'Response stopped. The partial answer is incomplete.',
        )
      else setError(errorMessage(err))
      setInput(question)
      if (!answer)
        setMessages((previous) => previous.filter((message) => message.id !== assistantId))
      else
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantId ? { ...message, incomplete: true } : message,
          ),
        )
      void client.invalidateQueries({ queryKey: ['sessions'] })
    } finally {
      clearTimeout(timeout)
      setBusy(false)
      setStreamingId(undefined)
      field.current?.focus()
    }
  }
  return (
    <div className="chat-interface">
      <div className="chat-toolbar">
        <div className="chat-scope">
          <BookOpen size={17} />
          <label htmlFor="chat-scope" className="sr-only">
            Papers to ask about
          </label>
          <select
            id="chat-scope"
            value={scope}
            disabled={busy}
            onChange={(event) => setScope(event.target.value)}
          >
            <option value="all">All ready papers ({ready.length})</option>
            {ready.map((document) => (
              <option key={document.id} value={document.id}>
                {document.title}
              </option>
            ))}
            {!scopeValid && <option value={scope}>Selected paper is unavailable</option>}
          </select>
        </div>
        <Exporter
          title="Research conversation"
          content={exportContent}
          disabled={busy || !!error}
        />
      </div>
      <div
        className="messages-scroll"
        ref={scroll}
        onScroll={() => {
          const element = scroll.current
          if (element)
            setFollow(element.scrollHeight - element.scrollTop - element.clientHeight < 100)
        }}
      >
        {!messages.length && (
          <div className="chat-empty">
            <span className="chat-empty-icon">
              <Sparkles size={28} />
            </span>
            <h2>A question is a good place to start.</h2>
            <p>
              {ready.length
                ? 'Explore your papers with answers grounded in your sources.'
                : 'Add a PDF to your library. Once it’s ready, your research conversation can begin.'}
            </p>
            {ready.length ? (
              <div className="prompt-grid">
                {[
                  'What are the main findings?',
                  'Explain the research methods.',
                  'What limitations should I consider?',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt)
                      field.current?.focus()
                    }}
                  >
                    <MessageSquarePlus size={17} />
                    {prompt}
                  </button>
                ))}
              </div>
            ) : (
              <Link className="button primary" to="/library?upload=1">
                Add your first paper
              </Link>
            )}
          </div>
        )}
        <div className="message-list" role="log" aria-label="Conversation" aria-busy={busy}>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              streaming={streamingId === message.id}
            />
          ))}
          <div ref={bottom} />
        </div>
      </div>
      {!follow && (
        <button
          className="jump-to-latest button secondary small"
          onClick={() => {
            setFollow(true)
            bottom.current?.scrollIntoView({
              behavior: reduced ? 'auto' : 'smooth',
              block: 'nearest',
            })
          }}
        >
          <ArrowDown size={15} />
          Latest message
        </button>
      )}
      <div className="composer-area">
        {error && <ErrorState message={error} />}
        {!scopeValid && (
          <p className="notice">
            This paper is not ready or has been deleted. Choose another paper above.
          </p>
        )}
        <form className="chat-composer" onSubmit={send}>
          <label className="sr-only" htmlFor="chat-message">
            Your question
          </label>
          <textarea
            ref={field}
            id="chat-message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={5000}
            rows={2}
            placeholder={
              ready.length
                ? 'Ask a question about your research…'
                : 'Upload a paper to start asking questions'
            }
            disabled={!ready.length}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <div className="composer-bottom">
            <span>
              {input.length > 4500
                ? `${input.length}/5000 characters`
                : 'Enter to send · Shift + Enter for a new line'}
            </span>
            {busy ? (
              <button
                key="stop"
                type="button"
                className="send-button stop"
                aria-label="Stop response"
                onClick={(event) => {
                  // Aborting can replace this button with a submit button before
                  // the browser's default click action. Prevent a duplicate send.
                  event.preventDefault()
                  controller.current?.abort()
                  toast('Response stopped.')
                }}
              >
                <Square size={17} />
              </button>
            ) : (
              <button
                key="send"
                type="submit"
                className="send-button"
                aria-label="Send question"
                disabled={!input.trim() || !ready.length || !scopeValid}
              >
                <ArrowUp size={20} />
              </button>
            )}
          </div>
        </form>
        <p className="composer-note" role="status">
          {busy
            ? 'Generating an answer from your papers…'
            : 'AI can make mistakes. Follow the sources and verify important details.'}
        </p>
      </div>
    </div>
  )
}
