<script setup lang="ts">
type Size = 'sm' | 'md' | 'lg'

withDefaults(
  defineProps<{
    size?: Size
    label?: string
  }>(),
  {
    size: 'md',
    label: 'Cargando…',
  },
)
</script>

<template>
  <div :class="['spinner', `spinner--${size}`]" role="status">
    <span class="sr-only">{{ label }}</span>
  </div>
</template>

<style scoped>
.spinner {
  display: inline-block;
  border: 2px solid var(--color-bg-alt);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: sp 700ms linear infinite;
}
.spinner--sm {
  width: 14px;
  height: 14px;
}
.spinner--md {
  width: 24px;
  height: 24px;
}
.spinner--lg {
  width: 40px;
  height: 40px;
  border-width: 3px;
}
@keyframes sp {
  to {
    transform: rotate(360deg);
  }
}
</style>
