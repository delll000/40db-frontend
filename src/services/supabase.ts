import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente JS de Supabase Auth.
 *
 * Por diseño del backend (`../../40db-backend/docs/auth.md §9`) el frontend
 * NO accede a tablas de Supabase directo: solo usa los métodos de
 * `supabase.auth.*` para signup/login/refresh. La `anon_key` no tiene
 * permisos sobre `public.*` porque RLS está habilitada sin políticas.
 *
 * Toda la data de negocio se pide a FastAPI (rama feat/http-client-and-env)
 * con el JWT que devuelve este cliente.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son obligatorias. Copia .env.example a .env.local y completa los valores.',
  )
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * Lee el access token vigente. Lo usa `setAuthTokenProvider` del cliente HTTP
 * para inyectar `Authorization: Bearer <jwt>` en cada request al backend.
 *
 * Devuelve null si no hay sesión (usuario anónimo) — válido para endpoints
 * públicos como /heatmaps, /comunas, /tipos-estado.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) return null
  return data.session.access_token
}
