/**
 * Analysis workspace page — comparison matrix, literature review, gap analysis, disagreement explorer.
 */
import { lazy, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, GitCompare, ChevronLeft, Telescope, Scale } from 'lucide-react'
import { LiteratureReviewWorkspace } from '../components/analysis/LiteratureReviewWorkspace'
import { AnalysisHistory } from '../components/analysis/AnalysisHistory'
import { Loading } from '../components/shared/Feedback'
import type { AnalysisKind } from '../types/analysis'

const ComparisonWorkspace = lazy(() =>
  import('../components/analysis/ComparisonWorkspace').then((m) => ({
    default: m.ComparisonWorkspace,
  })),
)
const GapAnalysisWorkspace = lazy(() =>
  import('../components/gaps/GapAnalysisWorkspace').then((m) => ({
    default: m.GapAnalysisWorkspace,
  })),
)
const DisagreementWorkspace = lazy(() =>
  import('../components/disagreement/DisagreementWorkspace').then((m) => ({
    default: m.DisagreementWorkspace,
  })),
)

const ANALYSIS_KINDS: {
  kind: AnalysisKind
  icon: React.ReactNode
  title: string
  description: string
  action: string
}[] = [
  {
    kind: 'comparison',
    icon: <GitCompare size={32} />,
    title: 'Comparison Matrix',
    description:
      'Compare 2–5 papers side-by-side across research questions, methods, populations, findings, and limitations.',
    action: 'Start comparison',
  },
  {
    kind: 'literature_review',
    icon: <FileText size={32} />,
    title: 'Literature Review',
    description:
      'Generate a thematic synthesis from 2–10 papers, identifying themes, agreements, differences, and open questions.',
    action: 'Generate review',
  },
  {
    kind: 'gap_analysis',
    icon: <Telescope size={32} />,
    title: 'Research Gap Finder',
    description:
      'Identify candidate research gaps, proposed research questions, and feasible student investigation projects from your selected papers.',
    action: 'Find gaps',
  },
  {
    kind: 'disagreement',
    icon: <Scale size={32} />,
    title: 'Agreement & Disagreement Explorer',
    description:
      'Compare claims across papers and understand where and why they agree, appear to disagree, or differ in context.',
    action: 'Explore relationships',
  },
]

import React from 'react'

export default function Analysis() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode = searchParams.get('mode') as AnalysisKind | null
  const runId = searchParams.get('runId')
  const selectedKind = (
    ['comparison', 'literature_review', 'gap_analysis', 'disagreement'] as AnalysisKind[]
  ).includes(mode as AnalysisKind)
    ? (mode as AnalysisKind)
    : null

  const handleSelectKind = (kind: AnalysisKind) => {
    setSearchParams({ mode: kind })
  }

  const handleBack = () => {
    setSearchParams({})
  }

  const runIdNum = runId ? parseInt(runId, 10) : undefined

  if (selectedKind === 'comparison') {
    return (
      <Suspense fallback={<Loading label="Loading workspace" />}>
        <ComparisonWorkspace key={runIdNum} runId={runIdNum} onBack={handleBack} />
      </Suspense>
    )
  }

  if (selectedKind === 'literature_review') {
    return <LiteratureReviewWorkspace key={runIdNum} runId={runIdNum} onBack={handleBack} />
  }

  if (selectedKind === 'gap_analysis') {
    return (
      <Suspense fallback={<Loading label="Loading workspace" />}>
        <GapAnalysisWorkspace key={runIdNum} runId={runIdNum} onBack={handleBack} />
      </Suspense>
    )
  }

  if (selectedKind === 'disagreement') {
    return (
      <Suspense fallback={<Loading label="Loading workspace" />}>
        <DisagreementWorkspace key={runIdNum} runId={runIdNum} onBack={handleBack} />
      </Suspense>
    )
  }

  // Selection screen
  return (
    <div className="page analysis-selection">
      <header className="page-header">
        <button
          className="button icon-only tertiary"
          onClick={() => navigate('/')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1>Research Analysis</h1>
          <p className="subtitle">Compare papers, generate reviews, find gaps, explore disagreements</p>
        </div>
      </header>

      <div className="analysis-grid analysis-grid--4">
        {ANALYSIS_KINDS.map(({ kind, icon, title, description, action }) => (
          <button
            key={kind}
            className="analysis-card"
            onClick={() => handleSelectKind(kind)}
          >
            <div className="analysis-card-icon">{icon}</div>
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="analysis-card-action">{action} →</span>
          </button>
        ))}
      </div>

      <section className="analysis-history-section">
        <h2 className="section-title">Recent Analyses</h2>
        <AnalysisHistory
          onSelectRun={(run) =>
            setSearchParams({ mode: run.kind, runId: String(run.id) })
          }
        />
      </section>
    </div>
  )
}
