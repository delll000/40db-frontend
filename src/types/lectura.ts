/**
 * Tipos del rollup horario de lecturas (`api.md §4.27`).
 *
 * `GET /api/v1/lecturas/resumen` sirve una serie horaria pre-agregada por
 * sensor desde la tabla `lectura_resumen_horaria` (refrescada cada hora por
 * pg_cron, ver `bbdd.md §13`). Es la capa OLAP/batch del proyecto — alimenta
 * gráficos del panel sin escanear `lectura` cruda.
 */

export interface ResumenHorarioItem {
  /** ISO 8601 alineado a hora (sufijo `Z`). */
  hora: string
  avg_db: number
  min_db: number
  max_db: number
  p95_db: number
  n_lecturas: number
}

export interface ResumenHorarioResponse {
  sensor_id: string
  sensor_nombre: string
  desde: string
  hasta: string
  /** Las horas sin lecturas NO aparecen — el cliente rellena con null si quiere gráfico continuo. */
  horas: ResumenHorarioItem[]
  fuente: 'lectura_resumen_horaria'
  /** MAX(refrescado_at) sobre el rango. Null si no hay filas. */
  refrescado_at: string | null
}

/** Ventanas predefinidas en la UI. El backend tope es 90 días. */
export type VentanaHistorico = '24h' | '7d' | '30d' | '90d'

export const VENTANA_DIAS: Record<VentanaHistorico, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

export const VENTANA_LABEL: Record<VentanaHistorico, string> = {
  '24h': 'Últimas 24 h',
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
}
