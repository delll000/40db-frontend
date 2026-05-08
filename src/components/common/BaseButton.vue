<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
    block?: boolean
    /** Si se pasa, el botón se renderiza como <RouterLink>. */
    to?: RouteLocationRaw
    /** Si se pasa (y no hay `to`), se renderiza como <a>. */
    href?: string
    target?: string
    ariaLabel?: string
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
  },
)

defineEmits<{
  click: [event: MouseEvent]
}>()

const tag = computed(() => {
  if (props.to) return 'router-link'
  if (props.href) return 'a'
  return 'button'
})

const classes = computed(() => [
  'btn',
  `btn--${props.variant}`,
  `btn--${props.size}`,
  { 'btn--block': props.block, 'is-loading': props.loading, 'is-disabled': props.disabled },
])
</script>

<template>
  <component
    :is="tag === 'router-link' ? RouterLink : tag"
    :class="classes"
    :type="tag === 'button' ? type : undefined"
    :to="to"
    :href="tag === 'a' ? href : undefined"
    :target="target"
    :rel="target === '_blank' ? 'noopener noreferrer' : undefined"
    :disabled="tag === 'button' ? disabled || loading : undefined"
    :aria-disabled="disabled || loading || undefined"
    :aria-busy="loading || undefined"
    :aria-label="ariaLabel"
    @click="(e: MouseEvent) => $emit('click', e)"
  >
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
    <span v-if="$slots.iconLeft" class="btn__icon" aria-hidden="true">
      <slot name="iconLeft" />
    </span>
    <span class="btn__label">
      <slot />
    </span>
    <span v-if="$slots.iconRight" class="btn__icon" aria-hidden="true">
      <slot name="iconRight" />
    </span>
  </component>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-weight: var(--font-semibold);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    color 150ms ease,
    transform 80ms ease,
    box-shadow 150ms ease;
  text-decoration: none;
  white-space: nowrap;
  user-select: none;
}

.btn--block {
  width: 100%;
}

/* Tamaños */
.btn--sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  min-height: 32px;
}
.btn--md {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  min-height: 40px;
}
.btn--lg {
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-lg);
  min-height: 48px;
}

/* Variantes */
.btn--primary {
  background: var(--color-primary);
  color: #fff;
}
.btn--primary:hover:not(.is-disabled):not(.is-loading) {
  background: var(--color-primary-hover);
}

.btn--secondary {
  background: transparent;
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.btn--secondary:hover:not(.is-disabled):not(.is-loading) {
  background: rgba(0, 77, 64, 0.06);
}

.btn--ghost {
  background: transparent;
  color: var(--color-text);
}
.btn--ghost:hover:not(.is-disabled):not(.is-loading) {
  background: var(--color-bg-alt);
}

.btn--danger {
  background: var(--color-danger);
  color: #fff;
}
.btn--danger:hover:not(.is-disabled):not(.is-loading) {
  background: #8e1414;
}

/* Estados */
.btn:active:not(.is-disabled):not(.is-loading) {
  transform: translateY(1px);
}

.btn.is-disabled,
.btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.btn.is-loading {
  cursor: progress;
}

.btn:hover:not(.is-disabled) {
  text-decoration: none;
}

/* Spinner */
.btn__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: btn-spin 700ms linear infinite;
}

.btn__icon {
  display: inline-flex;
  align-items: center;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
