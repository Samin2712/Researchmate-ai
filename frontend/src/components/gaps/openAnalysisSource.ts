import { useEvidenceStore } from '../../store/evidence'
import type { EvidenceReference } from '../../types/analysis'

export function openAnalysisSource(ref: EvidenceReference) {
  useEvidenceStore.getState().openSourcePanel({
    source_number: 1, document_id: ref.document_id,
    chunk_id: ref.chunk_id || undefined, title: ref.title || 'Source paper',
    authors: ref.authors || undefined, page_number: ref.page_number || undefined,
    page_label: ref.page_label || undefined, chunk_text: ref.quote,
  }, 0, 0)
}
