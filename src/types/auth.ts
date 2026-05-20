export type Role = 'admin' | 'vecino' | 'funcionario'

export interface User {
  id: string
  nombre: string
  email: string
  avatar?: string
}

export interface Session {
  user: User
  role: Role
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
