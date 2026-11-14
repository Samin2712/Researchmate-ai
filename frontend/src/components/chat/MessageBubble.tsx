import { memo } from 'react'
import { BookOpen, Sparkles, UserRound, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { citationLinks, normalizeAnswerMarkdown } from './answerFormatting'
import { useEvidenceStore } from '../../store/evidence'
import type { Message } from '../../types'

export const MessageBubble = memo(function MessageBubble({
  message,
  streaming = false,
}: {
  message: Message
  streaming?: boolean
}) {
  const assistant = message.role === 'assistant'
  const sourcePrefix = `message-${message.id}`
  const confidence = message.confidence_score == null ? null : Math.round(message.confidence_score)
  const openSourcePanel = useEvidenceStore(state => state.openSourcePanel)

  const handleSourceClick = (index: number) => {
    if (message.sources && message.sources[index]) {
      openSourcePanel(message.sources[index], message.id, index)
    }
  }

  return (
    <motion.article
      className={`message ${assistant ? 'assistant' : 'user'}`}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      aria-label={assistant ? 'ResearchMate answer' : 'Your question'}
    >
      <span className="message-avatar">
        {assistant ? <Sparkles size={18} /> : <UserRound size={18} />}
      </span>
      <div className="message-body">
        <div className="message-heading">
          <strong>{assistant ? 'ResearchMate' : 'You'}</strong>
          {streaming && <span className="stream-label">Reading and responding…</span>}
        </div>
        {message.incomplete && (
          <p className="notice">Incomplete response. Resend your question for a complete answer.</p>
        )}
        <div className="markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, [citationLinks, { sources: message.sources || [], prefix: sourcePrefix }]]}
            components={{
              table: ({ children }) => (
                <div className="answer-table-scroll" role="region" aria-label="Comparison table" tabIndex={0}>
                  <table>{children}</table>
                </div>
              ),
              a: ({ href, children, ...props }) => href?.startsWith(`#${sourcePrefix}-source-`) ? (
                <a
                  {...props}
                  href={href}
                  className="answer-citation"
                  onClick={(e) => {
                    e.preventDefault()
                    const sourceIndex = parseInt(href.split('-').pop() || '1') - 1
                    handleSourceClick(sourceIndex)
                  }}
                >
                  {children}
                </a>
              ) : <a {...props} href={href}>{children}</a>,
            }}
          >
            {(assistant ? normalizeAnswerMarkdown(message.content) : message.content) ||
              (streaming ? 'Looking through your papers…' : 'No answer was returned.')}
          </ReactMarkdown>
        </div>
        {!!message.sources?.length && (
          <div className="message-sources">
            <h3>
              <BookOpen size={15} />
              Sources
            </h3>
            <div>
              {message.sources.map((source, index) => (
                <details id={`${sourcePrefix}-source-${index + 1}`} key={`${source.document_id}-${index}`}>
                  <summary>
                    <span className="source-number">{index + 1}</span>
                    <span>
                      {source.title || 'Source paper'}
                      {source.page_number ? <small>Page {source.page_label || source.page_number}</small> : null}
                    </span>
                  </summary>
                    <button
                      className="source-view-btn"
                      onClick={(e) => {
                        e.preventDefault()
                        handleSourceClick(index)
                      }}
                      aria-label="View source in context"
                      title="View source in context"
                    >
                      <ExternalLink size={14} />
                    </button>
                  {source.chunk_text && <blockquote>{source.chunk_text}</blockquote>}
                  <Link to={`/library?document=${source.document_id}`}>View paper details</Link>
                </details>
              ))}
            </div>
          </div>
        )}
        {assistant && confidence != null && (
          <p className="confidence">
            Retrieval signal: {Math.max(0, Math.min(100, confidence))}%
            <span>This indicates retrieval relevance, not accuracy. Check sources before drawing conclusions.</span>
          </p>
        )}
      </div>
    </motion.article>
  )
})
