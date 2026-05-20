/**
 * Cliente HTTP del frontend contra `40db-backend`.
 *
 * Responsabilidades:
 * - Resolver la URL completa a partir de `VITE_API_BASE_URL`.
 * - Inyectar `Content-Type: application/json` y `X-Correlation-Id` por request.
 * - Parsear el shape uniforme de error (`errores.md §4`) y lanzar `ApiHttpError`.
 * - Permitir un getter de token (Bearer) sin acoplar a Supabase — el cliente de
 *   auth (rama 2) registrará el getter via `setAuthTokenProvider`.
 *
 * Lo que NO hace todavía:
 * - Reintentos automáticos. Si el back responde 5xx, dejamos que la UI decida.
 * - Cache. Los catálogos los cachea su propio servicio.
 */

import {
  ApiHttpError,
  NetworkError,
} from './errors'
import type { ApiErrorEnvelope } from '@/types/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

type TokenProvider = () => string | null | Promise<string | null>

let tokenProvider: TokenProvider | null = null

/**
 * Registra el proveedor del JWT. Lo invoca `feat/supabase-auth` con
 * `() => supabase.auth.getSession().then(s => s.data.session?.access_token ?? null)`.
 * Mientras nadie lo registre, las requests salen sin `Authorization` (útil para
 * endpoints públicos: /heatmaps, /comunas, /tipos-estado, /health/*).
 */
export function setAuthTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider
}

export interface RequestOptions {
  /** Query string params. Valores `undefined` se omiten. */
  query?: Record<string, string | number | boolean | undefined>
  /** Body JSON. Se serializa con JSON.stringify. */
  json?: unknown
  /** Headers extra. Sobrescriben los default. */
  headers?: Record<string, string>
  /** Para abortar la request (ej. limpiar polling al desmontar). */
  signal?: AbortSignal
  /** Si true, no agrega `Authorization` aunque haya token. */
  skipAuth?: boolean
}

async function resolveAuthHeader(skip: boolean | undefined): Promise<string | null> {
  if (skip || !tokenProvider) return null
  const token = await tokenProvider()
  return token ? `Bearer ${token}` : null
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

function newCorrelationId(): string {
  // ULID-like sin dependencia externa: timestamp + random base36.
  const time = Date.now().toString(36).padStart(9, '0')
  const rand = Math.random().toString(36).slice(2, 12).padStart(10, '0')
  return `${time}${rand}`.toUpperCase()
}

async function parseError(response: Response): Promise<ApiHttpError> {
  let payload: ApiErrorEnvelope | null = null
  try {
    payload = (await response.json()) as ApiErrorEnvelope
  } catch {
    // Respuesta sin JSON parseable (ej. CORS preflight rechazado, 502 del proxy).
  }
  if (payload?.error?.code) {
    return new ApiHttpError(response.status, payload.error)
  }
  return new ApiHttpError(response.status, {
    code: 'unknown_error',
    message: response.statusText || 'Error desconocido del servidor.',
    correlation_id: response.headers.get('X-Correlation-Id') ?? '',
    details: null,
  })
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!BASE_URL) {
    throw new Error(
      'VITE_API_BASE_URL no está configurada. Copia .env.example a .env.local y completa los valores.',
    )
  }

  const url = buildUrl(path, options.query)
  const correlationId = newCorrelationId()
  const authHeader = await resolveAuthHeader(options.skipAuth)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Correlation-Id': correlationId,
    ...(options.json !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(authHeader ? { Authorization: authHeader } : {}),
    ...options.headers,
  }

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
      signal: options.signal,
    })
  } catch (e) {
    throw new NetworkError(undefined, e)
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  // Para health checks y respuestas vacías, intentar JSON con fallback.
  const text = await response.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}
