import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

test('collections, metadata, tags and bibliography persist through reload', async ({ page, request }, info) => {
  const api = 'http://127.0.0.1:8000/api/v1'
  const email = `collections-${Date.now()}-${info.project.name}@example.com`
  expect((await request.post(`${api}/auth/register`, { data: { email, password: 'password123', full_name: 'Browser Researcher' } })).status()).toBe(201)
  const login = await request.post(`${api}/auth/login/json`, { data: { email, password: 'password123' } })
  const token = (await login.json()).access_token
  const headers = { Authorization: `Bearer ${token}` }
  const upload = await request.post(`${api}/documents/upload`, {
    headers,
    multipart: { file: { name: 'research.pdf', mimeType: 'application/pdf', buffer: await readFile('../backend/sample_ai_research.pdf') } },
  })
  expect(upload.status()).toBe(201)
  const paper = await upload.json()
  await expect.poll(async () => (await (await request.get(`${api}/documents/${paper.id}`, { headers })).json()).status).toBe('completed')
  await request.patch(`${api}/documents/${paper.id}`, { headers, data: { title: 'Unicode Research & Evidence', authors: 'Jane Smith and Ada Lovelace', year: 2024 } })
  await page.addInitScript((value) => localStorage.setItem('researchmate.token', value), token)
  await page.goto('/library')
  await page.getByRole('button', { name: 'New collection', exact: true }).click()
  await page.getByLabel('New collection name').fill('Evidence review')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page).toHaveURL(/collection=/)
  await page.getByRole('button', { name: 'All papers', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Select Unicode Research & Evidence', exact: true }).check()
  await page.getByRole('button', { name: 'Add to collection', exact: true }).click()
  await page.getByRole('button', { name: /^Evidence review/ }).last().click()
  await page.getByRole('navigation', { name: 'Collections' }).getByRole('button', { name: /^Evidence review/ }).click()
  await expect(page.getByRole('button', { name: 'Unicode Research & Evidence', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Unicode Research & Evidence', exact: true }).click()
  await page.getByRole('button', { name: 'Edit metadata', exact: true }).click()
  await page.getByLabel('Year', { exact: true }).fill('')
  await page.getByLabel('DOI', { exact: false }).fill('10.1000/evidence')
  await page.getByLabel('Journal', { exact: false }).fill('Evidence Journal')
  await page.getByLabel('Ordered authors').fill('García; Jane\nLovelace; Ada')
  await page.getByRole('button', { name: 'Save metadata', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Edit metadata', exact: true })).toBeVisible()
  await page.getByLabel('Citation style').selectOption('BibTeX')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download .bib', exact: true }).click()
  const download = await downloadPromise
  const content = await readFile((await download.path())!, 'utf8')
  expect(content).toContain('García, Jane and Lovelace, Ada')
  expect(content).toContain('10.1000/evidence')
  expect(content).not.toContain('year =')
  expect(content).toContain('\\&')
  await page.getByRole('button', { name: 'Add tag', exact: true }).click()
  await page.getByLabel('New tag name').fill('Reviewed')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Paper details' }).getByRole('button', { name: 'Remove tag Reviewed', exact: true })).toBeVisible()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('citation-editor.png'), fullPage: true })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Paper details' })).not.toBeVisible()
  await page.getByLabel('Filter by tag').selectOption({ label: 'Reviewed' })
  await page.getByLabel('Search papers').fill('Unicode')
  await page.reload()
  await expect(page.getByLabel('Search papers')).toHaveValue('Unicode')
  await expect(page.getByRole('button', { name: 'Unicode Research & Evidence', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('collection-library.png'), fullPage: true })
  const persisted = await (await request.get(`${api}/documents/${paper.id}`, { headers })).json()
  expect(persisted.year).toBeNull()
  expect(persisted.doi).toBe('10.1000/evidence')
  expect(persisted.collection_ids).toHaveLength(1)
})
