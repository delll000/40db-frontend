<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { HOME_BY_ROLE, ROLE_LABELS, type Role } from '@/types/auth'
import { useToast } from '@/composables/useToast'
import logoColor from '@/assets/brand/logo.color.svg'
import BaseButton from '@/components/common/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const showRolePicker = ref(false)
const loading = ref(false)
const selectedRole = ref<Role | null>(null)

interface RoleOption {
  value: Role
  description: string
  emoji: string
}

const roleOptions: RoleOption[] = [
  {
    value: 'admin',
    emoji: '⚙',
    description:
      'Gestiona dispositivos IoT, usuarios y supervisa la salud del sistema completo.',
  },
  {
    value: 'vecino',
    emoji: '🏠',
    description: 'Consulta el ruido de tu sector y genera reportes ciudadanos.',
  },
  {
    value: 'funcionario',
    emoji: '📋',
    description: 'Atiende, gestiona y cierra los reportes ciudadanos en tu municipio.',
  },
]

function startGoogleSignIn() {
  // Mock — en producción aquí dispararíamos el flujo de Google OAuth
  showRolePicker.value = true
}

async function chooseRole(role: Role) {
  selectedRole.value = role
  loading.value = true
  try {
    await auth.login(role)
    const redirect = (route.query.redirect as string | undefined) ?? HOME_BY_ROLE[role]
    toast.success(`Bienvenido, ${auth.user?.nombre}`)
    await router.replace(redirect)
  } catch {
    toast.error('No fue posible iniciar sesión', 'Intenta nuevamente.')
  } finally {
    loading.value = false
    selectedRole.value = null
  }
}
</script>

<template>
  <div class="auth">
    <div class="auth__card">
      <img :src="logoColor" alt="40dB" class="auth__logo" />
      <h1 class="auth__title">Inicia sesión</h1>
      <p class="auth__sub">
        Accede con tu cuenta institucional para continuar con la plataforma.
      </p>

      <transition name="swap" mode="out-in">
        <!-- Estado inicial: botón Google -->
        <div v-if="!showRolePicker" key="google" class="auth__google">
          <button
            type="button"
            class="gbtn"
            :disabled="loading"
            @click="startGoogleSignIn"
          >
            <span class="gbtn__icon" aria-hidden="true">
              <!-- Google G simplificado -->
              <svg viewBox="0 0 48 48" width="20" height="20">
                <path
                  fill="#FFC107"
                  d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.5-.2-3-.4-4.5z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.3 4.5 9.7 8.6 6.3 14.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 45.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8L6.2 34.5C9.5 40.7 16.2 45.5 24 45.5z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.4 4.5-4.5 6l6.2 5.2c-.4.4 6.5-4.7 6.5-14.2 0-1.5-.2-3-.4-4.5z"
                />
              </svg>
            </span>
            Continuar con Google
          </button>

          <p class="auth__terms">
            Al iniciar sesión aceptas los
            <a href="#" @click.prevent>Términos y Condiciones</a> y la
            <a href="#" @click.prevent>Política de Privacidad</a>.
          </p>
        </div>

        <!-- Estado selector de rol -->
        <div v-else key="picker" class="auth__picker">
          <p class="auth__picker-hint">
            Selecciona el tipo de cuenta con la que deseas continuar:
          </p>
          <ul class="auth__roles">
            <li v-for="opt in roleOptions" :key="opt.value">
              <button
                type="button"
                class="role-btn"
                :disabled="loading"
                :aria-busy="loading && selectedRole === opt.value || undefined"
                @click="chooseRole(opt.value)"
              >
                <span class="role-btn__emoji" aria-hidden="true">{{ opt.emoji }}</span>
                <span class="role-btn__text">
                  <strong class="role-btn__title">{{ ROLE_LABELS[opt.value] }}</strong>
                  <span class="role-btn__desc">{{ opt.description }}</span>
                </span>
                <span class="role-btn__chev" aria-hidden="true">→</span>
              </button>
            </li>
          </ul>

          <BaseButton variant="ghost" size="sm" :disabled="loading" @click="showRolePicker = false">
            ← Volver
          </BaseButton>
        </div>
      </transition>
    </div>

    <p class="auth__demo">
      <span class="auth__demo-tag">Modo demo</span>
      Selección de rol simulada. La integración real con Google OAuth se conectará en la
      próxima iteración.
    </p>
  </div>
</template>

<style scoped>
.auth {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px);
  padding: var(--space-8) var(--space-4);
  background:
    radial-gradient(circle at top, rgba(0, 77, 64, 0.06), transparent 60%),
    var(--color-bg-alt);
}

.auth__card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-12) var(--space-8);
  width: 100%;
  max-width: 480px;
  text-align: center;
}

.auth__logo {
  height: 48px;
  width: auto;
  margin: 0 auto var(--space-6);
}

.auth__title {
  margin: 0 0 var(--space-2);
}

.auth__sub {
  margin: 0 0 var(--space-8);
  color: var(--color-text-muted);
}

/* Google button */
.gbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: #fff;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  cursor: pointer;
  transition: box-shadow 150ms ease, border-color 150ms ease;
}
.gbtn:hover:not(:disabled) {
  border-color: var(--color-text-muted);
  box-shadow: var(--shadow-sm);
}
.gbtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.gbtn__icon {
  display: inline-flex;
}

.auth__terms {
  margin-top: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.auth__terms a {
  color: var(--color-primary);
  text-decoration: underline;
}

/* Role picker */
.auth__picker-hint {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.auth__roles {
  list-style: none;
  margin: 0 0 var(--space-4);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.role-btn {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
  padding: var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition:
    border-color 150ms ease,
    background 150ms ease,
    transform 80ms ease;
}
.role-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  background: rgba(0, 77, 64, 0.04);
}
.role-btn:active:not(:disabled) {
  transform: translateY(1px);
}
.role-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.role-btn__emoji {
  font-size: 1.5rem;
  flex-shrink: 0;
}
.role-btn__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.role-btn__title {
  color: var(--color-text);
  font-size: var(--text-base);
}
.role-btn__desc {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}
.role-btn__chev {
  color: var(--color-text-muted);
  font-size: var(--text-lg);
  flex-shrink: 0;
}
.role-btn:hover:not(:disabled) .role-btn__chev {
  color: var(--color-primary);
  transform: translateX(2px);
  transition: transform 150ms ease;
}

/* Demo banner */
.auth__demo {
  margin-top: var(--space-6);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  max-width: 480px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.auth__demo-tag {
  background: var(--color-accent);
  color: #6b2810;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Transición swap */
.swap-enter-active,
.swap-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}
.swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.swap-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
