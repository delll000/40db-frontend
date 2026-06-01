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
      <img :src="logoColor" alt="40dB" class="ob__logo" />
      <h1 class="ob__title">Completa tu perfil</h1>
      <p class="ob__sub">
        Necesitamos saber tu comuna para mostrarte el ruido de tu zona y enrutar tus
        reportes al municipio correcto.
      </p>

      <div v-if="loadingComunas" class="ob__loading">
        <BaseSpinner size="md" />
        Cargando comunas…
      </div>

      <form v-else class="ob__form" @submit.prevent="onSubmit">
        <BaseInput
          v-model="form.telefono"
          label="Teléfono"
          type="tel"
          inputmode="tel"
          placeholder="+56912345678"
          autocomplete="tel"
          hint="Formato internacional E.164, comenzando con +56."
          required
          :error="errors.telefono"
        />
        <BaseSelect
          :model-value="form.comunaId"
          :options="comunaOptions"
          label="Comuna"
          placeholder="Selecciona tu comuna…"
          required
          :error="errors.comunaId"
          @update:model-value="(v) => (form.comunaId = String(v))"
        />
        <BaseButton type="submit" :loading="submitting" size="lg" block>
          Guardar y continuar
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
  padding: var(--space-8) var(--space-4);
  background:
    radial-gradient(circle at top, rgba(0, 77, 64, 0.06), transparent 60%),
    var(--color-bg-alt);
}

.ob__card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-10) var(--space-8);
  width: 100%;
  max-width: 460px;
}

.ob__logo {
  display: block;
  height: 56px;
  margin: 0 auto var(--space-4);
}

.ob__title {
  margin: 0 0 var(--space-2);
  text-align: center;
}

.ob__sub {
  margin: 0 0 var(--space-6);
  color: var(--color-text-muted);
  text-align: center;
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
  gap: var(--space-4);
}
</style>
