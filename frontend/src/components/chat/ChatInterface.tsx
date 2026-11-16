import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, BookOpen, MessageSquarePlus, Square, Sparkles, BookA } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
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
import { StarterQuestions } from '../documents/StarterQuestions'
import { TerminologyModal } from './TerminologyModal'
import { useUser } from '../../services/queries'

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
  const [searchParams] = useSearchParams()
  const initialDraft = searchParams.get('q') || ''
  const defaultMode = usePreferences((state) => state.defaultExplanationMode) || 'standard'
  const { data: user } = useUser()
  const modeChanged = useRef(false)

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState(initialDraft)
  const [explanationMode, setExplanationMode] = useState<'standard' | 'simple'>(defaultMode)
  useEffect(() => {
    if (!modeChanged.current && user) {
      const saved = localStorage.getItem(`researchmate.explanation-mode.${user.id}`)
      setExplanationMode(saved === 'simple' || saved === 'standard' ? saved : user.default_explanation_mode || 'standard')
    }
  }, [user])
  function selectMode(mode: 'standard' | 'simple') {
    modeChanged.current = true
    setExplanationMode(mode)
    if (user) localStorage.setItem(`researchmate.explanation-mode.${user.id}`, mode)
  }
  const [terminologyOpen, setTerminologyOpen] = useState(false)
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
    if (initialDraft && field.current) {
      field.current.focus()
    }
  }, [initialDraft])
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
      { ...base, id: assistantId, role: 'assistant', content: '', explanation_mode: explanationMode },
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
          explanation_mode: explanationMode,
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="button secondary small inline-flex items-center gap-1.5"
            onClick={() => setTerminologyOpen(true)}
          >
            <BookA size={15} />
            <span>Explain term</span>
          </button>
          <Exporter
            title="Research conversation"
            content={exportContent}
            disabled={busy || !!error}
          />
        </div>
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
              <>
              {scope !== 'all' && (
                <div className="mt-4 max-w-xl mx-auto w-full text-left">
                  <StarterQuestions
                    documentId={Number(scope)}
                    onSelectQuestion={(prompt) => {
                      setInput(prompt)
                      field.current?.focus()
                    }}
                  />
                </div>
              )}
                <div className="generic-prompts-wrapper mt-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    General exploration prompts
                  </h3>
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
                  <p className="text-xs text-slate-600 mt-3">
                    Tip: Choose an individual paper in the scope selector above to see questions tailored to that study.
                  </p>
                </div>
              </>
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
              onExplainTerm={() => setTerminologyOpen(true)}
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
        <div className="composer-mode-bar flex items-center justify-between mb-2 px-1">
          <div
            className="segmented-mode-control inline-flex rounded-lg p-0.5 bg-slate-200/80 border border-slate-300 text-xs"
            role="radiogroup"
            aria-label="Explanation mode"
          >
            <button
              type="button"
              role="radio"
              aria-checked={explanationMode === 'standard'}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                explanationMode === 'standard'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => selectMode('standard')}
              onKeyDown={(event) => {
                if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
                  event.preventDefault(); selectMode('simple'); (event.currentTarget.nextElementSibling as HTMLElement)?.focus()
                }
              }}
            >
              Standard
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={explanationMode === 'simple'}
              className={`px-2.5 py-1 rounded-md font-medium transition-all inline-flex items-center gap-1 ${
                explanationMode === 'simple'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => selectMode('simple')}
              onKeyDown={(event) => {
                if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
                  event.preventDefault(); selectMode('standard'); (event.currentTarget.previousElementSibling as HTMLElement)?.focus()
                }
              }}
            >
              <Sparkles size={12} />
              <span>Explain simply</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            {explanationMode === 'simple'
              ? 'Applies to next reply: accessible terms & analogies, retains numbers and citations'
              : 'Applies to next reply: standard academic precision'}
          </span>
        </div>
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
      <TerminologyModal
        isOpen={terminologyOpen}
        onClose={() => setTerminologyOpen(false)}
        documents={documents}
        currentDocumentId={scope === 'all' ? undefined : Number(scope)}
      />
    </div>
  )
}
