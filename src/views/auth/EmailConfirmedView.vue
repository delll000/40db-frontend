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
      <img :src="logoColor" alt="40dB" class="confirmed__logo" />

      <div class="confirmed__check" aria-hidden="true">
        <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
          <circle cx="26" cy="26" r="24" />
          <path d="M14 27 L23 36 L39 18" />
        </svg>
      </div>

      <h1 class="confirmed__title">¡Tu correo fue confirmado!</h1>
      <p class="confirmed__sub">
        Tu cuenta de 40dB está activa. Ya puedes empezar a monitorear y reportar el
        ruido de tu comuna.
      </p>

      <BaseButton :to="home" size="lg" block>
        {{ ctaLabel }}
      </BaseButton>

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
  padding: var(--space-8) var(--space-4);
  background:
    radial-gradient(circle at 20% 10%, rgba(0, 77, 64, 0.08), transparent 55%),
    radial-gradient(circle at 80% 90%, rgba(255, 171, 145, 0.12), transparent 60%),
    var(--color-bg-alt);
}

.confirmed__card {
  width: 100%;
  max-width: 440px;
  padding: var(--space-10) var(--space-8);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  text-align: center;
}

.confirmed__logo {
  height: 56px;
  width: auto;
  margin: 0 auto var(--space-6);
}

.confirmed__check {
  width: 84px;
  height: 84px;
  margin: 0 auto var(--space-6);
  animation: pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.confirmed__check svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: var(--color-success);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.confirmed__check svg circle {
  fill: rgba(27, 94, 32, 0.08);
}

.confirmed__check svg path {
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  animation: draw 480ms 200ms ease-out forwards;
}

@keyframes pop {
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes draw {
  to { stroke-dashoffset: 0; }
}

.confirmed__title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-2xl);
  color: var(--color-text);
}

.confirmed__sub {
  margin: 0 0 var(--space-6);
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
}

.confirmed__hint {
  margin: var(--space-4) 0 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
