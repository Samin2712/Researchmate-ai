import { test, expect, type Page, type Route } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

const api = 'http://127.0.0.1:8013/api/v1'
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`
const pdf = (name: string) => ({ name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nFixture') })
const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function mockLibrary(page: Page, handleUpload: (route: Route) => Promise<void>) {
  await page.addInitScript(t => localStorage.setItem('researchmate.token', t), token)
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    if (path === '/documents/upload') return handleUpload(route)
    if (path === '/auth/me') return json(route, { id: 1, full_name: 'Researcher', email: 'test@example.com' })
    if (path === '/documents') return json(route, { documents: [], total: 0 })
    if (path.endsWith('/questions')) return json(route, { status: 'unavailable', questions: [] })
    return json(route, [])
  })
  await page.goto('/library')
}

function uploaded(id: number) {
  return { id, user_id: 1, title: `Paper ${id}`, status: 'processing', created_at: '2026-11-21T00:00:00', file_size: 100 }
}

test('select multiple PDFs: two transfers, queued remainder, individual progress and success', async ({ page }, info) => {
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let active = 0, maximum = 0, calls = 0
  await mockLibrary(page, async route => {
    const id = ++calls
    maximum = Math.max(maximum, ++active)
    if (id <= 2) await gate
    active--
    await json(route, uploaded(id), 201)
  })
  await expect(page.getByLabel('Choose PDF file')).toHaveAttribute('multiple', '')
  await page.getByLabel('Choose PDF file').setInputFiles(['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf'].map(pdf))
  const queue = page.getByRole('list', { name: 'File uploads' })
  await expect(queue.getByRole('listitem')).toHaveCount(4)
  await expect(queue.getByRole('progressbar')).toHaveCount(2)
  await expect(queue.getByText('Queued', { exact: true })).toHaveCount(2)
  expect(calls).toBe(2)
  release()
  await expect(page.locator('.upload-queue').getByRole('status')).toHaveText('4 uploaded · 0 remaining · 0 failed')
  await expect(queue.getByText(/Processing will continue/)).toHaveCount(4)
  expect(calls).toBe(4)
  expect(maximum).toBe(2)
  expect((await new AxeBuilder({ page }).include('.upload-section').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('multi-upload.png'), fullPage: true })
  await page.getByRole('button', { name: 'Clear finished' }).click()
  await expect(queue).toHaveCount(0)
})

test('invalid files and one server failure do not stop valid files; retry only failed transfer', async ({ page }) => {
  let calls = 0
  await mockLibrary(page, async route => {
    const call = ++calls
    await json(route, call === 1 ? { detail: 'Temporary upload failure' } : uploaded(call), call === 1 ? 503 : 201)
  })
  await page.getByLabel('Choose PDF file').setInputFiles([
    pdf('retry.pdf'), pdf('valid.pdf'),
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('notes') },
    { name: 'renamed.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') },
    { name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) },
    { name: 'oversized.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) },
  ])
  await expect(page.locator('.upload-queue').getByRole('status')).toHaveText('1 uploaded · 0 remaining · 5 failed')
  expect(calls).toBe(2)
  await expect(page.getByRole('listitem', { name: 'renamed.pdf', exact: true })).toContainText('not a valid PDF')
  await expect(page.getByRole('listitem', { name: 'oversized.pdf', exact: true })).toContainText('smaller than 10 MB')
  await page.getByRole('button', { name: 'Retry upload retry.pdf', exact: true }).click()
  await expect(page.locator('.upload-queue').getByRole('status')).toHaveText('2 uploaded · 0 remaining · 4 failed')
  expect(calls).toBe(3)
})

test('cancel queued and active files, add more while uploading, then retry a queued cancellation', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const requests: string[] = []
  await mockLibrary(page, async route => {
    const body = route.request().postDataBuffer()!.toString()
    requests.push(body)
    await gate
    await json(route, uploaded(requests.length), 201).catch(() => {})
  })
  await page.getByLabel('Choose PDF file').setInputFiles(['active.pdf', 'other.pdf', 'queued.pdf'].map(pdf))
  await expect(page.getByRole('progressbar')).toHaveCount(2)
  await page.getByRole('button', { name: 'Cancel upload queued.pdf', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel upload active.pdf', exact: true }).click()
  await expect(page.getByRole('listitem', { name: 'active.pdf', exact: true })).toContainText('Check the library before retrying')
  await page.getByLabel('Choose PDF file').setInputFiles(pdf('added.pdf'))
  release()
  await expect(page.locator('.upload-queue').getByRole('status')).toHaveText('2 uploaded · 0 remaining · 0 failed · 2 canceled')
  expect(requests.some(body => body.includes('filename="queued.pdf"'))).toBe(false)
  await page.getByRole('button', { name: 'Retry upload queued.pdf', exact: true }).click()
  await expect(page.locator('.upload-queue').getByRole('status')).toHaveText('3 uploaded · 0 remaining · 0 failed · 1 canceled')
  await expect(page.getByRole('listitem', { name: 'active.pdf', exact: true })).toContainText('canceled')
})

test('drag and drop accepts several PDFs', async ({ page }) => {
  let calls = 0
  await mockLibrary(page, async route => { await json(route, uploaded(++calls), 201) })
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer()
    for (const name of ['drop-a.pdf', 'drop-b.pdf', 'drop-c.pdf']) {
      transfer.items.add(new File(['%PDF-1.4\nFixture'], name, { type: 'application/pdf' }))
    }
    return transfer
  })
  await page.locator('.upload-zone').dispatchEvent('drop', { dataTransfer })
  await expect(page.locator('.upload-queue').getByRole('status')).toHaveText('3 uploaded · 0 remaining · 0 failed')
  expect(calls).toBe(3)
})

test('real local API: select three PDFs once, process all, persist after refresh', async ({ page, request }, info) => {
  test.skip(!!process.env.UPLOAD_HOSTED_URL, 'Real persistence checks use the isolated local API, never a production account.')
  const login = await request.post(`${api}/auth/login/json`, {
    data: { email: 'upload-browser@example.com', password: 'UploadBrowser!123' },
  })
  expect(login.status()).toBe(200)
  const { access_token: realToken } = await login.json()
  const headers = { Authorization: `Bearer ${realToken}` }
  const initial = (await (await request.get(`${api}/documents`, { headers })).json()).documents as { id: number }[]
  const initialIds = new Set(initial.map(doc => doc.id))
  const browserErrors: string[] = []
  page.on('pageerror', error => browserErrors.push(error.message))
  await page.addInitScript(t => localStorage.setItem('researchmate.token', t), realToken)
  await page.goto('/library')
  const buffer = await readFile('../backend/sample_ai_research.pdf')
  await page.getByLabel('Choose PDF file').setInputFiles([1, 2, 3].map(index => ({
    name: `local-${info.project.name}-${index}.pdf`, mimeType: 'application/pdf', buffer,
  })))
  await expect(page.locator('.upload-queue').getByRole('status')).toHaveText('3 uploaded · 0 remaining · 0 failed', { timeout: 60000 })
  let ids: number[] = []
  await expect.poll(async () => {
    const docs = (await (await request.get(`${api}/documents`, { headers })).json()).documents as { id: number; status: string; page_count: number }[]
    const added = docs.filter(doc => !initialIds.has(doc.id))
    ids = added.map(doc => doc.id)
    return added.length === 3 && added.every(doc => doc.status === 'completed' && doc.page_count === 4)
  }, { timeout: 60000 }).toBe(true)
  await expect(page.getByRole('list', { name: 'File uploads' }).getByText(/Ready for questions/)).toHaveCount(3)
  await page.screenshot({ path: info.outputPath('real-api-upload.png'), fullPage: true })
  await page.reload()
  for (const id of ids) expect((await (await request.get(`${api}/documents/${id}`, { headers })).json()).status).toBe('completed')
  await expect(page.locator('.document-card')).toHaveCount(initial.length + 3)
  expect(browserErrors).toEqual([])
  for (const id of ids) expect((await request.delete(`${api}/documents/${id}`, { headers })).status()).toBe(204)
})
