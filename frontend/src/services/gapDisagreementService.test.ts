import { describe, it, expect } from 'vitest'
import {
  exportGapAnalysisMarkdown,
  exportDisagreementMarkdown,
} from './gapDisagreementService'
import type {
  AnalysisRun,
  GapAnalysisResult,
  DisagreementResult,
} from '../types/analysis'

describe('gapDisagreementService exports', () => {
  it('exports structured gap analysis markdown with candidate evidence and feasible project', () => {
    const gapResult: GapAnalysisResult = {
      analysis_scope: 'Analysis of 2 trial papers',
      warnings: ['Absence from this set does not imply absence from global literature.'],
      coverage: { 1: 'included', 2: 'included' },
      candidates: [
        {
          id: 'gap_1',
          title: 'Pediatric retention curve unexplored',
          gap_category: 'population',
          scope: 'Pediatric cognitive cohorts',
          gap_source: 'model_inferred',
          evidence_basis: 'Trial evaluated adult cohorts only.',
          rationale: 'Differences in developmental stages may alter retention efficacy.',
          uncertainty: 'Limited to the analyzed excerpts of the selected papers.',
          proposed_research_question: 'What is the cognitive retention curve in pediatric participants?',
          suggested_search_terms: ['pediatric retention', 'cognitive decay'],
          coverage_note: 'Not found in the analyzed evidence.',
          supporting_quotes: [
            {
              source_id: 'doc1_chunk1',
              document_id: 1,
              quote: 'Sample: 40 adults.',
              page_number: 1,
              title: 'Clinical Trial A',
            },
          ],
          feasible_project: {
            bounded_question: 'How do simulated developmental parameters affect predicted retention?',
            suggested_method: 'Computational parameter exploration',
            data_sources: 'Open Science Framework benchmark data',
            skills_required: 'Python and pandas',
            concrete_steps: [
              'Extract parameters from literature',
              'Simulate 1,000 synthetic patient trajectories',
              'Plot comparative retention bounds',
            ],
            success_criteria: 'Documented simulation and report within 1 semester',
            time_budget: '1 semester',
            resource_budget: 'Free cloud notebook',
          },
        },
      ],
    }

    const run: AnalysisRun = {
      id: 10,
      user_id: 1,
      kind: 'gap_analysis',
      status: 'completed',
      document_ids: [1, 2],
      progress_percent: 100,
      created_at: '2026-11-15T00:00:00Z',
      parameters: { research_question: 'What are the main research gaps?' },
      result: gapResult,
    }

    const md = exportGapAnalysisMarkdown(run)
    expect(md).toContain('# Research Gap Analysis')
    expect(md).toContain('What are the main research gaps?')
    expect(md).toContain('Analysis of 2 trial papers')
    expect(md).toContain('Pediatric retention curve unexplored')
    expect(md).toContain('population')
    expect(md).toContain('model_inferred')
    expect(md).toContain('Sample: 40 adults.')
    expect(md).toContain('Clinical Trial A')
    expect(md).toContain('Feasible student investigation')
    expect(md).toContain('Computational parameter exploration')
    expect(md).toContain('1. Extract parameters from literature')
    expect(md).toContain('Documented simulation and report within 1 semester')
  })

  it('exports structured disagreement explorer markdown with side-by-side evidence and context', () => {
    const disResult: DisagreementResult = {
      themes: ['Latency vs Accuracy'],
      warnings: ['Different populations or settings are not automatic contradictions.'],
      coverage: { 1: 'included', 2: 'included' },
      relationships: [
        {
          id: 'rel_1',
          relationship_type: 'different_context',
          outcome_theme: 'Latency vs Accuracy Trade-off',
          rationale: 'Study 1 evaluated adult clinical trials; Study 2 benchmarked network latency.',
          distinguishing_factors: 'Different populations and measurement metrics',
          left: {
            document_id: 1,
            document_title: 'Clinical Trial A',
            claim: 'Accuracy increased by 5 percentage points.',
            metric_or_outcome: 'Accuracy (%)',
            population_or_dataset: 'Adult trial patients',
            method_or_context: 'Randomized controlled trial',
            evidence: [
              {
                source_id: 'doc1_chunk1',
                document_id: 1,
                quote: 'Accuracy increased by 5 percentage points.',
                page_number: 1,
              },
            ],
          },
          right: {
            document_id: 2,
            document_title: 'Latency Benchmark B',
            claim: 'Latency decreased by 5 ms.',
            metric_or_outcome: 'Latency (ms)',
            population_or_dataset: '120 server requests',
            method_or_context: 'Observational benchmark',
            evidence: [
              {
                source_id: 'doc2_chunk1',
                document_id: 2,
                quote: 'Latency decreased by 5 ms.',
                page_number: 1,
              },
            ],
          },
        },
      ],
    }

    const run: AnalysisRun = {
      id: 20,
      user_id: 1,
      kind: 'disagreement',
      status: 'completed',
      document_ids: [1, 2],
      progress_percent: 100,
      created_at: '2026-11-15T00:00:00Z',
      result: disResult,
    }

    const md = exportDisagreementMarkdown(run)
    expect(md).toContain('# Agreement & Disagreement Explorer')
    expect(md).toContain('Latency vs Accuracy Trade-off')
    expect(md).toContain('different_context')
    expect(md).toContain('Study 1 evaluated adult clinical trials')
    expect(md).toContain('Different populations and measurement metrics')
    expect(md).toContain('Study A — Clinical Trial A')
    expect(md).toContain('Accuracy increased by 5 percentage points.')
    expect(md).toContain('Study B — Latency Benchmark B')
    expect(md).toContain('Latency decreased by 5 ms.')
  })

  it('returns empty string when run result is missing or kind does not match', () => {
    const emptyRun: AnalysisRun = {
      id: 30,
      user_id: 1,
      kind: 'comparison',
      status: 'completed',
      document_ids: [1, 2],
      progress_percent: 100,
      created_at: '2026-11-15T00:00:00Z',
      result: null,
    }
    expect(exportGapAnalysisMarkdown(emptyRun)).toBe('')
    expect(exportDisagreementMarkdown(emptyRun)).toBe('')
  })
})
