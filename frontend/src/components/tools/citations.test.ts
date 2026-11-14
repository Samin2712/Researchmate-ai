import { describe, it, expect } from 'vitest'
import { formatCitation, formatBibTeX } from './citations'
import type { DocumentWithCollections } from '../../types/collections'
import type { Document } from '../../types'

describe('formatBibTeX', () => {
  it('formats an article entry with complete fields', () => {
    const doc: Partial<DocumentWithCollections> & Pick<Document, 'title' | 'authors' | 'year'> = {
      title: 'Attention Is All You Need',
      authors: 'Ashish Vaswani and Noam Shazeer',
      year: 2017,
      document_type: 'article',
      journal: 'Advances in Neural Information Processing Systems',
      volume: '30',
      issue: '1',
      pages: '5998--6008',
      doi: '10.48550/arXiv.1706.03762',
    }

    const bib = formatBibTeX(doc)
    expect(bib).toContain('@article{vaswani_2017_attention,')
    expect(bib).toContain('title = {Attention Is All You Need}')
    expect(bib).toContain('author = {Ashish Vaswani and Noam Shazeer}')
    expect(bib).toContain('year = {2017}')
    expect(bib).toContain('journal = {Advances in Neural Information Processing Systems}')
    expect(bib).toContain('volume = {30}')
    expect(bib).toContain('number = {1}')
    expect(bib).toContain('pages = {5998--6008}')
    expect(bib).toContain('doi = {10.48550/arXiv.1706.03762}')
  })

  it('escapes special BibTeX characters', () => {
    const doc: Partial<DocumentWithCollections> & Pick<Document, 'title' | 'authors' | 'year'> = {
      title: '100% Accuracy & Other #1 $Facts_in_AI',
      authors: 'Smith, Jane',
      year: 2024,
      document_type: 'misc',
    }

    const bib = formatBibTeX(doc)
    expect(bib).toContain('\\%')
    expect(bib).toContain('\\&')
    expect(bib).toContain('\\#')
    expect(bib).toContain('\\$')
    expect(bib).toContain('\\_')
  })

  it('omits missing fields gracefully without inventing facts', () => {
    const doc: Partial<DocumentWithCollections> & Pick<Document, 'title' | 'authors' | 'year'> = {
      title: 'Minimal Document',
      authors: null as unknown as string,
      year: null,
    }

    const bib = formatBibTeX(doc)
    expect(bib).toContain('@article{unknown_nd_minimal,')
    expect(bib).not.toContain('doi =')
    expect(bib).not.toContain('journal =')
  })
})

describe('formatCitation with BibTeX style', () => {
  it('routes BibTeX through formatBibTeX', () => {
    const doc: Pick<Document, 'title' | 'authors' | 'year'> = {
      title: 'Deep Residual Learning',
      authors: 'Kaiming He and Xiangyu Zhang',
      year: 2016,
    }

    const citation = formatCitation(doc, 'BibTeX')
    expect(citation).toContain('@article{he_2016_deep,')
  })
})


it('matches server keys for multiword structured surnames and punctuation', () => {
  const bib = formatBibTeX({ title: '«Étude» of methods', authors: 'Legacy text', year: 2024, structured_authors: [{ family: 'de la Cruz', given: 'Ana' }] })
  expect(bib).toContain('@article{delacruz_2024_tude,')
  expect(bib).toContain('author = {de la Cruz, Ana}')
})

it('uses a valid unknown key for non-Latin author metadata', () => {
  const bib = formatBibTeX({ title: '研究', authors: null, year: null, structured_authors: [{ family: '研究', given: '' }] })
  expect(bib).toContain('@article{unknown_nd_untitled,')
})
