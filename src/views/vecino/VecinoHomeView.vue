<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { reportsService } from '@/services/reports.service'
import { sensorsService } from '@/services/sensors.service'
import { useHeatmapData } from '@/composables/useHeatmapData'
import { defaultHeatmapFilters } from '@/types/filters'
import HeatmapMap from '@/components/mapa/HeatmapMap.vue'
import HeatmapLegend from '@/components/mapa/HeatmapLegend.vue'
import KpiCard from '@/components/common/KpiCard.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import { REPORT_CATEGORIES } from '@/types/report'
import type { Report } from '@/types/report'

const auth = useAuthStore()
const toast = useToast()

// Datos del heatmap (read-only, usamos los mismos puntos que admin)
const filters = ref(defaultHeatmapFilters())
const { points, kpis, loading } = useHeatmapData(filters)

const zones = ref<string[]>([])
const myReports = ref<Report[]>([])

onMounted(async () => {
  zones.value = await sensorsService.zones()
  // TODO rama 4 (feat/reportes-real): reemplazar por GET /api/v1/reportes/mios.
  // El back ya scopea por JWT; no se necesita email del usuario.
})

const lastReport = computed<Report | null>(() => myReports.value[0] ?? null)

// Modal "Realizar reporte"
const reportOpen = ref(false)
const submitting = ref(false)
const form = ref({
  category: '',
  description: '',
  zone: '',
  address: '',
})
const errors = ref<Record<string, string>>({})

function openReport() {
  form.value = { category: '', description: '', zone: '', address: '' }
  errors.value = {}
  reportOpen.value = true
}

function validate(): boolean {
  errors.value = {}
  if (!form.value.category) errors.value.category = 'Selecciona una categoría'
  if (!form.value.zone) errors.value.zone = 'Selecciona una zona'
  if (!form.value.address.trim()) errors.value.address = 'Ingresa una dirección'
  if (form.value.description.trim().length < 10) {
    errors.value.description = 'Describe la situación con al menos 10 caracteres'
  }
  return Object.keys(errors.value).length === 0
}

async function submitReport() {
  if (!auth.profile) return
  if (!validate()) return
  submitting.value = true
  try {
    // TODO rama 4: payload contra POST /api/v1/reportes (titulo, descripcion,
    // latitud, longitud, lectura_evidencia_id?). Mientras tanto, mock con
    // los campos legacy del front (citizenEmail toma un placeholder).
    const created = await reportsService.create({
      citizenName: auth.profile.nombre,
      citizenEmail: `${auth.profile.id}@placeholder.local`,
      category: form.value.category,
      description: form.value.description,
      zone: form.value.zone,
      address: form.value.address,
    })
    myReports.value = [created, ...myReports.value]
    toast.success(
      'Reporte enviado',
      'Recibirás una notificación cuando un funcionario lo gestione.',
    )
    reportOpen.value = false
  } catch (e) {
    toast.error('No se pudo enviar', e instanceof Error ? e.message : 'Intenta nuevamente.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="vh">
    <!-- Hero del vecino -->
    <header class="vh__hero">
      <div>
        <p class="vh__eyebrow">Mi comuna</p>
        <h1 class="vh__title">Hola, {{ auth.profile?.nombre }}</h1>
        <p class="vh__sub">
          Consulta el ruido de tu sector en tiempo real y reporta al municipio cuando
          superes los niveles tolerables.
        </p>
      </div>
      <BaseButton size="lg" @click="openReport">
        <template #iconLeft>＋</template>
        Realizar reporte
      </BaseButton>
    </header>

    <!-- Resumen vecino -->
    <section class="vh__sec">
      <h2 class="vh__sec-title">Resumen de tu zona</h2>
      <div class="vh__kpis">
        <KpiCard
          label="Nivel medio actual"
          :value="kpis?.avgDb ?? '—'"
          unit="dB(A)"
          icon="◐"
          :loading="loading"
        />
        <KpiCard
          label="Zonas críticas"
          :value="kpis?.zonesOverStandard ?? '—'"
          sub="DS 14/2024"
          icon="!"
          :tone="kpis && kpis.zonesOverStandard > 2 ? 'warning' : 'primary'"
          :loading="loading"
        />
        <KpiCard
          label="Mis reportes"
          :value="myReports.length"
          :sub="lastReport ? `Último: ${new Date(lastReport.createdAt).toLocaleDateString('es-CL')}` : 'Aún no has reportado'"
          icon="✎"
          tone="neutral"
        />
      </div>
    </section>

    <!-- Mapa embebido -->
    <section class="vh__sec">
      <div class="vh__sec-head">
        <h2 class="vh__sec-title">Tu comuna en tiempo real</h2>
        <HeatmapLegend />
      </div>
      <div class="vh__map">
        <HeatmapMap :points="points" readonly min-height="420px" />
      </div>
    </section>

    <!-- Mis reportes anteriores -->
    <section v-if="myReports.length > 0" class="vh__sec">
      <h2 class="vh__sec-title">Mis reportes recientes</h2>
      <div class="vh__reports">
        <BaseCard v-for="r in myReports" :key="r.id" padding="md">
          <header class="vh__r-head">
            <span class="vh__r-cat">
              {{ REPORT_CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category }}
            </span>
            <span class="vh__r-date">{{ new Date(r.createdAt).toLocaleString('es-CL') }}</span>
          </header>
          <p class="vh__r-desc">{{ r.description }}</p>
          <p class="vh__r-meta">{{ r.zone }} · {{ r.address }}</p>
        </BaseCard>
      </div>
    </section>

    <!-- Modal Realizar reporte -->
    <BaseModal v-model="reportOpen" title="Realizar un reporte de ruido" size="md">
      <form class="form" @submit.prevent="submitReport">
        <BaseSelect
          label="Categoría"
          :model-value="form.category"
          :options="[...REPORT_CATEGORIES]"
          placeholder="Selecciona una categoría…"
          required
          :error="errors.category"
          @update:model-value="(v) => (form.category = String(v))"
        />
        <BaseSelect
          label="Zona"
          :model-value="form.zone"
          :options="zones.map((z) => ({ value: z, label: z }))"
          placeholder="Selecciona la zona…"
          required
          :error="errors.zone"
          @update:model-value="(v) => (form.zone = String(v))"
        />
        <BaseInput
          v-model="form.address"
          label="Dirección"
          placeholder="Ej: Av. Pajaritos 1234"
          required
          :error="errors.address"
        />
        <BaseInput
          v-model="form.description"
          label="Describe la situación"
          textarea
          :rows="4"
          placeholder="Cuéntanos qué está ocurriendo, a qué hora, con qué frecuencia…"
          required
          :error="errors.description"
        />
      </form>
      <template #footer="{ close }">
        <BaseButton variant="ghost" :disabled="submitting" @click="close">Cancelar</BaseButton>
        <BaseButton :loading="submitting" @click="submitReport">Enviar reporte</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.vh {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.vh__hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  background: linear-gradient(135deg, var(--color-primary), #006054);
  color: #fff;
  padding: var(--space-8);
  border-radius: var(--radius-lg);
}
.vh__eyebrow {
  margin: 0;
  color: var(--color-accent);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: var(--text-sm);
}
.vh__title {
  margin: var(--space-1) 0 var(--space-2);
  color: #fff;
}
.vh__sub {
  margin: 0;
  max-width: 540px;
  color: rgba(255, 255, 255, 0.85);
}

.vh__sec {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.vh__sec-title {
  margin: 0;
  font-size: var(--text-lg);
}

.vh__sec-head {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.vh__kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}
@media (max-width: 720px) {
  .vh__kpis {
    grid-template-columns: 1fr;
  }
}

.vh__map {
  height: 420px;
}

.vh__reports {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-3);
}

.vh__r-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.vh__r-cat {
  background: var(--color-bg-alt);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-primary);
}

.vh__r-date {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.vh__r-desc {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
}

.vh__r-meta {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
