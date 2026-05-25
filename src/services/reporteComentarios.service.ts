/**
 * Servicio HTTP para comentarios sobre reportes.
 *
 * Spec autoritativa: `../../40db-backend/docs/api.md §4.28 / §4.29` y
 * `../../40db-backend/docs/frontend-comentarios-reporte.md`.
 *
 * El back filtra por rol al listar (dueño ve solo externos; municipalidad/admin
 * ven ambos). El front no hace lógica de filtrado extra.
 */

import { http } from './http'
import type {
  Cursor,
  CrearComentarioInput,
  ReporteComentario,
} from '@/types/api'

export const reporteComentariosService = {
  /** GET /api/v1/reportes/{id}/comentarios (api.md §4.29) */
  listar(reporteId: string): Promise<ReporteComentario[]> {
    return http
      .get<Cursor<ReporteComentario>>(`/api/v1/reportes/${reporteId}/comentarios`)
      .then((res) => res.data)
  },

  /** POST /api/v1/reportes/{id}/comentarios (api.md §4.28) */
  crear(reporteId: string, input: CrearComentarioInput): Promise<ReporteComentario> {
    return http.post<ReporteComentario>(`/api/v1/reportes/${reporteId}/comentarios`, {
      json: input,
    })
  },
}
