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
    /** Si true, el guard NO redirige a /onboarding aunque falte (vista propia de onboarding). */
    allowIncompleteOnboarding?: boolean
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
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/views/auth/OnboardingView.vue'),
    meta: {
      layout: 'public',
      requiresAuth: true,
      allowIncompleteOnboarding: true,
      title: 'Completa tu perfil',
    },
  },
  {
    path: '/auth/confirmado',
    name: 'auth-confirmado',
    component: () => import('@/views/auth/EmailConfirmedView.vue'),
    // Sin guards: el link del correo puede aterrizar con o sin sesion activa.
    meta: { layout: 'public', title: 'Correo confirmado' },
  },

  {
    path: '/heatmap',
    name: 'heatmap',
    component: () => import('@/views/heatmap/HeatmapView.vue'),
    meta: {
      layout: 'admin',
      requiresAuth: true,
      roles: ['admin', 'funcionario'],
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

  {
    // Catch-all 404. Mostramos una vista propia en lugar de redirigir
    // silenciosamente a /home: un 404 oculto enmascara typos en router-links,
    // deep-links rotos compartidos por URL, y rutas deprecadas.
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { layout: 'public', title: 'Página no encontrada' },
  },
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
    return auth.needsOnboarding ? '/onboarding' : HOME_BY_ROLE[auth.role]
  }

  // 2. requiresAuth: si no está autenticado, mandar a login con redirect.
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/auth', query: { redirect: to.fullPath } }
  }

  // 3. onboarding pendiente: si el perfil del back tiene comuna_id=null,
  //    forzar el flujo /onboarding salvo en la propia vista.
  if (
    auth.isAuthenticated &&
    auth.needsOnboarding &&
    !to.meta.allowIncompleteOnboarding
  ) {
    return { path: '/onboarding' }
  }

  // 4. Si NO necesita onboarding y va a /onboarding, redirigir al home.
  if (
    auth.isAuthenticated &&
    !auth.needsOnboarding &&
    to.name === 'onboarding' &&
    auth.role
  ) {
    return HOME_BY_ROLE[auth.role]
  }

  // 5. roles: si está autenticado pero el rol no califica, mandarlo a SU home
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
