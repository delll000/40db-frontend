<script setup lang="ts">
interface Band {
  range: string
  label: string
  color: string
}

const bands: Band[] = [
  { range: '< 55 dB', label: 'Aceptable', color: '#1b5e20' },
  { range: '55 – 65 dB', label: 'Moderado', color: '#fbc02d' },
  { range: '65 – 75 dB', label: 'Alto', color: '#ef6c00' },
  { range: '> 75 dB', label: 'Crítico', color: '#b71c1c' },
]
</script>

<template>
  <ul class="legend" aria-label="Escala de intensidad de ruido">
    <li v-for="b in bands" :key="b.range" class="legend__item">
      <span class="legend__sw" :style="{ background: b.color }" aria-hidden="true" />
      <div class="legend__text">
        <span class="legend__range">{{ b.range }}</span>
        <span class="legend__label">{{ b.label }}</span>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.legend {
  list-style: none;
  margin: 0;
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.legend__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.legend__sw {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  display: inline-block;
}

.legend__text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.legend__range {
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.legend__label {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}
</style>
