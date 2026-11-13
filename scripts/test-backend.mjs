import { run, python, backend, backendEnv } from './runtime.mjs'

try {
  await run(python, ['-m', 'pytest'], { cwd: backend, env: backendEnv })
} catch {
  process.exitCode = 1
}
