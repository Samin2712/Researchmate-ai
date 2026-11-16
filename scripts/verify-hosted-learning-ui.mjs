// Opt-in real deployed browser smoke. Uses no mocked routes or provider fixtures.
// Creates a test account; deletes its uploaded paper and chat on completion.
import { chromium, expect } from '../frontend/node_modules/@playwright/test/index.mjs'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const frontend = 'https://researchmate-frontend.onrender.com'
const api = 'https://researchmate-backend-djg9.onrender.com/api/v1'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const report = { frontend, api, mocked: false, checks: [], browserErrors: errors }
let documentId, sessionId, token
try {
  await page.goto(`${frontend}/register`)
  await page.getByLabel('Full name').fill('Hosted learning verification')
  await page.getByLabel('Email address').fill(`hosted-learning-${Date.now()}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill('HostedLearning!123')
  await page.getByLabel('Confirm password').fill('HostedLearning!123')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page).toHaveURL(`${frontend}/`, { timeout: 60000 })
  token = await page.evaluate(() => localStorage.getItem('researchmate.token'))
  report.checks.push('deployed registration, login and frontend/API connection')
  await page.goto(`${frontend}/library`)
  const uploadResult = page.waitForResponse(response => response.url() === `${api}/documents/upload` && response.request().method() === 'POST', { timeout: 120000 })
  await page.getByLabel('Choose PDF file').setInputFiles(fileURLToPath(new URL('../backend/sample_ai_research.pdf', import.meta.url)))
  const upload = await uploadResult
  if (upload.status() !== 201) throw new Error(`Upload returned ${upload.status()}`)
  documentId = (await upload.json()).id
  const firstQuestion = page.locator('.starter-question-card').first()
  await expect(firstQuestion).toBeVisible({ timeout: 180000 })
  await expect(page.locator('.starter-question-card')).toHaveCount(3)
  report.checks.push('real upload, processing and three automatic starter questions')
  await firstQuestion.click()
  await expect(page).toHaveURL(new RegExp(`/chat\\?document=${documentId}`))
  await expect(page.locator('#chat-message')).not.toHaveValue('')
  await page.getByRole('radio', { name: /Explain simply/i }).click()
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page).toHaveURL(/session=\d+/, { timeout: 120000 })
  sessionId = Number(new URL(page.url()).searchParams.get('session'))
  await expect(page.locator('.mode-badge.simple')).toBeVisible()
  await expect(page.locator('.answer-citation').first()).toBeVisible()
  await page.locator('.answer-citation').first().click()
  await expect(page.getByRole('dialog', { name: 'Source verification' })).toBeVisible()
  await page.getByRole('button', { name: 'Return to chat' }).click()
  report.checks.push('scoped draft, real simple streamed answer and clickable source verification')
  await page.reload()
  await expect(page.locator('.mode-badge.simple')).toBeVisible()
  await expect(page.getByRole('radio', { name: /Explain simply/i })).toHaveAttribute('aria-checked', 'true')
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  report.checks.push('saved history, mode selection, responsive layout and deep-route reload')
  await page.screenshot({ path: 'docs/features/screenshots/learning-hosted.png', fullPage: true })
  expect(errors).toEqual([])
  report.status = 'passed'
} finally {
  if (token) {
    const headers = { Authorization: `Bearer ${token}` }
    if (sessionId) expect((await page.request.delete(`${api}/chat/sessions/${sessionId}`, { headers })).status()).toBe(204)
    if (documentId) expect((await page.request.delete(`${api}/documents/${documentId}`, { headers })).status()).toBe(204)
  }
  await browser.close()
}
report.accountNote = 'Audit account remains; paper and chat were removed.'
await writeFile('docs/verification/learning-hosted-ui.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
