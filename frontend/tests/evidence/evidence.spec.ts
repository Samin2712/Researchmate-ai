import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

// Real API/database and multi-page PDF. Only generation/embeddings are replaced
// by backend/tests/browser_server.py; no browser API routes are mocked here.
test('citation, real PDF, save, edit, reload, Unicode export and focus return', async ({ page, request }, info) => {
  const api = 'http://127.0.0.1:8011/api/v1'
  const email = `evidence-${Date.now()}-${info.project.name}@example.com`
  expect((await request.post(`${api}/auth/register`, { data: { email, password: 'password123', full_name: 'Evidence Researcher' } })).status()).toBe(201)
  const token = (await (await request.post(`${api}/auth/login/json`, { data: { email, password: 'password123' } })).json()).access_token
  const headers = { Authorization: `Bearer ${token}` }
  const upload = await request.post(`${api}/documents/upload`, { headers, multipart: { file: { name: 'research.pdf', mimeType: 'application/pdf', buffer: await readFile('../backend/sample_ai_research.pdf') } } })
  expect(upload.status()).toBe(201)
  const doc = await upload.json()
  await expect.poll(async () => (await (await request.get(`${api}/documents/${doc.id}`, { headers })).json()).status, { timeout: 30000 }).toBe('completed')
  const answer = await request.post(`${api}/chat/ask`, { headers, data: { message: 'Summarize this paper', document_ids: [doc.id] } })
  expect(answer.status()).toBe(200)
  const chat = await answer.json()
  await page.addInitScript(value => localStorage.setItem('researchmate.token', value), token)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', req => { if (req.url().includes('/pdf')) expect(req.url()).not.toContain('token=') })
  await page.goto(`/chat?session=${chat.session_id}`)
  const citation = page.locator('.answer-citation').first()
  await citation.click()
  const panel = page.getByRole('dialog', { name: 'Source verification' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('img', { name: 'PDF page 2', exact: true })).toBeVisible()
  await expect(panel.getByText('Rendering PDF…')).not.toBeVisible({ timeout: 30000 })
  await expect(panel.getByText('Page 2 of 4', { exact: true })).toBeVisible()
  expect((await new AxeBuilder({ page }).include('.source-verification-panel').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('source-panel.png'), fullPage: true })
  await panel.getByRole('button', { name: 'Next PDF page' }).click()
  await expect(panel.getByRole('img', { name: 'PDF page 3', exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Save as evidence' }).click()
  const save = page.getByRole('dialog', { name: 'Save Evidence', exact: true })
  await save.getByLabel('Title (optional)').fill('বাংলা evidence')
  await save.getByLabel('Your Note (optional)').fill('My own interpretation')
  await save.getByRole('button', { name: 'Save Evidence', exact: true }).click()
  await expect(save).not.toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).not.toBeVisible()
  await expect(citation).toBeFocused()
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: 'Evidence notebook', exact: true }).click()
  const notebook = page.getByRole('dialog', { name: 'Evidence notebook', exact: true })
  await expect(notebook.getByRole('heading', { name: 'বাংলা evidence' })).toBeVisible()
  await notebook.getByRole('button', { name: 'Edit evidence', exact: true }).click()
  await notebook.getByLabel('Personal note', { exact: true }).fill('Edited ব্যক্তিগত নোট')
  await notebook.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(notebook.getByText('Edited ব্যক্তিগত নোট', { exact: true })).toBeVisible()
  await page.reload()
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: 'Evidence notebook', exact: true }).click()
  await expect(notebook.getByText('Edited ব্যক্তিগত নোট', { exact: true })).toBeVisible()
  await notebook.getByRole('checkbox', { name: 'Select evidence' }).check()
  const downloadPromise = page.waitForEvent('download')
  await notebook.getByRole('button', { name: 'Export (1)', exact: true }).click()
  const content = await readFile((await (await downloadPromise).path())!, 'utf8')
  expect(content).toContain('Edited ব্যক্তিগত নোট')
  expect(content).toContain('**Quote:**')
  expect(content).toContain('Page 2')
  expect((await new AxeBuilder({ page }).include('.evidence-notebook-panel').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('notebook.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await notebook.getByRole('button', { name: 'Close notebook' }).click()
  // Deterministic failure test: the PDF endpoint responds 404.
  await page.route('**/evidence/documents/*/pdf', route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Original PDF unavailable' }) }))
  await citation.click()
  await expect(panel.getByRole('alert')).toContainText('Original PDF unavailable')
  await panel.getByRole('button', { name: 'Return to chat' }).click()
  await page.unroute('**/evidence/documents/*/pdf')
  // Legacy saved chat source: resolve its truncated snippet server-side.
  await page.route('**/chat/sessions/*', async route => {
    const response = await route.fetch()
    const body = await response.json()
    for (const message of body.messages) {
      for (const source of message.sources || []) source.chunk_text = source.chunk_text.slice(0, 200) + '...'
    }
    await route.fulfill({ response, json: body })
  })
  await page.reload()
  await page.locator('.answer-citation').first().click()
  await expect(panel.getByRole('img', { name: 'PDF page 2', exact: true })).toBeVisible()
  await expect(panel.getByText('Rendering PDF…')).not.toBeVisible()
  await panel.getByRole('button', { name: 'Return to chat' }).click()
  // Close/reopen while requests are in flight; cancelled results must not win.
  await page.locator('.answer-citation').first().click()
  await panel.getByRole('button', { name: 'Return to chat' }).click()
  await page.locator('.answer-citation').first().click()
  await expect(panel.getByRole('img', { name: 'PDF page 2', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
