import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/collections',
  workers: 1,
  outputDir: './collection-test-results',
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [390, 768, 1440].map((width) => ({
    name: `width-${width}`,
    use: {
      viewport: { width, height: 1000 },
      reducedMotion: 'reduce' as const,
      launchOptions: {
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : process.platform === 'win32' ? { channel: 'msedge' } : {}),
      },
    },
  })),
  webServer: process.env.E2E_EXTERNAL_SERVERS ? undefined : [
    {
      command: process.platform === 'win32'
        ? '..\\backend\\venv\\Scripts\\python.exe tests/browser_server.py'
        : '../backend/venv/bin/python tests/browser_server.py',
      cwd: '../backend',
      env: { PYTHONUTF8: '1' },
      url: 'http://127.0.0.1:8000/health/live',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 5173',
      env: { VITE_API_URL: 'http://127.0.0.1:8000/api/v1' },
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
})
