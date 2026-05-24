<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { HOME_BY_ROLE } from '@/types/auth'
import { useToast } from '@/composables/useToast'
import logoMonoWhite from '@/assets/brand/logo-mono-white.svg'
import logoColor from '@/assets/brand/logo.color.svg'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

type Mode = 'login' | 'signup'
const mode = ref<Mode>('login')
const loading = ref(false)
const emailConfirmationPending = ref(false)
const showPassword = ref(false)

const form = ref({ email: '', password: '', nombre: '' })
const errors = ref<{ email?: string; password?: string; nombre?: string }>({})

const submitLabel = computed(() =>
  mode.value === 'login' ? 'Iniciar sesión' : 'Crear cuenta',
)

function switchMode(next: Mode) {
  mode.value = next
  errors.value = {}
  emailConfirmationPending.value = false
}

function validate(): boolean {
  errors.value = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Ingresa un correo válido.'
  }
  if (form.value.password.length < 8) {
    errors.value.password = 'Mínimo 8 caracteres.'
  }
  if (mode.value === 'signup' && form.value.nombre.trim().length < 2) {
    errors.value.nombre = 'Ingresa tu nombre.'
  }
  return Object.keys(errors.value).length === 0
}

async function onSubmit() {
  if (!validate()) return
  loading.value = true
  emailConfirmationPending.value = false
  try {
    if (mode.value === 'login') {
      await auth.signInWithPassword({
        email: form.value.email,
        password: form.value.password,
      })
      await redirectAfterAuth()
      return
    }

    const { needsEmailConfirmation } = await auth.signUp({
      email: form.value.email,
      password: form.value.password,
      nombre: form.value.nombre.trim(),
    })
    if (needsEmailConfirmation) {
      emailConfirmationPending.value = true
      toast.info(
        'Revisa tu correo',
        'Te enviamos un enlace para confirmar tu cuenta antes de continuar.',
      )
      return
    }
    await redirectAfterAuth()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Intenta nuevamente.'
    toast.error('No fue posible continuar', message)
  } finally {
    loading.value = false
  }
}

async function redirectAfterAuth() {
  if (auth.needsOnboarding) {
    await router.replace({ path: '/onboarding', query: route.query })
    return
  }
  const fallback = auth.role ? HOME_BY_ROLE[auth.role] : '/home'
  const redirect = (route.query.redirect as string | undefined) ?? fallback
  toast.success(`Bienvenido, ${auth.displayName}`)
  await router.replace(redirect)
}
</script>

<template>
  <div class="auth">
    <!-- Hero (oculto en mobile). Refuerza marca y propuesta de valor. -->
    <aside class="auth__hero" aria-hidden="true">
      <div class="auth__hero-inner">
        <img :src="logoMonoWhite" alt="" class="auth__hero-logo" />
        <h2 class="auth__hero-title">
          Monitorea el ruido de tu comuna en tiempo real.
        </h2>
        <p class="auth__hero-sub">
          Reporta, visualiza y gestiona la contaminación acústica con datos
          IoT validados por la Municipalidad.
        </p>
        <ul class="auth__hero-features">
          <li>
            <span class="auth__hero-icon" aria-hidden="true">◐</span>
            <div>
              <strong>Mapa de calor en vivo</strong>
              <span>Niveles dB(A) de los micrófonos desplegados en terreno.</span>
            </div>
          </li>
          <li>
            <span class="auth__hero-icon" aria-hidden="true">✎</span>
            <div>
              <strong>Reportes con evidencia</strong>
              <span>Adjunta lectura del sensor más cercano automáticamente.</span>
            </div>
          </li>
          <li>
            <span class="auth__hero-icon" aria-hidden="true">⚙</span>
            <div>
              <strong>Cumple el DS 14/2024</strong>
              <span>Histórico fiscalizable y umbrales según la normativa.</span>
            </div>
          </li>
        </ul>
      </div>
    </aside>

    <!-- Panel del formulario -->
    <section class="auth__panel">
      <div class="auth__card">
        <router-link to="/home" class="auth__brand">
          <img :src="logoColor" alt="40dB" class="auth__brand-logo" />
        </router-link>

        <h1 class="auth__title">
          {{ mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta' }}
        </h1>
        <p class="auth__sub">
          {{
            mode === 'login'
              ? 'Inicia sesión para continuar gestionando tu comuna.'
              : 'Solo necesitas un correo válido para empezar.'
          }}
        </p>

        <div class="auth__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'login'"
            :class="['tab', { 'tab--active': mode === 'login' }]"
            :disabled="loading"
            @click="switchMode('login')"
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'signup'"
            :class="['tab', { 'tab--active': mode === 'signup' }]"
            :disabled="loading"
            @click="switchMode('signup')"
          >
            Crear cuenta
          </button>
        </div>

        <form class="auth__form" @submit.prevent="onSubmit">
          <BaseInput
            v-if="mode === 'signup'"
            v-model="form.nombre"
            label="Nombre"
            placeholder="Tu nombre y apellido"
            autocomplete="name"
            required
            :error="errors.nombre"
          />
          <BaseInput
            v-model="form.email"
            label="Correo electrónico"
            type="email"
            inputmode="email"
            placeholder="tu@correo.cl"
            autocomplete="email"
            required
            :error="errors.email"
          />
          <div class="auth__pw">
            <BaseInput
              v-model="form.password"
              label="Contraseña"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Mínimo 8 caracteres"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              required
              :error="errors.password"
            />
            <button
              type="button"
              class="auth__pw-toggle"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              :aria-pressed="showPassword"
              tabindex="-1"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>

          <BaseButton type="submit" :loading="loading" size="lg" block>
            {{ submitLabel }}
          </BaseButton>
        </form>

        <div v-if="emailConfirmationPending" class="auth__hint" role="status">
          <span class="auth__hint-icon" aria-hidden="true">✉</span>
          <div>
            <strong>Revisa tu correo</strong>
            <p>Te enviamos un enlace para confirmar tu cuenta. Una vez confirmada vuelve aquí e inicia sesión.</p>
          </div>
        </div>

        <p class="auth__terms">
          Al continuar aceptas los
          <a href="#" @click.prevent>Términos y Condiciones</a> y la
          <a href="#" @click.prevent>Política de Privacidad</a>.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  min-height: calc(100vh - 80px);
  background: var(--color-bg);
}

@media (max-width: 960px) {
  .auth {
    grid-template-columns: 1fr;
  }
}

/* ── Hero ─────────────────────────────────────────────────────── */
.auth__hero {
  position: relative;
  color: #fff;
  background:
    radial-gradient(circle at 20% 15%, rgba(255, 171, 145, 0.25), transparent 55%),
    radial-gradient(circle at 90% 90%, rgba(255, 171, 145, 0.18), transparent 60%),
    linear-gradient(150deg, var(--color-primary) 0%, #00332b 70%, #001f1a 100%);
  padding: var(--space-12);
  overflow: hidden;
  display: flex;
  align-items: center;
}

@media (max-width: 960px) {
  .auth__hero {
    display: none;
  }
}

/* Decoración: "ondas" sutiles de fondo */
.auth__hero::before,
.auth__hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.06);
  pointer-events: none;
}
.auth__hero::before {
  width: 480px;
  height: 480px;
  left: -160px;
  bottom: -160px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 0 0 80px rgba(255, 255, 255, 0.03);
}
.auth__hero::after {
  width: 280px;
  height: 280px;
  right: -100px;
  top: -100px;
  background: radial-gradient(circle, rgba(255, 171, 145, 0.12), transparent 70%);
  border-color: transparent;
}

.auth__hero-inner {
  position: relative;
  max-width: 460px;
  margin: 0 auto;
}

.auth__hero-logo {
  width: 56px;
  height: auto;
  margin-bottom: var(--space-8);
  opacity: 0.95;
}

.auth__hero-title {
  margin: 0 0 var(--space-4);
  font-family: var(--font-heading);
  font-size: var(--text-3xl);
  line-height: var(--leading-tight);
  color: #fff;
  letter-spacing: -0.01em;
}

.auth__hero-sub {
  margin: 0 0 var(--space-8);
  font-size: var(--text-lg);
  line-height: var(--leading-normal);
  color: rgba(255, 255, 255, 0.78);
}

.auth__hero-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth__hero-features li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.auth__hero-features strong {
  display: block;
  color: #fff;
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
}

.auth__hero-features span:last-child {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.auth__hero-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 171, 145, 0.18);
  color: var(--color-accent);
  flex-shrink: 0;
  font-size: var(--text-lg);
}

/* ── Panel del formulario ─────────────────────────────────────── */
.auth__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-6);
  background:
    radial-gradient(circle at top right, rgba(0, 77, 64, 0.04), transparent 50%),
    var(--color-bg);
}

.auth__card {
  width: 100%;
  max-width: 420px;
}

.auth__brand {
  display: inline-block;
  margin-bottom: var(--space-6);
}

.auth__brand-logo {
  height: 40px;
  width: auto;
}

@media (min-width: 961px) {
  /* En desktop el hero ya carga la marca; ocultamos el logo del panel. */
  .auth__brand {
    display: none;
  }
}

.auth__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xl);
  letter-spacing: -0.01em;
}

.auth__sub {
  margin: 0 0 var(--space-6);
  color: var(--color-text-muted);
  font-size: var(--text-base);
}

.auth__tabs {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-alt);
  padding: 4px;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-6);
}

.tab {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font: inherit;
  font-weight: var(--font-semibold);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease;
}

.tab:hover:not(:disabled):not(.tab--active) {
  color: var(--color-text);
}

.tab--active {
  background: var(--color-bg);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.tab:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth__pw {
  position: relative;
}

.auth__pw-toggle {
  position: absolute;
  top: 30px;
  right: var(--space-3);
  background: transparent;
  border: none;
  font: inherit;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: background 150ms ease;
}

.auth__pw-toggle:hover {
  background: rgba(0, 77, 64, 0.06);
}

.auth__hint {
  margin-top: var(--space-5);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: rgba(0, 77, 64, 0.06);
  border: 1px solid rgba(0, 77, 64, 0.12);
  color: var(--color-text);
  font-size: var(--text-sm);
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.auth__hint strong {
  display: block;
  margin-bottom: 4px;
  color: var(--color-primary);
}

.auth__hint p {
  margin: 0;
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
}

.auth__hint-icon {
  font-size: var(--text-lg);
  flex-shrink: 0;
}

.auth__terms {
  margin-top: var(--space-6);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-align: center;
}

.auth__terms a {
  color: var(--color-primary);
  text-decoration: underline;
}
</style>
