<script setup lang="ts">
import KpiCard from '@/components/common/KpiCard.vue'
import type { HeatmapKpis } from '@/types/kpi'

defineProps<{
  kpis: HeatmapKpis | null
  loading?: boolean
}>()
</script>

<template>
  <div class="kpis">
    <KpiCard
      label="dB promedio"
      :value="kpis?.avgDb ?? '—'"
      unit="dB(A)"
      icon="◐"
      :loading="loading"
    />
    <KpiCard
      label="Zonas sobre estándar"
      :value="kpis?.zonesOverStandard ?? '—'"
      sub="DS 14/2024"
      icon="!"
      :tone="kpis && kpis.zonesOverStandard > 2 ? 'warning' : 'primary'"
      :loading="loading"
    />
    <KpiCard
      label="Sensores activos"
      :value="kpis?.activeSensors ?? '—'"
      sub="Reportaron en 15 min"
      icon="●"
      tone="success"
      :loading="loading"
    />
    <KpiCard
      label="Zona más ruidosa"
      :value="kpis?.noisiestZone?.zone ?? '—'"
      :sub="kpis?.noisiestZone ? `${kpis.noisiestZone.db} dB · últimos 5 min` : ''"
      icon="◍"
      :tone="kpis && kpis.noisiestZone && kpis.noisiestZone.db > 75 ? 'danger' : 'primary'"
      :loading="loading"
    />
  </div>
</template>

<style scoped>
.kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

@media (max-width: 1080px) {
  .kpis {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 540px) {
  .kpis {
    grid-template-columns: 1fr;
  }
}
</style>
