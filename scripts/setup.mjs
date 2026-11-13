import { exists, python, backend, frontend, backendEnv, run, npm, markSetup } from './runtime.mjs'
import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { pathToFileURL } from 'node:url'

export async function setup() {
  console.log(
    'Preparing ResearchMate. First setup downloads Python packages and the CPU embedding runtime.',
  )
  if (!(await exists(path.join(backend, '.env')))) {
    const template = await readFile(path.join(backend, '.env.example'), 'utf8')
    await writeFile(
      path.join(backend, '.env'),
      template.replace('generate-a-local-secret', randomBytes(32).toString('hex')),
      { flag: 'wx' },
    )
    console.log(
      'Created backend/.env for local SQLite + persistent Chroma. Add GOOGLE_API_KEY there (or in the root .env).',
    )
  }
  if (!(await exists(python))) {
    await run(process.platform === 'win32' ? 'python' : 'python3', [
      '-m',
      'venv',
      path.join(backend, 'venv'),
    ])
  }
  const options = { cwd: backend, env: backendEnv, progressLabel: 'Preparing Python runtime' }
  await run(
    python,
    [
      '-m',
      'pip',
      'install',
      '--disable-pip-version-check',
      '--quiet',
      '--cache-dir',
      '.pip-cache',
      'torch>=2.6,<2.7',
      '--index-url',
      'https://download.pytorch.org/whl/cpu',
    ],
    options,
  )
  await run(
    python,
    [
      '-m',
      'pip',
      'install',
      '--disable-pip-version-check',
      '--quiet',
      '--cache-dir',
      '.pip-cache',
      '-r',
      'requirements-runtime.txt',
    ],
    options,
  )
  let frontendReady = false
  if (
    (await exists(path.join(backend, '..', 'frontend', 'node_modules/vite/bin/vite.js'))) &&
    !process.argv.includes('--force')
  ) {
    try {
      await npm(['ls', '--prefix', 'frontend', '--depth=0', '--offline'], { stdio: 'ignore' })
      frontendReady = true
      console.log('Frontend dependencies are already installed and valid; keeping them.')
      for (const name of ['vite', 'tsc', 'eslint', 'vitest']) {
        if (
          !(await exists(
            path.join(
              frontend,
              'node_modules/.bin',
              name + (process.platform === 'win32' ? '.cmd' : ''),
            ),
          ))
        ) {
          console.log('Repairing frontend command shortcuts after an interrupted installation.')
          await npm([
            'rebuild',
            '--prefix',
            'frontend',
            '--offline',
            '--ignore-scripts',
            '--no-audit',
            '--no-fund',
          ])
          break
        }
      }
    } catch {
      /* Repair incomplete or incompatible installations below. */
    }
  }
  if (!frontendReady)
    await npm(
      ['ci', '--prefix', 'frontend', '--cache', 'frontend/.npm-cache', '--no-audit', '--no-fund'],
      { progressLabel: 'Installing frontend dependencies' },
    )
  // Package manifests alone do not detect interrupted extraction. Compile before
  // recording setup as complete so missing types/runtime modules are surfaced.
  console.log('Checking the frontend build before completing setup.')
  await npm(['run', 'build', '--prefix', 'frontend'], { progressLabel: 'Checking frontend build' })
  await markSetup()
  console.log('Setup finished. Run npm run dev.')
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  setup().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
