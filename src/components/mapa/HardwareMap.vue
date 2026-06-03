<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import type { Sensor } from '@/types/sensor'

const props = withDefaults(
  defineProps<{
    sensors: Sensor[]
    modelValue: Sensor | null
    fallbackCenter?: [number, number]
    initialZoom?: number
  }>(),
  {
    fallbackCenter: () => [-33.4569, -70.6483], // Santiago centro por defecto
    initialZoom: 11,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: Sensor | null]
}>()

const mapEl = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let markerGroup: L.FeatureGroup | null = null
const markersMap = new Map<string, L.CircleMarker>()

// Obtener color según el estado de salud del sensor
function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return '#10b981' // Esmeralda / Verde
    case 'intermitente':
      return '#f59e0b' // Ambar / Amarillo
    case 'offline':
      return '#ef4444' // Rojo
    case 'sin_lecturas':
    default:
      return '#9ca3af' // Gris
  }
}

// Crea o actualiza los marcadores en el mapa
function renderMarkers() {
  if (!map || !markerGroup) return

  // Limpiar marcadores antiguos
  markerGroup.clearLayers()
  markersMap.clear()

  props.sensors.forEach((sensor) => {
    if (!sensor.latitud || !sensor.longitud) return

    const color = getStatusColor(sensor.estado_salud)
    const isSelected = props.modelValue?.id === sensor.id

    // Crear marcador circular moderno
    const marker = L.circleMarker([sensor.latitud, sensor.longitud], {
      radius: isSelected ? 10 : 8,
      fillColor: color,
      color: isSelected ? '#ffffff' : '#1e293b', // Borde blanco si está seleccionado, azul oscuro si no
      weight: isSelected ? 3 : 2,
      opacity: 1,
      fillOpacity: 0.9,
    })

    // Tooltip rápido al pasar el cursor
    marker.bindTooltip(
      `<strong>${sensor.nombre}</strong><br/>${
        sensor.ultima_lectura_db !== null
          ? `${sensor.ultima_lectura_db.toFixed(1)} dB(A)`
          : 'Sin lecturas'
      }`,
      {
        direction: 'top',
        offset: [0, -5],
      },
    )

    // Evento de clic para seleccionar
    marker.on('click', () => {
      emit('update:modelValue', sensor)
    })

    marker.addTo(markerGroup!)
    markersMap.set(sensor.id, marker)
  })

  // Ajustar la vista si hay marcadores y no hay un sensor seleccionado inicialmente
  if (props.sensors.length > 0 && !props.modelValue && markerGroup.getBounds().isValid()) {
    map.fitBounds(markerGroup.getBounds().pad(0.1), { maxZoom: 15 })
  }
}

// Centrar el mapa en el sensor seleccionado
function centerOnSelected() {
  if (!map || !props.modelValue) return
  const { latitud, longitud } = props.modelValue
  if (latitud && longitud) {
    map.setView([latitud, longitud], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.5,
    })
  }
}

onMounted(() => {
  if (!mapEl.value) return

  // Crear mapa
  map = L.map(mapEl.value, {
    zoomControl: true,
    dragging: true,
    scrollWheelZoom: true,
  }).setView(props.fallbackCenter, props.initialZoom)

  // Capa base OpenStreetMap
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  // Grupo para manejar todos los marcadores juntos
  markerGroup = L.featureGroup().addTo(map)

  // Dibujar marcadores iniciales
  renderMarkers()

  // Si ya viene un sensor seleccionado por prop, centrar en él
  if (props.modelValue) {
    centerOnSelected()
  }

  // Manejar el redimensionamiento del contenedor del mapa de manera limpia
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => map?.invalidateSize())
    ro.observe(mapEl.value)
    onBeforeUnmount(() => ro.disconnect())
  }
})

// Observar cambios en la lista de sensores para volver a dibujarlos
watch(() => props.sensors, renderMarkers, { deep: true })

// Observar cambios en el sensor seleccionado para actualizar radios/bordes y centrar
watch(
  () => props.modelValue,
  (newSelected, oldSelected) => {
    if (!map) return

    // Restaurar estilo del marcador anteriormente seleccionado
    if (oldSelected) {
      const oldMarker = markersMap.get(oldSelected.id)
      if (oldMarker) {
        oldMarker.setStyle({
          radius: 8,
          color: '#1e293b',
          weight: 2,
        })
      }
    }

    // Destacar el nuevo marcador seleccionado
    if (newSelected) {
      const newMarker = markersMap.get(newSelected.id)
      if (newMarker) {
        newMarker.setStyle({
          radius: 10,
          color: '#ffffff',
          weight: 3,
        })
        centerOnSelected()
      }
    }
  },
)

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
  markerGroup = null
})
</script>

<template>
  <div class="hw-map">
    <div ref="mapEl" class="hw-map__canvas" aria-label="Mapa de sensores"></div>
  </div>
</template>

<style scoped>
.hw-map {
  width: 100%;
  height: 100%;
  position: relative;
}

.hw-map__canvas {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-alt);
}

.hw-map__canvas :deep(.leaflet-container) {
  height: 100%;
  width: 100%;
  font-family: var(--font-body);
  border-radius: var(--radius-md);
}
</style>
