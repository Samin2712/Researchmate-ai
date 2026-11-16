import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Sparkles, RefreshCw, ArrowRight, Loader2 } from 'lucide-react'
import { useDocumentQuestions } from '../../services/queries'
import { learningService } from '../../services/learningService'
import { toast } from '../../store/toasts'
import type { QuestionCategory, StarterQuestion } from '../../types'

interface StarterQuestionsProps {
  documentId: number
  documentTitle?: string
  onSelectQuestion?: (questionText: string) => void
  compact?: boolean
}

const CATEGORY_META: Record<
  QuestionCategory,
  { label: string; badgeClass: string; description: string }
> = {
  comprehension: {
    label: 'Comprehension',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    description: 'Core thesis & main finding',
  },
  methodology: {
    label: 'Methodology',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    description: 'Methods, datasets & analysis',
  },
  critical_thinking: {
    label: 'Critical thinking',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Assumptions, limits & trade-offs',
  },
}

export function StarterQuestions({
  documentId,
  documentTitle,
  onSelectQuestion,
  compact = false,
}: StarterQuestionsProps) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const { data, isLoading, isError } = useDocumentQuestions(documentId)

  const regenerate = useMutation({
    mutationFn: () => learningService.regenerateQuestions(documentId),
    onSuccess: (newData) => {
      client.setQueryData(['document-questions', documentId], newData)
      toast('Generating new starter questions.')
    },
    onError: () => {
      toast('Could not regenerate questions. Check provider connectivity.', 'error')
    },
  })

  function handleChoose(q: StarterQuestion) {
    if (onSelectQuestion) {
      onSelectQuestion(q.question)
    } else {
      navigate(`/chat?document=${documentId}&q=${encodeURIComponent(q.question)}`)
    }
  }

  if (isLoading) {
    return (
      <div role="status" className="starter-questions-loading p-4 border border-slate-200 rounded-lg bg-slate-50 flex items-center gap-3 text-sm text-slate-600">
        <Loader2 size={18} className="animate-spin text-teal-600" />
        <span>Reading paper evidence to generate starter questions…</span>
      </div>
    )
  }

  if (isError || data?.status === 'failed') {
    return (
      <div role="status" className="starter-questions-failed p-4 border border-rose-200 rounded-lg bg-rose-50 text-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-rose-900">
            {data?.error_message || 'Could not generate paper-specific questions.'}
          </span>
          <button
            type="button"
            className="button secondary small inline-flex items-center gap-1.5"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate()}
          >
            <RefreshCw size={13} className={regenerate.isPending ? 'animate-spin' : ''} />
            <span>{regenerate.isPending ? 'Retrying…' : 'Retry'}</span>
          </button>
        </div>
        <p className="text-xs text-rose-700">
          You can still ask any question directly in the chat.
        </p>
      </div>
    )
  }

  if (data?.status === 'pending') {
    return (
      <div role="status" className="starter-questions-pending p-4 border border-teal-200 rounded-lg bg-teal-50/50 flex items-center justify-between text-sm text-teal-900">
        <div className="flex items-center gap-2.5">
          <Loader2 size={18} className="animate-spin text-teal-700 shrink-0" />
          <div>
            <p className="font-medium">Formulating paper-specific questions…</p>
            <p className="text-xs text-teal-700">
              Examining methodology, results, and limitations across this paper.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const questions = data?.questions || []
  if (!questions.length) {
    return (
      <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
        <span>No paper-specific starter questions generated yet.</span>
        <button
          type="button"
          className="button secondary small"
          disabled={regenerate.isPending}
          onClick={() => regenerate.mutate()}
        >
          <Sparkles size={13} className="mr-1 text-teal-600" />
          Generate questions
        </button>
      </div>
    )
  }

  return (
    <div className={`starter-questions-container ${compact ? 'compact' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={16} className="text-teal-700" />
          <h3 className="text-sm font-semibold text-slate-900 truncate max-w-sm" title={documentTitle}>
            Paper-specific starter questions
          </h3>
        </div>
        <button
          type="button"
          className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 transition-colors"
          disabled={regenerate.isPending}
          onClick={() => regenerate.mutate()}
          title="Regenerate three grounded questions for this paper"
        >
          <RefreshCw size={12} className={regenerate.isPending ? 'animate-spin' : ''} />
          <span>Regenerate</span>
        </button>
      </div>

      <div className="space-y-2">
        {questions.map((q, idx) => {
          const meta = CATEGORY_META[q.category] || {
            label: q.category,
            badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
            description: '',
          }
          return (
            <button
              key={`${q.category}-${idx}`}
              type="button"
              className="starter-question-card w-full text-left p-3 rounded-lg border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/20 transition-all group flex flex-col gap-1.5 shadow-xs"
              onClick={() => handleChoose(q)}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.badgeClass}`}
                >
                  {meta.label}
                </span>
                <span className="text-[11px] text-slate-600 group-hover:text-teal-700 flex items-center gap-1 font-medium transition-colors">
                  <span>Open in chat</span>
                  <ArrowRight size={12} />
                </span>
              </div>
              <p className="text-sm text-slate-800 font-normal leading-snug group-hover:text-slate-900">
                {q.question}
              </p>
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-slate-600 mt-2">
        Selecting a question inserts an editable draft into the chat scoped to this paper.
      </p>
    </div>
  )
}
