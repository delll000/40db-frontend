<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { alertsService } from '@/services/alerts.service'
import { kpisService } from '@/services/kpis.service'
import {
  ALERT_NEXT_STATUS,
  ALERT_STATUS_LABELS,
  type Alert,
  type AlertHistoryEntry,
  type AlertStatus,
} from '@/types/alert'
import KpiCard from '@/components/common/KpiCard.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'

const auth = useAuthStore()
const toast = useToast()

const alerts = ref<Alert[]>([])
const breakdown = ref<{ activa: number; atendida: number; cerrada: number } | null>(null)
const loading = ref(true)

const filterStatus = ref<AlertStatus | ''>('')

const filtered = computed(() =>
  filterStatus.value
    ? alerts.value.filter((a) => a.status === filterStatus.value)
    : alerts.value,
)

async function load() {
  loading.value = true
  try {
    const [list, bd] = await Promise.all([
      alertsService.list(),
      kpisService.alertsBreakdown(),
    ])
    alerts.value = list.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
    breakdown.value = bd
  } catch (e) {
    toast.error('Error al cargar alertas', e instanceof Error ? e.message : undefined)
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Modal de cambio de estado
const modalOpen = ref(false)
const selected = ref<Alert | null>(null)
const targetStatus = ref<AlertStatus | null>(null)
const comment = ref('')
const commentError = ref('')
const saving = ref(false)
const history = ref<AlertHistoryEntry[]>([])

async function openChange(alert: Alert, next: AlertStatus) {
  selected.value = alert
  targetStatus.value = next
  comment.value = ''
  commentError.value = ''
  modalOpen.value = true
  history.value = await alertsService.historyFor(alert.id)
}

async function submitChange() {
  if (!selected.value || !targetStatus.value || !auth.profile) return
  if (!comment.value.trim()) {
    commentError.value = 'El comentario es obligatorio para registrar el cambio.'
    return
  }
  saving.value = true
  try {
    const updated = await alertsService.changeStatus(
      selected.value.id,
      targetStatus.value,
      comment.value,
      { id: auth.profile.id, name: auth.profile.nombre },
    )
    // Actualizar la fila localmente
    const idx = alerts.value.findIndex((a) => a.id === updated.id)
    if (idx !== -1) alerts.value[idx] = updated
    toast.success(
      `Alerta ${ALERT_STATUS_LABELS[updated.status].toLowerCase()}`,
      `${selected.value.zone} — ${selected.value.address}`,
    )
    modalOpen.value = false
  } catch (e) {
    toast.error('Error al cambiar estado', e instanceof Error ? e.message : undefined)
  } finally {
    saving.value = false
  }
}

function statusTone(s: AlertStatus): 'danger' | 'warning' | 'success' {
  if (s === 'activa') return 'danger'
  if (s === 'atendida') return 'warning'
  return 'success'
}

function dbTone(db: number): 'danger' | 'warning' | 'success' {
  if (db > 75) return 'danger'
  if (db >= 65) return 'warning'
  return 'success'
}
</script>

<template>
  <div class="fh">
    <header class="fh__head">
      <div>
        <p class="fh__eyebrow">Funcionario</p>
        <h1 class="fh__title">Reportes a gestionar</h1>
        <p class="fh__sub">Atiende, gestiona y cierra las alertas detectadas en Maipú.</p>
      </div>
      <BaseButton variant="ghost" size="sm" :disabled="loading" @click="load">
        ⟳ Actualizar
      </BaseButton>
    </header>

    <!-- KPIs -->
    <section class="fh__kpis">
      <KpiCard
        label="Activas"
        :value="breakdown?.activa ?? '—'"
        sub="Sin atender"
        icon="●"
        tone="danger"
        :loading="loading"
      />
      <KpiCard
        label="En atención"
        :value="breakdown?.atendida ?? '—'"
        sub="En proceso"
        icon="◐"
        tone="warning"
        :loading="loading"
      />
      <KpiCard
        label="Cerradas"
        :value="breakdown?.cerrada ?? '—'"
        sub="Resueltas"
        icon="✓"
        tone="success"
        :loading="loading"
      />
    </section>

    <!-- Filtro -->
    <div class="fh__bar">
      <BaseSelect
        :model-value="filterStatus"
        :options="[
          { value: '', label: 'Todos los estados' },
          { value: 'activa', label: 'Activas' },
          { value: 'atendida', label: 'En atención' },
          { value: 'cerrada', label: 'Cerradas' },
        ]"
        label="Filtrar por estado"
        @update:model-value="(v) => (filterStatus = v as AlertStatus | '')"
      />
    </div>

    <!-- Tabla -->
    <BaseCard padding="none">
      <div v-if="loading" class="fh__loading"><BaseSpinner size="lg" /></div>
      <BaseEmpty
        v-else-if="filtered.length === 0"
        icon="✓"
        title="Sin alertas"
        message="No hay alertas que coincidan con el filtro actual."
      />
      <div v-else class="fh__table-wrap">
        <table class="fh__table">
          <thead>
            <tr>
              <th>Detectada</th>
              <th>Zona</th>
              <th>Dirección</th>
              <th>dB</th>
              <th>Estado</th>
              <th>Reportado por</th>
              <th class="fh__col-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in filtered" :key="a.id">
              <td class="fh__nowrap">
                {{ new Date(a.detectedAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) }}
              </td>
              <td>{{ a.zone }}</td>
              <td>{{ a.address }}</td>
              <td>
                <BaseBadge :tone="dbTone(a.nivelDb)" size="sm">{{ a.nivelDb }} dB</BaseBadge>
              </td>
              <td>
                <BaseBadge :tone="statusTone(a.status)" dot>
                  {{ ALERT_STATUS_LABELS[a.status] }}
                </BaseBadge>
              </td>
              <td>{{ a.citizenName ?? '—' }}</td>
              <td class="fh__col-actions">
                <BaseButton
                  v-if="ALERT_NEXT_STATUS[a.status].includes('atendida')"
                  variant="primary"
                  size="sm"
                  @click="openChange(a, 'atendida')"
                >
                  Atender
                </BaseButton>
                <BaseButton
                  v-else-if="ALERT_NEXT_STATUS[a.status].includes('cerrada')"
                  variant="secondary"
                  size="sm"
                  @click="openChange(a, 'cerrada')"
                >
                  Cerrar
                </BaseButton>
                <span v-else class="fh__done">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Modal cambio de estado -->
    <BaseModal v-model="modalOpen" :title="targetStatus === 'cerrada' ? 'Cerrar alerta' : 'Atender alerta'" size="md">
      <div v-if="selected" class="dlg">
        <div class="dlg__info">
          <p><strong>{{ selected.zone }}</strong> — {{ selected.address }}</p>
          <p class="dlg__meta">
            Detectada: {{ new Date(selected.detectedAt).toLocaleString('es-CL') }}
            · Nivel: <strong>{{ selected.nivelDb }} dB(A)</strong>
          </p>
          <p v-if="selected.description" class="dlg__desc">{{ selected.description }}</p>
        </div>

        <div class="dlg__transition">
          <BaseBadge :tone="statusTone(selected.status)" size="sm">
            {{ ALERT_STATUS_LABELS[selected.status] }}
          </BaseBadge>
          <span aria-hidden="true">→</span>
          <BaseBadge :tone="targetStatus ? statusTone(targetStatus) : 'neutral'" size="sm">
            {{ targetStatus ? ALERT_STATUS_LABELS[targetStatus] : '' }}
          </BaseBadge>
        </div>

        <BaseInput
          v-model="comment"
          label="Comentario (obligatorio)"
          textarea
          :rows="4"
          placeholder="Describe la acción tomada o la información relevante…"
          required
          :error="commentError"
          hint="Este comentario queda registrado en el historial de auditoría."
        />

        <div v-if="history.length > 0" class="dlg__hist">
          <h4>Historial de la alerta</h4>
          <ul>
            <li v-for="h in history" :key="h.id">
              <span class="dlg__hist-when">
                {{ new Date(h.changedAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) }}
              </span>
              <strong>{{ h.funcionarioName }}</strong>:
              {{ ALERT_STATUS_LABELS[h.previousStatus] }} → {{ ALERT_STATUS_LABELS[h.newStatus] }}
              <p class="dlg__hist-comment">"{{ h.comment }}"</p>
            </li>
          </ul>
        </div>
      </div>

      <template #footer="{ close }">
        <BaseButton variant="ghost" :disabled="saving" @click="close">Cancelar</BaseButton>
        <BaseButton :loading="saving" @click="submitChange">
          Confirmar cambio
        </BaseButton>
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
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}
@media (max-width: 720px) {
  .fh__kpis {
    grid-template-columns: 1fr;
  }
}

.fh__bar {
  max-width: 320px;
}

.fh__loading {
  display: flex;
  justify-content: center;
  padding: var(--space-12);
}

.fh__table-wrap {
  overflow-x: auto;
}

.fh__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  min-width: 720px;
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

.fh__nowrap {
  white-space: nowrap;
}

.fh__col-actions {
  text-align: right;
}

.fh__done {
  color: var(--color-text-muted);
}

/* Dialog content */
.dlg {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.dlg__info p {
  margin: 0 0 var(--space-1);
}
.dlg__meta {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.dlg__desc {
  background: var(--color-bg-alt);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-style: italic;
  font-size: var(--text-sm);
  margin-top: var(--space-2);
}

.dlg__transition {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.dlg__hist {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}
.dlg__hist h4 {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
}
.dlg__hist-when {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  display: block;
}
.dlg__hist-comment {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
