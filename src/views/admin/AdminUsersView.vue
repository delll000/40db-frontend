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
        <span>Usuarios</span>
      </nav>
      <h1>Usuarios</h1>
      <p class="page__sub">
        Administra cuentas de funcionarios, vecinos y otros administradores.
      </p>
    </header>

    <BasePendingBanner
      message="No hay endpoints de gestión de usuarios en el backend MVP. La promoción a 'municipalidad' se hace manualmente desde el SQL editor de Supabase."
      doc-ref="02-endpoints-faltantes-back.md §6, §7"
    />

    <BaseCard padding="lg">
      <BaseEmpty
        icon="◉"
        title="Próximamente"
        message="Listado de usuarios con búsqueda, filtros por rol, alta y suspensión de cuentas."
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
