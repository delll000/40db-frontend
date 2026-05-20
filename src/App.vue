<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import VecinoLayout from '@/components/layout/VecinoLayout.vue'
import FuncionarioLayout from '@/components/layout/FuncionarioLayout.vue'
import BaseToastContainer from '@/components/common/BaseToastContainer.vue'

const layouts = {
  public: PublicLayout,
  admin: AdminLayout,
  vecino: VecinoLayout,
  funcionario: FuncionarioLayout,
} as const

type LayoutKey = keyof typeof layouts

const route = useRoute()

const layout = computed(() => {
  const key = (route.meta.layout as LayoutKey | undefined) ?? 'public'
  return layouts[key] ?? PublicLayout
})
</script>

<template>
  <component :is="layout">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </component>
  <BaseToastContainer />
</template>
