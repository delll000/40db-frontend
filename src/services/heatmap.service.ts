import { http } from './http'
import type { HeatmapFeatureCollection } from '@/types/api'
import type { HeatmapQuery } from '@/types/filters'

/**
 * Servicio del heatmap acústico.
 *
 * Endpoint: `GET /api/v1/heatmaps` (`api.md §4.3`).
 * Público (sin Bearer): `skipAuth: true`.
 *
 * El response es un GeoJSON `FeatureCollection`; la conversión a puntos
 * para Leaflet y los KPIs derivados viven en `utils/heatmap-features.ts`.
 */
export const heatmapService = {
  get(query: HeatmapQuery): Promise<HeatmapFeatureCollection> {
    if (!query.bbox) {
      // Guard: el caller debería evitar la llamada si no hay bbox. Si igual
      // sucede, mejor lanzar acá que dejar que el back devuelva 422.
      return Promise.reject(new Error('heatmap.get: query.bbox es null'))
    }
    return http.get<HeatmapFeatureCollection>('/api/v1/heatmaps', {
      skipAuth: true,
      query: {
        bbox: query.bbox,
        time_start: query.timeStart,
        time_end: query.timeEnd,
        bucket_minutes: query.bucketMinutes,
      },
    })
  },
}
