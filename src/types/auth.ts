import type { UsuarioMe, UsuarioTipo } from './api'

/**
 * Roles del frontend (UI / routing). Mapeo directo desde `usuario.tipo`
 * del backend (`auth.md §2 / §6`, ratificado por D9 — `admin` ahora real).
 */
export type Role = 'vecino' | 'funcionario' | 'admin'

/** Mapeo back → front. Los tres roles vienen del backend. */
export function tipoToRole(tipo: UsuarioTipo): Role {
  switch (tipo) {
    case 'admin':
      return 'admin'
    case 'municipalidad':
      return 'funcionario'
    case 'ciudadano':
      return 'vecino'
  }
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
