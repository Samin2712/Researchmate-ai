import { test, expect, type Page } from '@playwright/test'

const makeToken = () =>
  `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`
async function profile(page: Page, provider: 'google' | 'password') {
  await page.addInitScript(
    (token) => localStorage.setItem('researchmate.token', token),
    makeToken(),
  )
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/change-password')) {
      const data = route.request().postDataJSON()
      return route.fulfill({
        json:
          data.current_password === 'old-password'
            ? { message: 'Password changed. Sign in again with your new password.' }
            : { detail: 'Current password is incorrect.' },
        status: data.current_password === 'old-password' ? 200 : 400,
      })
    }
    if (path.endsWith('/providers')) return route.fulfill({ json: { google_client_id: null } })
    return route.fulfill({
      json: {
        id: 1,
        email: 'ada@example.com',
        full_name: 'Ada',
        is_active: true,
        created_at: '2026-11-13T10:00:00Z',
        auth_provider: provider,
      },
    })
  })
  await page.goto('/profile')
}

test('forgot password sends email address and displays a generic confirmation', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/providers', (route) =>
    route.fulfill({ json: { google_client_id: null } }),
  )
  await page.route('**/api/v1/auth/forgot-password', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: 'ada@example.com' })
    return route.fulfill({
      json: {
        message:
          'If an eligible email/password account exists, a password reset link will be emailed to you.',
      },
    })
  })
  await page.goto('/login')
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await page.getByLabel('Email address').fill('ada@example.com')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByRole('status')).toContainText('If an eligible')
  await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible()
})

test('reset link keeps token out of URL and validates matching passwords', async ({ page }, testInfo) => {
  await page.route('**/api/v1/auth/reset-password', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      token: 'one-time-secret',
      new_password: 'new-password',
    })
    return route.fulfill({ json: { message: 'Password reset. Sign in with your new password.' } })
  })
  await page.goto('/reset-password#token=one-time-secret')
  await expect(page).toHaveURL(/\/reset-password$/)
  await page.getByLabel('New password', { exact: true }).fill('new-password')
  await page.getByLabel('Confirm new password').fill('mismatch')
  await page.getByRole('button', { name: 'Reset password' }).click()
  await expect(page.getByRole('alert')).toHaveText('The passwords do not match.')
  await page.getByLabel('Confirm new password').fill('new-password')
  await page.screenshot({ path: testInfo.outputPath('reset-password.png'), fullPage: true })
  await page.getByRole('button', { name: 'Reset password' }).click()
  await expect(page.getByRole('status')).toContainText('Password reset.')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('missing and expired reset links offer recovery', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page.getByRole('alert')).toContainText('missing or invalid')
  await page.route('**/api/v1/auth/reset-password', (route) =>
    route.fulfill({
      status: 400,
      json: { detail: 'This reset link is invalid or expired. Request a new link.' },
    }),
  )
  await page.goto('/reset-password#token=expired-secret')
  await page.getByLabel('New password', { exact: true }).fill('new-password')
  await page.getByLabel('Confirm new password').fill('new-password')
  await page.getByRole('button', { name: 'Reset password' }).click()
  await expect(page.getByRole('alert')).toContainText('invalid or expired')
  await expect(page.getByRole('link', { name: 'Request a new reset link' })).toBeVisible()
})

test('profile password change handles wrong current password then logs out', async ({ page }) => {
  await profile(page, 'password')
  await page.getByLabel('Current password', { exact: true }).fill('wrong-password')
  await page.getByLabel('New password', { exact: true }).fill('new-password')
  await page.getByLabel('Confirm new password').fill('new-password')
  await page.getByRole('button', { name: 'Change password', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Current password is incorrect.')
  await page.getByLabel('Current password', { exact: true }).fill('old-password')
  await page.getByRole('button', { name: 'Change password', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => localStorage.getItem('researchmate.token'))).toBeNull()
})

test('Google profile directs password management to Google', async ({ page }) => {
  await profile(page, 'google')
  await expect(page.getByRole('heading', { name: 'Sign-in method' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Change password' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Google account security' })).toHaveAttribute(
    'href',
    'https://myaccount.google.com/security',
  )
})

test('Google button exchanges credential and opens the existing workspace', async ({ page }) => {
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
    window.google = { accounts: { id: {
      initialize(options) { window.googleCallback = options.callback },
      renderButton(element) { const button = document.createElement('button'); button.textContent = 'Continue with Google';
        button.onclick = () => window.googleCallback({credential: 'google-signed-credential'}); element.appendChild(button); }
    } } };
  `,
    }),
  )
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/providers'))
      return route.fulfill({ json: { google_client_id: 'test-client-id' } })
    if (path.endsWith('/google')) {
      expect(route.request().postDataJSON()).toEqual({ credential: 'google-signed-credential' })
      return route.fulfill({ json: { access_token: makeToken() } })
    }
    if (path.endsWith('/me'))
      return route.fulfill({
        json: {
          id: 1,
          email: 'ada@example.com',
          full_name: 'Ada',
          is_active: true,
          created_at: '2026-11-13T10:00:00Z',
          auth_provider: 'google',
        },
      })
    return route.fulfill({ json: [] })
  })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page).toHaveURL('/')
  expect(await page.evaluate(() => localStorage.getItem('researchmate.token'))).toBeTruthy()
})
