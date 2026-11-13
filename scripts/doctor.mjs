import { run, python, backend, backendEnv, exists } from './runtime.mjs'
if (!(await exists(python))) {
  console.error('Run npm run setup first.')
  process.exitCode = 1
} else {
  try {
    await run(python, ['../scripts/check_connections.py'], {
      cwd: backend,
      env: backendEnv,
    })
  } catch {
    process.exitCode = 1
  }
}
