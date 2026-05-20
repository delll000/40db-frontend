<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS } from '@/types/auth'
import logoColor from '@/assets/brand/logo.color.svg'
import logoMonoWhite from '@/assets/brand/logo-mono-white.svg'
import BaseButton from '@/components/common/BaseButton.vue'

withDefaults(
  defineProps<{
    /** Si true, oculta el logo (lo provee la sidebar en AdminLayout) */
    hideBrand?: boolean
    /** Si true, fondo oscuro (para variantes) */
    dark?: boolean
  }>(),
  { hideBrand: false, dark: false },
)

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/home')
}

function initials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
</script>

<template>
  <header :class="['ha', { 'ha--dark': dark }]">
    <div class="ha__brand">
      <router-link v-if="!hideBrand" to="/home" aria-label="40dB inicio">
        <img :src="dark ? logoMonoWhite : logoColor" alt="40dB" class="ha__logo" />
      </router-link>
      <slot name="brand-extra" />
    </div>

    <div class="ha__user" v-if="auth.isAuthenticated">
      <div class="ha__user-info">
        <p class="ha__name">{{ auth.user?.nombre }}</p>
        <p class="ha__role">{{ auth.role ? ROLE_LABELS[auth.role] : '' }}</p>
      </div>
      <div class="ha__avatar" aria-hidden="true">{{ initials(auth.user?.nombre) }}</div>
      <BaseButton variant="ghost" size="sm" @click="logout">Cerrar sesión</BaseButton>
    </div>
  </header>
</template>

<style scoped>
.ha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-6);
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}
.ha--dark {
  background: var(--color-primary);
  color: #fff;
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.ha__brand {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.ha__logo {
  height: 32px;
  width: auto;
  display: block;
}

.ha__user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.ha__user-info {
  text-align: right;
  line-height: 1.2;
}

.ha__name {
  margin: 0;
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
}

.ha__role {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.ha--dark .ha__role {
  color: rgba(255, 255, 255, 0.75);
}

.ha__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-bold);
  font-size: var(--text-sm);
  font-family: var(--font-heading);
}

@media (max-width: 540px) {
  .ha__user-info {
    display: none;
  }
}
</style>
