/**
 * KPIs agregados consumidos por las vistas admin y funcionario.
 *
 * Hoy se cubre el resumen de salud de sensores (admin) — el resto de
 * breakdown sobre reportes vive en las propias vistas (derivado del listado).
 */

import { sensorsService } from './sensors.service'
import type { SensorResumen } from '@/types/sensor'

export const kpisService = {
  /**
   * Resumen agregado para el panel admin. Wrapper sobre
   * `GET /api/v1/sensores/resumen` (`api.md §4.16`).
   *
   * @param comunaId opcional — admin sin filtro = global; con filtro = comuna.
   */
  adminSummary(comunaId?: number): Promise<SensorResumen> {
    return sensorsService.resumen(comunaId)
  },
}
