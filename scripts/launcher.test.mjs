import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { readHealth, waitForHealth } from './runtime.mjs'
import { createBackendEnv } from './environment.mjs'

test('local startup allows both Vite loopback origins despite a stale terminal CORS value', () => {
  const result = createBackendEnv(
    { CORS_ORIGINS: 'http://localhost:5173' },
    'CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173\n',
    '/cache',
  )
  assert.deepEqual(
    new Set(result.CORS_ORIGINS.split(',')),
    new Set(['http://localhost:5173', 'http://127.0.0.1:5173']),
  )
})

test('local startup keeps configured extra origins and allows an explicit CORS override', () => {
  const result = createBackendEnv({}, 'CORS_ORIGINS=https://research.example.com\n', '/cache')
  assert.ok(result.CORS_ORIGINS.includes('https://research.example.com'))
  assert.ok(result.CORS_ORIGINS.includes('http://127.0.0.1:5173'))
  assert.equal(
    createBackendEnv({ RESEARCHMATE_CORS_ORIGINS: 'https://only.example.com' }, '', '/cache')
      .CORS_ORIGINS,
    'https://only.example.com',
  )
})

test('local database configuration wins over an inherited terminal DATABASE_URL', () => {
  const result = createBackendEnv(
    { DATABASE_URL: 'postgresql+asyncpg://stale:invalid@localhost/researchmate' },
    'DATABASE_URL=sqlite+aiosqlite:///./test.db\n',
    '/model-cache',
  )
  assert.equal(result.DATABASE_URL, 'sqlite+aiosqlite:///./test.db')
})

test('an explicit ResearchMate database override wins over the local configuration', () => {
  const selected = 'postgresql+asyncpg://configured:password@localhost/researchmate'
  const result = createBackendEnv(
    { RESEARCHMATE_DATABASE_URL: selected },
    'DATABASE_URL=sqlite+aiosqlite:///./test.db\n',
    '/model-cache',
  )
  assert.equal(result.DATABASE_URL, selected)
})

test('the launcher retains an inherited database when no local database is configured', () => {
  const selected = 'sqlite+aiosqlite:///./custom.db'
  assert.equal(createBackendEnv({ DATABASE_URL: selected }, '', '/cache').DATABASE_URL, selected)
})

test('local Gemini model wins over a stale terminal model', () => {
  const result = createBackendEnv(
    { GEMINI_MODEL: 'gemini-1.5-flash' },
    'GEMINI_MODEL=gemini-2.5-flash\n',
    '/cache',
  )
  assert.equal(result.GEMINI_MODEL, 'gemini-2.5-flash')
  assert.equal(
    createBackendEnv({ GEMINI_MODEL: 'custom-model' }, '', '/cache').GEMINI_MODEL,
    'custom-model',
  )
  assert.equal(
    createBackendEnv({ RESEARCHMATE_GEMINI_MODEL: 'explicit-model' },
      'GEMINI_MODEL=gemini-2.5-flash\n', '/cache').GEMINI_MODEL,
    'explicit-model',
  )
})

test('health requires a successful HTTP status and healthy payload', async () => {
  let status = 200
  const server = http.createServer((_, response) => {
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ status: 'healthy' }))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url = `http://127.0.0.1:${server.address().port}`
  try {
    assert.equal((await readHealth(url)).status, 'healthy')
    status = 503
    assert.equal(await readHealth(url), null)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})
test('backend failure is reported without waiting for the startup timeout', async () => {
  await assert.rejects(
    waitForHealth('http://127.0.0.1:1', { exitCode: 1, signalCode: null }, 1000),
    /stopped before becoming ready/,
  )
})
