export interface HeatmapPoint {
  lat: number
  lng: number
  /** Intensidad normalizada 0..1 para leaflet.heat */
  intensity: number
  /** dB original (referencia) */
  db: number
  zone: string
}

export interface HeatmapKpis {
  /** Promedio de dB de la última lectura por sensor activo */
  avgDb: number
  /** Conteo de zonas que superan DS 14/2024 ahora */
  zonesOverStandard: number
  /** Sensores que reportaron en los últimos 15 minutos */
  activeSensors: number
  /** Zona con mayor dB en últimos 5 minutos */
  noisiestZone: { zone: string; db: number } | null
  /** Última actualización en ISO */
  lastUpdate: string
  /** Si hay zona sostenida >75dB durante > 10 min */
  alertSustained: { zone: string; minutes: number } | null
}

export interface ZoneStat {
  zone: string
  avgDb: number
  maxDb: number
  sensorsCount: number
}
