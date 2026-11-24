import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

const stamp = '2026-11-15T00:00:00'
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`

const papers = [
  {
    id: 1,
    user_id: 1,
    title: 'Clinical Trial on Cognitive Accuracy',
    authors: 'Dr. Alice Smith',
    status: 'completed',
    created_at: stamp,
  },
  {
    id: 2,
    user_id: 1,
    title: 'Server Latency and Caching Benchmark',
    authors: 'Bob Jones',
    status: 'completed',
    created_at: stamp,
  },
  {
    id: 3,
    user_id: 1,
    title: 'Pediatric Language Study',
    authors: 'Carol Davis',
    status: 'completed',
    created_at: stamp,
  },
]

const ref1 = {
  source_id: 'doc1_chunk1',
  document_id: 1,
  chunk_id: 1,
  page_number: 1,
  page_label: '1',
  quote: 'Accuracy increased by 5 percentage points.',
  title: 'Clinical Trial on Cognitive Accuracy',
}

const ref1_lim = {
  source_id: 'doc1_chunk1',
  document_id: 1,
  chunk_id: 1,
  page_number: 1,
  page_label: '1',
  quote: 'Limitation: single site trial.',
  title: 'Clinical Trial on Cognitive Accuracy',
}

const ref2 = {
  source_id: 'doc2_chunk1',
  document_id: 2,
  chunk_id: 2,
  page_number: 1,
  page_label: '1',
  quote: 'Latency decreased by 5 ms.',
  title: 'Server Latency and Caching Benchmark',
}

test('gap analysis and disagreement explorer end-to-end lifecycle', async ({ page }, info) => {
  test.setTimeout(120000)
  const runs: Record<string, unknown>[] = []
  const briefs: Record<string, unknown>[] = []
  let candidateReviewState: Record<string, unknown> = {}

  await page.addInitScript((t) => localStorage.setItem('researchmate.token', t), token)

  await page.route('**/api/v1/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace('/api/v1', '')

    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (path === '/auth/me') {
      return json({
        id: 1,
        email: 'researcher@example.com',
        full_name: 'Lead Researcher',
        is_active: true,
        created_at: stamp,
      })
    }
    if (path === '/documents') return json({ documents: papers, total: 3 })
    if (path === '/collections' || path === '/tags' || path === '/chat/sessions') return json([])

    if (path === '/analysis/runs' && req.method() === 'POST') {
      const data = req.postDataJSON()
      const id = runs.length + 1

      let result: unknown = null
      if (data.kind === 'gap_analysis') {
        result = {
          analysis_scope: 'Analysis of 2 trial papers',
          warnings: ['Absence from this set does not imply absence from global literature.'],
          coverage: { 1: 'included', 2: 'included' },
          candidates: [
            {
              id: 'gap_1',
              title: 'Multi-center clinical replication required',
              gap_category: 'methodology',
              scope: 'Clinical trial environments',
              gap_source: 'author_stated',
              evidence_basis:
                'Authors explicitly identify limitation to a single testing facility.',
              rationale:
                'Replicating findings across diverse centers is needed before broad adoption.',
              uncertainty: 'Single-center results cannot be assumed generalizable.',
              proposed_research_question:
                'Does the cognitive intervention replicate in community healthcare settings?',
              suggested_search_terms: ['multi-center replication', 'community healthcare'],
              coverage_note: 'Not addressed in these selected papers',
              supporting_quotes: [ref1_lim],
              feasible_project: {
                bounded_question: 'Can public clinic EHR records replicate the 5% accuracy gain?',
                suggested_method: 'Secondary cohort analysis using public anonymized records',
                data_sources: 'PhysioNet / MIMIC open database',
                skills_required: 'Python, pandas, basic statistical inference',
                concrete_steps: [
                  'Extract matched cohort from open dataset',
                  'Calculate standardized mean difference in accuracy',
                  'Compare observed effect to trial report bounds',
                ],
                success_criteria:
                  'Completed analysis report and reproducible script within 1 semester',
                time_budget: '1 semester',
                resource_budget: 'Standard student laptop',
              },
            },
            {
              id: 'gap_2',
              title: 'Pediatric retention curve unstudied',
              gap_category: 'population',
              scope: 'Pediatric developmental cohorts',
              gap_source: 'model_inferred',
              evidence_basis: 'Trial evaluated adult cohorts only; pediatric data not collected.',
              rationale: 'Cognitive developmental differences may significantly alter retention.',
              uncertainty: 'Pediatric papers were not included in the analyzed evidence.',
              proposed_research_question:
                'What is the cognitive decay curve in pediatric participants?',
              suggested_search_terms: ['pediatric retention', 'developmental decay'],
              coverage_note: 'Not found in the analyzed evidence.',
              supporting_quotes: [ref1],
              feasible_project: {
                bounded_question:
                  'How do developmental decay equations predict pediatric retention?',
                suggested_method: 'Computational parameter sweep using literature models',
                data_sources: 'Open Science Framework benchmark archives',
                skills_required: 'Basic scientific computing',
                concrete_steps: [
                  'Code literature mathematical decay models',
                  'Simulate 500 patient trajectories across age brackets',
                  'Document sensitivity bounds',
                ],
                success_criteria: 'Completed simulation notebook and summary write-up',
                time_budget: '8 weeks',
                resource_budget: 'Free cloud computing',
              },
            },
          ],
        }
      } else if (data.kind === 'disagreement') {
        result = {
          themes: ['Latency vs Accuracy Trade-off', 'Long-term Adverse Effects'],
          warnings: [
            'Different populations or measurement contexts are not automatic contradictions.',
          ],
          coverage: { 1: 'included', 2: 'included' },
          relationships: [
            {
              id: 'rel_1',
              relationship_type: 'different_context',
              outcome_theme: 'Latency vs Accuracy Trade-off',
              rationale:
                'Study 1 optimized accuracy in adult clinical trials; Study 2 benchmarked network latency on servers.',
              distinguishing_factors: 'Distinct populations and incompatible measurement metrics',
              left: {
                document_id: 1,
                document_title: 'Clinical Trial on Cognitive Accuracy',
                claim: 'Accuracy increased by 5 percentage points.',
                metric_or_outcome: 'Accuracy (%)',
                population_or_dataset: 'Adult trial cohort',
                method_or_context: 'Randomized trial',
                evidence: [ref1],
              },
              right: {
                document_id: 2,
                document_title: 'Server Latency and Caching Benchmark',
                claim: 'Latency decreased by 5 ms.',
                metric_or_outcome: 'Latency (ms)',
                population_or_dataset: '120 server requests',
                method_or_context: 'Observational benchmark',
                evidence: [ref2],
              },
            },
            {
              id: 'rel_2',
              relationship_type: 'insufficient_evidence',
              outcome_theme: 'Long-term Adverse Effects',
              rationale: 'Neither paper measured longitudinal adverse effects.',
              distinguishing_factors: 'Short follow-up periods',
              left: {
                document_id: 1,
                document_title: 'Clinical Trial on Cognitive Accuracy',
                claim: 'Adverse effects not tracked.',
                metric_or_outcome: null,
                population_or_dataset: null,
                method_or_context: null,
                evidence: [],
              },
              right: {
                document_id: 2,
                document_title: 'Server Latency and Caching Benchmark',
                claim: 'Follow-up was short; adverse effects omitted.',
                metric_or_outcome: null,
                population_or_dataset: null,
                method_or_context: null,
                evidence: [],
              },
            },
          ],
        }
      }

      const run = {
        ...data,
        id,
        user_id: 1,
        status: 'completed',
        progress_percent: 100,
        result,
        created_at: stamp,
      }
      runs.push(run)
      return json(run, 201)
    }

    if (path === '/analysis/runs') return json(runs)

    const runMatch = path.match(/^\/analysis\/runs\/(\d+)(.*)$/)
    if (runMatch) {
      const runId = Number(runMatch[1])
      const subpath = runMatch[2]

      if (subpath === '/gaps')
        return json(
          Object.keys(candidateReviewState).length
            ? [{ candidate_id: 'gap_2', ...candidateReviewState }]
            : [],
        )

      if (subpath.startsWith('/gaps/') && subpath.endsWith('/brief')) {
        const brief = {
          id: briefs.length + 1,
          user_id: 1,
          analysis_run_id: runId,
          candidate_id: 'gap_1',
          title: 'Multi-center clinical replication required',
          research_question: 'Can public clinic EHR records replicate the 5% accuracy gain?',
          method: 'Secondary cohort analysis',
          data_sources: 'Requires verification',
          steps: ['Inspect available data'],
          success_criteria: 'Reproducible report',
          linked_source_ids: ['doc1_chunk1'],
          ...req.postDataJSON(),
          created_at: stamp,
        }
        briefs.push(brief)
        return json(brief, 201)
      }

      if (subpath.startsWith('/gaps/')) {
        candidateReviewState = req.postDataJSON()
        return json({ id: 1, user_id: 1, analysis_run_id: runId, ...candidateReviewState })
      }

      if (subpath.startsWith('/relationships/') && subpath.endsWith('/save')) {
        return json({ saved: true })
      }

      return json(runs[runId - 1])
    }

    if (path === '/analysis/briefs') return json(briefs)

    return json({ detail: 'Not found' }, 404)
  })

  // ─── 1. TEST GAP ANALYSIS WORKSPACE ──────────────────────────────────────────
  await page.goto('/analysis')
  await expect(page.getByRole('heading', { name: 'Research Analysis' })).toBeVisible()

  // Select Gap Analysis card
  await page.getByRole('button', { name: /Find gaps/i }).click()
  await expect(page.getByRole('heading', { name: 'Research Gap Finder' })).toBeVisible()

  // Select documents
  await page.getByRole('button', { name: /Clinical Trial on Cognitive Accuracy/ }).click()
  await page.getByRole('button', { name: /Server Latency and Caching Benchmark/ }).click()

  // Optional parameters
  await page.locator('#gap-rq').fill('General research limitations')
  await page.locator('#gap-time').fill('1 semester')

  // Run Gap Analysis
  await page.getByRole('button', { name: 'Find Gaps' }).click()
  await expect(page).toHaveURL(/mode=gap_analysis/)

  // Assert candidates rendered
  await expect(page.getByText('Multi-center clinical replication required')).toBeVisible()
  await expect(page.getByText('Author-stated limitation')).toBeVisible()
  await expect(page.getByText('Model-inferred gap')).toBeVisible()
  await expect(page.getByText('Pediatric retention curve unstudied')).toBeVisible()

  // Verify evidence panel opens with exact quote
  await page
    .getByRole('button', { name: /View evidence for Multi-center clinical replication required/ })
    .click()
  await expect(page.getByRole('dialog', { name: /Evidence for: Multi-center/ })).toBeVisible()
  await expect(page.getByText('Limitation: single site trial.')).toBeVisible()
  await page.getByRole('button', { name: 'Close evidence panel' }).click()
  await expect(page.getByRole('dialog', { name: /Evidence for: Multi-center/ })).toBeHidden()

  // Expand feasible student project accordion
  const gapCard = page.getByRole('article', { name: 'Multi-center clinical replication required' })
  await expect(
    gapCard.getByText('Single-center results cannot be assumed generalizable.', { exact: false }),
  ).toBeVisible()
  await expect(
    gapCard.getByText('Authors explicitly identify limitation to a single testing facility.'),
  ).toBeHidden()
  const explanation = gapCard.locator('summary', { hasText: 'Supporting explanation' })
  await explanation.focus()
  await page.keyboard.press('Enter')
  await expect(
    gapCard.getByText('Authors explicitly identify limitation to a single testing facility.'),
  ).toBeVisible()
  await page.keyboard.press('Enter')
  const projectToggle = page
    .locator('summary', { hasText: 'Feasible student investigation' })
    .first()
  await projectToggle.click()
  await expect(
    page.getByText('Can public clinic EHR records replicate the 5% accuracy gain?'),
  ).toBeVisible()
  await expect(page.getByText('Extract matched cohort from open dataset')).toBeVisible()

  // Save as project brief dialog flow
  await page.getByRole('button', { name: 'Save as project brief' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Save project brief' })).toBeVisible()
  await page.getByPlaceholder('Assumption 1').fill('Cohort age distributions match trial criteria')
  await page.getByRole('button', { name: 'Save project brief', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Save project brief' })).toBeHidden()

  const savedBriefs = page.getByRole('region', { name: 'Saved project briefs' })
  await savedBriefs.getByText('Multi-center clinical replication required', { exact: true }).click()
  await expect(
    savedBriefs.getByText('Assumptions: Cohort age distributions match trial criteria'),
  ).toBeVisible()
  const briefDownload = page.waitForEvent('download')
  await savedBriefs.getByRole('button', { name: 'Export brief' }).click()
  const briefMd = await readFile((await (await briefDownload).path())!, 'utf8')
  expect(briefMd).toContain('Cohort age distributions match trial criteria')
  expect(briefMd).toContain('[doc1_chunk1]')
  await savedBriefs.getByText('Multi-center clinical replication required', { exact: true }).click()

  await page
    .getByRole('article')
    .filter({ hasText: 'Pediatric retention curve unstudied' })
    .getByRole('button', { name: 'Dismiss', exact: true })
    .click()
  await page.reload()
  await expect(page.getByText('Pediatric retention curve unstudied')).toBeHidden()
  await page.getByLabel('Show dismissed').check()
  await expect(page.getByText('Pediatric retention curve unstudied')).toBeVisible()

  // Export Gap Analysis markdown
  const gapDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export all' }).click()
  const gapMd = await readFile((await (await gapDownload).path())!, 'utf8')
  expect(gapMd).toContain('# Research Gap Analysis')
  expect(gapMd).toContain('Multi-center clinical replication required')
  expect(gapMd).toContain('Feasible student investigation')

  // Accessibility check on gap workspace
  expect((await new AxeBuilder({ page }).include('.gap-workspace').analyze()).violations).toEqual(
    [],
  )

  // Responsive layout check
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      (
        await new AxeBuilder({ page })
          .include('.gap-workspace')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.screenshot({ path: info.outputPath(`gaps-${width}.png`), fullPage: true })
  }

  // ─── 2. TEST DISAGREEMENT EXPLORER WORKSPACE ─────────────────────────────────
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('button', { name: /Explore relationships/i }).click()
  await expect(
    page.getByRole('heading', { name: 'Agreement & Disagreement Explorer' }),
  ).toBeVisible()

  // Select documents
  await page.getByRole('button', { name: /Clinical Trial on Cognitive Accuracy/ }).click()
  await page.getByRole('button', { name: /Server Latency and Caching Benchmark/ }).click()
  await page.getByRole('button', { name: 'Explore Relationships' }).click()
  await expect(page).toHaveURL(/mode=disagreement/)

  // Assert relationships rendered
  await expect(page.getByRole('heading', { name: 'Latency vs Accuracy Trade-off' })).toBeVisible()
  await expect(
    page.locator('.rel-type-badge', { hasText: 'Different context' }).first(),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Long-term Adverse Effects' })).toBeVisible()
  await expect(
    page.locator('.rel-type-badge', { hasText: 'Insufficient evidence' }).first(),
  ).toBeVisible()

  // Inspect side-by-side study context
  await expect(
    page.getByText('Evidence is incomplete: at least one study has no direct quotes.'),
  ).toBeVisible()
  await page
    .locator('summary', { hasText: 'Supporting explanation and study claims' })
    .first()
    .click()
  await expect(
    page.locator('.rel-claim', { hasText: 'Accuracy increased by 5 percentage points.' }),
  ).toBeVisible()
  await expect(page.locator('.rel-claim', { hasText: 'Latency decreased by 5 ms.' })).toBeVisible()

  // Toggle evidence drawer
  const evidenceToggle = page.locator('summary', { hasText: 'Show source evidence' }).first()
  await evidenceToggle.click()
  await expect(page.getByText('Accuracy increased by 5 percentage points.').nth(1)).toBeVisible()

  // Save evidence to notebook
  await page.getByRole('button', { name: 'Save evidence' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Evidence notebook' })).toBeVisible()
  await page.getByRole('button', { name: 'Close notebook' }).click()
  await expect(page.getByRole('dialog', { name: 'Evidence notebook' })).toBeHidden()

  // Send to review action
  await page.getByRole('button', { name: 'Send to review' }).first().click()

  // Export Disagreement markdown
  const disDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const disMd = await readFile((await (await disDownload).path())!, 'utf8')
  expect(disMd).toContain('# Agreement & Disagreement Explorer')
  expect(disMd).toContain('Latency vs Accuracy Trade-off')
  expect(disMd).toContain('different_context')

  // Accessibility check on disagreement workspace
  expect((await new AxeBuilder({ page }).include('.gap-workspace').analyze()).violations).toEqual(
    [],
  )

  // Responsive layout check
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      (
        await new AxeBuilder({ page })
          .include('.gap-workspace')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.screenshot({ path: info.outputPath(`disagreement-${width}.png`), fullPage: true })
  }
})
