/**
 * Servicio HTTP para los archivos del panel admin.
 *
 * Spec autoritativa: `../../40db-backend/docs/api.md §4.23 – §4.26`.
 *
 * Flujo:
 * - `subir`: multipart/form-data, sube el blob (PDF/CSV/imagen) generado
 *   desde `/heatmap` o `/admin-dashboard/reportes` al bucket privado.
 * - `listar`: paginación cursor; mismo esquema que `/usuarios`.
 * - `descarga`: el back devuelve una signed URL de corta duración. El
 *   frontend hace GET (o `<a download>`) directo contra esa URL — el back
 *   no proxiea el binario.
 * - `eliminar`: borra blob + metadata. 204 sin body.
 */

import { http } from './http'
import type {
  ArchivoAdminSignedUrl,
  Cursor,
  ListarArchivosAdminQuery,
  ReporteArchivoAdmin,
  TipoArchivoAdmin,
} from '@/types/api'

export interface SubirArchivoInput {
  blob: Blob
  /** Nombre legible para mostrar al usuario (1–200 chars). */
  nombre: string
  tipo: TipoArchivoAdmin
  /** ISO 8601 — inicio del período cubierto. */
  rango_desde?: string
  /** ISO 8601 — fin del período cubierto (>= rango_desde). */
  rango_hasta?: string
}

function buildFormData(input: SubirArchivoInput): FormData {
  const fd = new FormData()
  fd.append('archivo', input.blob, input.nombre)
  fd.append('nombre', input.nombre)
  fd.append('tipo', input.tipo)
  if (input.rango_desde) fd.append('rango_desde', input.rango_desde)
  if (input.rango_hasta) fd.append('rango_hasta', input.rango_hasta)
  return fd
}

export const reportesAdminArchivosService = {
  /** POST /api/v1/reportes-admin/archivos (api.md §4.23). */
  subir(input: SubirArchivoInput): Promise<ReporteArchivoAdmin> {
    return http.post<ReporteArchivoAdmin>('/api/v1/reportes-admin/archivos', {
      formData: buildFormData(input),
    })
  },

  /** GET /api/v1/reportes-admin/archivos (api.md §4.24). */
  listar(query: ListarArchivosAdminQuery = {}): Promise<Cursor<ReporteArchivoAdmin>> {
    return http.get<Cursor<ReporteArchivoAdmin>>('/api/v1/reportes-admin/archivos', {
      query: {
        tipo: query.tipo,
        generado_por_id: query.generado_por_id,
        limit: query.limit,
        cursor: query.cursor,
      },
    })
  },

  /** GET /api/v1/reportes-admin/archivos/{id}/descarga (api.md §4.25). */
  descarga(id: string): Promise<ArchivoAdminSignedUrl> {
    return http.get<ArchivoAdminSignedUrl>(`/api/v1/reportes-admin/archivos/${id}/descarga`)
  },

  /** DELETE /api/v1/reportes-admin/archivos/{id} (api.md §4.26). */
  eliminar(id: string): Promise<void> {
    return http.delete<void>(`/api/v1/reportes-admin/archivos/${id}`)
  },
}
