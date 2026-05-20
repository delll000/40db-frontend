<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import HeatmapMap from '@/components/mapa/HeatmapMap.vue'
import HeatmapKpis from '@/components/mapa/HeatmapKpis.vue'
import HeatmapFilters from '@/components/mapa/HeatmapFilters.vue'
import HeatmapLegend from '@/components/mapa/HeatmapLegend.vue'
import HeatmapExport from '@/components/mapa/HeatmapExport.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import { useHeatmapData } from '@/composables/useHeatmapData'
import { sensorsService } from '@/services/sensors.service'
import { defaultHeatmapFilters } from '@/types/filters'
import type { HeatmapFilters as HmFilters } from '@/types/filters'
import type { Sensor } from '@/types/sensor'

const filters = ref<HmFilters>(defaultHeatmapFilters())
const { points, kpis, loading, error, refresh } = useHeatmapData(filters)

const zones = ref<string[]>([])
const sensors = ref<Sensor[]>([])

onMounted(async () => {
  zones.value = await sensorsService.zones()
  sensors.value = await sensorsService.list()
})

const mapRef = ref<InstanceType<typeof HeatmapMap> | null>(null)
const mapElement = computed(() => mapRef.value?.getElement?.() ?? null)

const lastUpdate = computed(() => {
  if (!kpis.value) return ''
  const d = new Date(kpis.value.lastUpdate)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
})
</script>

<template>
  <div class="hview">
    <!-- Top bar -->
    <header class="hview__head">
      <div>
        <h1 class="hview__title">Mapa de Ruido — Maipú</h1>
        <p class="hview__sub">
          Monitoreo en tiempo real con sensores acústicos. Actualización cada 60 s.
        </p>
      </div>
      <div class="hview__meta">
        <span v-if="loading" class="hview__status">
          <BaseSpinner size="sm" />
          Actualizando…
        </span>
        <span v-else-if="kpis" class="hview__status">
          <span class="hview__dot" aria-hidden="true" />
          Última actualización: {{ lastUpdate }}
        </span>
        <BaseButton variant="ghost" size="sm" :disabled="loading" @click="refresh">
          ⟳ Refrescar
        </BaseButton>
      </div>
    </header>

    <!-- Alerta sostenida -->
    <div v-if="kpis?.alertSustained" class="hview__alert" role="alert">
      <span class="hview__alert-icon" aria-hidden="true">●</span>
      <strong>Zona crítica:</strong>
      {{ kpis.alertSustained.zone }} supera 75 dB(A) durante
      {{ kpis.alertSustained.minutes }} min. Se recomienda priorizar atención.
    </div>

    <!-- Error -->
    <div v-if="error" class="hview__error" role="alert">
      <strong>Error:</strong> {{ error }}
      <BaseButton variant="ghost" size="sm" @click="refresh">Reintentar</BaseButton>
    </div>

    <!-- KPIs -->
    <HeatmapKpis :kpis="kpis" :loading="loading" />

    <!-- Filtros -->
    <HeatmapFilters
      v-model="filters"
      :zones="zones"
      :sensors="sensors"
    />

    <!-- Mapa + leyenda + exportes -->
    <section class="hview__map-wrap">
      <div class="hview__map-bar">
        <HeatmapLegend />
        <HeatmapExport :map-element="mapElement" :points="points" :kpis="kpis" />
      </div>
      <HeatmapMap ref="mapRef" :points="points" min-height="560px" />
    </section>
  </div>
</template>

<style scoped>
.hview {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.hview__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.hview__title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-2xl);
}
.hview__sub {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.hview__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.hview__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.hview__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success);
  display: inline-block;
}

.hview__alert {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: rgba(183, 28, 28, 0.06);
  border: 1px solid rgba(183, 28, 28, 0.3);
  border-left: 4px solid var(--color-danger);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text);
  font-size: var(--text-sm);
}

.hview__alert-icon {
  color: var(--color-danger);
  font-size: 1.2rem;
  animation: blink 1.4s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.hview__error {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: rgba(183, 28, 28, 0.08);
  border: 1px solid rgba(183, 28, 28, 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-danger);
  font-size: var(--text-sm);
}

.hview__map-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hview__map-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: center;
}
</style>
