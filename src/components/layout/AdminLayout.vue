<script setup lang="ts">
import SidebarAdmin from './SidebarAdmin.vue'
import HeaderApp from './HeaderApp.vue'
</script>

<template>
  <div class="al">
    <SidebarAdmin />
    <div class="al__col">
      <HeaderApp hide-brand />
      <main class="al__main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.al {
  display: flex;
  height: 100%;
  min-height: 100vh;
  background: var(--color-bg-alt);
}
.al__col {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}
.al__main {
  flex: 1 1 auto;
  padding: var(--space-6);
  overflow-y: auto;
}

@media (max-width: 540px) {
  .al__main {
    padding: var(--space-4);
  }
}
</style>
