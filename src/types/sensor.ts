/**
 * Tipos de sensor expuestos por el backend (`api.md §4.14–§4.19`).
 *
 * `estado_salud` se computa server-side on-demand desde `MAX(timestamp_medicion)`
 * de la última lectura (umbrales en `bbdd.md §5.5 / D10`). Cuarto estado
 * `sin_lecturas` para sensores recién provisionados que nunca publicaron.
 */

export type SensorEstadoSalud =
  | 'online'
  | 'intermitente'
  | 'offline'
  | 'sin_lecturas'

export interface Sensor {
  id: string
  nombre: string
  comuna_id: number
  comuna_nombre: string
  latitud: number
  longitud: number
  activo: boolean
  estado_salud: SensorEstadoSalud
  ultima_lectura_at: string | null
  ultima_lectura_db: number | null
  /** Presente solo en el detalle (`GET /sensores/{id}`). */
  created_at?: string
}

/** Response de `GET /api/v1/sensores/resumen` (`api.md §4.16`). */
export interface SensorResumen {
  total: number
  online: number
  intermitente: number
  offline: number
  sin_lecturas: number
  calculado_at: string
}

/** Body de `POST /api/v1/sensores` (`api.md §4.17`). */
export interface CrearSensorInput {
  nombre: string
  comuna_id: number
  latitud: number
  longitud: number
}

/**
 * Body de `PATCH /api/v1/sensores/{id}` (`api.md §4.18`). `comuna_id` no es
 * editable — mover un sensor es darlo de baja y crear uno nuevo.
 */
export interface PatchSensorInput {
  nombre?: string
  latitud?: number
  longitud?: number
  activo?: boolean
}

export interface ListarSensoresQuery {
  comuna_id?: number
  estado_salud?: SensorEstadoSalud
  activo?: boolean
  limit?: number
  cursor?: string
}

/** Etiqueta humana para cada estado de salud (UI). */
export const ESTADO_SALUD_LABEL: Record<SensorEstadoSalud, string> = {
  online: 'En línea',
  intermitente: 'Intermitente',
  offline: 'Fuera de línea',
  sin_lecturas: 'Sin lecturas',
}
