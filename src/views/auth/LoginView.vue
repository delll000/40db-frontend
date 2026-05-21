<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { HOME_BY_ROLE } from '@/types/auth'
import { useToast } from '@/composables/useToast'
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
    <div class="auth__card">
      <img :src="logoColor" alt="40dB" class="auth__logo" />
      <h1 class="auth__title">
        {{ mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta' }}
      </h1>
      <p class="auth__sub">
        {{
          mode === 'login'
            ? 'Accede con tu correo institucional para continuar.'
            : 'Regístrate con tu correo para reportar y monitorear el ruido de tu comuna.'
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
        <BaseInput
          v-model="form.password"
          label="Contraseña"
          type="password"
          placeholder="Mínimo 8 caracteres"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          required
          :error="errors.password"
        />

        <BaseButton type="submit" :loading="loading" size="lg" block>
          {{ submitLabel }}
        </BaseButton>
      </form>

      <p v-if="emailConfirmationPending" class="auth__hint">
        Te enviamos un correo para confirmar tu cuenta. Una vez confirmada, vuelve a esta
        pantalla e inicia sesión.
      </p>

      <p class="auth__terms">
        Al continuar aceptas los
        <a href="#" @click.prevent>Términos y Condiciones</a> y la
        <a href="#" @click.prevent>Política de Privacidad</a>.
      </p>
    </div>
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
  padding: var(--space-10) var(--space-8);
  width: 100%;
  max-width: 460px;
  text-align: center;
}

.auth__logo {
  height: 48px;
  width: auto;
  margin: 0 auto var(--space-4);
}

.auth__title {
  margin: 0 0 var(--space-2);
}

.auth__sub {
  margin: 0 0 var(--space-6);
  color: var(--color-text-muted);
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
  transition: background 150ms ease, color 150ms ease;
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
  text-align: left;
}

.auth__hint {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: rgba(0, 77, 64, 0.06);
  color: var(--color-text);
  font-size: var(--text-sm);
}

.auth__terms {
  margin-top: var(--space-6);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.auth__terms a {
  color: var(--color-primary);
  text-decoration: underline;
}
</style>
