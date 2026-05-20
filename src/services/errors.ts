import type { ApiErrorPayload } from '@/types/api'

/**
 * Error tipado que envuelve la respuesta de error del backend.
 * Sigue el shape uniforme de `../../40db-backend/docs/errores.md §4`.
 */
export class ApiHttpError extends Error {
  readonly status: number
  readonly code: string
  readonly correlationId: string
  readonly details: unknown | null

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message)
    this.name = 'ApiHttpError'
    this.status = status
    this.code = payload.code
    this.correlationId = payload.correlation_id
    this.details = payload.details ?? null
  }
}

/**
 * Error de red previo a obtener la respuesta del back (DNS, CORS, offline).
 * No tiene shape de `ApiErrorPayload` porque nunca llegamos a parsear.
 */
export class NetworkError extends Error {
  readonly cause?: unknown
  constructor(message = 'No se pudo contactar al servidor.', cause?: unknown) {
    super(message)
    this.name = 'NetworkError'
    this.cause = cause
  }
}

export function isApiHttpError(e: unknown): e is ApiHttpError {
  return e instanceof ApiHttpError
}

/** Match por código de dominio. Ver `errores.md §10` para la lista. */
export function isApiError(e: unknown, code: string): e is ApiHttpError {
  return isApiHttpError(e) && e.code === code
}

/** 401: JWT ausente, inválido, expirado o usuario inactivo. */
export function isAuthError(e: unknown): e is ApiHttpError {
  return isApiHttpError(e) && e.status === 401
}

/** 403: rol/comuna insuficiente. */
export function isForbiddenError(e: unknown): e is ApiHttpError {
  return isApiHttpError(e) && e.status === 403
}
