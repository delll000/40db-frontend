<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { HOME_BY_ROLE } from '@/types/auth'
import logoColor from '@/assets/brand/logo.color.svg'
import BaseButton from '@/components/common/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()

const ctaTo = computed(() => {
  if (auth.isAuthenticated && auth.role) return HOME_BY_ROLE[auth.role]
  return '/auth'
})

const ctaLabel = computed(() => (auth.isAuthenticated ? 'Ir a mi panel' : 'Iniciar sesión'))

async function logout() {
  await auth.signOut()
  router.push('/home')
}
</script>

<template>
  <header class="hp">
    <div class="hp__inner">
      <router-link to="/home" class="hp__brand" aria-label="40dB inicio">
        <img :src="logoColor" alt="" class="hp__logo" />
      </router-link>

      <nav class="hp__nav" aria-label="Navegación principal">
        <BaseButton :to="ctaTo" variant="primary">
          {{ ctaLabel }}
        </BaseButton>
        <BaseButton v-if="auth.isAuthenticated" variant="ghost" @click="logout">
          Cerrar sesión
        </BaseButton>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.hp {
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 50;
}
.hp__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.hp__brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.hp__logo {
  height: 64px;
  width: auto;
}
.hp__nav {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
</style>
