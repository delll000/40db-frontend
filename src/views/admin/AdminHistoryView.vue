<script setup lang="ts">
import BaseCard from '@/components/common/BaseCard.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BasePendingBanner from '@/components/common/BasePendingBanner.vue'
</script>

<template>
  <div class="page">
    <header class="page__head">
      <nav aria-label="Migas de pan" class="page__crumbs">
        <router-link to="/admin-dashboard">Inicio</router-link> ›
        <span>Historial</span>
      </nav>
      <h1>Historial de conectividad</h1>
      <p class="page__sub">
        Eventos de conectividad por sensor en los últimos 30 días.
      </p>
    </header>

    <BasePendingBanner
      message="El backend MVP no expone historial de conectividad por sensor. El estado online/intermitente/offline se deriva client-side de la última lectura."
      doc-ref="02-endpoints-faltantes-back.md §9"
    />

    <BaseCard padding="lg">
      <BaseEmpty
        icon="⌚"
        title="Próximamente"
        message="Línea de tiempo de eventos online/intermitente/offline por sensor con filtros de fecha y exportación de reporte de disponibilidad PDF."
      >
        <template #actions>
          <BaseButton to="/admin-dashboard" variant="secondary">Volver al panel</BaseButton>
        </template>
      </BaseEmpty>
    </BaseCard>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.page__crumbs {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}
.page__crumbs a {
  color: var(--color-primary);
}
.page__head h1 {
  margin: 0 0 var(--space-2);
}
.page__sub {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
