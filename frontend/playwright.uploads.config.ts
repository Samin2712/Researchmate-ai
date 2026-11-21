import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/uploads',
  outputDir: process.env.UPLOAD_HOSTED_URL ? './test-results/uploads-hosted' : './test-results/uploads',
  workers: 1, timeout: 90000, expect: { timeout: 15000 },
  reporter: [['list']],
  use: { baseURL: process.env.UPLOAD_HOSTED_URL || 'http://localhost:5177', channel: 'msedge', trace: 'retain-on-failure', reducedMotion: 'reduce' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.UPLOAD_HOSTED_URL ? undefined : [
    {
      command: process.platform === 'win32'
        ? '..\\backend\\venv\\Scripts\\python.exe ..\\backend\\tests\\upload_browser_server.py'
        : '../backend/venv/bin/python ../backend/tests/upload_browser_server.py',
      url: 'http://127.0.0.1:8013/health/live', timeout: 90000,
      env: { BROWSER_API_PORT: '8013', PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    },
    {
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 5177',
      url: 'http://localhost:5177', timeout: 120000,
      env: { VITE_API_URL: 'http://127.0.0.1:8013/api/v1' },
    },
  ],
})
