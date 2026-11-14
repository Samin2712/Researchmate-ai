import { formatCitation } from '../tools/citations'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEvidenceStore } from '../../store/evidence'
import type { LiteratureReviewResult } from '../../types/analysis'

interface Props { result: LiteratureReviewResult; editedContent?: string }
export function LiteratureReview({ result, editedContent }: Props) {
  const openSourcePanel = useEvidenceStore(s => s.openSourcePanel)
  const view = (id: string) => {
    const ref = result.bibliography[id]
    if (!ref) return
    openSourcePanel({ source_number: 1, document_id: ref.document_id,
      chunk_id: ref.chunk_id || undefined, title: ref.title || 'Unknown',
      authors: ref.authors || undefined, page_number: ref.page_number || undefined,
      page_label: ref.page_label || undefined, chunk_text: ref.quote }, 0, 0)
  }
  const text = editedContent ?? `# ${result.title}\n\n${result.abstract}\n\n${result.sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n')}`
  const linked = text.replace(/\[(doc\d+_chunk\d+|\d+)\](?!\()/g, (match, id: string) =>
    result.bibliography[id] ? `[${id}](#analysis-source-${id})` : match)
  return <div className="literature-review"><div className="review-content">
    <p className="review-badge">Draft based on selected papers</p>
    {editedContent !== undefined && <p role="status">Edited version. Claims changed by you have not been revalidated against sources.</p>}
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      a: ({ href, children }) => href?.startsWith('#analysis-source-')
        ? <button className="citation-link" onClick={() => view(href.slice(17))}>{children}</button>
        : <a href={href} rel="noopener noreferrer">{children}</a>,
    }}>{linked}</ReactMarkdown>
    <section className="review-bibliography"><h2>References</h2>
      {Object.entries(result.bibliography).map(([id, ref]) => <button key={id}
        className="bibliography-item" onClick={() => view(id)}>
        [{id}] {formatCitation({title:ref.title || 'Unknown', authors:ref.authors ?? null, year:null, ...ref.metadata}, 'APA')} — Page {ref.page_label || ref.page_number || '?'}
      </button>)}
    </section>
    <section className="review-coverage"><h2>Document coverage</h2>
      {Object.entries(result.coverage).map(([id, status]) => <p key={id}>Document {id}: {status}</p>)}
    </section>
  </div></div>
}
