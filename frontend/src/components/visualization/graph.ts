import type { Document, Message } from '../../types'
export function buildConnections(documents: Document[], messages: Message[]) {
  const pairs = new Map<string, { source: string; target: string; labels: Set<string> }>()
  function connect(a: string, b: string, label: string) {
    if (a === b) return
    const [source, target] = [a, b].sort()
    const key = `${source}:${target}`
    const pair = pairs.get(key) || { source, target, labels: new Set<string>() }
    pair.labels.add(label)
    pairs.set(key, pair)
  }
  const authors = new Map<string, string[]>()
  for (const document of documents) {
    for (const author of (document.authors || '')
      .split(/;|\band\b|\n/i)
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name && name !== 'unknown')) {
      const existing = authors.get(author) || []
      existing.forEach((id) => connect(id, String(document.id), 'Shared author'))
      authors.set(author, [...existing, String(document.id)])
    }
  }
  const ids = new Set(documents.map((document) => String(document.id)))
  for (const message of messages) {
    const cited = [
      ...new Set((message.sources || []).map((source) => String(source.document_id))),
    ].filter((id) => ids.has(id))
    cited.forEach((a, index) =>
      cited.slice(index + 1).forEach((b) => connect(a, b, 'Cited in one answer')),
    )
  }
  return [...pairs.entries()].map(([id, pair]) => ({
    id,
    source: pair.source,
    target: pair.target,
    label: [...pair.labels].join(' / '),
  }))
}
