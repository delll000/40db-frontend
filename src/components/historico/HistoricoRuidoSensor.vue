<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { lecturasService } from '@/services/lecturas.service'
import { useApiError } from '@/composables/useApiError'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import GraficoRuido from './GraficoRuido.vue'
import {
  VENTANA_DIAS,
  VENTANA_LABEL,
  type ResumenHorarioItem,
  type VentanaHistorico,
} from '@/types/lectura'

/**
 * "Histórico de ruido" por sensor.
 *
 * Consume `GET /api/v1/lecturas/resumen` (api.md §4.27) — capa OLAP del
 * proyecto, materializa el componente big data del MVP. La docu de UX/UI
 * autoritativa vive en `40db-backend/docs/frontend-resumen-horario.md`.
 *
 * Responsabilidades:
 * - Selector de ventana 24h / 7d / 30d / 90d (default 7d).
 * - Fetch al cambiar sensor o ventana.
 * - Rellenar huecos del array `horas` con null para que el gráfico muestre gaps.
 * - Mostrar "Actualizado: hace X min" desde `refrescado_at` — evidencia de la
 *   capa batch (cron horario en pg_cron).
 */

const props = defineProps<{
  /** UUID del sensor. Si cambia, se refetchea. */
  sensorId: string
  /** Nombre humano para el header del card (fallback al que viene del back). */
  sensorNombre?: string
}>()

const { showError } = useApiError()

const ventana = ref<VentanaHistorico>('7d')
const horas = ref<ResumenHorarioItem[]>([])
const refrescadoAt = ref<string | null>(null)
const sensorNombreApi = ref<string | null>(null)
const rango = ref<{ desde: Date; hasta: Date } | null>(null)
const cargando = ref(false)
const error = ref<string | null>(null)

const ventanaOptions: VentanaHistorico[] = ['24h', '7d', '30d', '90d']

const totalLecturas = computed(() =>
  horas.value.reduce((acc, h) => acc + h.n_lecturas, 0),
)

const tituloSensor = computed(
  () => sensorNombreApi.value ?? props.sensorNombre ?? '—',
)

/**
 * Refrescado_at viene del MAX sobre el rango. Si la celda más nueva es de la
 * hora pasada y el cron corre al minuto 5, lo normal es ver "hace 5–65 min".
 * Si está null, no hay filas (sensor sin lecturas en la ventana).
 */
const refrescadoHaceMin = computed(() => {
  if (!refrescadoAt.value) return null
  const ms = Date.now() - new Date(refrescadoAt.value).getTime()
  return Math.max(0, Math.round(ms / 60000))
})

const refrescadoLabel = computed(() => {
  const m = refrescadoHaceMin.value
  if (m === null) return null
  if (m < 1) return 'Actualizado: hace menos de 1 min'
  if (m < 60) return `Actualizado: hace ${m} min`
  const h = Math.round(m / 60)
  return `Actualizado: hace ${h} h`
})

/**
 * Genera un array de timestamps horarios alineados a `:00:00` cubriendo todo
 * el rango [desde, hasta), y empareja cada uno con el `ResumenHorarioItem`
 * que le corresponde (o `null` si no hubo lecturas en esa hora).
 *
 * Esto permite que Chart.js dibuje gaps visibles cuando el sensor estuvo
 * offline, en vez de "saltar" el hueco conectando los extremos.
 */
const seriePaddedConHuecos = computed<
  Array<{ hora: string; item: ResumenHorarioItem | null }>
>(() => {
  if (!rango.value) return []
  const { desde, hasta } = rango.value
  // Aliñamos al inicio de hora UTC para no introducir desfases sub-horarios.
  const startMs = Math.floor(desde.getTime() / 3_600_000) * 3_600_000
  const endMs = Math.floor(hasta.getTime() / 3_600_000) * 3_600_000

  // Indexar lecturas por timestamp epoch ms para lookup O(1).
  const indice = new Map<number, ResumenHorarioItem>()
  for (const h of horas.value) {
    indice.set(new Date(h.hora).getTime(), h)
  }

  const out: Array<{ hora: string; item: ResumenHorarioItem | null }> = []
  for (let t = startMs; t < endMs; t += 3_600_000) {
    out.push({
      hora: new Date(t).toISOString(),
      item: indice.get(t) ?? null,
    })
  }
  return out
})

async function cargar() {
  cargando.value = true
  error.value = null
  const hasta = new Date()
  // Aliñamos `desde` al inicio de hora exacta para que el padding y el
  // gráfico arranquen donde el back devuelve los buckets.
  const desde = new Date(
    Math.floor(
      (hasta.getTime() - VENTANA_DIAS[ventana.value] * 24 * 3_600_000) /
        3_600_000,
    ) * 3_600_000,
  )
  try {
    const res = await lecturasService.resumenHorario(
      props.sensorId,
      desde,
      hasta,
    )
    horas.value = res.horas
    refrescadoAt.value = res.refrescado_at
    sensorNombreApi.value = res.sensor_nombre
    rango.value = { desde, hasta }
  } catch (e) {
    horas.value = []
    refrescadoAt.value = null
    rango.value = { desde, hasta }
    error.value =
      e instanceof Error ? e.message : 'No se pudo cargar el histórico.'
    showError(e, 'No se pudo cargar el histórico')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch(() => [props.sensorId, ventana.value], cargar)
</script>

<template>
  <BaseCard padding="md">
    <header class="hist__head">
      <div>
        <h3 class="hist__title">Histórico de ruido</h3>
        <p class="hist__sub">Sensor: <strong>{{ tituloSensor }}</strong></p>
      </div>
      <div class="hist__chips" role="tablist" aria-label="Ventana de tiempo">
        <button
          v-for="v in ventanaOptions"
          :key="v"
          type="button"
          role="tab"
          :aria-selected="ventana === v"
          :class="['hist__chip', { 'hist__chip--activo': ventana === v }]"
          @click="ventana = v"
        >
          {{ v }}
        </button>
      </div>
    </header>

    <p v-if="refrescadoLabel" class="hist__frescura">
      <BaseBadge tone="info" size="sm">batch</BaseBadge>
      {{ refrescadoLabel }}
      <span class="hist__frescura-aside">
        — datos pre-agregados por hora (cron horario)
      </span>
    </p>

    <div v-if="cargando" class="hist__center">
      <BaseSpinner size="lg" />
    </div>

    <div v-else-if="error" class="hist__error" role="alert">
      <strong>No se pudo cargar:</strong> {{ error }}
    </div>

    <BaseEmpty
      v-else-if="horas.length === 0"
      icon="📭"
      title="Sin lecturas en este período"
      :message="`No hay datos pre-agregados para ${VENTANA_LABEL[ventana].toLowerCase()}. Probá una ventana más amplia o verificá que el sensor esté reportando.`"
    />

    <div v-else class="hist__body">
      <GraficoRuido :serie="seriePaddedConHuecos" />
      <p class="hist__total">
        Total de lecturas en el período:
        <strong>{{ totalLecturas.toLocaleString('es-CL') }}</strong>
      </p>
    </div>
  </BaseCard>
</template>

<style scoped>
.hist__head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.hist__title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-lg);
}
.hist__sub {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.hist__chips {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.hist__chip {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.hist__chip:hover {
  color: var(--color-text);
}
.hist__chip--activo {
  background: var(--color-bg);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.hist__frescura {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.hist__frescura-aside {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  opacity: 0.85;
}

.hist__center {
  display: flex;
  justify-content: center;
  padding: var(--space-12);
}

.hist__error {
  background: rgba(183, 28, 28, 0.08);
  border: 1px solid rgba(183, 28, 28, 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-danger);
  font-size: var(--text-sm);
}

.hist__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hist__total {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-align: right;
}
</style>
