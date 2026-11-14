// Run against a running local or deployed API. Creates an isolated test account,
// then removes its test document, note, and conversation. No API mocking.
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'

const base = (process.argv[2] || 'http://localhost:8000/api/v1').replace(/\/$/, '')
let token
let documentId, noteId, sessionId
async function request(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
    signal: AbortSignal.timeout(180000),
  })
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`)
  return response
}
const json = async (path, method, body) => (await request(path, { method, body: JSON.stringify(body) })).json()
try {
  const email = `evidence-smoke-${randomUUID()}@example.com`
  const password = randomUUID()
  await json('/auth/register', 'POST', { email, password, full_name: 'Evidence deployment check' })
  token = (await json('/auth/login/json', 'POST', { email, password })).access_token
  console.log('Authentication: passed')
  const form = new FormData()
  form.set('file', new Blob([await readFile(new URL('../backend/sample_ai_research.pdf', import.meta.url))], { type: 'application/pdf' }), 'evidence-smoke.pdf')
  const uploaded = await (await request('/documents/upload', { method: 'POST', body: form })).json()
  documentId = uploaded.id
  for (let attempt = 0; attempt < 90; attempt++) {
    const doc = await (await request(`/documents/${documentId}`)).json()
    if (doc.status === 'failed') throw new Error(`PDF processing failed: ${doc.error_message}`)
    if (doc.status === 'completed') break
    if (attempt === 89) throw new Error('PDF processing timed out')
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  console.log('Real PDF upload and embeddings: passed')
  const answer = await json('/chat/ask', 'POST', { message: 'Summarize the automated assessment findings. Cite your sources.', document_ids: [documentId] })
  sessionId = answer.session_id
  assert(answer.message?.content?.length > 30, 'A real generated answer is required')
  assert(answer.sources?.length, 'The answer must include retrieved evidence')
  console.log('Real AI answer with citations: passed')
  const pdf = new Uint8Array(await (await request(`/evidence/documents/${documentId}/pdf`)).arrayBuffer())
  assert.equal(new TextDecoder().decode(pdf.slice(0, 4)), '%PDF')
  const detail = await (await request(`/evidence/documents/${documentId}/evidence-detail?page_number=2`)).json()
  assert.equal(detail.page_number, 2)
  assert(detail.source_quote && detail.content_hash)
  console.log('Authenticated original PDF and page mapping: passed')
  const note = await json('/evidence/notes', 'POST', { document_id: documentId, page_number: 2, source_quote: detail.source_quote, title: 'Deployment evidence', note: 'বাংলা evidence' })
  noteId = note.id
  await json(`/evidence/notes/${noteId}`, 'PATCH', { note: 'Edited বাংলা evidence' })
  // A fresh login must still see the saved note.
  token = (await json('/auth/login/json', 'POST', { email, password })).access_token
  const restored = await (await request(`/evidence/notes/${noteId}`)).json()
  assert.equal(restored.note, 'Edited বাংলা evidence')
  const exported = await request('/evidence/notes/export', { method: 'POST', body: JSON.stringify({ note_ids: [noteId] }) })
  const markdown = await exported.text()
  assert(markdown.includes('Edited বাংলা evidence') && markdown.includes('Page 2') && markdown.includes('**Quote:**'))
  console.log('Notebook create/edit/persistence/Unicode export: passed')
  await request(`/documents/${documentId}`, { method: 'DELETE' })
  documentId = null
  const retained = await (await request(`/evidence/notes/${noteId}`)).json()
  assert.equal(retained.document_id, null)
  assert.equal(retained.source_quote, detail.source_quote)
  console.log('Deleted source retains exact evidence snapshot: passed')
} finally {
  for (const [path, id] of [['/evidence/notes/', noteId], ['/documents/', documentId], ['/chat/sessions/', sessionId]]) {
    if (id) await request(path + id, { method: 'DELETE' }).catch(error => console.error('Cleanup:', error.message))
  }
}
