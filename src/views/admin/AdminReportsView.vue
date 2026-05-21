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
        <span>Reportes</span>
      </nav>
      <h1>Generación de reportes</h1>
      <p class="page__sub">
        Genera reportes institucionales en PDF, Excel o CSV con filtros por fecha y zona.
      </p>
    </header>

    <BasePendingBanner
      message="El backend MVP solo expone listados scoped por comuna o por usuario. Para exportes admin cross-comuna se necesita un endpoint agregado."
      doc-ref="02-endpoints-faltantes-back.md §8"
    />

    <BaseCard padding="lg">
      <BaseEmpty
        icon="▤"
        title="Próximamente"
        message="Generador de reportes en formato PDF/Excel/CSV con plantilla institucional, filtros por fecha, zona y tipo, y registro de auditoría según HU-005."
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
