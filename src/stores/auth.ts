import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Role, Session, User } from '@/types/auth'

const STORAGE_KEY = '40db.session.v1'

/**
 * Mock de usuarios por rol. En un backend real, el usuario viene del
 * payload de OAuth + lookup en la BD; aquí simulamos uno por rol.
 */
function buildMockUser(role: Role): User {
  const profiles: Record<Role, Omit<User, 'id'>> = {
    admin: { nombre: 'Admin Demo', email: 'admin@40db.demo' },
    vecino: { nombre: 'Camila Vecina', email: 'camila.vecina@correo.cl' },
    funcionario: { nombre: 'Pedro Funcionario', email: 'pedro@maipu.cl' },
  }
  return { id: `mock-${role}`, ...profiles[role] }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const role = ref<Role | null>(null)

  const isAuthenticated = computed(() => user.value !== null && role.value !== null)
  const displayName = computed(() => user.value?.nombre ?? '')

  function persist() {
    if (user.value && role.value) {
      const session: Session = { user: user.value, role: role.value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Session
      if (parsed?.user && parsed?.role) {
        user.value = parsed.user
        role.value = parsed.role
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  /**
   * Login mock — en producción esto recibiría el id_token de Google,
   * lo enviaría al backend y guardaría el resultado. Aquí solo seteamos
   * el rol elegido en el selector de desarrollo.
   */
  async function login(selectedRole: Role) {
    user.value = buildMockUser(selectedRole)
    role.value = selectedRole
    persist()
  }

  function logout() {
    user.value = null
    role.value = null
    persist()
  }

  return {
    user,
    role,
    isAuthenticated,
    displayName,
    login,
    logout,
    restore,
  }
})
