import { ref, watch, type Ref } from 'vue'
import { heatmapService } from '@/services/heatmap.service'
import { isApiHttpError } from '@/services/errors'
import { usePolling } from '@/composables/usePolling'
import { deriveKpis, featureCollectionToPoints } from '@/utils/heatmap-features'
import type { HeatmapQuery } from '@/types/filters'
import type { HeatmapKpis, HeatmapPoint } from '@/types/kpi'

/**
 * Centraliza el consumo del heatmap del back.
 *
 * - Si `query.value.bbox === null`, no fetch — el caller (HeatmapView /
 *   VecinoHomeView) está esperando que el mapa termine de inicializarse y
 *   emita su bbox.
 * - Cualquier cambio del query (bbox, rango, bucket) gatilla refresh inmediato.
 * - Polling adicional cada `intervalMs` (default 60 s) para refrescar puntos
 *   y KPIs mientras el usuario está mirando el mapa.
 *
 * Spec autoritativa: `../../40db-backend/docs/api.md §4.3`.
 */
export function useHeatmapData(query: Ref<HeatmapQuery>, intervalMs = 60_000) {
  const points = ref<HeatmapPoint[]>([])
  const kpis = ref<HeatmapKpis | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    if (!query.value.bbox) {
      // Aún no tenemos viewport del mapa: ignorar silenciosamente.
      return
    }
    loading.value = true
    error.value = null
    try {
      const fc = await heatmapService.get(query.value)
      points.value = featureCollectionToPoints(fc)
      kpis.value = deriveKpis(fc)
    } catch (e) {
      error.value = isApiHttpError(e)
        ? e.message
        : e instanceof Error
          ? e.message
          : 'Error desconocido'
    } finally {
      loading.value = false
    }
  }

  // Carga inicial (corre tan pronto el caller setea el bbox).
  void refresh()

  // Polling temporal.
  usePolling(refresh, intervalMs)

  // Cualquier cambio del query → refresh sin esperar al siguiente tick.
  watch(query, refresh, { deep: true })

  return { points, kpis, loading, error, refresh }
}
