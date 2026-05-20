<script setup lang="ts">
// Shell del admin: solo renderiza la sub-ruta. La sidebar la provee AdminLayout.
</script>
<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>
