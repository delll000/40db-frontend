/// <reference types="vite/client" />

declare module 'leaflet.heat'

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ENABLE_ADMIN_DEMO?: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
