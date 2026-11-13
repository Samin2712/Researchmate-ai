import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { setup } from './setup.mjs'
import {
  needsSetup,
  root,
  backend,
  frontend,
  python,
  getBackendEnv,
  readHealth,
  waitForHealth,
  run,
} from './runtime.mjs'

const children = new Set()
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM')
  process.exitCode = code
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
function launch(command, args, options) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    windowsHide: true,
    ...options,
  })
  children.add(child)
  child.on('error', (error) => {
    console.error(error.message)
    stop(1)
  })
  child.on('exit', (code) => {
    children.delete(child)
    if (!stopping) {
      console.error(`A server stopped (${code}); stopping the other server.`)
      stop(code || 1)
    }
  })
  return child
}
async function portBusy(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}
try {
  if (await needsSetup()) await setup()
  if (stopping) process.exit()
  const launchEnv = getBackendEnv()
  const healthURL = 'http://127.0.0.1:8000/health'
  let health
  if (await portBusy(8000)) {
    health = await readHealth(healthURL)
    if (!health?.vector_store || !health?.database_type)
      throw new Error(
        'Port 8000 is occupied by an unhealthy or different service. Stop it, then rerun npm run dev.',
      )
    if (health.llm?.provider === 'gemini' && launchEnv.GEMINI_MODEL &&
        health.llm.model !== launchEnv.GEMINI_MODEL)
      throw new Error(
        `The backend on port 8000 uses ${health.llm.model}, but the configured model is ${launchEnv.GEMINI_MODEL}. Stop the backend in its original terminal, then rerun npm run dev.`,
      )
    console.log('Using the existing healthy ResearchMate backend on port 8000.')
  } else {
    console.log('Checking the configured database before loading the AI model…')
    await run(python, ['../scripts/check_database.py'], { cwd: backend, env: launchEnv })
    console.log(
      'Starting backend. The first launch downloads the embedding model; later launches use its cache.',
    )
    const api = launch(
      python,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
      { cwd: backend, env: launchEnv },
    )
    health = await waitForHealth(
      healthURL,
      api,
      Number(process.env.RESEARCHMATE_STARTUP_TIMEOUT_MS) || 300000,
    )
  }
  console.log(
    `Database: ${health.database_type} (${health.database}); vector store: ${health.vector_store.mode}; embeddings: ${health.embeddings.status}.`,
  )
  console.log(
    'LLM credentials are configured; use npm run doctor to verify a real provider response. Redis is not used by the current app.',
  )
  if (await portBusy(5173)) {
    const response = await fetch('http://127.0.0.1:5173', {
      signal: AbortSignal.timeout(2000),
    })
    if (!(await response.text()).includes('ResearchMate'))
      throw new Error(
        'Port 5173 is occupied by a different service. Stop it, then rerun npm run dev.',
      )
    console.log('Using the existing ResearchMate frontend on port 5173.')
    if (!children.size)
      console.log('Both services are already running; no additional servers were started.')
  } else {
    launch(
      process.execPath,
      [
        path.join(frontend, 'node_modules/vite/bin/vite.js'),
        '--host',
        '127.0.0.1',
        '--port',
        '5173',
        '--strictPort',
      ],
      {
        cwd: frontend,
        env: {
          ...process.env,
          VITE_API_URL: process.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1',
        },
      },
    )
  }
  console.log(
    '\nResearchMate: http://127.0.0.1:5173\nAPI docs: http://127.0.0.1:8000/docs\nCtrl+C stops only servers started by this command.\n',
  )
} catch (error) {
  console.error(
    `Startup failed: ${error.message}\nSee ${path.join(root, 'docs/LOCAL_STARTUP.md')} for configuration.`,
  )
  stop(1)
}
