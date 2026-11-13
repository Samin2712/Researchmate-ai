import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { describe, expect, it } from 'vitest'
import { citationLinks, normalizeAnswerMarkdown } from './answerFormatting'

const sources = [{ document_id: '1', title: 'Sentiment paper', page_number: 2 }]
function render(content: string) {
  return renderToStaticMarkup(createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm, [citationLinks, { sources, prefix: 'message-7' }]],
    children: normalizeAnswerMarkdown(content),
  }))
}

describe('research answer formatting', () => {
  it('renders collapsed comparison rows as a table and preserves empty cells', () => {
    const html = render('| Dataset | NB | SVM | Notes | | :--- | ---: | ---: | --- | | Newswire | 78.2 | 78.2 | | | Movie reviews | 78.9 | 81.5 | [Page 2, Source 1] |')
    expect(html).toContain('<table>')
    expect(html.match(/<tr>/g)).toHaveLength(3)
    expect(html).toContain('<td></td>')
    expect(html).toContain('81.5')
    expect(html).toContain('href="#message-7-source-1"')
    expect(html).toContain('p. 2</a>')
    expect(html).not.toContain('[Page 2, Source 1]')
  })

  it('preserves ordinary Markdown, code, and escaped table pipes', () => {
    const markdown = '## Results\n\n| Dataset | NB |\n| --- | --- |\n| A \\| B | 61.5 |\n\n```text\n| A | B | | --- | --- | | C | D |\n[Page 2]\n```\n\n`[Page 2]`'
    expect(normalizeAnswerMarkdown(markdown)).toBe(markdown)
    const html = render(markdown)
    expect(html).toContain('A | B')
    expect(html).toContain('<code>[Page 2]</code>')
    expect(html).not.toContain('href=')
  })

  it('does not fabricate links for missing or ambiguous sources', () => {
    expect(render('Unknown [Page 99].')).toContain('[Page 99]')
    const html = renderToStaticMarkup(createElement(ReactMarkdown, {
      remarkPlugins: [[citationLinks, { sources: [...sources, { ...sources[0], document_id: '2' }], prefix: 'm' }]],
      children: 'Unclear [Page 2].',
    }))
    expect(html).not.toContain('href=')
  })

  it('resolves original source numbers even when only cited excerpts were returned', () => {
    const html = renderToStaticMarkup(createElement(ReactMarkdown, {
      remarkPlugins: [[citationLinks, { sources: [{ ...sources[0], source_number: 3 }], prefix: 'm' }]],
      children: 'Evidence [Source 3] and [Page 2, Source 3].',
    }))
    expect(html.match(/href="#m-source-1"/g)).toHaveLength(2)
  })
})
