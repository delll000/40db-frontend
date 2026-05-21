/**
 * Servicio para los catálogos públicos del backend.
 *
 * Endpoints expuestos:
 * - `GET /api/v1/comunas`       (`api.md §4.12`)
 * - `GET /api/v1/tipos-estado`  (`api.md §4.13`)
 *
 * Ambos son públicos (sin auth) y de tamaño chico (decenas de filas).
 * Como no cambian en runtime, cacheamos a nivel de módulo: la primera llamada
 * va al back; las siguientes resuelven la promesa pendiente o el resultado.
 *
 * Para forzar refresh (raro: solo si se modifica la BD en caliente) usar
 * `refresh()` — pensado para el panel admin futuro.
 */

import { http } from './http'
import type { Comuna, TipoEstado } from '@/types/api'

type CachedPromise<T> = Promise<T> | null

let comunasCache: CachedPromise<Comuna[]> = null
let tiposEstadoCache: CachedPromise<TipoEstado[]> = null

function fetchComunas(): Promise<Comuna[]> {
  return http.get<Comuna[]>('/api/v1/comunas', { skipAuth: true })
}

function fetchTiposEstado(): Promise<TipoEstado[]> {
  return http.get<TipoEstado[]>('/api/v1/tipos-estado', { skipAuth: true })
}

export const catalogosService = {
  /** Lista de comunas. Cacheada tras la primera llamada exitosa. */
  async getComunas(): Promise<Comuna[]> {
    if (!comunasCache) {
      comunasCache = fetchComunas().catch((e) => {
        // No persistir cache fallido: la próxima llamada reintenta.
        comunasCache = null
        throw e
      })
    }
    return comunasCache
  },

  /** Catálogo de estados de reporte. Cacheado. */
  async getTiposEstado(): Promise<TipoEstado[]> {
    if (!tiposEstadoCache) {
      tiposEstadoCache = fetchTiposEstado().catch((e) => {
        tiposEstadoCache = null
        throw e
      })
    }
    return tiposEstadoCache
  },

  /** Limpia el cache. Útil en tests o admin con privilegios para invalidar. */
  refresh(): void {
    comunasCache = null
    tiposEstadoCache = null
  },
}
