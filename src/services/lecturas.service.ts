/**
 * Servicio HTTP para la capa OLAP de lecturas.
 *
 * Spec autoritativa: `40db-backend/docs/api.md §4.27`.
 *
 * - `resumenHorario` consulta el rollup pre-agregado por sensor (avg/min/max/p95
 *   + n_lecturas por hora). Es la fuente del componente "Histórico de ruido".
 * - Requiere JWT (municipalidad de su comuna o admin) — el interceptor global
 *   adjunta el Bearer desde la sesión de Supabase.
 *
 * El back limita la ventana a 90 días (422 si se excede). El frontend ya valida
 * antes de llamar, pero igual mapeamos el error en la UI.
 */

import { http } from './http'
import type { ResumenHorarioResponse } from '@/types/lectura'

export const lecturasService = {
  /** GET /api/v1/lecturas/resumen (`api.md §4.27`). */
  resumenHorario(
    sensorId: string,
    desde: Date,
    hasta: Date,
  ): Promise<ResumenHorarioResponse> {
    return http.get<ResumenHorarioResponse>('/api/v1/lecturas/resumen', {
      query: {
        sensor_id: sensorId,
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      },
    })
  },
}
