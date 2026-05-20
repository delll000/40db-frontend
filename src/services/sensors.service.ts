import { mock } from './_utils'
import { SENSORS, ZONES } from './_mockData/sensors'
import type { Sensor, SensorStatusSummary } from '@/types/sensor'

export const sensorsService = {
  list: () => mock<Sensor[]>(SENSORS),

  byId: async (id: string): Promise<Sensor | null> => {
    const all = await mock<Sensor[]>(SENSORS, 150)
    return all.find((s) => s.id === id) ?? null
  },

  zones: () => mock<string[]>(ZONES, 100),

  statusSummary: async (): Promise<SensorStatusSummary> => {
    const all = await mock<Sensor[]>(SENSORS, 200)
    return {
      total: all.length,
      online: all.filter((s) => s.status === 'online').length,
      intermitente: all.filter((s) => s.status === 'intermitente').length,
      offline: all.filter((s) => s.status === 'offline').length,
    }
  },
}
