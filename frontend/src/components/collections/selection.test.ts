import { expect, it } from 'vitest'
import { resolvePaperSelection } from './selection'
import type { Document } from '../../types'
it('snapshots only existing selected papers and excludes processing papers for analyses', () => {
  const documents = [{ id: 3, status: 'completed' }, { id: 2, status: 'processing' }] as Document[]
  const selected = new Set([3, 2, 999])
  expect(resolvePaperSelection(documents, selected).document_ids).toEqual([2, 3])
  const snapshot = resolvePaperSelection(documents, selected, true)
  selected.clear()
  expect(snapshot).toEqual({ version: 1, document_ids: [3] })
})
