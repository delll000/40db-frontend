<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { kpisService } from '@/services/kpis.service'
import { sensorsService } from '@/services/sensors.service'
import KpiCard from '@/components/common/KpiCard.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import BasePendingBanner from '@/components/common/BasePendingBanner.vue'
import type { Sensor, SensorStatusSummary } from '@/types/sensor'

const auth = useAuthStore()
const summary = ref<SensorStatusSummary | null>(null)
const sensors = ref<Sensor[]>([])
const loading = ref(true)

interface ShortcutCard {
  to: string
  title: string
  description: string
  icon: string
  tone: 'primary' | 'accent'
}

const shortcuts: ShortcutCard[] = [
  {
    to: '/admin-dashboard/hardware',
    title: 'Hardware IoT',
    description: 'Registra, edita y da de baja sensores. Mantén el inventario al día.',
    icon: '⚙',
    tone: 'primary',
  },
  {
    to: '/admin-dashboard/usuarios',
    title: 'Usuarios',
    description: 'Gestiona cuentas de funcionarios y permisos de acceso.',
    icon: '◉',
    tone: 'accent',
  },
  {
    to: '/heatmap',
    title: 'Mapa de ruido',
    description: 'Visualiza las mediciones acústicas en tiempo real.',
    icon: '◍',
    tone: 'primary',
  },
  {
    to: '/admin-dashboard/reportes',
    title: 'Reportes',
    description: 'Genera reportes institucionales en PDF, Excel o CSV.',
    icon: '▤',
    tone: 'accent',
  },
  {
    to: '/admin-dashboard/historial',
    title: 'Historial conectividad',
    description: 'Revisa los últimos 30 días de eventos por sensor.',
    icon: '⌚',
    tone: 'primary',
  },
]

onMounted(async () => {
  loading.value = true
  try {
    const [s, sl] = await Promise.all([kpisService.adminSummary(), sensorsService.list()])
    summary.value = s
    sensors.value = sl
  } finally {
    loading.value = false
  }
})

function statusTone(s: Sensor['status']) {
  if (s === 'online') return 'success'
  if (s === 'intermitente') return 'warning'
  return 'danger'
}
</script>

<template>
  <div class="ah">
    <header class="ah__head">
      <div>
        <p class="ah__eyebrow">Panel administrador</p>
        <h1 class="ah__title">Hola, {{ auth.profile?.nombre }}</h1>
        <p class="ah__sub">Resumen general del sistema 40dB en Maipú.</p>
      </div>
    </header>

    <BasePendingBanner
      message="Los KPIs de salud de sensores y la tabla inferior usan datos demo. El backend MVP aún no expone los endpoints de catálogo y resumen."
      doc-ref="02-endpoints-faltantes-back.md §1, §2"
    />

    <!-- KPIs salud sensores -->
    <section class="ah__kpis">
      <KpiCard
        label="Sensores totales"
        :value="summary?.total ?? '—'"
        icon="◇"
        :loading="loading"
      />
      <KpiCard
        label="En línea"
        :value="summary?.online ?? '—'"
        icon="●"
        tone="success"
        :loading="loading"
      />
      <KpiCard
        label="Intermitentes"
        :value="summary?.intermitente ?? '—'"
        icon="◐"
        tone="warning"
        :loading="loading"
      />
      <KpiCard
        label="Fuera de línea"
        :value="summary?.offline ?? '—'"
        icon="○"
        tone="danger"
        :loading="loading"
      />
    </section>

    <!-- Tarjetas de acceso rápido -->
    <section class="ah__sec">
      <h2 class="ah__sec-title">Accesos rápidos</h2>
      <div class="ah__grid">
        <BaseCard
          v-for="s in shortcuts"
          :key="s.to"
          :to="s.to"
          padding="lg"
          interactive
        >
          <div :class="['shortcut', `shortcut--${s.tone}`]">
            <span class="shortcut__icon" aria-hidden="true">{{ s.icon }}</span>
            <h3 class="shortcut__title">{{ s.title }}</h3>
            <p class="shortcut__desc">{{ s.description }}</p>
            <span class="shortcut__cta">Ir →</span>
          </div>
        </BaseCard>
      </div>
    </section>

    <!-- Tabla últimos sensores -->
    <section class="ah__sec">
      <h2 class="ah__sec-title">Estado de sensores</h2>
      <BaseCard padding="none">
        <div v-if="loading" class="ah__loading"><BaseSpinner /></div>
        <table v-else class="ah__table">
          <thead>
            <tr>
              <th>ID técnico</th>
              <th>Zona</th>
              <th>Estado</th>
              <th>Batería</th>
              <th>Señal</th>
              <th>Último reporte</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sensors.slice(0, 8)" :key="s.id">
              <td><code>{{ s.technicalId }}</code></td>
              <td>{{ s.zone }}</td>
              <td>
                <BaseBadge :tone="statusTone(s.status)" dot>
                  {{ s.status }}
                </BaseBadge>
              </td>
              <td>{{ s.battery }}%</td>
              <td>{{ s.signal }}%</td>
              <td>{{ new Date(s.lastReportAt).toLocaleString('es-CL') }}</td>
            </tr>
          </tbody>
        </table>
      </BaseCard>
    </section>
  </div>
</template>

<style scoped>
.ah {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.ah__eyebrow {
  margin: 0;
  color: var(--color-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ah__title {
  margin: var(--space-1) 0 var(--space-2);
}

.ah__sub {
  margin: 0;
  color: var(--color-text-muted);
}

.ah__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
@media (max-width: 1080px) {
  .ah__kpis {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 540px) {
  .ah__kpis {
    grid-template-columns: 1fr;
  }
}

.ah__sec-title {
  margin: 0 0 var(--space-4);
  font-size: var(--text-lg);
}

.ah__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-4);
}

.shortcut {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  height: 100%;
}

.shortcut__icon {
  font-size: 2rem;
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: var(--space-2);
}
.shortcut--accent .shortcut__icon {
  color: var(--color-accent);
}

.shortcut__title {
  margin: 0;
  font-size: var(--text-lg);
}

.shortcut__desc {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  flex: 1;
}

.shortcut__cta {
  margin-top: var(--space-3);
  color: var(--color-primary);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
}

.ah__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.ah__table th,
.ah__table td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.ah__table th {
  background: var(--color-bg-alt);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.ah__table tbody tr:hover {
  background: var(--color-bg-alt);
}

.ah__table code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-xs);
  background: var(--color-bg-alt);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.ah__loading {
  display: flex;
  justify-content: center;
  padding: var(--space-12);
}
</style>
