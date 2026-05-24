<script setup lang="ts">
/**
 * 404 visible. La ruta catch-all del router monta esta vista en lugar de
 * redirigir a `/home`, porque silenciar un 404 esconde bugs (typo en un
 * router-link, ruta deprecada compartida por URL, deep-link roto).
 *
 * Si el usuario llego aqui haciendo F5 en una ruta valida y el hosting no
 * tiene SPA fallback (Vercel rewrites en `vercel.json`), revisar
 * `docs/integracion-backend/05-deploy-spa-fallback.md`.
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { HOME_BY_ROLE } from '@/types/auth'
import logoColor from '@/assets/brand/logo.color.svg'
import BaseButton from '@/components/common/BaseButton.vue'

const auth = useAuthStore()

const home = computed(() => {
  if (!auth.isAuthenticated) return '/home'
  if (auth.needsOnboarding) return '/onboarding'
  return auth.role ? HOME_BY_ROLE[auth.role] : '/home'
})
</script>

<template>
  <div class="nf">
    <div class="nf__card">
      <img :src="logoColor" alt="40dB" class="nf__logo" />
      <p class="nf__code" aria-hidden="true">404</p>
      <h1 class="nf__title">No encontramos esta página</h1>
      <p class="nf__sub">
        El enlace que seguiste puede estar roto, o la página fue movida.
        Volvamos a un lugar conocido.
      </p>
      <div class="nf__actions">
        <BaseButton :to="home" size="lg">Ir al inicio</BaseButton>
        <BaseButton to="/heatmap" variant="ghost" size="lg">
          Ver mapa de ruido
        </BaseButton>
      </div>
    </div>

    <!-- Onda decorativa que evoca dB / sonido -->
    <svg class="nf__wave" viewBox="0 0 600 80" aria-hidden="true">
      <polyline
        points="0,40 30,30 60,55 90,20 120,60 150,35 180,50 210,15 240,65 270,30 300,50 330,25 360,55 390,35 420,50 450,20 480,60 510,30 540,55 570,40 600,40"
      />
    </svg>
  </div>
</template>

<style scoped>
.nf {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px);
  padding: var(--space-8) var(--space-4);
  background:
    radial-gradient(circle at 20% 0%, rgba(0, 77, 64, 0.06), transparent 55%),
    radial-gradient(circle at 80% 100%, rgba(255, 171, 145, 0.1), transparent 60%),
    var(--color-bg-alt);
  overflow: hidden;
}

.nf__card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 520px;
  padding: var(--space-10) var(--space-8);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  text-align: center;
}

.nf__logo {
  height: 40px;
  width: auto;
  margin: 0 auto var(--space-6);
}

.nf__code {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 6rem;
  font-weight: var(--font-bold);
  line-height: 1;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nf__title {
  margin: var(--space-3) 0 var(--space-3);
  font-size: var(--text-2xl);
  color: var(--color-text);
}

.nf__sub {
  margin: 0 0 var(--space-6);
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
}

.nf__actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  flex-wrap: wrap;
}

.nf__wave {
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 120px;
  opacity: 0.25;
  pointer-events: none;
}

.nf__wave polyline {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
