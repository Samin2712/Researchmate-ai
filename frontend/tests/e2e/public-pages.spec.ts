import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('public homepage describes the app and links to public policies without signing in', async ({
  page,
}, testInfo) => {
  let privateRequests = 0
  await page.route('**/api/v1/**', (route) => {
    privateRequests++
    return route.abort()
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Your papers.A clearer perspective.',
  )
  await expect(page.getByRole('link', { name: 'Create your workspace' })).toHaveAttribute(
    'href',
    '/register',
  )
  await page.getByRole('link', { name: 'Privacy policy', exact: true }).click()
  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy policy')
  await expect(
    page.getByRole('heading', { name: 'Google sign-in and Gmail permissions' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'AI processing and service providers' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy policy')
  expect(privateRequests).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: testInfo.outputPath('privacy.png'), fullPage: true })
})

test('terms are public, readable, linked to privacy, and accessible', async ({
  page,
}, testInfo) => {
  await page.goto('/terms')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms of service')
  await expect(page.getByRole('heading', { name: 'Your content and permissions' })).toBeVisible()
  await expect(
    page.locator('article').getByRole('link', { name: 'Privacy policy' }),
  ).toHaveAttribute('href', '/privacy')
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(accessibility.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: testInfo.outputPath('terms.png'), fullPage: true })
})

test('homepage is accessible and policies stay linked from sign-in', async ({ page }, testInfo) => {
  await page.route('**/api/v1/auth/providers', (route) =>
    route.fulfill({ json: { google_client_id: null } }),
  )
  await page.goto('/')
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(accessibility.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true })
  await page.getByRole('link', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Privacy policy', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Terms of service', exact: true })).toBeVisible()
})
