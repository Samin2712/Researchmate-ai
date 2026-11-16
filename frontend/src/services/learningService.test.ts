import { describe, expect, it } from 'vitest'
import { usePreferences } from '../store/preferences'
import type { DocumentQuestionSet, TermExplanationResponse } from '../types'

describe('learning assistance frontend contracts', () => {
  it('preserves explanation mode preferences', () => {
    const store = usePreferences.getState()
    expect(store.defaultExplanationMode).toBe('standard')

    store.setDefaultExplanationMode('simple')
    expect(usePreferences.getState().defaultExplanationMode).toBe('simple')

    store.setDefaultExplanationMode('standard')
    expect(usePreferences.getState().defaultExplanationMode).toBe('standard')
  })

  it('validates paper starter questions structure with exactly three categories', () => {
    const questionSet: DocumentQuestionSet = {
      id: 1,
      document_id: 42,
      status: 'ready',
      questions: [
        {
          category: 'comprehension',
          question: 'What is the primary cognitive accuracy improvement reported?',
          evidence_quotes: ['Accuracy increased by 5 percentage points.'],
          page_numbers: [1],
        },
        {
          category: 'methodology',
          question: 'What experimental design and sample size were used?',
          evidence_quotes: ['Randomized trial. Sample: 40 adults.'],
          page_numbers: [1],
        },
        {
          category: 'critical_thinking',
          question: 'What single-site limitations constrain generalizability?',
          evidence_quotes: ['Limitation: single site trial.'],
          page_numbers: [1],
        },
      ],
    }

    expect(questionSet.questions).toHaveLength(3)
    const categories = questionSet.questions.map((q) => q.category)
    expect(categories).toEqual(['comprehension', 'methodology', 'critical_thinking'])
    expect(questionSet.questions[0].evidence_quotes?.[0]).toContain('5 percentage points')
  })

  it('validates grounded vs general terminology responses', () => {
    const groundedTerm: TermExplanationResponse = {
      term: 'latent Dirichlet allocation',
      document_id: 10,
      explanation: 'A generative statistical model for collections of discrete data.',
      grounded_in_paper: true,
      status: 'grounded',
      source_quote: 'We modeled topics using latent Dirichlet allocation on Page 4.',
      page_number: 4,
    }

    expect(groundedTerm.grounded_in_paper).toBe(true)
    expect(groundedTerm.status).toBe('grounded')
    expect(groundedTerm.source_quote).toBeDefined()
    expect(groundedTerm.page_number).toBe(4)

    const generalTerm: TermExplanationResponse = {
      term: 'qubit',
      document_id: 10,
      explanation: 'Note: This term is not explicitly mentioned in this paper; general scientific definition: A quantum bit.',
      grounded_in_paper: false,
      status: 'general',
      source_quote: null,
      page_number: null,
    }

    expect(generalTerm.grounded_in_paper).toBe(false)
    expect(generalTerm.status).toBe('general')
    expect(generalTerm.source_quote).toBeNull()
  })
})
