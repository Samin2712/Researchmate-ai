import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const stamp = '2026-11-24T10:00:00Z'
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`
const collectionName = 'Longitudinal evidence and community healthcare replication studies'
const paper = {
  id: 1,
  user_id: 1,
  title: 'Community healthcare replication',
  authors: 'Alice Morgan and Ben Smith',
  year: 2025,
  status: 'completed',
  created_at: stamp,
  page_count: 12,
  abstract: 'Evidence from a multi-center replication study.',
  collection_ids: [1],
  tag_ids: [],
}

async function setup(page: Page, empty = false) {
  await page.addInitScript((value) => localStorage.setItem('researchmate.token', value), token)
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/auth/me')
      return json({
        id: 1,
        full_name: 'Alice Morgan',
        email: 'alice@example.com',
        is_active: true,
        created_at: stamp,
      })
    if (path === '/documents')
      return json({
        documents: empty
          ? []
          : [
              paper,
              {
                ...paper,
                id: 2,
                title: 'A paper needing review',
                status: 'failed',
                error_message: 'This PDF needs processing again.',
              },
            ],
        total: empty ? 0 : 2,
      })
    if (path === '/collections' && route.request().method() === 'POST')
      return json({ detail: 'Collection could not be saved. Please try again.' }, 503)
    if (path === '/collections')
      return json([{ id: 1, name: collectionName, document_count: 1, created_at: stamp }])
    if (path === '/collections/1/documents') return json([paper])
    if (path === '/collections/2/documents') return json([])
    if (path === '/chat/sessions')
      return json(
        empty ? [] : [{ id: 1, title: 'How reliable are these findings?', created_at: stamp }],
      )
    if (path === '/tags' || path.startsWith('/analysis')) return json([])
    return json({ detail: 'Not found' }, 404)
  })
}

async function accessible(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(result.violations).toEqual([])
}

for (const width of [390, 768, 1440]) {
  test(`research workspace at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await setup(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Continue your research' })).toBeVisible()
    await expect(page.locator('.workspace-banner')).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'How reliable are these findings?' }),
    ).toHaveAttribute('href', '/chat?session=1')
    await expect(page.getByRole('link', { name: /A paper needing review/ })).toHaveAttribute(
      'href',
      '/library?document=2',
    )
    await accessible(page)
    await page.screenshot({ path: info.outputPath(`dashboard-${width}.png`), fullPage: true })
    await page.getByRole('link', { name: /Compare papers/ }).click()
    await expect(page).toHaveURL(/mode=comparison/)
    await page.goto('/analysis')
    await expect(page.getByRole('heading', { name: 'Compare papers' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Find research gaps' })).toBeVisible()
    await accessible(page)
    await page.screenshot({ path: info.outputPath(`analysis-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: /Find research gaps/ }).click()
    await expect(page).toHaveURL(/mode=gap_analysis/)
    await page.goto('/library')
    const toggle = page.getByRole('button', { name: /collections$/, exact: false })
    if (width <= 768) await toggle.click()
    const collection = page
      .getByRole('navigation', { name: 'Collections' })
      .getByRole('button', { name: new RegExp(collectionName) })
      .first()
    await expect(collection).toHaveAttribute('title', collectionName)
    await collection.click()
    await expect(page).toHaveURL(/collection=1/)
    await page.getByLabel('Search papers').fill('Community')
    await page.getByRole('button', { name: 'List', exact: true }).click()
    await expect(page.locator('.document-list .document-card')).toHaveCount(1)
    await page.getByRole('checkbox', { name: `Select ${paper.title}`, exact: true }).check()
    await expect(page.getByRole('toolbar', { name: 'Bulk actions' })).toBeVisible()
    await page.getByRole('button', { name: 'Hide collections' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('navigation', { name: 'Collections' })).toBeHidden()
    await expect(page).toHaveURL(/collection=1/)
    await accessible(page)
    await page.screenshot({ path: info.outputPath(`library-list-${width}.png`), fullPage: true })
    await page.reload()
    await expect(page.getByLabel('Search papers')).toHaveValue('Community')
    await expect(page.getByRole('button', { name: 'List', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: paper.title, exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Paper details' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Cards', exact: true }).click()
    await expect(page.locator('.document-grid .document-card')).toHaveCount(1)
    await accessible(page)
    await page.screenshot({ path: info.outputPath(`library-cards-${width}.png`), fullPage: true })
    // Queue multiple failures through a real UI action. Errors persist and only one is shown.
    if (await page.getByRole('button', { name: 'Show collections' }).isVisible())
      await page.getByRole('button', { name: 'Show collections' }).click()
    await page.getByRole('button', { name: 'New collection', exact: true }).click()
    await page.getByLabel('New collection name').fill('A new collection')
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
    }
    await expect(page.locator('.toast')).toHaveCount(1)
    await expect(page.locator('.toast')).toContainText('2 more')
    const toast = await page.locator('.toast-stack').boundingBox()
    const content = await page.locator('#main-content').boundingBox()
    expect(toast!.y + toast!.height).toBeLessThanOrEqual(content!.y + 1)
    await accessible(page)
    await page.screenshot({ path: info.outputPath(`notifications-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Dismiss notification' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.toast')).toContainText('1 more')
  })
}

test('new researchers retain onboarding and dashboard gap shortcut', async ({ page }) => {
  await setup(page, true)
  await page.goto('/')
  await expect(page.locator('.workspace-banner')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Add your first paper' })).toHaveAttribute(
    'href',
    '/library?upload=1',
  )
  await page.getByRole('link', { name: /Find research gaps/ }).click()
  await expect(page).toHaveURL(/mode=gap_analysis/)
})

test('success feedback pauses for keyboard and pointer users; errors persist', async ({ page }) => {
  await setup(page)
  await page.clock.install()
  await page.goto('/library')
  if (await page.getByRole('button', { name: 'Show collections' }).isVisible())
    await page.getByRole('button', { name: 'Show collections' }).click()
  await page.route('**/api/v1/collections', async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    return route.fulfill({ json: { id: 2, name: 'Saved collection', document_count: 0, created_at: stamp } })
  })
  await page.getByRole('button', { name: 'New collection', exact: true }).click()
  await page.getByLabel('New collection name').fill('Saved collection')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  const notification = page.locator('.toast')
  await expect(notification).toContainText('created')
  await page.getByRole('button', { name: 'Dismiss notification' }).focus()
  await page.clock.fastForward(15000)
  await expect(notification).toBeVisible()
  await page.getByLabel('Search papers').focus()
  await notification.hover()
  await page.clock.fastForward(15000)
  await expect(notification).toBeVisible()
  await page.getByLabel('Search papers').hover()
  await page.clock.fastForward(9000)
  await expect(notification).toHaveCount(0)
  await page.unroute('**/api/v1/collections')
  // The shared API fixture returns failures for later saves.
  await page.getByRole('button', { name: 'New collection', exact: true }).click()
  await page.getByLabel('New collection name').fill('Another collection')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(notification).toHaveClass(/error/)
  await page.clock.fastForward(60000)
  await expect(notification).toBeVisible()
})
