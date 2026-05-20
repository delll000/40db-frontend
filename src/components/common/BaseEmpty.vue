<script setup lang="ts">
defineProps<{
  title: string
  message?: string
  icon?: string
}>()
</script>

<template>
  <div class="empty">
    <div v-if="icon || $slots.icon" class="empty__icon" aria-hidden="true">
      <slot name="icon">{{ icon }}</slot>
    </div>
    <h3 class="empty__title">{{ title }}</h3>
    <p v-if="message" class="empty__msg">{{ message }}</p>
    <div v-if="$slots.actions" class="empty__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-6);
  text-align: center;
  color: var(--color-text-muted);
}
.empty__icon {
  font-size: 3rem;
  line-height: 1;
  margin-bottom: var(--space-4);
  color: var(--color-primary);
  opacity: 0.6;
}
.empty__title {
  margin: 0 0 var(--space-2);
  color: var(--color-text);
}
.empty__msg {
  margin: 0 0 var(--space-4);
  max-width: 480px;
}
.empty__actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
</style>
