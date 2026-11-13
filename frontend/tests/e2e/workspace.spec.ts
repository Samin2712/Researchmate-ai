import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const created = '2026-11-13T10:00:00Z'
const paper = {
  id: 1,
  user_id: 1,
  title: 'Attention and Research Methods',
  authors: 'Alex Morgan',
  year: 2024,
  abstract: 'A study of attention mechanisms, methods, and their limitations.',
  status: 'completed',
  page_count: 12,
  file_size: 1024,
  error_message: null,
  created_at: created,
  updated_at: null,
}
const secondPaper = { ...paper, id: 2, title: 'A Connected Study', authors: 'Alex Morgan' }
const source = {
  document_id: '1',
  title: paper.title,
  authors: paper.authors,
  page_number: 2,
  chunk_text: 'Attention helps connect relevant evidence.',
  similarity_score: 0.92,
}
const session = {
  id: 1,
  user_id: 1,
  title: 'What are the main findings?',
  created_at: created,
  updated_at: null,
}
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`
const pdf = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF')

async function mockAPI(
  page: Page,
  options: { empty?: boolean; unauthorized?: boolean; streamError?: boolean } = {},
) {
  let documents = options.empty ? [] : [paper, secondPaper]
  let loggedIn = false
  let messages: object[] = []
  let hasSession = false
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (method === 'OPTIONS') return route.fulfill({ status: 204 })
    if (path === '/auth/register')
      return json(
        {
          id: 1,
          email: 'alex@example.com',
          full_name: 'Alex Morgan',
          is_active: true,
          created_at: created,
        },
        201,
      )
    if (path === '/auth/login/json') {
      const body = request.postDataJSON() as { password: string }
      if (body.password === 'wrongpass') return json({ detail: 'Incorrect email or password' }, 401)
      loggedIn = true
      return json({ access_token: token, token_type: 'bearer' })
    }
    if (path === '/auth/me')
      return options.unauthorized
        ? json({ detail: 'Could not validate credentials' }, 401)
        : json({
            id: 1,
            email: 'alex@example.com',
            full_name: 'Alex Morgan',
            is_active: true,
            created_at: created,
          })
    if (!request.headers().authorization && !loggedIn)
      return json({ detail: 'Not authenticated' }, 401)
    if (path === '/documents/upload') {
      documents = [paper, ...documents]
      return json({ ...paper, status: 'processing' }, 201)
    }
    if (path === '/documents' && method === 'GET')
      return json({ documents, total: documents.length })
    if (path === '/documents/1' && method === 'DELETE') {
      documents = documents.filter((item) => item.id !== 1)
      return route.fulfill({ status: 204 })
    }
    if (path === '/chat/sessions' && method === 'GET') return json(hasSession ? [session] : [])
    if (path === '/chat/sessions/1' && method === 'GET') return json({ ...session, messages })
    if (path === '/chat/sessions/1' && method === 'DELETE') {
      hasSession = false
      return route.fulfill({ status: 204 })
    }
    if (path === '/chat/stream') {
      expect(request.headers().authorization).toBe(`Bearer ${token}`)
      expect(request.postDataJSON().message).toBeTruthy()
      if (options.streamError)
        return route.fulfill({
          contentType: 'text/event-stream',
          body: 'data: {"type":"session","session_id":1}\n\ndata: {"type":"error","error":"The model provider is unavailable. Try again."}\n\n',
        })
      const text = 'The main finding connects relevant evidence through attention [Page 2].'
      hasSession = true
      messages = [
        {
          id: 1,
          session_id: 1,
          role: 'user',
          content: request.postDataJSON().message,
          sources: null,
          confidence_score: null,
          created_at: created,
        },
        {
          id: 2,
          session_id: 1,
          role: 'assistant',
          content: text,
          sources: [source],
          confidence_score: 92,
          created_at: created,
        },
      ]
      return route.fulfill({
        contentType: 'text/event-stream',
        body: [
          { type: 'session', session_id: 1 },
          { type: 'answer', content: text },
          { type: 'sources', sources: [source], confidence: 0.92 },
          { type: 'complete' },
        ]
          .map((event) => `data: ${JSON.stringify(event)}\n\n`)
          .join(''),
      })
    }
    return json({ detail: `Unhandled fixture request: ${method} ${path}` }, 404)
  })
}
async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('alex@example.com')
  await page.getByLabel('Password', { exact: true }).fill('research123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'What will you discover today?' })).toBeVisible()
}
async function navigate(page: Page, label: string) {
  if ((page.viewportSize()?.width || 1280) <= 767) {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('dialog').getByRole('link', { name: label, exact: true }).click()
  } else
    await page
      .getByRole('complementary', { name: 'Workspace navigation' })
      .getByRole('link', { name: label, exact: true })
      .click()
}

test('registration → upload → streaming chat → history → export → logout (controlled API)', async ({
  page,
}) => {
  await mockAPI(page, { empty: true })
  await page.goto('/chat')
  await expect(page).toHaveURL(/\/login/)
  await page.getByRole('link', { name: 'Create an account' }).click()
  await page.getByLabel('Full name').fill('Alex Morgan')
  await page.getByLabel('Email address').fill('alex@example.com')
  await page.getByLabel('Password', { exact: true }).fill('research123')
  await page.getByLabel('Confirm password').fill('different')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('do not match')
  await page.getByLabel('Confirm password').fill('research123')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await navigate(page, 'Paper library')
  await expect(
    page.getByRole('heading', { name: 'Your next discovery starts with a paper.' }),
  ).toBeVisible()
  await page
    .getByLabel('Choose PDF file')
    .setInputFiles({ name: 'paper.pdf', mimeType: 'application/pdf', buffer: pdf })
  await expect(page.getByRole('button', { name: paper.title, exact: true })).toBeVisible()
  await page.getByRole('link', { name: `Chat about ${paper.title}` }).click()
  await page.getByRole('button', { name: 'What are the main findings?' }).click()
  await page.getByRole('textbox', { name: 'Your question' }).press('Enter')
  await expect(page.getByRole('article', { name: 'ResearchMate answer' })).toContainText(
    'main finding',
  )
  await expect(page).toHaveURL(/session=1/)
  await expect(page.getByText('Retrieval confidence: 92%')).toBeVisible()
  await page
    .getByText(paper.title, { exact: false })
    .filter({ has: page.locator('small') })
    .first()
    .click()
  await expect(page.getByText(source.chunk_text, { exact: true })).toBeVisible()
  await checkAccessibility(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  expect((await download).suggestedFilename()).toMatch(/\.md$/)
  await page.reload()
  await expect(page.getByRole('article', { name: 'ResearchMate answer' })).toContainText(
    'main finding',
  )
  await navigate(page, 'Settings')
  await page.getByRole('button', { name: 'Log out of ResearchMate' }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('researchmate.token')))
    .toBeNull()
})

test('validation, filter, summary, citation, PDF export, graph and deletion (controlled API)', async ({
  page,
}) => {
  await mockAPI(page)
  await signIn(page)
  await navigate(page, 'Paper library')
  await page
    .getByLabel('Choose PDF file')
    .setInputFiles({ name: 'not-a-pdf.txt', mimeType: 'text/plain', buffer: Buffer.from('text') })
  await expect(page.getByRole('alert')).toContainText('Choose a PDF')
  await page.getByLabel('Choose PDF file').setInputFiles({
    name: 'renamed.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('not pdf'),
  })
  await expect(page.getByRole('alert')).toContainText('not a valid PDF')
  await page.getByRole('textbox', { name: 'Search papers' }).fill('no-match')
  await expect(page.getByRole('heading', { name: 'No papers match your search.' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByRole('button', { name: paper.title, exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Citation style').selectOption('MLA')
  await expect(dialog.locator('.citation-text')).toContainText('“Attention')
  await dialog.getByRole('button', { name: 'Close dialog' }).click()
  await page.getByRole('button', { name: `Summarize ${paper.title}`, exact: true }).click()
  await expect(page.getByRole('dialog').locator('.markdown')).toContainText('main finding')
  await page.getByRole('dialog').getByLabel('Export format').selectOption('pdf')
  const download = page.waitForEvent('download')
  await page.getByRole('dialog').getByRole('button', { name: 'Export', exact: true }).click()
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/)
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await navigate(page, 'Knowledge map')
  await expect(page.getByRole('region', { name: 'Interactive knowledge map' })).toBeVisible()
  await expect(page.getByText('Shared author', { exact: true }).first()).toBeVisible()
  const paperLink = page.locator('.graph-paper').filter({ hasText: paper.title })
  await paperLink.focus()
  await paperLink.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await navigate(page, 'Paper library')
  await page.getByRole('button', { name: `Delete ${paper.title}`, exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete paper', exact: true }).click()
  await expect(page.getByRole('button', { name: paper.title, exact: true })).toHaveCount(0)
})

test('auth errors, expired session, and streaming recovery (controlled API)', async ({ page }) => {
  await mockAPI(page, { streamError: true })
  await page.goto('/login')
  await page.getByLabel('Email address').fill('alex@example.com')
  await page.getByLabel('Password', { exact: true }).fill('wrongpass')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Incorrect email or password')
  await page.getByLabel('Password', { exact: true }).fill('research123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await navigate(page, 'Research chat')
  await page.getByRole('textbox', { name: 'Your question' }).fill('Explain these findings')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.getByRole('alert')).toContainText('model provider is unavailable')
  await expect(page.getByRole('textbox', { name: 'Your question' })).toHaveValue(
    'Explain these findings',
  )
  await expect(page.getByRole('button', { name: 'Send question' })).toBeEnabled()
  await page.evaluate(() =>
    localStorage.setItem('researchmate.token', 'e30.' + btoa(JSON.stringify({ exp: 1 })) + '.x'),
  )
  await page.reload()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Your session expired. Sign in to continue.')).toBeVisible()
})

test('keyboard, mobile navigation, reduced motion, and accessibility (controlled API)', async ({
  page,
}) => {
  await mockAPI(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/login')
  await page.getByLabel('Email address').focus()
  await page.keyboard.type('alex@example.com')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused()
  await page.keyboard.type('research123')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'What will you discover today?' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await checkAccessibility(page)
  await page.screenshot({
    path: `test-results/dashboard-${test.info().project.name}.png`,
    fullPage: true,
  })
  await navigate(page, 'Paper library')
  await expect(page.getByRole('heading', { name: 'Your paper library' })).toBeVisible()
  await checkAccessibility(page)
  await page.getByRole('button', { name: paper.title, exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await navigate(page, 'Research chat')
  await expect(page.getByRole('textbox', { name: 'Your question' })).toBeVisible()
  await checkAccessibility(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({
    path: `test-results/chat-${test.info().project.name}.png`,
    fullPage: true,
  })
})

test('server 401 clears the protected session (controlled API)', async ({ page }) => {
  await mockAPI(page, { unauthorized: true })
  await page.addInitScript((value) => localStorage.setItem('researchmate.token', value), token)
  await page.goto('/library')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Your session expired. Sign in to continue.')).toBeVisible()
})

test('network outage has a useful recovery state (controlled failure)', async ({ page }) => {
  await page.route('**/api/v1/**', (route) => route.abort('connectionrefused'))
  await page.goto('/login')
  await page.getByLabel('Email address').fill('alex@example.com')
  await page.getByLabel('Password', { exact: true }).fill('research123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Cannot reach the server')
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled()
})

test('live backend: register, upload, chat, logout', async ({ page, request }) => {
  test.skip(test.info().project.name !== 'chromium', 'Run live flow once on desktop Chromium')
  const health = await request
    .get('http://localhost:8000/health', { timeout: 5000 })
    .catch(() => null)
  test.skip(
    !health?.ok(),
    'Backend is unreachable on localhost:8000; live integration cannot be verified',
  )
  test.setTimeout(240000)
  const email = `phase3-${Date.now()}@example.com`
  await page.goto('/register')
  await page.getByLabel('Full name').fill('Phase 3 Verification')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('ResearchPhase3!')
  await page.getByLabel('Confirm password').fill('ResearchPhase3!')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await navigate(page, 'Paper library')
  await page.getByLabel('Choose PDF file').setInputFiles('../backend/sample_ai_research.pdf')
  await expect(page.getByText('Ready to explore', { exact: true }).first()).toBeVisible({
    timeout: 120000,
  })
  await page
    .getByRole('link', { name: /^Chat about/ })
    .first()
    .click()
  await page
    .getByRole('textbox', { name: 'Your question' })
    .fill('Explain how artificial intelligence improves STEM education through adaptive learning systems, intelligent tutoring systems, automated assessment and personalized learning. Cite the relevant pages.')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.getByRole('article', { name: 'ResearchMate answer' })).toContainText(/\w{10}/, {
    timeout: 120000,
  })
  await expect(page.getByRole('button', { name: 'Stop response' })).toHaveCount(0, {
    timeout: 120000,
  })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Sources', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sources', exact: true })).toBeVisible()
  await navigate(page, 'Settings')
  await page.getByRole('button', { name: 'Log out of ResearchMate' }).click()
  await expect(page).toHaveURL(/\/login/)
})

async function checkAccessibility(page: Page) {
  await expect(page.locator('#main-content > div')).toHaveCSS('opacity', '1')
  const result = await new AxeBuilder({ page }).analyze()
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({ target: node.target, failure: node.failureSummary })),
    })),
  ).toEqual([])
}

test('upload progress, server rejection and retry (controlled API)', async ({ page }) => {
  await mockAPI(page, { empty: true })
  let release: (() => void) | undefined
  let attempts = 0
  await page.route('**/api/v1/documents/upload', async (route) => {
    attempts++
    if (attempts === 1) {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Storage temporarily unavailable. Try again.' }),
      })
    } else await route.fallback()
  })
  await signIn(page)
  await navigate(page, 'Paper library')
  const transfer = await page.evaluateHandle((bytes) => {
    const data = new DataTransfer()
    data.items.add(new File([new Uint8Array(bytes)], 'paper.pdf', { type: 'application/pdf' }))
    return data
  }, [...pdf])
  await page.locator('.upload-zone').dispatchEvent('drop', { dataTransfer: transfer })
  await transfer.dispose()
  await expect(page.getByRole('progressbar', { name: 'File upload' })).toBeVisible()
  release?.()
  await expect(page.getByRole('alert')).toContainText('Storage temporarily unavailable')
  await page.getByRole('button', { name: 'Retry upload' }).click()
  await expect(page.getByRole('button', { name: paper.title, exact: true })).toBeVisible()
})

test('partial answers appear while streaming and can be stopped (controlled stream)', async ({
  page,
}) => {
  await mockAPI(page)
  await page.addInitScript(() => {
    const original = window.fetch
    window.fetch = async (input, options) => {
      if (!String(input).endsWith('/chat/stream')) return original(input, options)
      const encoder = new TextEncoder()
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"type":"session","session_id":1}\n\ndata: {"type":"answer","content":"The first finding is visible."}\n\n',
            ),
          )
          const timer = window.setTimeout(() => {
            controller.enqueue(encoder.encode('data: {"type":"complete"}\n\n'))
            controller.close()
          }, 10000)
          options?.signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(timer)
              controller.error(new DOMException('Aborted', 'AbortError'))
            },
            { once: true },
          )
        },
      })
      return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
    }
  })
  await signIn(page)
  await navigate(page, 'Research chat')
  await page.getByRole('textbox', { name: 'Your question' }).fill('Explain the first finding')
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.getByRole('article', { name: 'ResearchMate answer' })).toContainText(
    'The first finding is visible.',
  )
  await expect(page.getByRole('button', { name: 'Stop response' })).toBeVisible()
  await page.getByRole('button', { name: 'Stop response' }).click()
  await expect(page.getByRole('alert')).toContainText('partial answer is incomplete')
  await expect(page.getByRole('textbox', { name: 'Your question' })).toHaveValue(
    'Explain the first finding',
  )
  await expect(page.getByRole('button', { name: 'Send question' })).toBeEnabled()
})
