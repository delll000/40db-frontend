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
        <span>Hardware</span>
      </nav>
      <h1>Gestión de hardware IoT</h1>
      <p class="page__sub">Registra, edita y da de baja sensores acústicos.</p>
    </header>

    <BasePendingBanner
      message="El backend MVP no expone endpoints para listar ni gestionar sensores. La sección está disponible solo como demo de UI."
      doc-ref="02-endpoints-faltantes-back.md §1, §3"
    />

    <BaseCard padding="lg">
      <BaseEmpty
        icon="⚙"
        title="Próximamente"
        message="Aquí se mostrará la tabla paginada de dispositivos con búsqueda, filtros por estado y acciones de registro/edición/baja según HU-006."
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
