import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const stamp = '2026-11-16T00:00:00'
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`

const paper1 = {
  id: 1,
  user_id: 1,
  title: 'Cognitive Accuracy in Longitudinal Cohorts',
  authors: 'Dr. Jane Doe, Dr. John Smith',
  year: 2024,
  abstract: 'A randomized controlled trial investigating cognitive intervention accuracy.',
  status: 'completed',
  content_hash: 'rev123',
  created_at: stamp,
}

const starterQuestionsFixture = {
  id: 1,
  document_id: 1,
  status: 'ready',
  document_revision: 'rev123',
  prompt_version: 'v1',
  questions: [
    {
      category: 'comprehension',
      question: 'What is the primary cognitive accuracy improvement reported?',
      evidence_quotes: ['Accuracy increased by 5 percentage points (p < 0.05).'],
      page_numbers: [1],
    },
    {
      category: 'methodology',
      question: 'How did the double-blind trial design control for participant variance?',
      evidence_quotes: ['Randomized trial with 40 adults.'],
      page_numbers: [2],
    },
    {
      category: 'critical_thinking',
      question: 'How does the single-site cohort constraint limit demographic inference?',
      evidence_quotes: ['Limitation: single-site trial.'],
      page_numbers: [3],
    },
  ],
}

test('upload processing finishes before showing grounded starter questions', async ({ page }) => {
  let uploaded = false
  let reads = 0
  let questionReads = 0
  await page.addInitScript((t) => localStorage.setItem('researchmate.token', t), token)
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/auth/me') return json({ id: 1, full_name: 'Researcher', email: 'test@example.com' })
    if (path === '/documents/upload') {
      uploaded = true
      return json({ ...paper1, status: 'processing' }, 201)
    }
    if (path === '/documents') return json({ documents: uploaded ? [{ ...paper1, status: ++reads < 2 ? 'processing' : 'completed' }] : [], total: uploaded ? 1 : 0 })
    if (path === '/documents/1/questions') {
      expect(reads).toBeGreaterThanOrEqual(2)
      questionReads++
      return json(starterQuestionsFixture)
    }
    return json([])
  })
  await page.goto('/library')
  await page.getByLabel('Choose PDF file').setInputFiles({ name: 'study.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') })
  await expect(page.getByText('Processing your paper. Starter questions will appear when it is ready.')).toBeVisible()
  const question = page.getByRole('button', { name: /What is the primary cognitive accuracy improvement reported/ })
  await expect(question).toBeVisible({ timeout: 15000 })
  await question.click()
  await expect(page).toHaveURL(/\/chat\?document=1/)
  await expect(page.locator('#chat-message')).toHaveValue('What is the primary cognitive accuracy improvement reported?')
  expect(questionReads).toBe(1)
})

test('learning assistance: starter questions, simple explanation mode, terminology and accessibility', async ({ page }, info) => {
  test.setTimeout(90000)

  let chatSession: Record<string, unknown> = {
    id: 101,
    user_id: 1,
    title: 'Cognitive Accuracy in Longitudinal Cohorts',
    created_at: stamp,
    messages: [],
  }

  let userProfile: Record<string, unknown> = {
    id: 1,
    email: 'researcher@example.com',
    full_name: 'Dr. Researcher',
    is_active: true,
    created_at: stamp,
    default_explanation_mode: 'standard',
  }

  await page.addInitScript((t) => localStorage.setItem('researchmate.token', t), token)

  await page.route('**/api/v1/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace('/api/v1', '')

    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (path === '/auth/me') {
      if (req.method() === 'PATCH') {
        const data = req.postDataJSON()
        userProfile = { ...userProfile, ...data }
        return json(userProfile)
      }
      return json(userProfile)
    }

    if (path === '/documents') {
      return json({ documents: [paper1], total: 1 })
    }

    if (path === '/documents/1/questions') {
      return json(starterQuestionsFixture)
    }

    if (path === '/documents/1/questions/regenerate') {
      return json(starterQuestionsFixture)
    }

    if (path === '/chat/sessions') {
      return json(chatSession.messages && (chatSession.messages as unknown[]).length ? [chatSession] : [])
    }

    if (path === '/chat/sessions/101') {
      return json(chatSession)
    }

    if (path === '/chat/explain-term' || path === '/documents/1/explain-term') {
      const data = req.postDataJSON()
      const isSVM = data.term.toLowerCase().includes('accuracy') || data.term.toLowerCase().includes('svm')
      if (isSVM) {
        return json({
          term: data.term,
          document_id: 1,
          explanation: 'Accuracy indicates the proportion of correct classifications achieved by the model.',
          grounded_in_paper: true,
          status: 'grounded',
          source_quote: 'Accuracy increased by 5 percentage points.',
          page_number: 1,
        })
      } else {
        return json({
          term: data.term,
          document_id: 1,
          explanation: 'General scientific definition: A hypothetical physical or computational construct.',
          grounded_in_paper: false,
          status: 'general',
          source_quote: null,
          page_number: null,
        })
      }
    }

    if (path === '/chat/stream') {
      const data = req.postDataJSON()
      const mode = data.explanation_mode || 'standard'
      const isSimple = mode === 'simple'

      const assistantMsg = {
        id: 2,
        session_id: 101,
        role: 'assistant',
        content: isSimple
          ? 'Here is an accessible explanation: The researchers found that accuracy improved by 5 percentage points (p < 0.05) [Page 1]. *Analogy:* Imagine training a tennis player with targeted practice drills.'
          : 'Analysis indicates cognitive accuracy improved by 5 percentage points (p < 0.05) under randomized conditions [Page 1].',
        explanation_mode: mode,
        confidence_score: 95,
        sources: [
          {
            document_id: 1,
            title: paper1.title,
            page_number: 1,
            chunk_text: 'Accuracy increased by 5 percentage points (p < 0.05).',
          },
        ],
        created_at: stamp,
      }

      chatSession = {
        ...chatSession,
        messages: [
          {
            id: 1,
            session_id: 101,
            role: 'user',
            content: data.message,
            explanation_mode: mode,
            created_at: stamp,
          },
          assistantMsg,
        ],
      }

      const events = [
        `data: ${JSON.stringify({ type: 'session', session_id: 101 })}\n\n`,
        `data: ${JSON.stringify({ type: 'metadata', chunks_retrieved: 1, confidence: 0.95, explanation_mode: mode })}\n\n`,
        `data: ${JSON.stringify({ type: 'answer', content: assistantMsg.content })}\n\n`,
        `data: ${JSON.stringify({ type: 'sources', sources: assistantMsg.sources, confidence: 0.95 })}\n\n`,
        `data: ${JSON.stringify({ type: 'complete' })}\n\n`,
      ]

      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: events.join(''),
      })
    }

    if (path === '/collections' || path === '/tags' || path === '/evidence-notes') {
      return json([])
    }

    return json({ detail: 'Not mocked' }, 404)
  })

  // 1. Visit Library and check Paper Details modal with Starter Questions
  await page.goto('/library')
  await expect(page.getByText('Cognitive Accuracy in Longitudinal Cohorts').first()).toBeVisible()

  // Click document title to open Paper details modal
  await page.getByRole('button', { name: 'Cognitive Accuracy in Longitudinal Cohorts', exact: true }).click()
  await expect(page.getByText('Paper-specific starter questions')).toBeVisible()
  await expect(page.getByText('What is the primary cognitive accuracy improvement reported?')).toBeVisible()
  await expect(page.getByText('How did the double-blind trial design control for participant variance?')).toBeVisible()
  await expect(page.getByText('How does the single-site cohort constraint limit demographic inference?')).toBeVisible()

  // 2. Click the comprehension question -> Opens Chat scoped to paper with editable draft
  await page.getByText('What is the primary cognitive accuracy improvement reported?').click()
  await expect(page).toHaveURL(/\/chat\?document=1/)

  // Confirm input draft is prefilled and editable
  const textarea = page.locator('#chat-message')
  await expect(textarea).toHaveValue('What is the primary cognitive accuracy improvement reported?')

  // 3. Switch mode to "Explain simply"
  const simpleModeBtn = page.getByRole('radio', { name: /Explain simply/i })
  await expect(simpleModeBtn).toBeVisible()
  await simpleModeBtn.click()
  await expect(simpleModeBtn).toHaveAttribute('aria-checked', 'true')

  // Submit question
  await page.getByRole('button', { name: 'Send question' }).click()

  // 4. Verify assistant response, simple mode badge, and exact numerical preservation
  await expect(page.locator('.mode-badge.simple')).toBeVisible()
  await expect(page.getByText('5 percentage points').first()).toBeVisible()
  await expect(page.getByText('Analogy:').first()).toBeVisible()

  // 5. Test Terminology Help interaction
  await page.getByRole('button', { name: /Explain term/i }).first().click()
  await expect(page.getByRole('dialog', { name: 'Explain this term' })).toBeVisible()

  // Look up term "accuracy"
  await page.locator('#term-input').fill('accuracy')
  await page.getByRole('button', { name: 'Look up term explanation' }).click()

  await expect(page.getByText('Grounded in paper')).toBeVisible()
  await expect(page.getByText('Accuracy indicates the proportion of correct classifications')).toBeVisible()

  // Close terminology modal with Escape
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Explain this term' })).toBeHidden()

  // 6. Reload and verify mode / history persistence
  await page.reload()
  await expect(page.locator('.mode-badge.simple')).toBeVisible()
  await expect(page.getByRole('radio', { name: /Explain simply/i })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('5 percentage points').first()).toBeVisible()

  // Accessibility check
  const axeResults = await new AxeBuilder({ page }).include('.chat-interface').analyze()
  expect(axeResults.violations).toEqual([])

  // Responsive viewports: 390px, 768px, 1440px
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }

  // Capture screenshot
  await page.screenshot({ path: info.outputPath('learning-assistance-chat.png'), fullPage: true })
})

test('provider-unavailable fallback and keyboard/reduced-motion behavior', async ({ page }, info) => {
  test.setTimeout(60000)

  let streamFail = true
  await page.addInitScript((t) => localStorage.setItem('researchmate.token', t), token)
  await page.emulateMedia({ reducedMotion: 'reduce' })

  await page.route('**/api/v1/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace('/api/v1', '')
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (path === '/auth/me') {
      return json({ id: 1, email: 'researcher@example.com', full_name: 'Dr. Researcher', default_explanation_mode: 'standard' })
    }
    if (path === '/documents') {
      return json({ documents: [paper1], total: 1 })
    }
    if (path === '/chat/sessions') {
      return json([])
    }
    if (path.startsWith('/chat/sessions/')) {
      return json({
        id: 102,
        user_id: 1,
        title: 'Testing provider failure fallback',
        created_at: stamp,
        messages: [
          { id: 1, session_id: 102, role: 'user', content: 'Testing provider failure fallback', created_at: stamp },
          { id: 2, session_id: 102, role: 'assistant', content: 'Recovered answer.', created_at: stamp },
        ],
      })
    }
    if (path === '/chat/stream') {
      if (streamFail) {
        return route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'The AI provider could not answer. Check provider connectivity and try again.' }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: {"type":"session","session_id":102}\n\ndata: {"type":"answer","content":"Recovered answer."}\n\ndata: {"type":"complete"}\n\n`,
      })
    }
    return json({ detail: 'Not mocked' }, 404)
  })

  await page.goto('/chat?document=1')

  // Verify reduced-motion doesn't break rendering
  const textarea = page.locator('#chat-message')
  await textarea.fill('Testing provider failure fallback')

  // Keyboard navigation: switch to Explain simply with keyboard
  const standardRadio = page.getByRole('radio', { name: 'Standard' })
  await expect(standardRadio).toHaveAttribute('aria-checked', 'true')
  const simpleRadio = page.getByRole('radio', { name: /Explain simply/i })
  await simpleRadio.focus()
  await page.keyboard.press('Enter')
  await expect(simpleRadio).toHaveAttribute('aria-checked', 'true')

  // Submit
  await page.getByRole('button', { name: 'Send question' }).click()

  // Truthful error state displayed, no silent fake answers
  await expect(page.getByText('The AI provider could not answer')).toBeVisible()

  // User input preserved in textarea so user doesn't lose their draft!
  await expect(textarea).toHaveValue('Testing provider failure fallback')

  // Retry after provider recovers
  streamFail = false
  await page.getByRole('button', { name: 'Send question' }).click()
  await expect(page.getByText('Recovered answer.')).toBeVisible()

  await page.screenshot({ path: info.outputPath('provider-fallback-recovery.png') })
})
