<script setup lang="ts">
import HeaderApp from './HeaderApp.vue'
</script>

<template>
  <div class="vl">
    <HeaderApp />
    <main class="vl__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.vl {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--color-bg-alt);
}
.vl__main {
  flex: 1 1 auto;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-6);
}

@media (max-width: 540px) {
  .vl__main {
    padding: var(--space-4);
  }
}
</style>
