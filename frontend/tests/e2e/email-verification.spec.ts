import { test, expect } from '@playwright/test'

test('registration requires email verification before sign-in and supports resending', async ({
  page,
}) => {
  let loginCalls = 0
  await page.route('**/api/v1/auth/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/providers')) return route.fulfill({ json: { google_client_id: null } })
    if (path.endsWith('/register'))
      return route.fulfill({
        status: 201,
        json: {
          id: 1,
          email: 'new@example.com',
          full_name: 'New User',
          is_active: true,
          email_verified: false,
        },
      })
    if (path.endsWith('/resend-verification')) {
      expect(route.request().postDataJSON()).toEqual({ email: 'new@example.com' })
      return route.fulfill({
        json: {
          message: 'If an account needs verification, a new link has been submitted for sending.',
        },
      })
    }
    loginCalls++
    return route.fulfill({
      status: 403,
      json: { detail: 'Verify your email address before signing in.' },
    })
  })
  await page.goto('/register')
  await page.getByLabel('Full name').fill('New User')
  await page.getByLabel('Email address').fill('new@example.com')
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByLabel('Confirm password').fill('password123')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible()
  expect(loginCalls).toBe(0)
  expect(await page.evaluate(() => localStorage.getItem('researchmate.token'))).toBeNull()
  await expect(page.getByLabel('Email address')).toHaveValue('new@example.com')
  await page.getByRole('button', { name: 'Resend verification email' }).click()
  await expect(page.getByRole('status')).toContainText('submitted for sending')
})

test('verification requires a click and removes the secret from the URL', async ({
  page,
}, testInfo) => {
  let verificationCalls = 0
  await page.route('**/api/v1/auth/verify-email', (route) => {
    verificationCalls++
    expect(route.request().postDataJSON()).toEqual({ token: 'one-time-verification-token' })
    return route.fulfill({ json: { message: 'Email verified. You can now sign in.' } })
  })
  await page.goto('/verify-email#token=one-time-verification-token')
  await expect(page.getByRole('button', { name: 'Verify email address' })).toBeVisible()
  await expect(page).toHaveURL(/\/verify-email$/)
  expect(verificationCalls).toBe(0)
  await page.screenshot({ path: testInfo.outputPath('verify-email.png'), fullPage: true })
  await page.getByRole('button', { name: 'Verify email address' }).click()
  await expect(page.getByRole('status')).toContainText('Email verified.')
  await expect(page.getByRole('button', { name: 'Verify email address' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible()
  expect(verificationCalls).toBe(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('expired verification offers resend and displays mail-service failures', async ({ page }) => {
  await page.route('**/api/v1/auth/verify-email', (route) =>
    route.fulfill({
      status: 400,
      json: { detail: 'This verification link is invalid or expired. Request a new one.' },
    }),
  )
  await page.route('**/api/v1/auth/resend-verification', (route) =>
    route.fulfill({
      status: 503,
      json: { detail: 'The verification email could not be sent. Please try again later.' },
    }),
  )
  await page.goto('/verify-email#token=expired-token')
  await page.getByRole('button', { name: 'Verify email address' }).click()
  await expect(page.getByRole('alert')).toContainText('invalid or expired')
  await page.getByLabel('Email address').fill('new@example.com')
  await page.getByRole('button', { name: 'Resend verification email' }).click()
  await expect(page.getByRole('alert')).toContainText('could not be sent')
})
