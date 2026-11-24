import { test, expect } from '@playwright/test'

test('personal provider lifecycle keeps keys masked and out of browser storage', async ({ page }) => {
  const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`
  await page.addInitScript((value) => localStorage.setItem('researchmate.token', value), token)
  const state = {
    selected: 'default', available: true,
    models: { gemini: 'gemini-2.5-flash', openai: 'gpt-4o-mini', anthropic: 'claude-haiku-4-5' },
    connections: [] as { provider: string; status: string; verified_at: string }[],
  }
  let verifications = 0
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/auth/me') return json({ id: 1, full_name: 'Ada', email: 'ada@example.com', created_at: '2026-11-01', is_active: true })
    if (path === '/ai-providers/verify') {
      verifications++
      expect(request.postDataJSON().api_key).toContain('test-private')
      return json({ status: 'verified', message: 'Connection verified. Save to keep this key.', verification_token: 'test-receipt' })
    }
    if (path === '/ai-providers/connection') {
      expect(request.postDataJSON().verification_token).toBe('test-receipt')
      state.connections = [{ provider: request.postDataJSON().provider, status: 'verified', verified_at: '2026-11-24T10:00:00Z' }]
    }
    if (path === '/ai-providers/selection') state.selected = request.postDataJSON().provider
    if (path === '/ai-providers/gemini' && request.method() === 'DELETE') {
      state.connections = []; state.selected = 'default'
    }
    return json(state)
  })
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: /AI providers/ })).toBeVisible()
  await expect(page.getByText(/may incur a small charge/)).toBeVisible()
  await expect(page.getByText(/billed to your provider account/)).toBeVisible()
  await expect(page.getByLabel('AI for chat and analysis')).toHaveValue('default')
  const input = page.locator('#ai-key')
  await expect(input).toHaveAttribute('type', 'password')
  await input.fill('test-private-key-one')
  await page.getByRole('button', { name: 'Verify connection' }).click()
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
  await input.fill('test-private-key-edited')
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Verify connection' }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(input).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Replace', exact: true })).toBeDisabled()
  await page.getByLabel('AI for chat and analysis').selectOption('gemini')
  await expect(page.getByLabel('AI for chat and analysis')).toHaveValue('gemini')
  await input.fill('test-private-key-replacement')
  await page.getByRole('button', { name: 'Verify connection' }).click()
  await page.getByRole('button', { name: 'Replace', exact: true }).click()
  await expect(input).toHaveValue('')
  await page.reload()
  await expect(page.getByLabel('AI for chat and analysis')).toHaveValue('gemini')
  await expect(input).toHaveValue('')
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('test-private')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/ai-providers-${page.viewportSize()?.width}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(page.getByLabel('AI for chat and analysis')).toHaveValue('default')
  await expect(page.getByText('Not connected', { exact: true })).toBeVisible()
  expect(verifications).toBe(3)
})

test('failed verification explains the error and keeps Save disabled', async ({ page }) => {
  const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`
  await page.addInitScript((value) => localStorage.setItem('researchmate.token', value), token)
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const body = path.endsWith('/auth/me')
      ? { id: 1, full_name: 'Ada', email: 'ada@example.com', created_at: '2026-11-01' }
      : path.endsWith('/verify') ? { status: 'failed', message: 'Invalid API key. Check the key or replace it in Settings.' }
        : { selected: 'default', available: true, models: { gemini: 'gemini-2.5-flash' }, connections: [] }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.goto('/settings')
  await page.locator('#ai-key').fill('invalid-private-key')
  await page.getByRole('button', { name: 'Verify connection' }).click()
  await expect(page.getByRole('alert')).toContainText('Invalid API key')
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
})
