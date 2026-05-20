import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { HOME_BY_ROLE, type Role } from '@/types/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Layout dinámico resuelto en App.vue. Default: 'public'. */
    layout?: 'public' | 'admin' | 'vecino' | 'funcionario'
    /** Si true, redirige a la home del rol cuando el usuario ya está autenticado. */
    guestOnly?: boolean
    /** Si true, exige sesión activa. */
    requiresAuth?: boolean
    /** Roles permitidos. Si está vacío o ausente, basta con `requiresAuth`. */
    roles?: Role[]
    /** Título mostrado en la pestaña del navegador. */
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/home' },

  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/public/HomeView.vue'),
    meta: { layout: 'public', title: 'Inicio' },
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { layout: 'public', guestOnly: true, title: 'Iniciar sesión' },
  },

  {
    path: '/heatmap',
    name: 'heatmap',
    component: () => import('@/views/heatmap/HeatmapView.vue'),
    meta: {
      layout: 'admin',
      requiresAuth: true,
      roles: ['admin'],
      title: 'Mapa de Ruido',
    },
  },

  {
    path: '/admin-dashboard',
    component: () => import('@/views/admin/AdminShellView.vue'),
    meta: {
      layout: 'admin',
      requiresAuth: true,
      roles: ['admin'],
      title: 'Panel administrador',
    },
    children: [
      {
        path: '',
        name: 'admin-home',
        component: () => import('@/views/admin/AdminHomeView.vue'),
        meta: { title: 'Panel administrador' },
      },
      {
        path: 'hardware',
        name: 'admin-hardware',
        component: () => import('@/views/admin/AdminHardwareView.vue'),
        meta: { title: 'Hardware' },
      },
      {
        path: 'usuarios',
        name: 'admin-users',
        component: () => import('@/views/admin/AdminUsersView.vue'),
        meta: { title: 'Usuarios' },
      },
      {
        path: 'reportes',
        name: 'admin-reports',
        component: () => import('@/views/admin/AdminReportsView.vue'),
        meta: { title: 'Reportes' },
      },
      {
        path: 'historial',
        name: 'admin-history',
        component: () => import('@/views/admin/AdminHistoryView.vue'),
        meta: { title: 'Historial' },
      },
    ],
  },

  {
    path: '/vecino-home',
    name: 'vecino-home',
    component: () => import('@/views/vecino/VecinoHomeView.vue'),
    meta: {
      layout: 'vecino',
      requiresAuth: true,
      roles: ['vecino'],
      title: 'Mi comuna',
    },
  },

  {
    path: '/funcionario-home',
    name: 'funcionario-home',
    component: () => import('@/views/funcionario/FuncionarioHomeView.vue'),
    meta: {
      layout: 'funcionario',
      requiresAuth: true,
      roles: ['funcionario'],
      title: 'Reportes a gestionar',
    },
  },

  { path: '/:pathMatch(.*)*', redirect: '/home' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const required = (to.meta.roles ?? []) as Role[]

  // 1. guestOnly: si ya está autenticado, sacarlo de /auth.
  if (to.meta.guestOnly && auth.isAuthenticated && auth.role) {
    return HOME_BY_ROLE[auth.role]
  }

  // 2. requiresAuth: si no está autenticado, mandar a login con redirect.
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/auth', query: { redirect: to.fullPath } }
  }

  // 3. roles: si está autenticado pero el rol no califica, mandarlo a SU home
  //    (no a /auth, eso causaría loop).
  if (required.length > 0) {
    if (!auth.role || !required.includes(auth.role)) {
      return auth.role ? HOME_BY_ROLE[auth.role] : '/auth'
    }
  }

  return true
})

router.afterEach((to) => {
  const baseTitle = '40dB — Monitoreo de Ruido'
  document.title = to.meta.title ? `${to.meta.title} · ${baseTitle}` : baseTitle
})

export default router
