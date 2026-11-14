import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/evidence', outputDir: './evidence-test-results', workers: 1, timeout: 90000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/evidence', open: 'never' }]],
  use: { baseURL: 'http://localhost:5175', channel: 'msedge', actionTimeout: 15000, trace: 'retain-on-failure', reducedMotion: 'reduce' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 5175', url: 'http://localhost:5175', timeout: 120000,
    env: { VITE_API_URL: 'http://127.0.0.1:8011/api/v1' } },
})
