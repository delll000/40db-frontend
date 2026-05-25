<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import type { ReporteComentario } from '@/types/api'

const props = withDefaults(
  defineProps<{
    comentarios: ReporteComentario[]
    /**
     * Si true, solo se muestra el sub-bloque "Externos" (vista del vecino).
     * El back ya filtra; este flag es solo para no renderizar el header del
     * bloque interno en vacío.
     */
    soloExternos?: boolean
    /**
     * Mensaje del empty-state para los externos. El doc sugiere:
     * "Aún no hay actualizaciones del municipio sobre este reporte."
     */
    emptyExternos?: string
    emptyInternos?: string
  }>(),
  {
    soloExternos: false,
    emptyExternos: 'Aún no hay actualizaciones del municipio sobre este reporte.',
    emptyInternos: 'Aún no hay notas internas en este reporte.',
  },
)

const externos = computed(() => props.comentarios.filter((c) => c.visibilidad === 'externo'))
const internos = computed(() => props.comentarios.filter((c) => c.visibilidad === 'interno'))

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffSec = Math.round(diffMs / 1000)
  if (diffSec < 60) return 'hace un momento'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `hace ${diffHr} h`
  const diffD = Math.round(diffHr / 24)
  if (diffD < 30) return `hace ${diffD} d`
  // Para fechas viejas, mostrar absoluto.
  return formatAbsolute(iso)
}
</script>

<template>
  <div class="cmt">
    <!-- Externos -->
    <section class="cmt__group">
      <h4 v-if="!soloExternos" class="cmt__group-title">
        Mensajes al vecino
        <BaseBadge size="sm">{{ externos.length }}</BaseBadge>
      </h4>
      <ul v-if="externos.length > 0" class="cmt__list">
        <li v-for="c in externos" :key="c.id" class="cmt__item cmt__item--externo">
          <header class="cmt__item-head">
            <strong class="cmt__autor">{{ c.autor.nombre }}</strong>
            <BaseBadge tone="info" size="sm">Mensaje al vecino</BaseBadge>
            <time class="cmt__when" :title="formatAbsolute(c.created_at)">
              {{ formatRelative(c.created_at) }}
            </time>
          </header>
          <p class="cmt__body">{{ c.cuerpo }}</p>
        </li>
      </ul>
      <p v-else class="cmt__empty">{{ emptyExternos }}</p>
    </section>

    <!-- Internos -->
    <section v-if="!soloExternos" class="cmt__group">
      <h4 class="cmt__group-title">
        Notas internas
        <BaseBadge size="sm">{{ internos.length }}</BaseBadge>
      </h4>
      <ul v-if="internos.length > 0" class="cmt__list">
        <li v-for="c in internos" :key="c.id" class="cmt__item cmt__item--interno">
          <header class="cmt__item-head">
            <strong class="cmt__autor">{{ c.autor.nombre }}</strong>
            <BaseBadge v-if="c.delegado_a" tone="warning" size="sm">Delegación</BaseBadge>
            <BaseBadge v-else tone="neutral" size="sm">Nota interna</BaseBadge>
            <time class="cmt__when" :title="formatAbsolute(c.created_at)">
              {{ formatRelative(c.created_at) }}
            </time>
          </header>
          <p v-if="c.delegado_a && c.delegado_at" class="cmt__deleg">
            <strong>{{ c.autor.nombre }}</strong> delegó a
            <strong>{{ c.delegado_a.nombre }}</strong>
            <span class="cmt__deleg-when">— {{ formatAbsolute(c.delegado_at) }}</span>
          </p>
          <p class="cmt__body">{{ c.cuerpo }}</p>
        </li>
      </ul>
      <p v-else class="cmt__empty">{{ emptyInternos }}</p>
    </section>
  </div>
</template>

<style scoped>
.cmt {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.cmt__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cmt__group-title {
  margin: 0;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.cmt__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cmt__item {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-border);
  background: var(--color-bg-alt);
}

.cmt__item--externo {
  border-left-color: var(--color-primary);
}

.cmt__item--interno {
  border-left-color: #b45722;
}

.cmt__item-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.cmt__autor {
  font-size: var(--text-sm);
  color: var(--color-text);
}

.cmt__when {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.cmt__deleg {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.cmt__deleg-when {
  color: var(--color-text-muted);
}

.cmt__body {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text);
  white-space: pre-wrap;
}

.cmt__empty {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-alt);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
