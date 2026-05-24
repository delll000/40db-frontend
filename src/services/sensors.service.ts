/**
 * Servicio HTTP de sensores (admin / municipalidad).
 *
 * Spec autoritativa: `40db-backend/docs/api.md §4.14–§4.19`.
 *
 * - Listado paginado cursor + filtros (`estado_salud`, `activo`, `comuna_id`).
 * - Resumen agregado para KPIs.
 * - CRUD restringido a `admin` (POST/PATCH/DELETE). DELETE es soft (activo=false).
 */

import { http } from './http'
import type { Cursor } from '@/types/api'
import type {
  CrearSensorInput,
  ListarSensoresQuery,
  PatchSensorInput,
  Sensor,
  SensorResumen,
} from '@/types/sensor'

export const sensorsService = {
  /** GET /api/v1/sensores (`api.md §4.14`). */
  list(query: ListarSensoresQuery = {}): Promise<Cursor<Sensor>> {
    return http.get<Cursor<Sensor>>('/api/v1/sensores', {
      query: {
        comuna_id: query.comuna_id,
        estado_salud: query.estado_salud,
        activo: query.activo,
        limit: query.limit,
        cursor: query.cursor,
      },
    })
  },

  /** GET /api/v1/sensores/{id} (`api.md §4.15`). */
  byId(id: string): Promise<Sensor> {
    return http.get<Sensor>(`/api/v1/sensores/${id}`)
  },

  /** GET /api/v1/sensores/resumen (`api.md §4.16`). */
  resumen(comunaId?: number): Promise<SensorResumen> {
    return http.get<SensorResumen>('/api/v1/sensores/resumen', {
      query: { comuna_id: comunaId },
    })
  },

  /** POST /api/v1/sensores (`api.md §4.17`). Solo admin. */
  create(input: CrearSensorInput): Promise<Sensor> {
    return http.post<Sensor>('/api/v1/sensores', { json: input })
  },

  /** PATCH /api/v1/sensores/{id} (`api.md §4.18`). Solo admin. */
  update(id: string, patch: PatchSensorInput): Promise<Sensor> {
    return http.patch<Sensor>(`/api/v1/sensores/${id}`, { json: patch })
  },

  /**
   * DELETE /api/v1/sensores/{id} (`api.md §4.19`). Soft-delete (`activo=false`).
   * Solo admin. Las lecturas históricas se preservan.
   */
  remove(id: string): Promise<{ id: string; activo: boolean; estado_salud: string }> {
    return http.delete<{ id: string; activo: boolean; estado_salud: string }>(
      `/api/v1/sensores/${id}`,
    )
  },
}
