<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useApiError } from '@/composables/useApiError'
import { reportesService } from '@/services/reportes.service'
import { useHeatmapData } from '@/composables/useHeatmapData'
import { defaultHeatmapQuery } from '@/types/filters'
import HeatmapMap from '@/components/mapa/HeatmapMap.vue'
import HeatmapLegend from '@/components/mapa/HeatmapLegend.vue'
import ReporteMapPicker from '@/components/reportes/ReporteMapPicker.vue'
import EvidenciaSensorCard from '@/components/reportes/EvidenciaSensorCard.vue'
import KpiCard from '@/components/common/KpiCard.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import {
  ESTADO_TONE,
  type ReporteListItem,
  type ReporteLecturaEvidencia,
} from '@/types/report'

const auth = useAuthStore()
const toast = useToast()
const { showError } = useApiError()

// Heatmap embebido (mismo backend que la vista /heatmap; bbox lo emite el mapa).
const heatmapQuery = ref(defaultHeatmapQuery())
const { points, kpis, loading: heatmapLoading } = useHeatmapData(heatmapQuery)

function onHeatmapBbox(bbox: string) {
  heatmapQuery.value = { ...heatmapQuery.value, bbox }
}

// Mis reportes (back real)
const myReports = ref<ReporteListItem[]>([])
const nextCursor = ref<string | null>(null)
const loadingReports = ref(true)
const loadingMore = ref(false)

const lastReport = computed(() => myReports.value[0] ?? null)

async function loadMyReports(cursor?: string) {
  const target = cursor ? loadingMore : loadingReports
  target.value = true
  try {
    const res = await reportesService.mios({ limit: 20, cursor })
    myReports.value = cursor ? [...myReports.value, ...res.data] : res.data
    nextCursor.value = res.next_cursor
  } catch (e) {
    showError(e, 'No se pudieron cargar tus reportes')
  } finally {
    target.value = false
  }
}

onMounted(() => loadMyReports())

// ──────────────────────────────────────────────────────────
// Modal: realizar reporte
// ──────────────────────────────────────────────────────────

const reportOpen = ref(false)
const submitting = ref(false)
const form = ref<{
  titulo: string
  descripcion: string
  ubicacion: { latitud: number; longitud: number } | null
}>({ titulo: '', descripcion: '', ubicacion: null })
const errors = ref<Record<string, string>>({})

// Estado de la evidencia
const evidencia = ref<ReporteLecturaEvidencia | null | undefined>(undefined) // undefined = no consultado
const evidenciaLoading = ref(false)
const adjuntarEvidencia = ref(true)

function resetForm() {
  form.value = { titulo: '', descripcion: '', ubicacion: null }
  errors.value = {}
  evidencia.value = undefined
  evidenciaLoading.value = false
  adjuntarEvidencia.value = true
}

function openReport() {
  resetForm()
  reportOpen.value = true
}

async function comprobarEvidencia() {
  if (!form.value.ubicacion) return
  evidenciaLoading.value = true
  evidencia.value = undefined
  try {
    const { evidencia: match } = await reportesService.buscarEvidencia(
      form.value.ubicacion.latitud,
      form.value.ubicacion.longitud,
    )
    evidencia.value = match
    adjuntarEvidencia.value = match !== null
  } catch (e) {
    showError(e, 'No se pudo comprobar la evidencia')
    evidencia.value = undefined
  } finally {
    evidenciaLoading.value = false
  }
}

function validate(): boolean {
  errors.value = {}
  const titulo = form.value.titulo.trim()
  const descripcion = form.value.descripcion.trim()
  if (titulo.length < 3) errors.value.titulo = 'Mínimo 3 caracteres.'
  else if (titulo.length > 120) errors.value.titulo = 'Máximo 120 caracteres.'
  if (descripcion.length < 10) errors.value.descripcion = 'Describe la situación con al menos 10 caracteres.'
  else if (descripcion.length > 2000) errors.value.descripcion = 'Máximo 2000 caracteres.'
  if (!form.value.ubicacion) errors.value.ubicacion = 'Haz clic en el mapa para fijar la ubicación.'
  return Object.keys(errors.value).length === 0
}

async function submitReport() {
  if (!auth.profile || !form.value.ubicacion) return
  if (!validate()) return
  submitting.value = true
  try {
    // Re-validar evidencia justo antes de crear (decisión F5).
    // Cubre dos casos: (a) anti-forgery — confirmar que el id sigue válido en el back.
    // (b) staleness — quizás llegó una lectura más reciente o salió de ventana.
    let lecturaIdFinal: number | undefined
    const idAdjuntado =
      adjuntarEvidencia.value && evidencia.value ? evidencia.value.lectura_id : undefined

    try {
      const fresh = await reportesService.buscarEvidencia(
        form.value.ubicacion.latitud,
        form.value.ubicacion.longitud,
      )
      if (idAdjuntado && fresh.evidencia?.lectura_id === idAdjuntado) {
        lecturaIdFinal = idAdjuntado
      } else if (idAdjuntado && fresh.evidencia && fresh.evidencia.lectura_id !== idAdjuntado) {
        lecturaIdFinal = fresh.evidencia.lectura_id
        toast.info(
          'Evidencia actualizada',
          'Adjuntamos la lectura más reciente disponible para tu ubicación.',
        )
      } else if (idAdjuntado && fresh.evidencia === null) {
        lecturaIdFinal = undefined
        toast.warning(
          'Evidencia ya no disponible',
          'La lectura adjunta salió de la ventana de validación. Tu reporte se enviará sin evidencia.',
        )
      } else {
        // No había id adjuntado: ignorar fresh (no fue intención del usuario).
        lecturaIdFinal = undefined
      }
    } catch {
      // Si la re-validación falla, mejor no bloquear: el back hará fallback
      // server-side (backend.md §5.1 paso 4). Mandar sin id.
      lecturaIdFinal = undefined
    }

    const created = await reportesService.crear({
      titulo: form.value.titulo.trim(),
      descripcion: form.value.descripcion.trim(),
      latitud: form.value.ubicacion.latitud,
      longitud: form.value.ubicacion.longitud,
      lectura_evidencia_id: lecturaIdFinal,
    })
    // Prepend a la lista local como ReporteListItem.
    myReports.value = [
      {
        id: created.id,
        titulo: created.titulo,
        estado_actual: created.estado_actual,
        created_at: created.created_at,
      },
      ...myReports.value,
    ]
    toast.success(
      'Reporte enviado',
      created.lectura_evidencia
        ? 'Tu reporte fue creado con evidencia acústica adjunta.'
        : 'Tu reporte fue creado. Un funcionario lo gestionará pronto.',
    )
    reportOpen.value = false
  } catch (e) {
    showError(e, 'No se pudo enviar el reporte')
  } finally {
    submitting.value = false
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
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
          Consulta el ruido de tu sector y reporta al municipio cuando algo supere los
          niveles tolerables.
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
          :loading="heatmapLoading"
        />
        <KpiCard
          label="Zonas críticas"
          :value="kpis?.zonesOverStandard ?? '—'"
          sub="DS 14/2024"
          icon="!"
          :tone="kpis && kpis.zonesOverStandard > 2 ? 'warning' : 'primary'"
          :loading="heatmapLoading"
        />
        <KpiCard
          label="Mis reportes"
          :value="myReports.length"
          :sub="lastReport ? `Último: ${formatDate(lastReport.created_at)}` : 'Aún no has reportado'"
          icon="✎"
          tone="neutral"
          :loading="loadingReports"
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
        <HeatmapMap
          :points="points"
          readonly
          min-height="420px"
          @bbox-change="onHeatmapBbox"
        />
      </div>
    </section>

    <!-- Mis reportes -->
    <section class="vh__sec">
      <h2 class="vh__sec-title">Mis reportes recientes</h2>
      <div v-if="loadingReports" class="vh__center"><BaseSpinner /></div>
      <p v-else-if="myReports.length === 0" class="vh__empty">
        Aún no has enviado reportes. Cuando hagas el primero aparecerá aquí.
      </p>
      <div v-else class="vh__reports">
        <BaseCard v-for="r in myReports" :key="r.id" padding="md">
          <header class="vh__r-head">
            <strong class="vh__r-titulo">{{ r.titulo }}</strong>
            <BaseBadge :tone="ESTADO_TONE[r.estado_actual]" dot size="sm">
              {{ r.estado_actual }}
            </BaseBadge>
          </header>
          <p class="vh__r-date">{{ formatDate(r.created_at) }}</p>
        </BaseCard>
      </div>
      <div v-if="nextCursor" class="vh__more">
        <BaseButton
          variant="ghost"
          :loading="loadingMore"
          @click="loadMyReports(nextCursor ?? undefined)"
        >
          Ver más reportes
        </BaseButton>
      </div>
    </section>

    <!-- Modal Realizar reporte -->
    <BaseModal v-model="reportOpen" title="Realizar un reporte de ruido" size="lg">
      <form class="form" @submit.prevent="submitReport">
        <BaseInput
          v-model="form.titulo"
          label="Título"
          placeholder="Ej: Fiesta con parlantes a la calle"
          hint="Resumen corto (3 a 120 caracteres)."
          required
          :error="errors.titulo"
        />

        <BaseInput
          v-model="form.descripcion"
          label="Describe la situación"
          textarea
          :rows="4"
          placeholder="Cuéntanos qué está ocurriendo, a qué hora, con qué frecuencia…"
          hint="Mínimo 10 caracteres."
          required
          :error="errors.descripcion"
        />

        <div class="form__field">
          <label class="form__label">
            Ubicación <span class="form__req" aria-hidden="true">*</span>
          </label>
          <ReporteMapPicker v-model="form.ubicacion" min-height="320px" />
          <p v-if="errors.ubicacion" class="form__error">{{ errors.ubicacion }}</p>
        </div>

        <div class="form__field">
          <div class="form__row">
            <label class="form__label">Evidencia acústica (opcional)</label>
            <BaseButton
              type="button"
              variant="secondary"
              size="sm"
              :disabled="!form.ubicacion || evidenciaLoading"
              :loading="evidenciaLoading"
              @click="comprobarEvidencia"
            >
              Comprobar evidencia cercana
            </BaseButton>
          </div>
          <EvidenciaSensorCard
            v-if="evidencia !== undefined || evidenciaLoading"
            :evidencia="evidencia"
            :loading="evidenciaLoading"
            :show-toggle="evidencia !== null && !evidenciaLoading"
            :attached="adjuntarEvidencia"
            @update:attached="(v) => (adjuntarEvidencia = v)"
          />
          <p v-else class="form__hint">
            Si hay un micrófono de la red cerca, podemos validar tu reporte con su lectura
            más reciente.
          </p>
        </div>
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
  .vh__kpis { grid-template-columns: 1fr; }
}

.vh__map { height: 420px; }

.vh__center {
  display: flex;
  justify-content: center;
  padding: var(--space-8);
}

.vh__empty {
  margin: 0;
  padding: var(--space-6);
  text-align: center;
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.vh__reports {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-3);
}

.vh__r-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.vh__r-titulo {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.vh__r-date {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.vh__more {
  display: flex;
  justify-content: center;
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form__label {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.form__req {
  color: var(--color-danger);
  margin-left: 2px;
}

.form__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.form__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.form__error {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-danger);
}
</style>
