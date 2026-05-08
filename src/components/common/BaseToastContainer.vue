<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import BaseToast from './BaseToast.vue'

const store = useToastStore()
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      <transition-group name="toast-tg" tag="div" class="toast-stack">
        <BaseToast
          v-for="t in store.items"
          :key="t.id"
          :toast="t"
          @dismiss="store.dismiss"
        />
      </transition-group>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: var(--space-4);
  right: var(--space-4);
  z-index: 1100;
  pointer-events: none;
}

.toast-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.toast-stack > * {
  pointer-events: auto;
}

.toast-tg-enter-active,
.toast-tg-leave-active {
  transition:
    transform 200ms ease,
    opacity 200ms ease;
}
.toast-tg-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.toast-tg-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
