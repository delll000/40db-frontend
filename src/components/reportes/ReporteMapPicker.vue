<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Workaround para que los íconos del marker resuelvan con Vite (Leaflet asume
// que viven en el directorio raíz; con bundler hay que setearlos manualmente).
L.Marker.prototype.options.icon = L.icon({
  iconRetinaUrl: markerIconRetinaUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface Ubicacion {
  latitud: number
  longitud: number
}

const props = withDefaults(
  defineProps<{
    modelValue: Ubicacion | null
    /** Coordenadas iniciales si no hay modelValue ni geolocalización. Default: Maipú. */
    fallbackCenter?: [number, number]
    initialZoom?: number
    minHeight?: string
  }>(),
  {
    fallbackCenter: () => [-33.5167, -70.7575],
    initialZoom: 14,
    minHeight: '360px',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: Ubicacion | null]
}>()

const mapEl = ref<HTMLDivElement | null>(null)
const locating = ref(false)
let map: L.Map | null = null
let marker: L.Marker | null = null

function setMarker(lat: number, lng: number) {
  if (!map) return
  if (marker) {
    marker.setLatLng([lat, lng])
  } else {
    marker = L.marker([lat, lng], { draggable: false }).addTo(map)
  }
  emit('update:modelValue', { latitud: lat, longitud: lng })
}

function clearMarker() {
  if (marker) {
    marker.remove()
    marker = null
  }
  emit('update:modelValue', null)
}

async function tryGeolocate(): Promise<[number, number] | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  locating.value = true
  try {
    return await new Promise<[number, number] | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 60_000 },
      )
    })
  } finally {
    locating.value = false
  }
}

onMounted(async () => {
  if (!mapEl.value) return

  let initialCenter: [number, number] = props.fallbackCenter
  if (props.modelValue) {
    initialCenter = [props.modelValue.latitud, props.modelValue.longitud]
  } else {
    const geo = await tryGeolocate()
    if (geo) initialCenter = geo
  }

  map = L.map(mapEl.value, {
    zoomControl: true,
    dragging: true,
    scrollWheelZoom: true,
  }).setView(initialCenter, props.initialZoom)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  if (props.modelValue) {
    setMarker(props.modelValue.latitud, props.modelValue.longitud)
  }

  map.on('click', (e: L.LeafletMouseEvent) => {
    setMarker(e.latlng.lat, e.latlng.lng)
  })

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => map?.invalidateSize())
    ro.observe(mapEl.value)
    onBeforeUnmount(() => ro.disconnect())
  }
})

watch(
  () => props.modelValue,
  (next) => {
    if (!map) return
    if (!next) {
      if (marker) {
        marker.remove()
        marker = null
      }
      return
    }
    if (!marker || marker.getLatLng().lat !== next.latitud || marker.getLatLng().lng !== next.longitud) {
      setMarker(next.latitud, next.longitud)
    }
  },
)

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
  marker = null
})

defineExpose({ clear: clearMarker })
</script>

<template>
  <div class="picker">
    <div ref="mapEl" class="picker__map" :style="{ minHeight }" aria-label="Selector de ubicación"></div>

    <div class="picker__bar">
      <p v-if="locating" class="picker__hint">Detectando tu ubicación…</p>
      <p v-else-if="!modelValue" class="picker__hint">
        Haz clic en el mapa para fijar la ubicación del reporte.
      </p>
      <p v-else class="picker__hint">
        Lat <strong>{{ modelValue.latitud.toFixed(5) }}</strong>,
        Lng <strong>{{ modelValue.longitud.toFixed(5) }}</strong>
      </p>
      <button
        v-if="modelValue"
        type="button"
        class="picker__clear"
        @click="clearMarker"
      >
        Limpiar
      </button>
    </div>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.picker__map {
  width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-alt);
}

.picker__map :deep(.leaflet-container) {
  height: 100%;
  width: 100%;
  font-family: var(--font-body);
  cursor: crosshair;
}

.picker__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-sm);
}

.picker__hint {
  margin: 0;
  color: var(--color-text-muted);
}

.picker__hint strong {
  color: var(--color-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.picker__clear {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 4px var(--space-3);
  font: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: border-color 150ms ease, color 150ms ease;
}

.picker__clear:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
</style>
