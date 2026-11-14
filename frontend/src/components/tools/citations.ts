import type { Document, Source } from '../../types'
import type { DocumentWithCollections } from '../../types/collections'

export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'BibTeX'

export function formatCitation(
  document: Pick<Document, 'title' | 'authors' | 'year'> & Partial<DocumentWithCollections>,
  style: CitationStyle,
): string {
  if (style === 'BibTeX') {
    return formatBibTeX(document as DocumentWithCollections)
  }
  const author = document.structured_authors?.length ? document.structured_authors.map((a) => `${a.family}, ${a.given}`.replace(/, $/, '')).join('; ') : document.authors?.trim() || 'Unknown author'
  const year = document.year || 'n.d.'
  const publication = [document.journal, document.volume ? `${document.volume}${document.issue ? `(${document.issue})` : ''}` : null, document.pages, document.publisher].filter(Boolean).join(', ')
  const location = document.doi ? `https://doi.org/${document.doi}` : document.url
  const suffix = [publication, location].filter(Boolean).join('. ')
  const tail = suffix ? ` ${suffix}.` : ''
  if (style === 'MLA') return `${author}. “${document.title}.” ${year}.${tail}`
  if (style === 'Chicago') return `${author}. ${year}. "${document.title}."${tail}`
  return `${author} (${year}). ${document.title}.${tail}`
}

function escapeBibTeX(value: string): string {
  const escapes: Record<string, string> = {
    '{': '\\{', '}': '\\}', '\\': '\\\\', '%': '\\%', '$': '\\$',
    '#': '\\#', '&': '\\&', '^': '\\^{}', '_': '\\_', '~': '\\~{}',
  }
  return value.replace(/[{}\\%$#&^_~]/g, (character) => escapes[character])
}

export function formatBibTeX(
  document: Partial<DocumentWithCollections> & Pick<Document, 'title' | 'authors' | 'year'>,
  key?: string,
): string {
  // Build citation key
  let citationKey = key
  if (!citationKey) {
    const firstAuthorRaw = document.structured_authors?.[0]?.family || document.authors?.split(/[,;]|\band\b/i)[0]?.trim() || 'unknown'
    // Take the last word as "last name", strip to ASCII lowercase
    const lastNameRaw = document.structured_authors?.[0]?.family || firstAuthorRaw.split(/\s+/).pop() || firstAuthorRaw
    const lastName = lastNameRaw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase() || 'unknown'
    const year = document.year?.toString() || 'nd'
    const firstTitleWord = document.title?.match(/[a-zA-Z0-9]+/)?.[0]?.toLowerCase() || 'untitled'
    citationKey = `${lastName}_${year}_${firstTitleWord}`
  }

  // Determine entry type
  const docType = (document as DocumentWithCollections).document_type?.toLowerCase() || 'article'
  let entryType = '@article'
  if (docType === 'book') entryType = '@book'
  else if (docType === 'conference paper' || docType === 'inproceedings')
    entryType = '@inproceedings'
  else if (docType !== 'article') entryType = '@misc'

  const fields: string[] = []
  const addField = (name: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      fields.push(`  ${name} = {${escapeBibTeX(String(value))}}`)
    }
  }

  addField('title', document.title)
  addField('author', document.structured_authors?.length ? document.structured_authors.map((a) => `${a.family}, ${a.given}`.replace(/, $/, '')).join(' and ') : document.authors?.replace(/\s*;\s*|\s+and\s+/gi, ' and '))
  addField('year', document.year)
  addField('doi', (document as DocumentWithCollections).doi)
  addField('abstract', document.abstract)
  if (entryType === '@article') {
    addField('journal', document.journal)
    addField('volume', document.volume)
    addField('number', document.issue)
    addField('pages', document.pages)
    addField('publisher', document.publisher)
  } else if (entryType === '@book') {
    addField('publisher', document.publisher)
    addField('volume', document.volume)
    addField('pages', document.pages)
  } else if (entryType === '@inproceedings') {
    addField('booktitle', document.journal)
    addField('pages', document.pages)
    addField('publisher', document.publisher)
  }
  addField('url', (document as DocumentWithCollections).url)

  return `${entryType}{${citationKey},\n${fields.join(',\n')}\n}`
}

export function sourceCitation(source: Source) {
  return `${source.authors || 'Unknown author'}. ${source.title}${source.page_number ? `, p. ${source.page_number}` : ''}.`
}
