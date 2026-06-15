import { defineConfig } from 'cypress'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function resolveSupabaseStorageKey(): string {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env'), 'utf-8')
    const match = content.match(/VITE_SUPABASE_URL=https?:\/\/([^.\s]+)\.supabase\.co/)
    if (match?.[1]) return `sb-${match[1]}-auth-token`
  } catch {}
  const url = process.env.VITE_SUPABASE_URL ?? ''
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/)
  return match?.[1] ? `sb-${match[1]}-auth-token` : 'sb-test-project-auth-token'
}

export default defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}',
    baseUrl: 'http://localhost:4173',
    viewportWidth: 1280,
    viewportHeight: 800,
  },
  env: {
    SUPABASE_STORAGE_KEY: resolveSupabaseStorageKey(),
  },
})
