import { mock } from './_utils'
import { generateHeatmapPoints } from './_mockData/heatmapPoints'
import type { HeatmapFilters } from '@/types/filters'
import type { HeatmapPoint } from '@/types/kpi'

export const heatmapService = {
  /** Devuelve puntos heatmap, opcionalmente filtrados por zona/sensor */
  points: async (filters?: HeatmapFilters): Promise<HeatmapPoint[]> => {
    return mock(generateHeatmapPoints(filters), 300)
  },
}
