/**
 * Adapter entre el GeoJSON del back (`api.md §4.3`) y los tipos que
 * consumen los componentes Vue del heatmap.
 *
 * Las features del back agrupan lecturas por celda (~100 m, según
 * `HEATMAP_GRID_SIZE_DEG` del back) y bucket temporal. Cada feature trae
 * `nivel_db_avg`, `nivel_db_max`, `lectura_count`, `bucket_start`. Acá
 * derivamos:
 *
 * - `HeatmapPoint[]` — un punto por feature, con `intensity` normalizada
 *   para `leaflet.heat`.
 * - `HeatmapKpis` — promedio, zonas críticas, punto más ruidoso. `alertSustained`
 *   queda `null` hasta que el back lo provea (ver `02-endpoints-faltantes-back.md §5`).
 */

import type {
  HeatmapFeature,
  HeatmapFeatureCollection,
} from '@/types/api'
import type { HeatmapKpis, HeatmapPoint } from '@/types/kpi'

/**
 * Rango de dB para normalizar `intensity ∈ [0, 1]`. 40 dB ≈ susurro,
 * 90 dB ≈ tráfico pesado. Lo que pase de 90 satura la escala visual.
 */
const DB_MIN = 40
const DB_MAX = 90

/** Umbral de "zona sobre estándar" para uso nocturno (DS 14/2024 ~ 55 dB; usamos 65 como guideline pragmática). */
const DB_OVER_STANDARD = 65

export function featureCollectionToPoints(fc: HeatmapFeatureCollection): HeatmapPoint[] {
  return fc.features.map(featureToPoint)
}

export function featureToPoint(f: HeatmapFeature): HeatmapPoint {
  const [lng, lat] = f.geometry.coordinates
  const db = f.properties.nivel_db_avg
  return {
    lat,
    lng,
    db,
    intensity: clamp01((db - DB_MIN) / (DB_MAX - DB_MIN)),
    // El back no nos da "zona" del feature; usamos coords como label corto.
    zone: formatZone(lat, lng),
  }
}

export function deriveKpis(fc: HeatmapFeatureCollection): HeatmapKpis {
  const features = fc.features
  if (features.length === 0) {
    return {
      avgDb: 0,
      zonesOverStandard: 0,
      activeSensors: 0,
      noisiestZone: null,
      lastUpdate: new Date().toISOString(),
      alertSustained: null,
    }
  }

  let weightedSum = 0
  let weightTotal = 0
  let overStandard = 0
  let maxFeature: HeatmapFeature = features[0]!

  for (const f of features) {
    const { nivel_db_avg, nivel_db_max, lectura_count } = f.properties
    // Promedio ponderado por nº de lecturas: una celda con 50 lecturas pesa
    // más que una con 2. Refleja la "densidad acústica" real.
    weightedSum += nivel_db_avg * lectura_count
    weightTotal += lectura_count
    if (nivel_db_avg > DB_OVER_STANDARD) overStandard++
    if (nivel_db_max > maxFeature.properties.nivel_db_max) maxFeature = f
  }

  const avgDb = weightTotal > 0 ? weightedSum / weightTotal : 0
  const [maxLng, maxLat] = maxFeature.geometry.coordinates

  return {
    avgDb: round1(avgDb),
    zonesOverStandard: overStandard,
    // `total_cells` es la mejor aproximación que tenemos a "puntos activos"
    // — no es lo mismo que sensores, pero el back no expone catálogo de
    // sensores (ver 02-endpoints-faltantes-back.md §1).
    activeSensors: fc.metadata.total_cells,
    noisiestZone: {
      zone: formatZone(maxLat, maxLng),
      db: round1(maxFeature.properties.nivel_db_max),
    },
    lastUpdate: new Date().toISOString(),
    // Roadmap del back: 02-endpoints-faltantes-back.md §5.
    alertSustained: null,
  }
}

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function formatZone(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}
