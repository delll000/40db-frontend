<script setup lang="ts">
import HeaderPublic from './HeaderPublic.vue'
import FooterPublic from './FooterPublic.vue'
</script>

<template>
  <div class="pl">
    <HeaderPublic />
    <main class="pl__main">
      <slot />
    </main>
    <FooterPublic />
  </div>
</template>

<style scoped>
.pl {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.pl__main {
  flex: 1 1 auto;
}
</style>
