<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

type Padding = 'none' | 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    padding?: Padding
    interactive?: boolean
    /** Si se pasa, la tarjeta entera es un router-link. */
    to?: RouteLocationRaw
    /** Si se pasa (y no hay `to`), la tarjeta es un <a>. */
    href?: string
  }>(),
  {
    padding: 'md',
    interactive: false,
  },
)

const tag = computed(() => {
  if (props.to) return 'router-link'
  if (props.href) return 'a'
  return 'div'
})

const classes = computed(() => [
  'card',
  `card--p-${props.padding}`,
  { 'card--interactive': props.interactive || !!props.to || !!props.href },
])
</script>

<template>
  <component
    :is="tag === 'router-link' ? RouterLink : tag"
    :class="classes"
    :to="to"
    :href="tag === 'a' ? href : undefined"
  >
    <header v-if="$slots.header" class="card__header">
      <slot name="header" />
    </header>
    <div class="card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="card__footer">
      <slot name="footer" />
    </footer>
  </component>
</template>

<style scoped>
.card {
  display: block;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  color: inherit;
  text-decoration: none;
  transition:
    box-shadow 150ms ease,
    transform 150ms ease,
    border-color 150ms ease;
}

.card--p-none .card__body {
  padding: 0;
}
.card--p-sm .card__body {
  padding: var(--space-3);
}
.card--p-md .card__body {
  padding: var(--space-6);
}
.card--p-lg .card__body {
  padding: var(--space-8);
}

.card__header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}
.card__footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-alt);
  border-bottom-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
}

.card--interactive {
  cursor: pointer;
}
.card--interactive:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: var(--color-primary);
  text-decoration: none;
}
</style>
