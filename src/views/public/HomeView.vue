<script setup lang="ts">
import { computed } from 'vue'
import isotipo from '@/assets/brand/isotipo.svg'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import { useAuthStore } from '@/stores/auth'
import { HOME_BY_ROLE } from '@/types/auth'

const auth = useAuthStore()

const ctaTo = computed(() => {
  if (auth.isAuthenticated && auth.role) return HOME_BY_ROLE[auth.role]
  return '/auth'
})

const ctaLabel = computed(() => (auth.isAuthenticated ? 'Ir a mi panel' : 'Iniciar sesión'))

interface Step {
  icon: string
  title: string
  body: string
}

const steps: Step[] = [
  {
    icon: '◍',
    title: 'Detectamos',
    body: 'Sensores IoT acústicos miden el ruido de tu comuna en tiempo real, las 24 horas.',
  },
  {
    icon: '✎',
    title: 'Reportas',
    body: 'Si detectas niveles excesivos, generas tu reporte con respaldo de mediciones objetivas.',
  },
  {
    icon: '◎',
    title: 'Atendemos',
    body: 'Funcionarios municipales reciben, gestionan y responden cada reporte hasta cerrarlo.',
  },
]
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <div class="hero__inner">
        <div class="hero__text">
          <p class="hero__eyebrow">Plataforma municipal</p>
          <h1 class="hero__title">
            Reporta el ruido de tu comuna,
            <span class="hero__accent">con evidencia.</span>
          </h1>
          <p class="hero__sub">
            40dB es el sistema de monitoreo y denuncia de ruido para Maipú. Tus reportes
            están respaldados por una red de sensores acústicos externos, para que cada
            denuncia llegue con datos verificables al municipio.
          </p>
          <div class="hero__cta">
            <BaseButton :to="ctaTo" size="lg">{{ ctaLabel }}</BaseButton>
            <BaseButton href="#como-funciona" variant="ghost" size="lg">
              Cómo funciona
            </BaseButton>
          </div>
        </div>
        <div class="hero__art" aria-hidden="true">
          <img :src="isotipo" alt="" class="hero__iso" />
        </div>
      </div>
    </section>

    <!-- Cómo funciona -->
    <section id="como-funciona" class="section">
      <div class="section__inner">
        <header class="section__head">
          <h2>Cómo funciona</h2>
          <p>Tres pasos para llevar el ruido de tu sector al municipio.</p>
        </header>
        <div class="steps">
          <BaseCard v-for="(s, i) in steps" :key="s.title" padding="lg">
            <div class="step">
              <span class="step__num">0{{ i + 1 }}</span>
              <span class="step__icon" aria-hidden="true">{{ s.icon }}</span>
              <h3 class="step__title">{{ s.title }}</h3>
              <p class="step__body">{{ s.body }}</p>
            </div>
          </BaseCard>
        </div>
      </div>
    </section>

    <!-- Propuesta institucional -->
    <section class="section section--alt">
      <div class="section__inner pitch">
        <div class="pitch__copy">
          <h2>Una alianza municipal por barrios más sanos</h2>
          <p>
            La exposición prolongada al ruido afecta el descanso, la salud y la
            convivencia. 40dB facilita la denuncia con un canal directo al municipio,
            respaldado por mediciones objetivas según DS 14/2024.
          </p>
          <ul class="pitch__list">
            <li>Sensores fijos en sectores residenciales y comerciales.</li>
            <li>Mapa de calor actualizado cada 60 segundos.</li>
            <li>Trazabilidad completa de cada reporte: activa → atendida → cerrada.</li>
          </ul>
          <BaseButton to="/auth" size="md">Comenzar ahora</BaseButton>
        </div>
        <div class="pitch__quote">
          <blockquote>
            "Facilitamos las denuncias de ruido al municipio, respaldadas por
            sensores acústicos externos."
          </blockquote>
          <p class="pitch__author">— Manifiesto 40dB</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: block;
}

/* ---------- Hero ---------- */
.hero {
  background: linear-gradient(135deg, var(--color-primary) 0%, #006054 60%, #007a6a 100%);
  color: #fff;
  padding: var(--space-16) var(--space-6);
}

.hero__inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: var(--space-12);
  align-items: center;
}

@media (max-width: 880px) {
  .hero__inner {
    grid-template-columns: 1fr;
    gap: var(--space-8);
  }
}

.hero__eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-accent);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  margin: 0 0 var(--space-3);
}

.hero__title {
  font-size: clamp(2rem, 4vw, var(--text-3xl));
  margin: 0 0 var(--space-4);
  color: #fff;
  line-height: 1.15;
}

.hero__accent {
  color: var(--color-accent);
}

.hero__sub {
  margin: 0 0 var(--space-6);
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  color: rgba(255, 255, 255, 0.9);
  max-width: 560px;
}

.hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
/*
 * Sobre el gradiente verde del hero, el ghost debe ser blanco. Calzamos la
 * especificidad del hover de BaseButton (`:not(.is-disabled):not(.is-loading)`)
 * para que el fondo translúcido gane y el texto no quede blanco-sobre-blanco.
 */
.hero__cta :deep(.btn--ghost) {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
}
.hero__cta :deep(.btn--ghost:hover:not(.is-disabled):not(.is-loading)) {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.7);
}

.hero__art {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero__iso {
  width: 220px;
  height: auto;
  filter: drop-shadow(0 12px 32px rgba(0, 0, 0, 0.25));
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  padding: var(--space-8);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

/* ---------- Sections ---------- */
.section {
  padding: var(--space-16) var(--space-6);
}

.section--alt {
  background: var(--color-bg-alt);
}

.section__inner {
  max-width: 1200px;
  margin: 0 auto;
}

.section__head {
  text-align: center;
  margin-bottom: var(--space-12);
}

.section__head h2 {
  margin: 0 0 var(--space-2);
}

.section__head p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-lg);
}

/* ---------- Steps ---------- */
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}

@media (max-width: 880px) {
  .steps {
    grid-template-columns: 1fr;
  }
}

.step {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.step__num {
  font-family: var(--font-heading);
  font-weight: var(--font-bold);
  color: var(--color-accent);
  font-size: var(--text-sm);
  letter-spacing: 0.1em;
}

.step__icon {
  font-size: 2.5rem;
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: var(--space-2);
}

.step__title {
  margin: 0;
}

.step__body {
  margin: 0;
  color: var(--color-text-muted);
}

/* ---------- Pitch ---------- */
.pitch {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--space-12);
  align-items: center;
}

@media (max-width: 880px) {
  .pitch {
    grid-template-columns: 1fr;
  }
}

.pitch__copy h2 {
  margin: 0 0 var(--space-4);
}

.pitch__copy p {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  line-height: var(--leading-relaxed);
}

.pitch__list {
  margin: 0 0 var(--space-6);
  padding: 0 0 0 var(--space-6);
  color: var(--color-text);
}

.pitch__list li {
  margin-bottom: var(--space-2);
}

.pitch__quote {
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--color-accent);
  padding: var(--space-8);
  box-shadow: var(--shadow-sm);
}

.pitch__quote blockquote {
  margin: 0 0 var(--space-3);
  font-size: var(--text-lg);
  font-family: var(--font-heading);
  color: var(--color-text);
  line-height: var(--leading-tight);
}

.pitch__author {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}
</style>
