<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useApiError } from '@/composables/useApiError'
import { reportesService } from '@/services/reportes.service'
import { catalogosService } from '@/services/catalogos.service'
import { isApiError } from '@/services/errors'
import type { Comuna } from '@/types/api'
import KpiCard from '@/components/common/KpiCard.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import {
  ESTADOS_TERMINALES,
  ESTADO_TONE,
  ESTADO_TRANSICIONES,
  transicionRequiereComentario,
  type Reporte,
  type ReporteEstadoNombre,
  type ReporteListItem,
} from '@/types/report'

const auth = useAuthStore()
const toast = useToast()
const { showError } = useApiError()

// ──────────────────────────────────────────────────────────
// Listado paginado
// ──────────────────────────────────────────────────────────

const reportes = ref<ReporteListItem[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(true)
const loadingMore = ref(false)

const filterEstado = ref<ReporteEstadoNombre | ''>('')

const estadoOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'En espera', label: 'En espera' },
  { value: 'En atencion', label: 'En atención' },
  { value: 'Atendido', label: 'Atendidos' },
  { value: 'Descartado', label: 'Descartados' },
] as const

const comunaId = computed(() => auth.profile?.comuna_id ?? null)

// Catálogo de comunas para resolver `comuna_id` → nombre en el modal detalle.
// Cacheado en catalogosService (una sola request por sesión).
const comunas = ref<Comuna[]>([])
catalogosService.getComunas().then((cs) => (comunas.value = cs)).catch(() => {})

function comunaNombre(id: number): string {
  return comunas.value.find((c) => c.id === id)?.nombre ?? `Comuna ${id}`
}

async function loadReportes(cursor?: string) {
  if (!comunaId.value) {
    loading.value = false
    return
  }
  const target = cursor ? loadingMore : loading
  target.value = true
  try {
    const res = await reportesService.porComuna(comunaId.value, {
      limit: 20,
      cursor,
      estado: filterEstado.value || undefined,
    })
    reportes.value = cursor ? [...reportes.value, ...res.data] : res.data
    nextCursor.value = res.next_cursor
  } catch (e) {
    showError(e, 'No se pudieron cargar los reportes de la comuna')
  } finally {
    target.value = false
  }
}

onMounted(() => loadReportes())

watch(filterEstado, () => loadReportes())

// Breakdown derivado de la página actual. Cuando exista §8 de
// docs/integracion-backend/02-endpoints-faltantes-back.md lo reemplazamos.
const breakdown = computed(() => {
  const acc: Record<ReporteEstadoNombre, number> = {
    'En espera': 0,
    'En atencion': 0,
    Atendido: 0,
    Descartado: 0,
  }
  for (const r of reportes.value) acc[r.estado_actual]++
  return acc
})

// ──────────────────────────────────────────────────────────
// Modal: detalle + cambio de estado
// ──────────────────────────────────────────────────────────

const modalOpen = ref(false)
const detalleLoading = ref(false)
const detalle = ref<Reporte | null>(null)
const targetEstado = ref<ReporteEstadoNombre | null>(null)
const comment = ref('')
const commentError = ref('')
const saving = ref(false)

async function openReporte(item: ReporteListItem) {
  modalOpen.value = true
  detalle.value = null
  detalleLoading.value = true
  targetEstado.value = null
  comment.value = ''
  commentError.value = ''
  try {
    detalle.value = await reportesService.byId(item.id)
  } catch (e) {
    showError(e, 'No se pudo cargar el detalle')
    modalOpen.value = false
  } finally {
    detalleLoading.value = false
  }
}

const transicionesPosibles = computed<ReporteEstadoNombre[]>(() => {
  if (!detalle.value) return []
  return ESTADO_TRANSICIONES[detalle.value.estado_actual]
})

const isTerminal = computed(() =>
  detalle.value ? ESTADOS_TERMINALES.has(detalle.value.estado_actual) : false,
)

async function aplicarCambio() {
  if (!detalle.value || !targetEstado.value) return
  if (transicionRequiereComentario(targetEstado.value) && !comment.value.trim()) {
    commentError.value = 'El comentario es obligatorio para descartar el reporte.'
    return
  }
  saving.value = true
  try {
    const updated = await reportesService.cambiarEstado(detalle.value.id, {
      nuevo_estado: targetEstado.value,
      comentario: comment.value.trim() || undefined,
    })
    // Reemplazar en la lista local.
    const idx = reportes.value.findIndex((r) => r.id === updated.id)
    if (idx !== -1) {
      reportes.value[idx] = {
        id: updated.id,
        titulo: updated.titulo,
        estado_actual: updated.estado_actual,
        created_at: updated.created_at,
      }
    }
    detalle.value = updated
    targetEstado.value = null
    comment.value = ''
    commentError.value = ''
    toast.success(`Reporte ${updated.estado_actual}`, updated.titulo)
  } catch (e) {
    if (isApiError(e, 'invalid_state_transition')) {
      // El back rechazó la transición — refrescar el detalle para reflejar el
      // estado real (puede haber cambiado por otro funcionario).
      toast.warning(
        'El reporte fue actualizado',
        'Otro funcionario lo modificó. Recargamos el detalle.',
      )
      try {
        detalle.value = await reportesService.byId(detalle.value.id)
      } catch {
        // ignorar — el toast ya informó.
      }
    } else {
      showError(e, 'No se pudo cambiar el estado')
    }
  } finally {
    saving.value = false
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div class="fh">
    <header class="fh__head">
      <div>
        <p class="fh__eyebrow">Funcionario</p>
        <h1 class="fh__title">Reportes a gestionar</h1>
        <p class="fh__sub">
          Atiende, gestiona y cierra los reportes ciudadanos de
          <strong>{{ auth.profile?.comuna_nombre ?? 'tu comuna' }}</strong>.
        </p>
      </div>
      <BaseButton variant="ghost" size="sm" :disabled="loading" @click="loadReportes()">
        ⟳ Actualizar
      </BaseButton>
    </header>

    <!-- KPIs (derivados de la página cargada) -->
    <section class="fh__kpis">
      <KpiCard
        label="En espera"
        :value="breakdown['En espera']"
        sub="Sin asignar"
        icon="●"
        tone="danger"
        :loading="loading"
      />
      <KpiCard
        label="En atención"
        :value="breakdown['En atencion']"
        sub="En proceso"
        icon="◐"
        tone="warning"
        :loading="loading"
      />
      <KpiCard
        label="Atendidos"
        :value="breakdown['Atendido']"
        sub="Resueltos"
        icon="✓"
        tone="success"
        :loading="loading"
      />
      <KpiCard
        label="Descartados"
        :value="breakdown['Descartado']"
        sub="Inválidos"
        icon="✕"
        tone="neutral"
        :loading="loading"
      />
    </section>

    <!-- Filtro -->
    <div class="fh__bar">
      <BaseSelect
        :model-value="filterEstado"
        :options="[...estadoOptions]"
        label="Filtrar por estado"
        @update:model-value="(v) => (filterEstado = v as ReporteEstadoNombre | '')"
      />
    </div>

    <!-- Tabla -->
    <BaseCard padding="none">
      <div v-if="loading" class="fh__center"><BaseSpinner size="lg" /></div>
      <BaseEmpty
        v-else-if="reportes.length === 0"
        icon="✓"
        title="Sin reportes"
        message="No hay reportes que coincidan con el filtro actual."
      />
      <div v-else class="fh__table-wrap">
        <table class="fh__table">
          <thead>
            <tr>
              <th>Creado</th>
              <th>Título</th>
              <th>Estado</th>
              <th class="fh__col-actions">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reportes" :key="r.id">
              <td class="fh__nowrap">{{ formatDate(r.created_at) }}</td>
              <td>{{ r.titulo }}</td>
              <td>
                <BaseBadge :tone="ESTADO_TONE[r.estado_actual]" dot>
                  {{ r.estado_actual }}
                </BaseBadge>
              </td>
              <td class="fh__col-actions">
                <BaseButton variant="ghost" size="sm" @click="openReporte(r)">
                  Ver detalle
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <div v-if="nextCursor" class="fh__more">
      <BaseButton
        variant="ghost"
        :loading="loadingMore"
        @click="loadReportes(nextCursor ?? undefined)"
      >
        Ver más
      </BaseButton>
    </div>

    <!-- Modal detalle + cambio de estado -->
    <BaseModal v-model="modalOpen" title="Detalle del reporte" size="lg">
      <div v-if="detalleLoading" class="fh__center"><BaseSpinner /></div>
      <div v-else-if="detalle" class="dlg">
        <div class="dlg__hero">
          <h3 class="dlg__titulo">{{ detalle.titulo }}</h3>
          <BaseBadge :tone="ESTADO_TONE[detalle.estado_actual]" dot>
            {{ detalle.estado_actual }}
          </BaseBadge>
        </div>

        <p class="dlg__meta">
          Reportado el <strong>{{ formatDate(detalle.created_at) }}</strong>
          <span v-if="detalle.usuario">
            por <strong>{{ detalle.usuario.nombre }}</strong>
          </span>
        </p>

        <p class="dlg__meta">
          Comuna: <strong>{{ comunaNombre(detalle.comuna_id) }}</strong>
        </p>

        <p class="dlg__meta dlg__meta--mono">
          Lat <strong>{{ detalle.latitud.toFixed(5) }}</strong>,
          Lng <strong>{{ detalle.longitud.toFixed(5) }}</strong>
        </p>

        <p class="dlg__descripcion">{{ detalle.descripcion }}</p>

        <!-- Evidencia -->
        <div v-if="detalle.lectura_evidencia" class="dlg__ev">
          <p class="dlg__ev-title">Evidencia acústica adjunta</p>
          <p class="dlg__ev-body">
            Sensor <strong>{{ detalle.lectura_evidencia.sensor_nombre }}</strong> midió
            <strong>{{ detalle.lectura_evidencia.nivel_db.toFixed(1) }} dB(A)</strong> el
            {{ formatDate(detalle.lectura_evidencia.timestamp_medicion) }}.
          </p>
        </div>

        <!-- Atendido por -->
        <p v-if="detalle.atendido_por" class="dlg__meta">
          Atendido por <strong>{{ detalle.atendido_por.nombre }}</strong>
        </p>

        <!-- Historial -->
        <section v-if="detalle.historial && detalle.historial.length > 0" class="dlg__hist">
          <h4>Historial</h4>
          <ul>
            <li v-for="(h, idx) in detalle.historial" :key="idx">
              <span class="dlg__hist-when">{{ formatDate(h.created_at) }}</span>
              <BaseBadge :tone="ESTADO_TONE[h.estado]" size="sm">{{ h.estado }}</BaseBadge>
              <span v-if="h.usuario">
                por <strong>{{ h.usuario.nombre }}</strong>
              </span>
              <p v-if="h.comentario" class="dlg__hist-comment">"{{ h.comentario }}"</p>
            </li>
          </ul>
        </section>

        <!-- Cambiar estado -->
        <section v-if="!isTerminal" class="dlg__change">
          <h4>Cambiar estado</h4>
          <div class="dlg__transitions">
            <BaseButton
              v-for="t in transicionesPosibles"
              :key="t"
              :variant="t === 'Descartado' ? 'danger' : 'primary'"
              size="sm"
              :disabled="saving"
              @click="targetEstado = t"
            >
              {{ t }}
            </BaseButton>
          </div>

          <div v-if="targetEstado" class="dlg__form">
            <p class="dlg__transition-info">
              <BaseBadge :tone="ESTADO_TONE[detalle.estado_actual]" size="sm">
                {{ detalle.estado_actual }}
              </BaseBadge>
              <span aria-hidden="true">→</span>
              <BaseBadge :tone="ESTADO_TONE[targetEstado]" size="sm">
                {{ targetEstado }}
              </BaseBadge>
            </p>
            <BaseInput
              v-model="comment"
              :label="transicionRequiereComentario(targetEstado) ? 'Motivo del descarte (obligatorio)' : 'Comentario (opcional)'"
              textarea
              :rows="3"
              placeholder="Describe la acción tomada o el motivo del cambio…"
              :required="transicionRequiereComentario(targetEstado)"
              :error="commentError"
              hint="Queda en el historial de auditoría del reporte."
            />
            <div class="dlg__actions">
              <BaseButton variant="ghost" size="sm" :disabled="saving" @click="targetEstado = null">
                Cancelar
              </BaseButton>
              <BaseButton :loading="saving" @click="aplicarCambio">
                Confirmar cambio
              </BaseButton>
            </div>
          </div>
        </section>
        <p v-else class="dlg__terminal">
          Este reporte está en un estado terminal y no puede cambiar.
        </p>
      </div>

      <template #footer="{ close }">
        <BaseButton variant="ghost" @click="close">Cerrar</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.fh {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.fh__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.fh__eyebrow {
  margin: 0;
  color: var(--color-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.fh__title {
  margin: var(--space-1) 0 var(--space-2);
}
.fh__sub {
  margin: 0;
  color: var(--color-text-muted);
}

.fh__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
@media (max-width: 880px) {
  .fh__kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .fh__kpis { grid-template-columns: 1fr; }
}

.fh__bar {
  max-width: 320px;
}

.fh__center {
  display: flex;
  justify-content: center;
  padding: var(--space-12);
}

.fh__more {
  display: flex;
  justify-content: center;
}

.fh__table-wrap {
  overflow-x: auto;
}

.fh__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  min-width: 600px;
}

.fh__table th,
.fh__table td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.fh__table th {
  background: var(--color-bg-alt);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: var(--font-semibold);
}

.fh__table tbody tr:hover {
  background: var(--color-bg-alt);
}

.fh__nowrap { white-space: nowrap; }
.fh__col-actions { text-align: right; }

/* Dialog */
.dlg {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.dlg__hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}

.dlg__titulo {
  margin: 0;
  font-size: var(--text-lg);
}

.dlg__meta {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.dlg__meta--mono strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--color-text);
}

.dlg__descripcion {
  margin: 0;
  padding: var(--space-3);
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-style: italic;
  white-space: pre-wrap;
}

.dlg__ev {
  border-left: 3px solid var(--color-primary);
  padding: var(--space-2) var(--space-3);
  background: rgba(0, 77, 64, 0.04);
  border-radius: var(--radius-sm);
}

.dlg__ev-title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-primary);
  font-weight: var(--font-semibold);
}

.dlg__ev-body {
  margin: 0;
  font-size: var(--text-sm);
}

.dlg__hist {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}

.dlg__hist h4 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.dlg__hist ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.dlg__hist li {
  font-size: var(--text-sm);
  border-left: 2px solid var(--color-border);
  padding-left: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dlg__hist-when {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.dlg__hist-comment {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-style: italic;
}

.dlg__change {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}

.dlg__change h4 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
}

.dlg__transitions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.dlg__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
}

.dlg__transition-info {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.dlg__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.dlg__terminal {
  margin: 0;
  padding: var(--space-3);
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
