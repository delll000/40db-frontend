<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { http } from '@/services/http'
import { catalogosService } from '@/services/catalogos.service'
import { useAuthStore } from '@/stores/auth'
import { HOME_BY_ROLE } from '@/types/auth'
import { useApiError } from '@/composables/useApiError'
import { useToast } from '@/composables/useToast'
import logoColor from '@/assets/brand/logo.color.svg'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import type { Comuna, UsuarioMe, UsuarioPatch } from '@/types/api'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const { showError } = useApiError()

const comunas = ref<Comuna[]>([])
const loadingComunas = ref(true)
const submitting = ref(false)

const form = ref({ telefono: '', comunaId: '' })
const errors = ref<{ telefono?: string; comunaId?: string }>({})

const comunaOptions = computed(() =>
  comunas.value.map((c) => ({ value: c.id, label: c.nombre })),
)

onMounted(async () => {
  try {
    comunas.value = await catalogosService.getComunas()
  } catch (e) {
    showError(e, 'No se pudo cargar el listado de comunas')
  } finally {
    loadingComunas.value = false
  }
})

function validate(): boolean {
  errors.value = {}
  // E.164: + seguido de 8-15 dígitos (api.md §4.11 menciona regex E.164).
  if (!/^\+[1-9]\d{7,14}$/.test(form.value.telefono.trim())) {
    errors.value.telefono = 'Formato esperado: +56912345678'
  }
  if (!form.value.comunaId) {
    errors.value.comunaId = 'Selecciona una comuna'
  }
  return Object.keys(errors.value).length === 0
}

async function onSubmit() {
  if (!validate()) return
  submitting.value = true
  try {
    const body: UsuarioPatch = {
      telefono: form.value.telefono.trim(),
      comuna_id: Number(form.value.comunaId),
    }
    const updated = await http.patch<UsuarioMe>('/api/v1/usuarios/me', { json: body })
    // Sincroniza el store con el perfil actualizado.
    auth.profile = updated
    toast.success('Perfil completo', 'Ya puedes empezar a usar la plataforma.')
    const home = auth.role ? HOME_BY_ROLE[auth.role] : '/home'
    await router.replace(home)
  } catch (e) {
    showError(e, 'No se pudo guardar tu perfil')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="ob">
    <div class="ob__card">
      <img :src="logoColor" alt="40dB Logo" class="ob__logo" />
      <h1 class="ob__title">Completa tu perfil</h1>
      <p class="ob__sub">
        Necesitamos saber tu comuna para mostrarte el ruido de tu zona y enrutar tus
        reportes al municipio correcto.
      </p>

      <div v-if="loadingComunas" class="ob__loading">
        <BaseSpinner size="md" />
        <span>Cargando comunas…</span>
      </div>

      <form v-else class="ob__form" @submit.prevent="onSubmit">
        <div class="ob__fields">
          <BaseInput
            v-model="form.telefono"
            label="Teléfono de contacto"
            type="tel"
            inputmode="tel"
            placeholder="+56912345678"
            autocomplete="tel"
            hint="Usa el formato internacional (ej: +56912345678)."
            required
            :error="errors.telefono"
          />
          <BaseSelect
            :model-value="form.comunaId"
            :options="comunaOptions"
            label="Tu Comuna"
            placeholder="Selecciona tu comuna…"
            required
            :error="errors.comunaId"
            @update:model-value="(v) => (form.comunaId = String(v))"
          />
        </div>
        
        <BaseButton type="submit" :loading="submitting" size="lg" class="ob__btn">
          Guardar y continuar
          <template #iconRight>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </template>
        </BaseButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.ob {
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

.ob__card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.01),
    0 20px 40px -4px rgba(0, 0, 0, 0.04),
    0 1px 0 0 rgba(255, 255, 255, 0.6) inset;
  padding: var(--space-12) var(--space-8);
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
}

.ob__logo {
  display: block;
  height: 96px;
  width: auto;
  margin: 0 auto var(--space-8);
}

.ob__title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  text-align: center;
  letter-spacing: -0.02em;
}

.ob__sub {
  margin: 0 0 var(--space-8);
  color: var(--color-text-muted);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  text-align: center;
  max-width: 40ch;
  margin-left: auto;
  margin-right: auto;
}

.ob__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.ob__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.ob__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.ob__btn {
  min-width: 220px;
  align-self: center;
  box-shadow: 0 4px 12px rgba(0, 77, 64, 0.15);
  transition: all 0.2s ease;
}

.ob__btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 77, 64, 0.25);
}
</style>
