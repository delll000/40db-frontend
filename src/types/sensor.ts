export type SensorStatus = 'online' | 'intermitente' | 'offline'

export interface Sensor {
  id: string
  technicalId: string
  zone: string
  latitude: number
  longitude: number
  status: SensorStatus
  lastReportAt: string
  battery: number
  signal: number
}

export interface SensorStatusSummary {
  total: number
  online: number
  intermitente: number
  offline: number
}
