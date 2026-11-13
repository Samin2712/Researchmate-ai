import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('edit profile, upload/remove photo, restore saved fields, and log out', async ({
  page,
}, testInfo) => {
  let user = {
    id: 1,
    email: 'ada@example.com',
    full_name: 'Ada Researcher',
    is_active: true,
    created_at: '2026-11-13T10:00:00Z',
    institution: '',
    bio: '',
    research_interests: '',
    avatar_url: null as string | null,
  }
  const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`
  await page.addInitScript((value) => localStorage.setItem('researchmate.token', value), token)
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    const method = route.request().method()
    if (method === 'OPTIONS') return route.fulfill({ status: 204 })
    if (path === '/auth/me' && method === 'PATCH')
      user = { ...user, ...route.request().postDataJSON() }
    if (path === '/auth/me/photo') {
      if (method === 'POST') {
        expect(route.request().headers()['content-type']).toContain('multipart/form-data')
        user.avatar_url =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XkAAAAASUVORK5CYII='
      } else if (method === 'DELETE') user.avatar_url = null
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    })
  })
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible()
  await page.getByLabel('Full name', { exact: true }).fill('Ada Lovelace')
  await page.getByLabel('Institution or organization').fill('STEM Lab')
  await page.getByLabel('Research interests').fill('Natural language processing')
  await page.getByLabel('About you').fill('Researching language models.')
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible()
  await page.getByLabel('Choose profile photo').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XkAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expect(page.getByRole('img', { name: 'Your profile', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Institution or organization')).toHaveValue('STEM Lab')
  await expect(page.getByRole('img', { name: 'Your profile', exact: true })).toBeVisible()
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(accessibility.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: testInfo.outputPath('profile.png'), fullPage: true })
  if (testInfo.project.name === 'chromium') {
    await expect(page.locator('aside').getByRole('button', { name: 'Log out', exact: true })).toBeInViewport()
  }
  await page.getByRole('button', { name: 'Remove photo' }).click()
  await expect(page.getByRole('img', { name: 'Your profile', exact: true })).toHaveCount(0)
  await page.locator('main').getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => localStorage.getItem('researchmate.token'))).toBeNull()
})
