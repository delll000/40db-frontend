<script setup lang="ts">
import type { Toast } from '@/stores/toast'

defineProps<{
  toast: Toast
}>()

defineEmits<{
  dismiss: [id: string]
}>()

const ICONS: Record<Toast['tone'], string> = {
  success: '✓',
  error: '⚠',
  warning: '!',
  info: 'i',
}
</script>

<template>
  <div :class="['toast', `toast--${toast.tone}`]" role="status" aria-live="polite">
    <span :class="['toast__icon', `toast__icon--${toast.tone}`]" aria-hidden="true">
      {{ ICONS[toast.tone] }}
    </span>
    <div class="toast__content">
      <p class="toast__title">{{ toast.title }}</p>
      <p v-if="toast.message" class="toast__message">{{ toast.message }}</p>
    </div>
    <button
      type="button"
      class="toast__close"
      aria-label="Cerrar notificación"
      @click="$emit('dismiss', toast.id)"
    >
      ✕
    </button>
  </div>
</template>

<style scoped>
.toast {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: flex-start;
  gap: var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  min-width: 280px;
  max-width: 420px;
  box-shadow: var(--shadow-md);
}

.toast--success {
  border-left-color: var(--color-success);
}
.toast--error {
  border-left-color: var(--color-danger);
}
.toast--warning {
  border-left-color: #d97706;
}
.toast--info {
  border-left-color: var(--color-info);
}

.toast__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-weight: var(--font-bold);
  font-size: var(--text-sm);
  color: #fff;
}
.toast__icon--success {
  background: var(--color-success);
}
.toast__icon--error {
  background: var(--color-danger);
}
.toast__icon--warning {
  background: #d97706;
}
.toast__icon--info {
  background: var(--color-info);
}

.toast__content {
  min-width: 0;
}

.toast__title {
  margin: 0;
  font-weight: var(--font-semibold);
  color: var(--color-text);
  font-size: var(--text-sm);
}

.toast__message {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.toast__close {
  background: transparent;
  border: 0;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
}
.toast__close:hover {
  background: var(--color-bg-alt);
  color: var(--color-text);
}
</style>
