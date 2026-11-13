import { describe, expect, it } from 'vitest'
import { readSSE } from './chatService'
import { validateFile, MAX_UPLOAD_BYTES } from './documentService'
import type { Document, Message, StreamEvent } from '../types'
import { buildConnections } from '../components/visualization/graph'
import { formatCitation } from '../components/tools/citations'

function stream(text: string, step = 1) {
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += step) controller.enqueue(bytes.slice(i, i + step))
      controller.close()
    },
  })
}
describe('SSE protocol', () => {
  it('handles partial frames, comments, CRLF, UTF-8, sources and completion', async () => {
    const events: StreamEvent[] = []
    await readSSE(
      stream(
        ': keepalive\r\n\r\ndata: {"type":"session","session_id":7}\r\n\r\ndata: {"type":"answer","content":"Café বাংলা"}\r\n\r\ndata: {"type":"sources","sources":[],"confidence":0.91}\r\n\r\ndata: {"type":"complete"}\r\n\r\n',
      ),
      (event) => events.push(event),
    )
    expect(events).toHaveLength(4)
    expect(events[1]).toEqual({ type: 'answer', content: 'Café বাংলা' })
  })
  it('surfaces stream errors', async () => {
    await expect(
      readSSE(stream('data: {"type":"error","error":"Provider unavailable"}\n\n'), () => {}),
    ).rejects.toThrow('Provider unavailable')
  })
  it('rejects interrupted streams instead of claiming success', async () => {
    await expect(
      readSSE(stream('data: {"type":"answer","content":"partial"}\n\n'), () => {}),
    ).rejects.toThrow('interrupted')
  })
  it('accepts a final frame without a trailing separator', async () => {
    await expect(
      readSSE(stream('data: {"type":"complete"}', 10), () => {}),
    ).resolves.toBeUndefined()
  })
})
describe('upload validation', () => {
  const pdf = { name: 'Research.PDF', type: 'application/pdf', size: 100 }
  it('accepts PDF names case-insensitively and missing OS MIME types', () => {
    expect(validateFile(pdf)).toBeNull()
    expect(validateFile({ ...pdf, type: '' })).toBeNull()
  })
  it('rejects non-PDF, empty and oversized files', () => {
    expect(validateFile({ ...pdf, name: 'paper.exe' })).toContain('PDF')
    expect(validateFile({ ...pdf, type: 'text/plain' })).toContain('PDF')
    expect(validateFile({ ...pdf, size: 0 })).toContain('empty')
    expect(validateFile({ ...pdf, size: MAX_UPLOAD_BYTES + 1 })).toContain('smaller')
  })
})
describe('evidence tools', () => {
  const documents = [
    { id: 1, title: 'Paper A', authors: 'Ada Lovelace; Grace Hopper', year: 2024 },
    { id: 2, title: 'Paper B', authors: 'Ada Lovelace', year: null },
    { id: 3, title: 'Paper C', authors: 'Unknown' },
  ] as Document[]
  it('connects only shared authors and co-cited papers, ignoring deleted sources', () => {
    const messages = [
      { sources: [{ document_id: '2' }, { document_id: 3 }, { document_id: 99 }] },
    ] as Message[]
    const edges = buildConnections(documents, messages)
    expect(edges).toHaveLength(2)
    expect(edges).toContainEqual({ id: '1:2', source: '1', target: '2', label: 'Shared author' })
    expect(edges).toContainEqual({
      id: '2:3',
      source: '2',
      target: '3',
      label: 'Cited in one answer',
    })
  })
  it('formats available citation metadata and handles missing dates', () => {
    expect(formatCitation(documents[0], 'APA')).toBe('Ada Lovelace; Grace Hopper (2024). Paper A.')
    expect(formatCitation(documents[1], 'MLA')).toContain('n.d.')
    expect(formatCitation({ ...documents[0], authors: null }, 'Chicago')).toContain(
      'Unknown author',
    )
  })
})
