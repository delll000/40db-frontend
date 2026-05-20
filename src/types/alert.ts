export type AlertStatus = 'activa' | 'atendida' | 'cerrada'

export interface Alert {
  id: string
  sensorId: string
  zone: string
  address: string
  latitude: number
  longitude: number
  nivelDb: number
  detectedAt: string
  status: AlertStatus
  citizenName?: string
  description?: string
}

export interface AlertHistoryEntry {
  id: string
  alertId: string
  funcionarioId: string
  funcionarioName: string
  previousStatus: AlertStatus
  newStatus: AlertStatus
  comment: string
  changedAt: string
  isReversion: boolean
}

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  activa: 'Activa',
  atendida: 'Atendida',
  cerrada: 'Cerrada',
}

/** Próximos estados válidos según HU-002 */
export const ALERT_NEXT_STATUS: Record<AlertStatus, AlertStatus[]> = {
  activa: ['atendida'],
  atendida: ['cerrada'],
  cerrada: [],
}
