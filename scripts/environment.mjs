import { parseEnv } from 'node:util'

/** Local launcher configuration is explicit, avoiding unrelated shell DATABASE_URL exports. */
export function createBackendEnv(environment, localEnvText, cachePath) {
  const local = parseEnv(localEnvText)
  const database =
    environment.RESEARCHMATE_DATABASE_URL || local.DATABASE_URL || environment.DATABASE_URL
  const geminiModel =
    environment.RESEARCHMATE_GEMINI_MODEL || local.GEMINI_MODEL || environment.GEMINI_MODEL
  const configuredOrigins = local.CORS_ORIGINS || environment.CORS_ORIGINS || ''
  const corsOrigins =
    environment.RESEARCHMATE_CORS_ORIGINS ||
    [
      ...new Set([
        ...configuredOrigins
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ]),
    ].join(',')
  return {
    ...environment,
    ...(database ? { DATABASE_URL: database } : {}),
    ...(geminiModel ? { GEMINI_MODEL: geminiModel } : {}),
    CORS_ORIGINS: corsOrigins,
    DEBUG: environment.RESEARCHMATE_DEBUG || 'false',
    PYTHONUTF8: '1',
    PYTHONUNBUFFERED: '1',
    HF_HOME: environment.HF_HOME || cachePath,
    HF_HUB_DISABLE_SYMLINKS_WARNING: '1',
    TOKENIZERS_PARALLELISM: 'false',
  }
}
