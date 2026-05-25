/**
 * Tipos del contrato HTTP con `40db-backend`.
 *
 * Fuente autoritativa: ../../40db-backend/docs/api.md.
 * Estos tipos modelan los responses tal como vienen del back; mantenelos
 * snake_case para que coincida 1:1 con el JSON. Los componentes Vue pueden
 * adaptar a camelCase cuando convenga.
 */

// ──────────────────────────────────────────────────────────
// Errores (errores.md §4)
// ──────────────────────────────────────────────────────────

export interface ApiErrorPayload {
  code: string
  message: string
  details?: unknown | null
  correlation_id: string
}

export interface ApiErrorEnvelope {
  error: ApiErrorPayload
}

// ──────────────────────────────────────────────────────────
// Paginación cursor (api.md §1 / §4.6)
// ──────────────────────────────────────────────────────────

export interface Cursor<T> {
  data: T[]
  next_cursor: string | null
}

// ──────────────────────────────────────────────────────────
// Catálogos públicos (api.md §4.12 / §4.13)
// ──────────────────────────────────────────────────────────

export interface Comuna {
  id: number
  nombre: string
  region: string | null
  codigo: string | null
}

export interface TipoEstado {
  id: number
  nombre: ReporteEstadoNombre
  descripcion: string | null
  orden: number
}

// ──────────────────────────────────────────────────────────
// Usuario (api.md §4.10 / §4.11)
// ──────────────────────────────────────────────────────────

export type UsuarioTipo = 'ciudadano' | 'municipalidad' | 'admin'

export interface UsuarioMe {
  id: string
  nombre: string
  telefono: string | null
  tipo: UsuarioTipo
  comuna_id: number | null
  comuna_nombre: string | null
  activo: boolean
  created_at: string
}

export interface UsuarioPatch {
  telefono?: string
  comuna_id?: number
}

// Referencia mínima a un usuario embebida en reportes/historial.
export interface UsuarioRef {
  id: string
  nombre: string
}

// ──────────────────────────────────────────────────────────
// Usuarios — panel admin (api.md §4.20 / §4.21 / §4.22)
// ──────────────────────────────────────────────────────────

export interface UsuarioAdminListItem {
  id: string
  nombre: string
  /** JOIN a auth.users.email — no vive en public.usuario. */
  email: string
  telefono: string | null
  tipo: UsuarioTipo
  comuna_id: number | null
  comuna_nombre: string | null
  activo: boolean
  created_at: string
}

export interface ListarUsuariosQuery {
  tipo?: UsuarioTipo
  comuna_id?: number
  activo?: boolean
  /** Búsqueda ILIKE sobre nombre/email. */
  q?: string
  limit?: number
  cursor?: string
}

export interface PromoverInput {
  nuevo_tipo: UsuarioTipo
  /** Obligatorio si `nuevo_tipo='municipalidad'`. Ignorado si `ciudadano`. */
  comuna_id?: number
}

// ──────────────────────────────────────────────────────────
// Reporte (api.md §4.5 / §4.6 / §4.7 / §4.8 / §4.9)
// ──────────────────────────────────────────────────────────

export type ReporteEstadoNombre =
  | 'En espera'
  | 'En atencion'
  | 'Atendido'
  | 'Descartado'

export interface ReporteLecturaEvidencia {
  lectura_id: number
  sensor_id: string
  sensor_nombre: string
  nivel_db: number
  /** Solo presente en respuestas de /buscar-evidencia */
  distancia_metros?: number
  timestamp_medicion: string
}

export interface ReporteHistorialEntry {
  estado: ReporteEstadoNombre
  comentario: string | null
  created_at: string
  usuario: UsuarioRef | null
}

/** Item de lista (mios, comuna). Subset del detalle completo. */
export interface ReporteListItem {
  id: string
  titulo: string
  estado_actual: ReporteEstadoNombre
  created_at: string
}

/** Detalle completo (GET /reportes/{id}, response de POST /reportes). */
export interface Reporte {
  id: string
  usuario_id?: string
  usuario?: UsuarioRef
  atendido_por?: UsuarioRef | null
  comuna_id: number
  titulo: string
  descripcion: string
  latitud: number
  longitud: number
  estado_actual: ReporteEstadoNombre
  lectura_evidencia: ReporteLecturaEvidencia | null
  historial?: ReporteHistorialEntry[]
  /**
   * Comentarios filtrados por rol (api.md §4.8). Aditivo: el back puede
   * omitirlo en versiones viejas — tratar como [] cuando esté ausente.
   */
  comentarios?: ReporteComentario[]
  created_at: string
}

// ──────────────────────────────────────────────────────────
// Comentarios sobre reportes (api.md §4.28 / §4.29)
// ──────────────────────────────────────────────────────────

export type ComentarioVisibilidad = 'interno' | 'externo'

export interface ReporteComentario {
  id: number
  visibilidad: ComentarioVisibilidad
  cuerpo: string
  autor: UsuarioRef
  /** Funcionario al que se delegó (solo para internos con delegación). */
  delegado_a: UsuarioRef | null
  /** ISO 8601 UTC. Solo presente si hay delegación. */
  delegado_at: string | null
  created_at: string
}

export interface CrearComentarioInput {
  visibilidad: ComentarioVisibilidad
  cuerpo: string
  /** uuid del funcionario delegado. Va junto con `delegado_at` o ninguno. */
  delegado_a_id?: string
  /** ISO 8601 UTC. Va junto con `delegado_a_id` o ninguno. */
  delegado_at?: string
}

export interface CrearReporteInput {
  titulo: string
  descripcion: string
  latitud: number
  longitud: number
  /**
   * Resuelto en el cliente vía Nominatim (`api.md §4.5.1`). Si se omite, el
   * backend usa `usuario.comuna_id` como fallback.
   */
  comuna_id?: number
  lectura_evidencia_id?: number
}

export interface BuscarEvidenciaResponse {
  evidencia: ReporteLecturaEvidencia | null
}

export interface CambiarEstadoInput {
  nuevo_estado: ReporteEstadoNombre
  comentario?: string
}

export interface ListarReportesQuery {
  limit?: number
  cursor?: string
  estado?: ReporteEstadoNombre
}

// ──────────────────────────────────────────────────────────
// Heatmap (api.md §4.3)
// ──────────────────────────────────────────────────────────

export interface HeatmapFeatureProperties {
  nivel_db_avg: number
  nivel_db_max: number
  lectura_count: number
  bucket_start: string
}

export interface HeatmapFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    /** [lng, lat] en GeoJSON */
    coordinates: [number, number]
  }
  properties: HeatmapFeatureProperties
}

/**
 * Origen del heatmap (api.md §4.3 + frontend-resumen-horario.md §5).
 * - `matview`: servido desde la vista materializada de la capa OLAP (refresh
 *   cada 5 min). Es el caso típico — gráfico rápido sobre 100M lecturas.
 * - `rpc`: el back cayó al fallback de consulta en vivo (ventana >7d, bucket
 *   ∈ {1,15,60} u otros casos fuera del matview).
 */
export type HeatmapFuente = 'matview' | 'rpc'

export interface HeatmapFeatureCollection {
  type: 'FeatureCollection'
  metadata: {
    bucket_minutes: number
    grid_size_deg: number
    total_cells: number
    /** Aditivo: ausente en versiones viejas del back. Mostrar badge si está. */
    fuente?: HeatmapFuente
  }
  features: HeatmapFeature[]
}

export type HeatmapBucketMinutes = 1 | 5 | 15 | 60

export interface HeatmapQuery {
  /** "minLng,minLat,maxLng,maxLat" (WGS84). */
  bbox: string
  /** ISO 8601. */
  time_start: string
  /** ISO 8601. Max 7 días desde time_start. */
  time_end: string
  bucket_minutes?: HeatmapBucketMinutes
}

// ──────────────────────────────────────────────────────────
// Reportes admin — archivos (api.md §4.23 – §4.26)
// ──────────────────────────────────────────────────────────

export type TipoArchivoAdmin = 'pdf' | 'csv' | 'imagen'

export interface ReporteArchivoAdmin {
  id: string
  nombre: string
  tipo: TipoArchivoAdmin
  mime_type: string
  tamano_bytes: number
  generado_por_id: string
  generado_por_nombre: string | null
  rango_desde: string | null
  rango_hasta: string | null
  created_at: string
}

export interface ListarArchivosAdminQuery {
  tipo?: TipoArchivoAdmin
  generado_por_id?: string
  limit?: number
  cursor?: string
}

export interface ArchivoAdminSignedUrl {
  url: string
  expires_in_seconds: number
}

// ──────────────────────────────────────────────────────────
// Health (api.md §4.1 / §4.2)
// ──────────────────────────────────────────────────────────

export interface HealthReady {
  status: 'ready' | 'degraded'
  checks: {
    supabase: 'ok' | 'error'
    mqtt: 'ok' | 'reconnecting' | 'disabled' | 'error'
    jwt_secret: 'ok' | 'missing'
  }
}
