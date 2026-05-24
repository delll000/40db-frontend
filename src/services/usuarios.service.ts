/**
 * Gestión de usuarios desde el panel admin.
 *
 * Spec autoritativa: `40db-backend/docs/api.md §4.20–§4.22`.
 *
 * Restricciones del backend (no las repite el cliente, solo las traduce a UI):
 * - El admin no puede desactivarse a sí mismo (`api.md §4.21`).
 * - El admin no puede degradarse a sí mismo (`api.md §4.22`,
 *   error `cannot_demote_self`).
 * - `comuna_id` es obligatorio al promover a `municipalidad`.
 */

import { http } from './http'
import type {
  Cursor,
  ListarUsuariosQuery,
  PromoverInput,
  UsuarioAdminListItem,
} from '@/types/api'

export const usuariosService = {
  /** GET /api/v1/usuarios (`api.md §4.20`). Solo admin. */
  list(query: ListarUsuariosQuery = {}): Promise<Cursor<UsuarioAdminListItem>> {
    return http.get<Cursor<UsuarioAdminListItem>>('/api/v1/usuarios', {
      query: {
        tipo: query.tipo,
        comuna_id: query.comuna_id,
        activo: query.activo,
        q: query.q,
        limit: query.limit,
        cursor: query.cursor,
      },
    })
  },

  /** PATCH /api/v1/usuarios/{id}/activo (`api.md §4.21`). */
  setActivo(id: string, activo: boolean): Promise<UsuarioAdminListItem> {
    return http.patch<UsuarioAdminListItem>(`/api/v1/usuarios/${id}/activo`, {
      json: { activo },
    })
  },

  /** PATCH /api/v1/usuarios/{id}/promover (`api.md §4.22`). */
  promover(id: string, input: PromoverInput): Promise<UsuarioAdminListItem> {
    return http.patch<UsuarioAdminListItem>(`/api/v1/usuarios/${id}/promover`, {
      json: input,
    })
  },
}
