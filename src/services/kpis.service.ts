import { mock } from './_utils'
import { SENSORS } from './_mockData/sensors'
import type { HeatmapKpis } from '@/types/kpi'
import type { SensorStatusSummary } from '@/types/sensor'

export const kpisService = {
  /**
   * KPIs para la vista heatmap. Calculados desde los sensores y alertas mock,
   * con un poco de variación por refresh para simular tiempo real.
   */
  heatmap: async (): Promise<HeatmapKpis> => {
    const active = SENSORS.filter((s) => s.status !== 'offline')

    // Promedio dB simulado por zona ruidosa
    const baseDbByZone: Record<string, number> = {
      'Maipú Centro': 72,
      'Plaza Maipú': 70,
      'Templo Votivo': 60,
      'El Bosque': 58,
      'Ciudad Satélite': 62,
      'Cerrillos límite': 67,
      Rinconada: 64,
      'Industrial Maipú': 78,
      Longitudinal: 76,
      'San Luis': 65,
      'Las Parcelas': 55,
      Pajaritos: 71,
    }
    const sum = active.reduce((acc, s) => acc + (baseDbByZone[s.zone] ?? 60), 0)
    const avg = active.length ? sum / active.length : 0
    const jitter = (Math.random() - 0.5) * 2

    // Zonas ruidosas (>65 dB se considera sobre estándar nocturno DS 14/2024)
    const zonesOverStandard = active.filter((s) => (baseDbByZone[s.zone] ?? 60) > 65).length

    const noisiest = active
      .map((s) => ({ zone: s.zone, db: (baseDbByZone[s.zone] ?? 60) + (Math.random() - 0.5) * 4 }))
      .sort((a, b) => b.db - a.db)[0]

    // Alerta visual sostenida si la zona más ruidosa supera 75 dB
    const alertSustained =
      noisiest && noisiest.db > 75
        ? { zone: noisiest.zone, minutes: 12 + Math.floor(Math.random() * 8) }
        : null

    return mock<HeatmapKpis>(
      {
        avgDb: Math.round((avg + jitter) * 10) / 10,
        zonesOverStandard,
        activeSensors: active.length,
        noisiestZone: noisiest
          ? { zone: noisiest.zone, db: Math.round(noisiest.db * 10) / 10 }
          : null,
        lastUpdate: new Date().toISOString(),
        alertSustained,
      },
      300,
    )
  },

  /** KPIs para el panel admin (salud de sensores) */
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
