import type { Document } from '../../types'

/** Snapshot IDs when saving an analysis; never save a live collection query. */
export interface PaperSelection {
  version: 1
  document_ids: number[]
}

export function resolvePaperSelection(documents: Document[], selectedIds: ReadonlySet<number>, readyOnly = false): PaperSelection {
  return {
    version: 1,
    document_ids: documents
      .filter((doc) => selectedIds.has(doc.id) && (!readyOnly || doc.status === 'completed'))
      .map((doc) => doc.id)
      .sort((a, b) => a - b),
  }
}
