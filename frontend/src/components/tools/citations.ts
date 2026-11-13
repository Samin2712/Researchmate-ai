import type { Document, Source } from '../../types'
export type CitationStyle = 'APA' | 'MLA' | 'Chicago'
export function formatCitation(
  document: Pick<Document, 'title' | 'authors' | 'year'>,
  style: CitationStyle,
): string {
  const author = document.authors?.trim() || 'Unknown author'
  const year = document.year || 'n.d.'
  if (style === 'MLA') return `${author}. “${document.title}.” ${year}.`
  if (style === 'Chicago') return `${author}. ${year}. “${document.title}.”`
  return `${author} (${year}). ${document.title}.`
}
export function sourceCitation(source: Source) {
  return `${source.authors || 'Unknown author'}. ${source.title}${source.page_number ? `, p. ${source.page_number}` : ''}.`
}
