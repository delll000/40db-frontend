<script setup lang="ts">
type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'

withDefaults(
  defineProps<{
    label: string
    value: string | number
    unit?: string
    sub?: string
    tone?: Tone
    icon?: string
    loading?: boolean
  }>(),
  {
    tone: 'primary',
    loading: false,
  },
)
</script>

<template>
  <article :class="['kpi', `kpi--${tone}`]" :aria-busy="loading || undefined">
    <div class="kpi__head">
      <span class="kpi__label">{{ label }}</span>
      <span v-if="icon" class="kpi__icon" aria-hidden="true">{{ icon }}</span>
    </div>
    <div class="kpi__value">
      <template v-if="loading">—</template>
      <template v-else>
        {{ value }}
        <span v-if="unit" class="kpi__unit">{{ unit }}</span>
      </template>
    </div>
    <p v-if="sub" class="kpi__sub">{{ sub }}</p>
  </article>
</template>

<style scoped>
.kpi {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-6);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.kpi--success {
  border-left-color: var(--color-success);
}
.kpi--warning {
  border-left-color: #d97706;
}
.kpi--danger {
  border-left-color: var(--color-danger);
}
.kpi--neutral {
  border-left-color: var(--color-border);
}
.kpi--info {
  border-left-color: var(--color-info);
}

.kpi__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.kpi__label {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kpi__icon {
  font-size: var(--text-lg);
  opacity: 0.7;
}

.kpi__value {
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text);
  line-height: var(--leading-tight);
  word-break: break-word;
}

.kpi__unit {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-muted);
  margin-left: var(--space-1);
}

.kpi__sub {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
