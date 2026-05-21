import type { HeatmapBucketMinutes } from './api'

/**
 * Query del heatmap tal como la entiende `GET /api/v1/heatmaps`
 * (`../../40db-backend/docs/api.md §4.3`).
 *
 * El `bbox` lo provee el componente del mapa cuando termina de inicializarse
 * y en cada `moveend`. Mientras es `null`, el composable `useHeatmapData` no
 * dispara fetch — evita una request al boot con un bbox que aún no existe.
 */
export interface HeatmapQuery {
  /** "minLng,minLat,maxLng,maxLat" (WGS84). null = mapa aún sin viewport. */
  bbox: string | null
  /** ISO 8601 inclusive. */
  timeStart: string
  /** ISO 8601 inclusive. Max 7 días desde timeStart. */
  timeEnd: string
  /** Tamaño de bucket temporal. */
  bucketMinutes: HeatmapBucketMinutes
}

/**
 * Rangos temporales predefinidos para el selector. La etiqueta es lo que
 * el usuario ve; el valor (`hours`) se traduce a `time_start`/`time_end`.
 */
export const HEATMAP_RANGES = [
  { value: 1, label: 'Última hora' },
  { value: 24, label: 'Últimas 24h' },
  { value: 24 * 7, label: 'Últimos 7 días' },
] as const

export type HeatmapRangeHours = (typeof HEATMAP_RANGES)[number]['value']

export const HEATMAP_BUCKETS: { value: HeatmapBucketMinutes; label: string }[] = [
  { value: 1, label: '1 min' },
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 60, label: '60 min' },
]

/**
 * Convierte "últimas N horas" → `(timeStart, timeEnd)` ISO 8601.
 * `timeEnd` se ancla a `now()`; el back tolera valores en el futuro inmediato.
 */
export function rangeToWindow(hours: HeatmapRangeHours): { timeStart: string; timeEnd: string } {
  const end = new Date()
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000)
  return { timeStart: start.toISOString(), timeEnd: end.toISOString() }
}

export function defaultHeatmapQuery(): HeatmapQuery {
  return {
    bbox: null,
    bucketMinutes: 5,
    ...rangeToWindow(24),
  }
}
