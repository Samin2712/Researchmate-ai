import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { access, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createBackendEnv } from './environment.mjs'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const backend = path.join(root, 'backend')
export const frontend = path.join(root, 'frontend')
export const python = path.join(
  backend,
  'venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
)
export function getBackendEnv() {
  return createBackendEnv(
    process.env,
    existsSync(path.join(backend, '.env')) ? readFileSync(path.join(backend, '.env'), 'utf8') : '',
    path.join(backend, 'data', 'huggingface'),
  )
}
export const backendEnv = getBackendEnv()
export async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const { progressLabel, ...spawnOptions } = options
    const started = Date.now()
    const timer = progressLabel
      ? setInterval(
          () => console.log(`${progressLabel} (${Math.round((Date.now() - started) / 1000)}s)…`),
          15000,
        )
      : null
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      windowsHide: true,
      ...spawnOptions,
    })
    const cleanup = () => {
      if (timer) clearInterval(timer)
    }
    child.once('error', cleanup)
    child.once('exit', cleanup)
    child.once('error', reject)
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Command failed with exit code ${code}: ${path.basename(command)}`)),
    )
  })
}
export async function npm(args, options = {}) {
  const cli =
    process.env.npm_execpath ||
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
  await run(process.execPath, [cli, ...args], options)
}
export async function fingerprint() {
  return createHash('sha256')
    .update(await readFile(path.join(backend, 'requirements-runtime.txt')))
    .update(await readFile(path.join(frontend, 'package-lock.json')))
    .digest('hex')
}
export async function needsSetup() {
  if (
    !(await exists(python)) ||
    !(await exists(path.join(frontend, 'node_modules/vite/bin/vite.js')))
  )
    return true
  for (const name of ['vite', 'tsc', 'eslint', 'vitest']) {
    if (
      !(await exists(
        path.join(
          frontend,
          'node_modules/.bin',
          name + (process.platform === 'win32' ? '.cmd' : ''),
        ),
      ))
    )
      return true
  }
  try {
    return (
      (await readFile(path.join(backend, 'venv/.researchmate-setup'), 'utf8')).trim() !==
      (await fingerprint())
    )
  } catch {
    return true
  }
}
export async function markSetup() {
  await writeFile(path.join(backend, 'venv/.researchmate-setup'), await fingerprint())
}
export async function readHealth(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) })
    const data = await response.json()
    return response.ok && data.status === 'healthy' ? data : null
  } catch {
    return null
  }
}
export async function waitForHealth(url, child, timeoutMs = 300000) {
  const start = Date.now()
  let lastUpdate = start
  while (Date.now() - start < timeoutMs) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error('The backend stopped before becoming ready. See its error above.')
    const health = await readHealth(url)
    if (health) return health
    if (Date.now() - lastUpdate >= 15000) {
      console.log(
        `Backend is still starting (${Math.round((Date.now() - start) / 1000)}s). First launch may be downloading the embedding model.`,
      )
      lastUpdate = Date.now()
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(
    'Backend startup timed out. The first embedding-model download may need more time; rerun npm run dev after checking the log.',
  )
}
