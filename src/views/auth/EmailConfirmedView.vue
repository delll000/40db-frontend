<script setup lang="ts">
/**
 * Pantalla de aterrizaje tras hacer click en el enlace de confirmacion del
 * correo de Supabase (`auth.md §3`).
 *
 * Supabase procesa el token automaticamente al iniciar el SDK
 * (`detectSessionInUrl: true`). Por eso, cuando este componente se monta,
 * pueden ocurrir dos cosas:
 *  - La confirmacion vino acompanada de tokens y `auth.isAuthenticated`
 *    quedo en true: ofrecemos un boton para ir a su home.
 *  - Solo se confirmo el correo (sin sesion automatica): invitamos al usuario
 *    a iniciar sesion.
 *
 * Para que el correo apunte aqui hay que setear `emailRedirectTo` en signUp
 * (ya lo hacemos) y agregar la URL a Redirect URLs en el dashboard de
 * Supabase. Detalles: `docs/integracion-backend/03-auth-supabase-redirects.md`.
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { HOME_BY_ROLE } from '@/types/auth'
import logoColor from '@/assets/brand/logo.color.svg'
import BaseButton from '@/components/common/BaseButton.vue'

const auth = useAuthStore()

const home = computed(() => {
  if (auth.needsOnboarding) return '/onboarding'
  if (auth.role) return HOME_BY_ROLE[auth.role]
  return '/auth'
})

const ctaLabel = computed(() =>
  auth.isAuthenticated ? 'Ir al inicio' : 'Iniciar sesión',
)
</script>

<template>
  <div class="confirmed">
    <div class="confirmed__card">
      <img :src="logoColor" alt="40dB Logo" class="confirmed__logo" />

      <div class="confirmed__check" aria-hidden="true">
        <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
          <circle cx="26" cy="26" r="24" class="check-circle" />
          <path d="M16 27 L23 34 L36 19" class="check-path" />
        </svg>
      </div>

      <h1 class="confirmed__title">¡Tu correo fue confirmado!</h1>
      <p class="confirmed__sub">
        Tu cuenta de 40dB está activa. Ya puedes empezar a monitorear y reportar el
        ruido de tu comuna.
      </p>

      <div class="confirmed__actions">
        <BaseButton :to="home" size="lg" class="confirmed__btn">
          {{ ctaLabel }}
          <template #iconRight>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </template>
        </BaseButton>
      </div>

      <p v-if="!auth.isAuthenticated" class="confirmed__hint">
        Si el botón no avanza, inicia sesión manualmente con el correo y contraseña
        que registraste.
      </p>
    </div>
  </div>
</template>

<style scoped>
.confirmed {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px);
  padding: var(--space-12) var(--space-4);
  background:
    radial-gradient(circle at 15% 15%, rgba(0, 77, 64, 0.06), transparent 50%),
    radial-gradient(circle at 85% 85%, rgba(255, 171, 145, 0.1), transparent 50%),
    var(--color-bg-alt);
}

.confirmed__card {
  width: 100%;
  max-width: 480px;
  padding: var(--space-12) var(--space-8);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.01),
    0 20px 40px -4px rgba(0, 0, 0, 0.04),
    0 1px 0 0 rgba(255, 255, 255, 0.6) inset;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.confirmed__logo {
  height: 96px;
  width: auto;
  margin-bottom: var(--space-8);
  display: block;
}

.confirmed__check {
  width: 80px;
  height: 80px;
  margin-bottom: var(--space-6);
  filter: drop-shadow(0 8px 16px rgba(27, 94, 32, 0.12));
}

.confirmed__check svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: var(--color-success);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.confirmed__check svg .check-circle {
  fill: rgba(27, 94, 32, 0.06);
  stroke: rgba(27, 94, 32, 0.15);
  stroke-width: 2;
}

.confirmed__check svg .check-path {
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  animation: draw 500ms 200ms cubic-bezier(0.19, 1, 0.22, 1) forwards;
}

@keyframes draw {
  to { stroke-dashoffset: 0; }
}

.confirmed__title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  letter-spacing: -0.02em;
}

.confirmed__sub {
  margin: 0 0 var(--space-8);
  color: var(--color-text-muted);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  max-width: 38ch;
}

.confirmed__actions {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-4);
}

.confirmed__btn {
  min-width: 220px;
  box-shadow: 0 4px 12px rgba(0, 77, 64, 0.15);
  transition: all 0.2s ease;
}

.confirmed__btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 77, 64, 0.25);
}

.confirmed__hint {
  margin: var(--space-3) 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  max-width: 34ch;
  line-height: var(--leading-normal);
}
</style>
