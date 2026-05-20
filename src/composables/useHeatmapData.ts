import { ref, watch, type Ref } from 'vue'
import { heatmapService } from '@/services/heatmap.service'
import { kpisService } from '@/services/kpis.service'
import { usePolling } from '@/composables/usePolling'
import type { HeatmapFilters } from '@/types/filters'
import type { HeatmapKpis, HeatmapPoint } from '@/types/kpi'

/**
 * Centraliza datos del heatmap: puntos + KPIs + auto-refresh.
 *
 * @param filters reactivos — al cambiar, recarga
 * @param intervalMs intervalo de polling. Por defecto 60s (HU-01).
 */
export function useHeatmapData(filters: Ref<HeatmapFilters>, intervalMs = 60_000) {
  const points = ref<HeatmapPoint[]>([])
  const kpis = ref<HeatmapKpis | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const [pts, kpi] = await Promise.all([
        heatmapService.points(filters.value),
        kpisService.heatmap(),
      ])
      points.value = pts
      kpis.value = kpi
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido'
    } finally {
      loading.value = false
    }
  }

  // Carga inicial
  refresh()

  // Polling cada intervalMs
  usePolling(refresh, intervalMs)

  // Recargar al cambiar filtros (sin esperar al próximo polling)
  watch(filters, refresh, { deep: true })

  return { points, kpis, loading, error, refresh }
}
