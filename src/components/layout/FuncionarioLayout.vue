<script setup lang="ts">
import HeaderApp from './HeaderApp.vue'
</script>

<template>
  <div class="fl">
    <HeaderApp />
    <main class="fl__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.fl {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--color-bg-alt);
}
.fl__main {
  flex: 1 1 auto;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-6);
}

@media (max-width: 540px) {
  .fl__main {
    padding: var(--space-4);
  }
}
</style>
