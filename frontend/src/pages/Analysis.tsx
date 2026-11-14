/**
 * Analysis workspace page for comparison matrix and literature review.
 */
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, GitCompare, ChevronLeft } from 'lucide-react'
import { ComparisonWorkspace } from '../components/analysis/ComparisonWorkspace'
import { LiteratureReviewWorkspace } from '../components/analysis/LiteratureReviewWorkspace'
import { AnalysisHistory } from '../components/analysis/AnalysisHistory'
import type { AnalysisKind } from '../types/analysis'

export default function Analysis() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode = searchParams.get('mode') as AnalysisKind | null
  const runId = searchParams.get('runId')
  const selectedKind = mode === 'comparison' || mode === 'literature_review' ? mode : null

  const handleSelectKind = (kind: AnalysisKind) => {
    setSearchParams({ mode: kind })
  }

  const handleBack = () => {
    setSearchParams({})
  }

  if (runId) {
    // View existing run
    const runIdNum = parseInt(runId, 10)
    if (selectedKind === 'comparison') {
      return <ComparisonWorkspace key={runIdNum} runId={runIdNum} onBack={handleBack} />
    } else if (selectedKind === 'literature_review') {
      return <LiteratureReviewWorkspace key={runIdNum} runId={runIdNum} onBack={handleBack} />
    }
  }

  if (selectedKind === 'comparison') {
    return <ComparisonWorkspace onBack={handleBack} />
  }

  if (selectedKind === 'literature_review') {
    return <LiteratureReviewWorkspace onBack={handleBack} />
  }

  // Selection screen
  return (
    <div className="page analysis-selection">
      <header className="page-header">
        <button className="button icon-only tertiary" onClick={() => navigate('/')} aria-label="Back to dashboard">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1>Research Analysis</h1>
          <p className="subtitle">Compare papers or generate literature reviews</p>
        </div>
      </header>

      <div className="analysis-grid">
        <button className="analysis-card" onClick={() => handleSelectKind('comparison')}>
          <div className="analysis-card-icon">
            <GitCompare size={32} />
          </div>
          <h2>Comparison Matrix</h2>
          <p>
            Compare 2-5 papers side-by-side across research questions, methods, populations,
            findings, and limitations.
          </p>
          <span className="analysis-card-action">Start comparison →</span>
        </button>

        <button className="analysis-card" onClick={() => handleSelectKind('literature_review')}>
          <div className="analysis-card-icon">
            <FileText size={32} />
          </div>
          <h2>Literature Review</h2>
          <p>
            Generate a thematic synthesis from 2-10 papers, identifying themes, agreements,
            differences, and open questions.
          </p>
          <span className="analysis-card-action">Generate review →</span>
        </button>
      </div>

      <section className="analysis-history-section">
        <h2 className="section-title">Recent Analyses</h2>
        <AnalysisHistory onSelectRun={(run) => setSearchParams({ mode: run.kind, runId: String(run.id) })} />
      </section>
    </div>
  )
}
