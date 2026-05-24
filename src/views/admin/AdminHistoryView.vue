<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sensorsService } from '@/services/sensors.service'
import { catalogosService } from '@/services/catalogos.service'
import { useApiError } from '@/composables/useApiError'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import HistoricoRuidoSensor from '@/components/historico/HistoricoRuidoSensor.vue'
import type { Comuna } from '@/types/api'
import type { Sensor } from '@/types/sensor'

/**
 * Histórico de ruido por sensor (capa OLAP del backend).
 *
 * Reusa el slot "Historial" del panel admin (antes placeholder) y lo conecta
 * al rollup `lectura_resumen_horaria` vía `HistoricoRuidoSensor`. La docu de
 * producto vive en `40db-backend/docs/frontend-resumen-horario.md`.
 *
 * Flujo:
 *   1. Carga catálogo de comunas (para filtrar) y listado de sensores.
 *   2. Permite filtrar sensores por comuna.
 *   3. Al elegir un sensor, renderiza el componente histórico — éste hace su
 *      propio fetch al endpoint /lecturas/resumen y maneja loading/error.
 *   4. El sensor seleccionado se sincroniza con la query string (?sensor=...)
 *      para que los deep-links funcionen (ej. desde la vista de hardware).
 */

const route = useRoute()
const router = useRouter()
const { showError } = useApiError()

const comunas = ref<Comuna[]>([])
const sensors = ref<Sensor[]>([])
const cargandoSensores = ref(true)
const filtroComuna = ref<string>('')
const sensorIdSel = ref<string>('')

const comunaOptions = computed(() => [
  { value: '', label: 'Todas las comunas' },
  ...comunas.value.map((c) => ({ value: String(c.id), label: c.nombre })),
])

// Sólo sensores activos y con al menos una lectura — el rollup no devuelve
// nada útil para sensores que nunca publicaron.
const sensorOptions = computed(() => {
  const filtrados = sensors.value.filter((s) => {
    if (filtroComuna.value && String(s.comuna_id) !== filtroComuna.value) {
      return false
    }
    return true
  })
  return [
    { value: '', label: 'Selecciona un sensor…' },
    ...filtrados.map((s) => ({
      value: s.id,
      label: `${s.nombre} · ${s.comuna_nombre}`,
    })),
  ]
})

const sensorSeleccionado = computed(() =>
  sensors.value.find((s) => s.id === sensorIdSel.value) ?? null,
)

async function cargarCatalogos() {
  cargandoSensores.value = true
  try {
    const [com, page] = await Promise.all([
      catalogosService.getComunas().catch(() => [] as Comuna[]),
      // Pedimos un primer lote grande; el panel admin típico tiene <100
      // sensores. Si en producción crece, paginamos acá.
      sensorsService.list({ limit: 100, activo: true }),
    ])
    comunas.value = com
    sensors.value = page.data
  } catch (e) {
    showError(e, 'No se pudo cargar el listado de sensores')
  } finally {
    cargandoSensores.value = false
  }
}

function syncSensorToQuery(id: string) {
  // Reemplazo sin pushear historial: cambiar de sensor no debería llenar
  // el back-button del navegador.
  router.replace({ query: { ...route.query, sensor: id || undefined } })
}

watch(sensorIdSel, syncSensorToQuery)

onMounted(async () => {
  await cargarCatalogos()
  // Si vino ?sensor=... y existe en el listado, lo pre-seleccionamos.
  const fromQuery = (route.query.sensor as string | undefined) ?? ''
  if (fromQuery && sensors.value.some((s) => s.id === fromQuery)) {
    sensorIdSel.value = fromQuery
  }
})
</script>

<template>
  <div class="page">
    <header class="page__head">
      <nav aria-label="Migas de pan" class="page__crumbs">
        <router-link to="/admin-dashboard">Inicio</router-link> ›
        <span>Historial</span>
      </nav>
      <h1>Histórico de ruido por sensor</h1>
      <p class="page__sub">
        Serie horaria pre-agregada (avg / p95 / min-max) por sensor. Los datos
        vienen de <code>lectura_resumen_horaria</code>, una tabla refrescada
        cada hora por <code>pg_cron</code> sobre la tabla cruda — capa de
        agregación batch que mantiene los gráficos rápidos sobre volúmenes
        grandes.
      </p>
    </header>

    <BaseCard padding="md">
      <div class="filtros">
        <BaseSelect
          v-model="filtroComuna"
          :options="comunaOptions"
          label="Comuna"
        />
        <BaseSelect
          v-model="sensorIdSel"
          :options="sensorOptions"
          label="Sensor"
          :disabled="cargandoSensores"
        />
      </div>
      <div v-if="cargandoSensores" class="filtros__loading">
        <BaseSpinner size="sm" />
        <span>Cargando sensores…</span>
      </div>
    </BaseCard>

    <HistoricoRuidoSensor
      v-if="sensorIdSel && sensorSeleccionado"
      :key="sensorIdSel"
      :sensor-id="sensorIdSel"
      :sensor-nombre="sensorSeleccionado.nombre"
    />

    <BaseCard v-else padding="lg">
      <BaseEmpty
        icon="📊"
        title="Selecciona un sensor"
        message="Elige un sensor del listado para ver su serie histórica de ruido. Podés filtrar por comuna si tu panel administra varias."
      />
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
  max-width: 76ch;
}
.page__sub code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
  background: var(--color-bg-alt);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.filtros {
  display: grid;
  grid-template-columns: minmax(180px, 240px) 1fr;
  gap: var(--space-4);
  align-items: end;
}

@media (max-width: 640px) {
  .filtros {
    grid-template-columns: 1fr;
  }
}

.filtros__loading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
