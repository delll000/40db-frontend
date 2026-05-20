import type { HeatmapPoint } from '@/types/kpi'
import { SENSORS } from './sensors'
import type { HeatmapFilters } from '@/types/filters'

/**
 * Genera puntos heatmap dispersos alrededor de cada sensor activo.
 * No es un cálculo de interpolación real (eso es del backend), pero
 * produce una nube visualmente correcta para validar la UI.
 *
 * Cada llamada introduce variación pequeña para simular cambios en tiempo real.
 */
export function generateHeatmapPoints(filters?: HeatmapFilters): HeatmapPoint[] {
  const points: HeatmapPoint[] = []

  for (const sensor of SENSORS) {
    if (sensor.status === 'offline') continue
    if (filters?.zone && sensor.zone !== filters.zone) continue
    if (filters?.sensorId && sensor.id !== filters.sensorId) continue

    // dB base por zona — algunas zonas son más ruidosas
    const baseDb = baseDbByZone(sensor.zone)

    // Varia ±3 dB por refresh para simular dinámica
    const jitter = (Math.random() - 0.5) * 6

    // Hotspot principal en el sensor
    points.push(toPoint(sensor.latitude, sensor.longitude, baseDb + jitter, sensor.zone))

    // Generar dispersión alrededor del sensor (~150m radio)
    const cloudCount = 12
    for (let i = 0; i < cloudCount; i++) {
      const radiusKm = Math.random() * 0.18
      const angle = Math.random() * Math.PI * 2
      const dLat = (radiusKm / 111) * Math.sin(angle)
      const dLng = (radiusKm / 111) * Math.cos(angle) / Math.cos((sensor.latitude * Math.PI) / 180)

      // Atenuación con la distancia
      const attenuation = 1 - radiusKm / 0.18
      const localDb = baseDb * 0.9 + jitter * 0.5 - (1 - attenuation) * 8
      points.push(toPoint(sensor.latitude + dLat, sensor.longitude + dLng, localDb, sensor.zone))
    }
  }

  return points
}

function baseDbByZone(zone: string): number {
  // Aproximaciones plausibles según el tipo de sector
  const map: Record<string, number> = {
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
  return map[zone] ?? 60
}

function toPoint(lat: number, lng: number, db: number, zone: string): HeatmapPoint {
  // Normalizar dB a intensidad 0..1 sobre rango 40..90
  const clamped = Math.max(40, Math.min(90, db))
  const intensity = (clamped - 40) / 50
  return { lat, lng, intensity, db: Math.round(clamped), zone }
}
