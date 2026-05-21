/**
 * Servicio HTTP de reportes contra `40db-backend`.
 *
 * Spec autoritativa: `../../40db-backend/docs/api.md §4.4–§4.9`.
 *
 * Convención de paginación: cursor opaco. La primera página se pide sin
 * `cursor`; el siguiente lote pasa el `next_cursor` de la respuesta anterior.
 */

import { http } from './http'
import type {
  BuscarEvidenciaResponse,
  CambiarEstadoInput,
  CrearReporteInput,
  Cursor,
  ListarReportesQuery,
  Reporte,
  ReporteListItem,
} from '@/types/api'

export const reportesService = {
  /** GET /api/v1/reportes/buscar-evidencia (api.md §4.4) */
  buscarEvidencia(lat: number, lng: number): Promise<BuscarEvidenciaResponse> {
    return http.get<BuscarEvidenciaResponse>('/api/v1/reportes/buscar-evidencia', {
      query: { lat, lng },
    })
  },

  /** POST /api/v1/reportes (api.md §4.5) */
  crear(input: CrearReporteInput): Promise<Reporte> {
    return http.post<Reporte>('/api/v1/reportes', { json: input })
  },

  /** GET /api/v1/reportes/mios (api.md §4.6) */
  mios(query: ListarReportesQuery = {}): Promise<Cursor<ReporteListItem>> {
    return http.get<Cursor<ReporteListItem>>('/api/v1/reportes/mios', {
      query: { limit: query.limit, cursor: query.cursor, estado: query.estado },
    })
  },

  /** GET /api/v1/reportes/comuna/{comuna_id} (api.md §4.7) */
  porComuna(comunaId: number, query: ListarReportesQuery = {}): Promise<Cursor<ReporteListItem>> {
    return http.get<Cursor<ReporteListItem>>(`/api/v1/reportes/comuna/${comunaId}`, {
      query: { limit: query.limit, cursor: query.cursor, estado: query.estado },
    })
  },

  /** GET /api/v1/reportes/{id} (api.md §4.8) */
  byId(id: string): Promise<Reporte> {
    return http.get<Reporte>(`/api/v1/reportes/${id}`)
  },

  /** PATCH /api/v1/reportes/{id}/estado (api.md §4.9) */
  cambiarEstado(id: string, input: CambiarEstadoInput): Promise<Reporte> {
    return http.patch<Reporte>(`/api/v1/reportes/${id}/estado`, { json: input })
  },
}
