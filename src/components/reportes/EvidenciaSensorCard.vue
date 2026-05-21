<script setup lang="ts">
import { computed } from 'vue'
import type { ReporteLecturaEvidencia } from '@/types/api'

const props = defineProps<{
  /** null = sin match. undefined = aún no consultado. */
  evidencia?: ReporteLecturaEvidencia | null
  loading?: boolean
  /** Si true, muestra el checkbox para adjuntar. */
  showToggle?: boolean
  /** v-model:attached para el checkbox. */
  attached?: boolean
}>()

const emit = defineEmits<{
  'update:attached': [value: boolean]
}>()

const niveldbTone = computed<'danger' | 'warning' | 'success'>(() => {
  if (!props.evidencia) return 'success'
  if (props.evidencia.nivel_db > 75) return 'danger'
  if (props.evidencia.nivel_db >= 65) return 'warning'
  return 'success'
})

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function onToggle(e: Event) {
  emit('update:attached', (e.target as HTMLInputElement).checked)
}
</script>

<template>
  <div :class="['ev', `ev--${loading ? 'loading' : evidencia ? 'match' : 'empty'}`]">
    <div v-if="loading" class="ev__body">
      <div class="ev__spinner" aria-hidden="true" />
      <p class="ev__title">Buscando evidencia cercana…</p>
    </div>

    <div v-else-if="evidencia" class="ev__body">
      <header class="ev__head">
        <span class="ev__icon" aria-hidden="true">●</span>
        <strong class="ev__title">Evidencia disponible</strong>
        <span :class="['ev__db', `ev__db--${niveldbTone}`]">
          {{ evidencia.nivel_db.toFixed(1) }} dB(A)
        </span>
      </header>
      <p class="ev__meta">
        Sensor <strong>{{ evidencia.sensor_nombre }}</strong>
        <span v-if="evidencia.distancia_metros != null">
          a {{ Math.round(evidencia.distancia_metros) }} m
        </span>
      </p>
      <p class="ev__meta">
        Medición:&nbsp;
        <strong>{{ formatTime(evidencia.timestamp_medicion) }}</strong>
      </p>

      <label v-if="showToggle" class="ev__toggle">
        <input
          type="checkbox"
          :checked="attached"
          @change="onToggle"
        />
        Adjuntar al reporte
      </label>
    </div>

    <div v-else class="ev__body">
      <p class="ev__title ev__title--muted">No encontramos micrófonos con evidencia en esta ubicación.</p>
      <p class="ev__meta">
        Puedes enviar tu reporte igual; el municipio lo evaluará con tu descripción.
      </p>
    </div>
  </div>
</template>

<style scoped>
.ev {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-alt);
}

.ev--match {
  border-color: var(--color-primary);
  background: rgba(0, 77, 64, 0.04);
}

.ev--loading {
  border-style: dashed;
}

.ev__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ev__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.ev__icon {
  color: var(--color-primary);
  font-size: 0.9rem;
}

.ev--match .ev__icon {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.ev__title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.ev__title--muted {
  color: var(--color-text-muted);
  font-weight: var(--font-medium);
}

.ev__db {
  margin-left: auto;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.ev__db--success { background: rgba(46, 125, 50, 0.15); color: #1b5e20; }
.ev__db--warning { background: rgba(251, 192, 45, 0.2); color: #6b4f00; }
.ev__db--danger  { background: rgba(183, 28, 28, 0.15); color: #b71c1c; }

.ev__meta {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.ev__meta strong {
  color: var(--color-text);
}

.ev__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  cursor: pointer;
}

.ev__spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  animation: spin 0.8s linear infinite;
  display: inline-block;
  margin-right: var(--space-2);
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
