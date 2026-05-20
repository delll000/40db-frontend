<script setup lang="ts">
type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'
type Size = 'sm' | 'md'

withDefaults(
  defineProps<{
    tone?: Tone
    size?: Size
    /** Si true, agrega un punto coloreado al inicio (estilo "estado"). */
    dot?: boolean
  }>(),
  {
    tone: 'neutral',
    size: 'md',
    dot: false,
  },
)
</script>

<template>
  <span :class="['badge', `badge--${tone}`, `badge--${size}`]">
    <span v-if="dot" class="badge__dot" aria-hidden="true" />
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-full);
  font-weight: var(--font-semibold);
  line-height: 1;
  border: 1px solid transparent;
}

.badge--sm {
  padding: 2px var(--space-2);
  font-size: var(--text-xs);
}

.badge--md {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
}

.badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.badge--success {
  background: rgba(27, 94, 32, 0.12);
  color: var(--color-success);
  border-color: rgba(27, 94, 32, 0.3);
}
.badge--warning {
  background: rgba(255, 171, 145, 0.25);
  color: #b45722;
  border-color: rgba(255, 171, 145, 0.6);
}
.badge--danger {
  background: rgba(183, 28, 28, 0.1);
  color: var(--color-danger);
  border-color: rgba(183, 28, 28, 0.3);
}
.badge--info {
  background: rgba(0, 77, 64, 0.1);
  color: var(--color-primary);
  border-color: rgba(0, 77, 64, 0.3);
}
.badge--neutral {
  background: var(--color-bg-alt);
  color: var(--color-text);
  border-color: var(--color-border);
}
</style>
