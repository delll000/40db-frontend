<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Título del banner. */
    title?: string
    /** Mensaje principal. */
    message: string
    /** Referencia textual al doc (ej. "§1 de endpoints-faltantes-back.md"). */
    docRef?: string
  }>(),
  {
    title: 'Funcionalidad pendiente en backend',
  },
)
</script>

<template>
  <aside class="pending" role="status">
    <span class="pending__icon" aria-hidden="true">⚠</span>
    <div class="pending__body">
      <strong class="pending__title">{{ title }}</strong>
      <p class="pending__msg">{{ message }}</p>
      <p v-if="docRef" class="pending__ref">
        Detalle:
        <code>docs/integracion-backend/{{ docRef }}</code>
      </p>
    </div>
  </aside>
</template>

<style scoped>
.pending {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: rgba(251, 192, 45, 0.1);
  border: 1px solid rgba(251, 192, 45, 0.4);
  border-left: 4px solid #f9a825;
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--text-sm);
}

.pending__icon {
  font-size: 1.25rem;
  line-height: 1.2;
  color: #f9a825;
  flex-shrink: 0;
}

.pending__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.pending__title {
  display: block;
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.pending__msg {
  margin: 0;
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
}

.pending__ref {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.pending__ref code {
  background: rgba(0, 0, 0, 0.04);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em;
}
</style>
