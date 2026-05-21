import { mock } from './_utils'
import { SENSORS } from './_mockData/sensors'
import type { SensorStatusSummary } from '@/types/sensor'

export const kpisService = {
  /**
   * KPIs para el panel admin (salud de sensores).
   *
   * MOCK hasta que exista §2 de `docs/integracion-backend/02-endpoints-faltantes-back.md`
   * (resumen de salud server-side). El admin sigue consumiendo este mock vía
   * `VITE_ENABLE_ADMIN_DEMO` mientras tanto.
   */
  adminSummary: async (): Promise<SensorStatusSummary> => {
    return mock<SensorStatusSummary>(
      {
        total: SENSORS.length,
        online: SENSORS.filter((s) => s.status === 'online').length,
        intermitente: SENSORS.filter((s) => s.status === 'intermitente').length,
        offline: SENSORS.filter((s) => s.status === 'offline').length,
      },
      200,
    )
  },
}
