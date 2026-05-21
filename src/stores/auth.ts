import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/services/supabase'
import { http } from '@/services/http'
import { isAuthError } from '@/services/errors'
import { tipoToRole, type Role, type UsuarioMe } from '@/types/auth'

/**
 * Fuente de verdad de la autenticación.
 *
 * - La sesión (JWT, refresh) la maneja Supabase Auth (`@supabase/supabase-js`).
 *   El SDK persiste en localStorage y refresca tokens automáticamente.
 * - El perfil de negocio (`tipo`, `comuna_id`, etc.) proviene de
 *   `GET /api/v1/usuarios/me` — vive en el backend, no en el JWT.
 *
 * Por convención del back (`auth.md §7`), `comuna_id` arranca en null tras
 * el signup; el flujo onboarding lo completa con `PATCH /usuarios/me`. La
 * computed `needsOnboarding` exponemos para el guard del router.
 */
export const useAuthStore = defineStore('auth', () => {
  const profile = ref<UsuarioMe | null>(null)
  const initializing = ref(true)

  const isAuthenticated = computed(() => profile.value !== null)
  const needsOnboarding = computed(
    () => profile.value !== null && profile.value.comuna_id === null,
  )
  const role = computed<Role | null>(() =>
    profile.value ? tipoToRole(profile.value.tipo) : null,
  )
  const displayName = computed(() => profile.value?.nombre ?? '')

  /**
   * Carga el perfil desde el back. Si el JWT es inválido / el usuario fue
   * desactivado, limpia la sesión local.
   */
  async function loadProfile(): Promise<void> {
    try {
      profile.value = await http.get<UsuarioMe>('/api/v1/usuarios/me')
    } catch (e) {
      if (isAuthError(e)) {
        await supabase.auth.signOut()
        profile.value = null
        return
      }
      throw e
    }
  }

  /**
   * Llamado UNA vez al boot (`main.ts`) y por el listener
   * `onAuthStateChange`. Restaura desde la sesión persistida.
   *
   * No re-lanza errores: si el backend está caído al boot, dejamos al usuario
   * como anónimo y los guards lo manejarán cuando intente entrar a una ruta
   * protegida. Sin esta defensa, el `await` en `main.ts` rechazaría y la app
   * no montaría.
   */
  async function restore(): Promise<void> {
    initializing.value = true
    try {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        try {
          await loadProfile()
        } catch (e) {
          console.warn('[auth] No se pudo cargar el perfil al boot:', e)
          profile.value = null
        }
      } else {
        profile.value = null
      }
    } finally {
      initializing.value = false
    }
  }

  /**
   * Signup email + password. `nombre` se guarda en `raw_user_meta_data.full_name`,
   * que el trigger `handle_new_user` del back lee para poblar `usuario.nombre`
   * (`auth.md §3`).
   *
   * Comportamiento según config de Supabase:
   * - Confirm email ON: signUp devuelve `user` pero `session = null`.
   *   El front debe mostrar "revisa tu correo".
   * - Confirm email OFF: devuelve `user` Y `session` → login automático.
   */
  async function signUp(params: {
    email: string
    password: string
    nombre: string
  }): Promise<{ needsEmailConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: { data: { full_name: params.nombre } },
    })
    if (error) throw error

    if (data.session) {
      await loadProfile()
      return { needsEmailConfirmation: false }
    }
    return { needsEmailConfirmation: true }
  }

  async function signInWithPassword(params: {
    email: string
    password: string
  }): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    })
    if (error) throw error
    await loadProfile()
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    profile.value = null
  }

  /**
   * Suscripción al ciclo de vida de la sesión. Se invoca una sola vez desde
   * `main.ts`. Cubre logout en otra pestaña, refresh fallido del JWT, etc.
   */
  function subscribeToAuthChanges(): void {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        profile.value = null
        return
      }
      // Para SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED → asegurar perfil fresco.
      void loadProfile()
    })
  }

  return {
    profile,
    initializing,
    isAuthenticated,
    needsOnboarding,
    role,
    displayName,
    restore,
    loadProfile,
    signUp,
    signInWithPassword,
    signOut,
    subscribeToAuthChanges,
  }
})
