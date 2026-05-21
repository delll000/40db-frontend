import type { UsuarioMe, UsuarioTipo } from './api'

/**
 * Roles del frontend (UI / routing). El backend solo conoce `ciudadano`
 * y `municipalidad` (`auth.md §2 / §6`). `admin` es UI-only y se mantiene
 * mientras el back no exponga endpoints administrativos (decisión F1, ver
 * `docs/integracion-backend/README.md`).
 */
export type Role = 'vecino' | 'funcionario' | 'admin'

/** Mapeo back → front. `admin` nunca proviene del back. */
export function tipoToRole(tipo: UsuarioTipo): Exclude<Role, 'admin'> {
  return tipo === 'municipalidad' ? 'funcionario' : 'vecino'
}

/** Etiquetas humanas para mostrar en UI */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  vecino: 'Vecino',
  funcionario: 'Funcionario municipal',
}

/** Ruta home por rol — usado en redirects post-login y guards */
export const HOME_BY_ROLE: Record<Role, string> = {
  admin: '/admin-dashboard',
  vecino: '/vecino-home',
  funcionario: '/funcionario-home',
}

/**
 * Re-export del perfil canónico del back para que componentes/stores
 * que solo necesiten "el usuario" no tengan que tocar `types/api.ts`.
 */
export type { UsuarioMe }
