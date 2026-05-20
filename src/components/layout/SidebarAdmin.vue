<script setup lang="ts">
import { ref } from 'vue'
import logoMonoWhite from '@/assets/brand/logo-mono-white.svg'

interface NavItem {
  to: string
  label: string
  icon: string
  exact?: boolean
}

const items: NavItem[] = [
  { to: '/admin-dashboard', label: 'Inicio', icon: '⌂', exact: true },
  { to: '/admin-dashboard/hardware', label: 'Hardware', icon: '⚙' },
  { to: '/admin-dashboard/usuarios', label: 'Usuarios', icon: '◉' },
  { to: '/heatmap', label: 'Mapa de ruido', icon: '◍' },
  { to: '/admin-dashboard/reportes', label: 'Reportes', icon: '▤' },
  { to: '/admin-dashboard/historial', label: 'Historial', icon: '⌚' },
]

const collapsed = ref(false)
</script>

<template>
  <aside :class="['sb', { 'sb--collapsed': collapsed }]" aria-label="Navegación administrador">
    <div class="sb__brand">
      <img :src="logoMonoWhite" alt="40dB" class="sb__logo" />
      <button
        type="button"
        class="sb__toggle"
        :aria-label="collapsed ? 'Expandir menú' : 'Colapsar menú'"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '»' : '«' }}
      </button>
    </div>

    <nav class="sb__nav">
      <router-link
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="sb__link"
        active-class="is-active"
        :exact-active-class="item.exact ? 'is-active' : ''"
      >
        <span class="sb__icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="sb__label">{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<style scoped>
.sb {
  background: var(--color-primary);
  color: #fff;
  width: 240px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 200ms ease;
}

.sb--collapsed {
  width: 64px;
}

.sb__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sb__logo {
  height: 32px;
  width: auto;
}

.sb--collapsed .sb__logo {
  display: none;
}

.sb__toggle {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 1rem;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}
.sb__toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.sb__nav {
  display: flex;
  flex-direction: column;
  padding: var(--space-3) var(--space-2);
  gap: 2px;
}

.sb__link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  white-space: nowrap;
  transition: background 150ms ease, color 150ms ease;
}
.sb__link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  text-decoration: none;
}
.sb__link.is-active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.sb__icon {
  width: 20px;
  text-align: center;
  font-size: var(--text-base);
}

.sb--collapsed .sb__label {
  display: none;
}

@media (max-width: 768px) {
  .sb {
    width: 64px;
  }
  .sb .sb__label,
  .sb .sb__logo {
    display: none;
  }
}
</style>
