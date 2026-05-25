/**
 * Modelo de Reporte del frontend.
 *
 * Los tipos canónicos viven en `types/api.ts` (snake_case 1:1 con el back).
 * Acá re-exportamos lo que las vistas necesitan, además de helpers de UI:
 * máquina de transiciones permitidas, mapa de tonos para badges, etc.
 *
 * Spec autoritativa:
 * - `../../40db-backend/docs/api.md §4.5–§4.9`
 * - `../../40db-backend/docs/bbdd.md §7` (máquina de estados)
 */

import type {
  Reporte,
  ReporteListItem,
  ReporteHistorialEntry,
  ReporteLecturaEvidencia,
  ReporteEstadoNombre,
  ReporteComentario,
  ComentarioVisibilidad,
  CrearComentarioInput,
  CrearReporteInput,
  CambiarEstadoInput,
  BuscarEvidenciaResponse,
  ListarReportesQuery,
} from './api'

export type {
  Reporte,
  ReporteListItem,
  ReporteHistorialEntry,
  ReporteLecturaEvidencia,
  ReporteEstadoNombre,
  ReporteComentario,
  ComentarioVisibilidad,
  CrearComentarioInput,
  CrearReporteInput,
  CambiarEstadoInput,
  BuscarEvidenciaResponse,
  ListarReportesQuery,
}

// ──────────────────────────────────────────────────────────
// Máquina de estados (UI)
// ──────────────────────────────────────────────────────────

/**
 * Transiciones permitidas desde cada estado. Es una copia de la regla del
 * back (`bbdd.md §7`); el back rechaza si el cliente intenta saltarse pasos.
 * Acá la replicamos para deshabilitar opciones inválidas en la UI.
 */
export const ESTADO_TRANSICIONES: Record<ReporteEstadoNombre, ReporteEstadoNombre[]> = {
  'En espera': ['En atencion', 'Descartado'],
  'En atencion': ['Atendido', 'Descartado'],
  Atendido: [],
  Descartado: [],
}

/** Estados terminales: no aceptan más cambios. */
export const ESTADOS_TERMINALES: ReadonlySet<ReporteEstadoNombre> = new Set([
  'Atendido',
  'Descartado',
])

/** Tono visual sugerido para badges. */
export const ESTADO_TONE: Record<ReporteEstadoNombre, 'danger' | 'warning' | 'success' | 'neutral'> = {
  'En espera': 'danger',
  'En atencion': 'warning',
  Atendido: 'success',
  Descartado: 'neutral',
}

/** ¿Esta transición requiere comentario obligatorio? (`api.md §4.9`) */
export function transicionRequiereComentario(target: ReporteEstadoNombre): boolean {
  return target === 'Descartado'
}
