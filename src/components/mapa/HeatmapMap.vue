<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet.heat'
import type { HeatmapPoint } from '@/types/kpi'

const props = withDefaults(
  defineProps<{
    points: HeatmapPoint[]
    /** Si true, oculta zoomControl y dragging suave (vista vecino). */
    readonly?: boolean
    /** Centro inicial. Default: Maipú. */
    center?: [number, number]
    initialZoom?: number
    /** Mínimo alto del contenedor */
    minHeight?: string
  }>(),
  {
    readonly: false,
    center: () => [-33.5167, -70.7575],
    initialZoom: 13,
    minHeight: '500px',
  },
)

const emit = defineEmits<{
  /** Bbox del viewport actual, listo para pasarse como `?bbox=` al back. */
  'bbox-change': [bbox: string]
}>()

const mapEl = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
// `any` aquí porque leaflet.heat no tiene tipos oficiales
let heatLayer: L.Layer | null = null

onMounted(() => {
  if (!mapEl.value) return

  map = L.map(mapEl.value, {
    zoomControl: !props.readonly,
    dragging: true,
    scrollWheelZoom: !props.readonly,
    doubleClickZoom: !props.readonly,
  }).setView(props.center, props.initialZoom)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  renderHeat()

  // Emitir bbox inicial + en cada movimiento del viewport.
  emitBbox()
  map.on('moveend', emitBbox)

  // Recalcular dimensiones cuando el contenedor cambie de tamaño
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => map?.invalidateSize())
    ro.observe(mapEl.value)
    onBeforeUnmount(() => ro.disconnect())
  }
})

function emitBbox() {
  if (!map) return
  const b = map.getBounds()
  // Formato esperado por el back: "minLng,minLat,maxLng,maxLat" (api.md §4.3).
  const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
    .map((n) => n.toFixed(6))
    .join(',')
  emit('bbox-change', bbox)
}

function renderHeat() {
  if (!map) return
  if (heatLayer) {
    heatLayer.remove()
    heatLayer = null
  }
  const data: [number, number, number][] = props.points.map((p) => [p.lat, p.lng, p.intensity])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  heatLayer = (L as any).heatLayer(data, {
    radius: 28,
    blur: 22,
    maxZoom: 17,
    max: 1.0,
    gradient: {
      0.2: '#1b5e20',
      0.45: '#fbc02d',
      0.65: '#ef6c00',
      0.85: '#b71c1c',
    },
  })
  heatLayer!.addTo(map)
}

watch(() => props.points, renderHeat, { deep: true })

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
  heatLayer = null
})

defineExpose({
  /** Acceso al elemento DOM del mapa para exportar a PNG */
  getElement: () => mapEl.value,
  /** Acceso al objeto Leaflet para casos avanzados */
  getMap: () => map,
})
</script>

<template>
  <div ref="mapEl" class="hmap" :style="{ minHeight }" aria-label="Mapa de calor de ruido"></div>
</template>

<style scoped>
.hmap {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
}

.hmap :deep(.leaflet-container) {
  height: 100%;
  width: 100%;
  font-family: var(--font-body);
}
</style>
