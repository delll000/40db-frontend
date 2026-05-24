import { describe, expect, it } from 'vitest'
import {
  deriveKpis,
  featureCollectionToPoints,
  featureToPoint,
} from '@/utils/heatmap-features'
import type {
  HeatmapFeature,
  HeatmapFeatureCollection,
} from '@/types/api'

function makeFeature(
  lng: number,
  lat: number,
  avg: number,
  max = avg,
  count = 10,
  bucket = '2026-05-22T00:00:00Z',
): HeatmapFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {
      nivel_db_avg: avg,
      nivel_db_max: max,
      lectura_count: count,
      bucket_start: bucket,
    },
  }
}

function makeCollection(features: HeatmapFeature[]): HeatmapFeatureCollection {
  return {
    type: 'FeatureCollection',
    metadata: {
      bucket_minutes: 5,
      grid_size_deg: 0.001,
      total_cells: features.length,
    },
    features,
  }
}

describe('featureToPoint', () => {
  it('convierte coords GeoJSON [lng, lat] al shape del front', () => {
    const f = makeFeature(-70.65, -33.44, 62)
    const p = featureToPoint(f)
    expect(p.lat).toBe(-33.44)
    expect(p.lng).toBe(-70.65)
    expect(p.db).toBe(62)
  })

  it('intensity normaliza al rango [0, 1] entre 40 y 90 dB', () => {
    expect(featureToPoint(makeFeature(0, 0, 40)).intensity).toBe(0)
    expect(featureToPoint(makeFeature(0, 0, 65)).intensity).toBeCloseTo(0.5, 5)
    expect(featureToPoint(makeFeature(0, 0, 90)).intensity).toBe(1)
  })

  it('intensity satura abajo/arriba del rango', () => {
    expect(featureToPoint(makeFeature(0, 0, 20)).intensity).toBe(0)
    expect(featureToPoint(makeFeature(0, 0, 120)).intensity).toBe(1)
  })
})

describe('featureCollectionToPoints', () => {
  it('respeta el orden y cardinalidad', () => {
    const fc = makeCollection([
      makeFeature(-70.65, -33.44, 60),
      makeFeature(-70.66, -33.45, 72),
    ])
    const pts = featureCollectionToPoints(fc)
    expect(pts).toHaveLength(2)
    expect(pts[0]!.db).toBe(60)
    expect(pts[1]!.db).toBe(72)
  })
})

describe('deriveKpis', () => {
  it('FeatureCollection vacío → KPIs en cero, noisiestZone null', () => {
    const k = deriveKpis(makeCollection([]))
    expect(k.avgDb).toBe(0)
    expect(k.zonesOverStandard).toBe(0)
    expect(k.activeSensors).toBe(0)
    expect(k.noisiestZone).toBeNull()
    expect(k.alertSustained).toBeNull()
  })

  it('avgDb es ponderado por lectura_count', () => {
    // 60 dB con 10 lecturas + 80 dB con 30 lecturas
    // Promedio simple = 70. Ponderado = (60*10 + 80*30) / 40 = 75.
    const fc = makeCollection([
      makeFeature(-70.65, -33.44, 60, 60, 10),
      makeFeature(-70.66, -33.45, 80, 80, 30),
    ])
    expect(deriveKpis(fc).avgDb).toBe(75)
  })

  it('zonesOverStandard cuenta features con avg > 65', () => {
    const fc = makeCollection([
      makeFeature(-70.65, -33.44, 64),
      makeFeature(-70.66, -33.45, 65), // no cuenta (umbral estricto >)
      makeFeature(-70.67, -33.46, 66),
      makeFeature(-70.68, -33.47, 80),
    ])
    expect(deriveKpis(fc).zonesOverStandard).toBe(2)
  })

  it('noisiestZone usa el max de nivel_db_max, no del avg', () => {
    const fc = makeCollection([
      makeFeature(-70.65, -33.44, 70, /* max */ 75),
      makeFeature(-70.66, -33.45, 65, /* max */ 88),
    ])
    const k = deriveKpis(fc)
    expect(k.noisiestZone).not.toBeNull()
    expect(k.noisiestZone!.db).toBe(88)
    // Label es las coords del feature ganador.
    expect(k.noisiestZone!.zone).toContain('-33.4500')
  })

  it('activeSensors usa metadata.total_cells', () => {
    const fc: HeatmapFeatureCollection = {
      ...makeCollection([makeFeature(0, 0, 50)]),
      metadata: { bucket_minutes: 5, grid_size_deg: 0.001, total_cells: 42 },
    }
    expect(deriveKpis(fc).activeSensors).toBe(42)
  })

  it('alertSustained queda en null hasta que el back lo provea', () => {
    const fc = makeCollection([makeFeature(0, 0, 90, 90, 1)])
    expect(deriveKpis(fc).alertSustained).toBeNull()
  })
})
