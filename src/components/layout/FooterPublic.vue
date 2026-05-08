<script setup lang="ts">
import logoMonoBlack from '@/assets/brand/logo-mono-black.svg'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="fp">
    <div class="fp__inner">
      <div class="fp__brand">
        <img :src="logoMonoBlack" alt="40dB" class="fp__logo" />
        <p class="fp__tagline">
          Plataforma de monitoreo y reporte de ruido en la comuna de Maipú.
        </p>
      </div>

      <div class="fp__cols">
        <div class="fp__col">
          <h4 class="fp__title">Plataforma</h4>
          <ul class="fp__list">
            <li><router-link to="/home">Inicio</router-link></li>
            <li><router-link to="/auth">Iniciar sesión</router-link></li>
          </ul>
        </div>
        <div class="fp__col">
          <h4 class="fp__title">Legal</h4>
          <ul class="fp__list">
            <li><a href="#" @click.prevent>Términos y condiciones</a></li>
            <li><a href="#" @click.prevent>Política de privacidad</a></li>
          </ul>
        </div>
        <div class="fp__col">
          <h4 class="fp__title">Contacto</h4>
          <ul class="fp__list">
            <li>contacto@40db.cl</li>
            <li>Maipú, Región Metropolitana</li>
          </ul>
        </div>
      </div>
    </div>
    <div class="fp__bottom">© {{ year }} 40dB · Todos los derechos reservados.</div>
  </footer>
</template>

<style scoped>
.fp {
  background: var(--color-bg-alt);
  border-top: 1px solid var(--color-border);
  margin-top: auto;
}
.fp__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-12) var(--space-6) var(--space-8);
  display: grid;
  grid-template-columns: 1.2fr 2fr;
  gap: var(--space-12);
}

@media (max-width: 720px) {
  .fp__inner {
    grid-template-columns: 1fr;
    gap: var(--space-8);
  }
}

.fp__logo {
  height: 32px;
  width: auto;
  margin-bottom: var(--space-3);
}
.fp__tagline {
  margin: 0;
  color: var(--color-text-muted);
  max-width: 360px;
}

.fp__cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}
@media (max-width: 720px) {
  .fp__cols {
    grid-template-columns: 1fr 1fr;
  }
}

.fp__title {
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  margin: 0 0 var(--space-3);
}

.fp__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-sm);
}
.fp__list a {
  color: var(--color-text);
}
.fp__list a:hover {
  color: var(--color-primary);
}

.fp__bottom {
  border-top: 1px solid var(--color-border);
  padding: var(--space-4) var(--space-6);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  max-width: 1200px;
  margin: 0 auto;
}
</style>
