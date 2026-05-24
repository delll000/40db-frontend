<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { es } from 'date-fns/locale'
import type { ResumenHorarioItem } from '@/types/lectura'

Chart.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
)

/**
 * Wrapper de Chart.js para la serie horaria del sensor.
 *
 * Dibuja 4 datasets:
 *   1. Promedio (avg_db)        — línea sólida principal.
 *   2. P95 (p95_db)             — línea punteada secundaria.
 *   3. Max (nivel_db_max)       — borde transparente, fill hacia el siguiente (min).
 *   4. Min (nivel_db_min)       — invisible, sirve de "piso" del relleno.
 *
 * El resultado visual es: línea avg + p95 punteada + banda gris min-max.
 * Las horas sin lecturas vienen como `null` en `seriesPadded` (rellenadas
 * por el padre) → Chart.js dibuja un gap (`spanGaps: false`).
 */

const props = defineProps<{
  /** Serie con huecos null en horas sin lecturas (padre la pre-procesa). */
  serie: Array<{ hora: string; item: ResumenHorarioItem | null }>
}>()

const datasets = computed(() => {
  const labels = props.serie.map((p) => p.hora)
  const avg = props.serie.map((p) => (p.item ? p.item.avg_db : null))
  const p95 = props.serie.map((p) => (p.item ? p.item.p95_db : null))
  const max = props.serie.map((p) => (p.item ? p.item.max_db : null))
  const min = props.serie.map((p) => (p.item ? p.item.min_db : null))
  return { labels, avg, p95, max, min }
})

const chartData = computed(() => ({
  labels: datasets.value.labels,
  datasets: [
    {
      label: 'Promedio (dB)',
      data: datasets.value.avg,
      borderColor: '#0e7c66',
      backgroundColor: 'transparent',
      tension: 0.25,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      spanGaps: false,
    },
    {
      label: 'P95 (dB)',
      data: datasets.value.p95,
      borderColor: '#d97706',
      backgroundColor: 'transparent',
      borderDash: [4, 4],
      tension: 0.25,
      pointRadius: 0,
      pointHoverRadius: 3,
      borderWidth: 1.5,
      spanGaps: false,
    },
    {
      label: 'Máximo (dB)',
      data: datasets.value.max,
      borderColor: 'rgba(148, 163, 184, 0.5)',
      backgroundColor: 'rgba(148, 163, 184, 0.18)',
      fill: '+1',
      tension: 0.25,
      pointRadius: 0,
      pointHoverRadius: 3,
      borderWidth: 1,
      spanGaps: false,
    },
    {
      label: 'Mínimo (dB)',
      data: datasets.value.min,
      borderColor: 'rgba(148, 163, 184, 0.5)',
      backgroundColor: 'transparent',
      tension: 0.25,
      pointRadius: 0,
      pointHoverRadius: 3,
      borderWidth: 1,
      spanGaps: false,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  scales: {
    x: {
      type: 'time' as const,
      adapters: { date: { locale: es } },
      time: {
        tooltipFormat: 'dd MMM yyyy HH:mm',
        displayFormats: {
          hour: 'HH:mm',
          day: 'dd MMM',
        },
      },
      ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
    },
    y: {
      title: { display: true, text: 'Nivel sonoro (dB)' },
      suggestedMin: 30,
      suggestedMax: 90,
    },
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { boxWidth: 14, boxHeight: 8 },
    },
    tooltip: {
      callbacks: {
        afterBody: (ctx: Array<{ dataIndex: number }>) => {
          const i = ctx[0]?.dataIndex
          if (i === undefined) return ''
          const item = props.serie[i]?.item
          if (!item) return 'Sin lecturas en esa hora'
          return `Lecturas en la hora: ${item.n_lecturas.toLocaleString('es-CL')}`
        },
      },
    },
  },
}))

// vue-chartjs no expone el canvas para forzar resize tras transiciones de
// layout; el componente Line se redibuja al cambiar la key.
const chartKey = ref(0)
const lastLen = shallowRef(props.serie.length)
watch(
  () => props.serie.length,
  (len) => {
    if (len !== lastLen.value) {
      lastLen.value = len
      chartKey.value++
    }
  },
)

onBeforeUnmount(() => {
  // Chart.js limpia internos al desmontar via vue-chartjs; nada que hacer.
})
</script>

<template>
  <div class="grafico-ruido">
    <Line :key="chartKey" :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.grafico-ruido {
  position: relative;
  width: 100%;
  height: 360px;
}
</style>
