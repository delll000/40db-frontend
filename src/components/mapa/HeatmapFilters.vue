<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import type { HeatmapFilters } from '@/types/filters'
import { defaultHeatmapFilters } from '@/types/filters'

const props = defineProps<{
  modelValue: HeatmapFilters
  zones: string[]
  sensors: { id: string; technicalId: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: HeatmapFilters]
  reset: []
}>()

// Copia local que se sincroniza con el padre
const local = ref<HeatmapFilters>({ ...props.modelValue })

watch(
  () => props.modelValue,
  (v) => {
    local.value = { ...v }
  },
  { deep: true },
)

const zoneOptions = computed(() => [
  { value: '', label: 'Todas las zonas' },
  ...props.zones.map((z) => ({ value: z, label: z })),
])

const sensorOptions = computed(() => [
  { value: '', label: 'Todos los sensores' },
  ...props.sensors.map((s) => ({ value: s.id, label: s.technicalId })),
])

const hourOptions = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${String(h).padStart(2, '0')}:00`,
}))

function emitChange(patch: Partial<HeatmapFilters>) {
  local.value = { ...local.value, ...patch }
  emit('update:modelValue', { ...local.value })
}

function reset() {
  const def = defaultHeatmapFilters()
  local.value = def
  emit('update:modelValue', def)
  emit('reset')
}
</script>

<template>
  <div class="filters">
    <div class="filters__grid">
      <BaseInput
        type="date"
        label="Desde"
        :model-value="local.dateFrom"
        @update:model-value="(v) => emitChange({ dateFrom: String(v) })"
      />
      <BaseInput
        type="date"
        label="Hasta"
        :model-value="local.dateTo"
        @update:model-value="(v) => emitChange({ dateTo: String(v) })"
      />
      <BaseSelect
        label="Hora desde"
        :model-value="String(local.hourFrom)"
        :options="hourOptions.map((h) => ({ value: String(h.value), label: h.label }))"
        @update:model-value="(v) => emitChange({ hourFrom: Number(v) })"
      />
      <BaseSelect
        label="Hora hasta"
        :model-value="String(local.hourTo)"
        :options="hourOptions.map((h) => ({ value: String(h.value), label: h.label }))"
        @update:model-value="(v) => emitChange({ hourTo: Number(v) })"
      />
      <BaseSelect
        label="Zona"
        :model-value="local.zone"
        :options="zoneOptions"
        @update:model-value="(v) => emitChange({ zone: String(v) })"
      />
      <BaseSelect
        label="Sensor"
        :model-value="local.sensorId"
        :options="sensorOptions"
        @update:model-value="(v) => emitChange({ sensorId: String(v) })"
      />
    </div>
    <div class="filters__actions">
      <BaseButton variant="ghost" size="sm" @click="reset">Restablecer</BaseButton>
    </div>
  </div>
</template>

<style scoped>
.filters {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.filters__grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-3);
}

@media (max-width: 1200px) {
  .filters__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 720px) {
  .filters__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .filters__grid {
    grid-template-columns: 1fr;
  }
}

.filters__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
