import type { Sensor } from '@/types/sensor'

const MAIPU_CENTER = { lat: -33.5167, lng: -70.7575 }

/** Genera un timestamp ISO relativo al ahora con offset en minutos */
function isoMinAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString()
}

/**
 * Sensores fijos en distintos sectores de Maipú con estados variados.
 * Mantenemos la lista estable para que la UI no salte entre llamadas.
 */
export const SENSORS: Sensor[] = [
  {
    id: 's-001',
    technicalId: 'MP-001-CTR',
    zone: 'Maipú Centro',
    latitude: MAIPU_CENTER.lat,
    longitude: MAIPU_CENTER.lng,
    status: 'online',
    lastReportAt: isoMinAgo(2),
    battery: 92,
    signal: 87,
  },
  {
    id: 's-002',
    technicalId: 'MP-002-PLZ',
    zone: 'Plaza Maipú',
    latitude: -33.5104,
    longitude: -70.7569,
    status: 'online',
    lastReportAt: isoMinAgo(1),
    battery: 76,
    signal: 91,
  },
  {
    id: 's-003',
    technicalId: 'MP-003-TPL',
    zone: 'Templo Votivo',
    latitude: -33.5075,
    longitude: -70.7611,
    status: 'intermitente',
    lastReportAt: isoMinAgo(7),
    battery: 41,
    signal: 52,
  },
  {
    id: 's-004',
    technicalId: 'MP-004-BAR',
    zone: 'El Bosque',
    latitude: -33.5298,
    longitude: -70.7641,
    status: 'online',
    lastReportAt: isoMinAgo(3),
    battery: 88,
    signal: 80,
  },
  {
    id: 's-005',
    technicalId: 'MP-005-SOL',
    zone: 'Ciudad Satélite',
    latitude: -33.5421,
    longitude: -70.7782,
    status: 'offline',
    lastReportAt: isoMinAgo(42),
    battery: 14,
    signal: 0,
  },
  {
    id: 's-006',
    technicalId: 'MP-006-CER',
    zone: 'Cerrillos límite',
    latitude: -33.4998,
    longitude: -70.7320,
    status: 'online',
    lastReportAt: isoMinAgo(1),
    battery: 95,
    signal: 95,
  },
  {
    id: 's-007',
    technicalId: 'MP-007-RIN',
    zone: 'Rinconada',
    latitude: -33.5512,
    longitude: -70.7405,
    status: 'online',
    lastReportAt: isoMinAgo(4),
    battery: 70,
    signal: 75,
  },
  {
    id: 's-008',
    technicalId: 'MP-008-IND',
    zone: 'Industrial Maipú',
    latitude: -33.4882,
    longitude: -70.7715,
    status: 'intermitente',
    lastReportAt: isoMinAgo(11),
    battery: 38,
    signal: 45,
  },
  {
    id: 's-009',
    technicalId: 'MP-009-LON',
    zone: 'Longitudinal',
    latitude: -33.5150,
    longitude: -70.7892,
    status: 'online',
    lastReportAt: isoMinAgo(2),
    battery: 81,
    signal: 88,
  },
  {
    id: 's-010',
    technicalId: 'MP-010-SAN',
    zone: 'San Luis',
    latitude: -33.5365,
    longitude: -70.7510,
    status: 'online',
    lastReportAt: isoMinAgo(1),
    battery: 67,
    signal: 73,
  },
  {
    id: 's-011',
    technicalId: 'MP-011-LMP',
    zone: 'Las Parcelas',
    latitude: -33.5022,
    longitude: -70.7821,
    status: 'offline',
    lastReportAt: isoMinAgo(85),
    battery: 0,
    signal: 0,
  },
  {
    id: 's-012',
    technicalId: 'MP-012-PAJ',
    zone: 'Pajaritos',
    latitude: -33.4810,
    longitude: -70.7490,
    status: 'online',
    lastReportAt: isoMinAgo(3),
    battery: 90,
    signal: 84,
  },
]

/** Listado único de zonas para selectors */
export const ZONES: string[] = Array.from(new Set(SENSORS.map((s) => s.zone))).sort()
