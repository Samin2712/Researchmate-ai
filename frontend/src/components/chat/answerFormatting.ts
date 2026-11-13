import type { Source } from '../../types'

/** Repair legacy tables whose row breaks were lost, without changing cell data. */
export function normalizeAnswerMarkdown(content: string): string {
  let fence = ''
  return content.split('\n').map((line) => {
    const marker = line.trimStart().match(/^(`{3,}|~{3,})/)
    if (marker) {
      if (!fence) fence = marker[1][0]
      else if (marker[1][0] === fence) fence = ''
      return line
    }
    if (fence || !line.trimStart().startsWith('|')) return line
    const header = line.match(/^(\s*\|.+?\|)[ \t]+\|[ \t]*:?-{3,}/)
    if (!header) return line
    // Escaped pipes are cell content, not column separators.
    const cells = line.trim().split(/(?<!\\)\|/).slice(1, -1)
    const width = header[1].split(/(?<!\\)\|/).length - 2
    const rows: string[] = []
    for (let index = 0; index < cells.length; index += width + 1) {
      if (index + width > cells.length || (index > 0 && cells[index - 1].trim())) return line
      rows.push(`|${cells.slice(index, index + width).join('|')}|`)
    }
    if (rows.length < 2 || !rows[1].slice(1, -1).split(/(?<!\\)\|/).every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell))) return line
    return rows.join('\n')
  }).join('\n')
}

type MarkdownNode = {
  type: string
  value?: string
  url?: string
  title?: string
  children?: MarkdownNode[]
}

/** Turn verified page citations into small links, leaving code and unknown references intact. */
export function citationLinks({ sources, prefix }: { sources: Source[]; prefix: string }) {
  return (tree: MarkdownNode) => {
    function walk(node: MarkdownNode) {
      if (!node.children || ['link', 'code', 'inlineCode', 'html'].includes(node.type)) return
      node.children = node.children.flatMap((child) => {
        if (child.type !== 'text' || !child.value) {
          walk(child)
          return [child]
        }
        const result: MarkdownNode[] = []
        let previous = 0
        for (const match of child.value.matchAll(/\[(?:Page\s+(\d+)(?:,\s*Source\s+(\d+))?|Source\s+(\d+))\]/gi)) {
          const sourceNumber = Number(match[2] || match[3])
          const candidates = sources.map((source, index) => ({ source, index }))
            .filter(({ source, index }) => {
              if (match[1] && String(source.page_number) !== match[1]) return false
              if (!sourceNumber) return true
              // Legacy responses did not preserve original excerpt numbers.
              return source.source_number != null ? source.source_number === sourceNumber :
                match[1] ? true : index + 1 === sourceNumber
            })
          if (!candidates.length || new Set(candidates.map(({ source }) => source.document_id)).size > 1) continue
          const { source, index } = candidates[0]
          const start = match.index!
          result.push({ type: 'text', value: child.value.slice(previous, start) })
          result.push({ type: 'link', url: `#${prefix}-source-${index + 1}`,
            title: `${source.title || 'Source paper'}${source.page_number ? `, page ${source.page_number}` : ''}`,
            children: [{ type: 'text', value: source.page_number ? `p. ${source.page_number}` : `Source ${index + 1}` }] })
          previous = start + match[0].length
        }
        result.push({ type: 'text', value: child.value.slice(previous) })
        return result
      })
    }
    walk(tree)
  }
}
