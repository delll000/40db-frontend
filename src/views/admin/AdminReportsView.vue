<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { useApiError } from '@/composables/useApiError'
import { reportesAdminArchivosService } from '@/services/reportesAdminArchivos.service'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { ReporteArchivoAdmin, TipoArchivoAdmin } from '@/types/api'

const toast = useToast()
const { showError } = useApiError()

const archivos = ref<ReporteArchivoAdmin[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(true)
const loadingMore = ref(false)
const downloadingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

const filterTipo = ref<TipoArchivoAdmin | ''>('')
const tipoOptions = [
  { value: '', label: 'Todos los tipos' },
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'imagen', label: 'Imagen' },
] as const

const tipoLabel: Record<TipoArchivoAdmin, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  imagen: 'Imagen',
}
const tipoTone: Record<TipoArchivoAdmin, 'info' | 'warning' | 'success'> = {
  pdf: 'info',
  csv: 'warning',
  imagen: 'success',
}

async function cargar(cursor?: string) {
  const target = cursor ? loadingMore : loading
  target.value = true
  try {
    const res = await reportesAdminArchivosService.listar({
      tipo: filterTipo.value || undefined,
      limit: 20,
      cursor,
    })
    archivos.value = cursor ? [...archivos.value, ...res.data] : res.data
    nextCursor.value = res.next_cursor
  } catch (e) {
    showError(e, 'No se pudo cargar el historial de archivos')
  } finally {
    target.value = false
  }
}

onMounted(() => cargar())
watch(filterTipo, () => cargar())

// El backend NO proxy el binario: devuelve una signed URL de Supabase
// Storage con `response_disposition=attachment`. Abrimos en pestaña nueva
// y el browser dispara la descarga. La URL caduca en ~300s, así que la
// pedimos recien al hacer click.
async function descargar(a: ReporteArchivoAdmin) {
  downloadingId.value = a.id
  try {
    const { url } = await reportesAdminArchivosService.descarga(a.id)
    window.open(url, '_blank', 'noopener')
  } catch (e) {
    showError(e, 'No se pudo generar la descarga')
  } finally {
    downloadingId.value = null
  }
}

// Confirmación con BaseModal (no `confirm()` nativo — uno se ve feo en el
// resto del admin y no respeta el design system).
const deleteOpen = ref(false)
const deleteTarget = ref<ReporteArchivoAdmin | null>(null)

function pedirEliminar(a: ReporteArchivoAdmin) {
  deleteTarget.value = a
  deleteOpen.value = true
}

async function confirmarEliminar() {
  if (!deleteTarget.value) return
  const a = deleteTarget.value
  deletingId.value = a.id
  try {
    await reportesAdminArchivosService.eliminar(a.id)
    archivos.value = archivos.value.filter((x) => x.id !== a.id)
    toast.success('Archivo eliminado', a.nombre)
    deleteOpen.value = false
  } catch (e) {
    showError(e, 'No se pudo eliminar el archivo')
  } finally {
    deletingId.value = null
  }
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isEmpty = computed(() => !loading.value && archivos.value.length === 0)
</script>

<template>
  <div class="page">
    <header class="page__head">
      <nav aria-label="Migas de pan" class="page__crumbs">
        <router-link to="/admin-dashboard">Inicio</router-link> ›
        <span>Reportes</span>
      </nav>
      <h1>Reportes generados</h1>
      <p class="page__sub">
        Archivos (PDF, CSV o imagen) generados desde el mapa de ruido o este
        panel. Cada archivo se almacena en el bucket privado del backend y
        solo es accesible para administradores.
      </p>
    </header>

    <div class="page__filters">
      <BaseSelect v-model="filterTipo" :options="[...tipoOptions]" label="Tipo de archivo" />
    </div>

    <BaseCard padding="none">
      <div v-if="loading" class="page__center"><BaseSpinner size="lg" /></div>

      <BaseEmpty
        v-else-if="isEmpty"
        icon="▤"
        title="Sin archivos todavía"
        message="Genera un reporte desde el mapa (con la opción “Guardar copia en el panel admin” activada) y aparecerá listado aquí."
      >
        <template #actions>
          <BaseButton to="/heatmap" variant="primary">Ir al mapa</BaseButton>
        </template>
      </BaseEmpty>

      <table v-else class="tbl">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Tamaño</th>
            <th>Generado por</th>
            <th>Fecha</th>
            <th class="tbl__col-actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in archivos" :key="a.id">
            <td class="tbl__nombre">{{ a.nombre }}</td>
            <td>
              <BaseBadge :tone="tipoTone[a.tipo]" size="sm">
                {{ tipoLabel[a.tipo] }}
              </BaseBadge>
            </td>
            <td>{{ fmtBytes(a.tamano_bytes) }}</td>
            <td>{{ a.generado_por_nombre ?? '—' }}</td>
            <td>{{ fmtFecha(a.created_at) }}</td>
            <td class="tbl__col-actions">
              <BaseButton
                variant="secondary"
                size="sm"
                :loading="downloadingId === a.id"
                :disabled="downloadingId !== null || deletingId !== null"
                @click="descargar(a)"
              >
                Descargar
              </BaseButton>
              <BaseButton
                variant="danger"
                size="sm"
                :disabled="downloadingId !== null || deletingId !== null"
                @click="pedirEliminar(a)"
              >
                Eliminar
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <div v-if="nextCursor" class="page__more">
      <BaseButton
        variant="ghost"
        :loading="loadingMore"
        @click="cargar(nextCursor ?? undefined)"
      >
        Ver más archivos
      </BaseButton>
    </div>

    <BaseModal v-model="deleteOpen" title="Eliminar archivo" size="sm">
      <p v-if="deleteTarget" class="form__hint">
        Vas a eliminar <strong>{{ deleteTarget.nombre }}</strong>. Esta acción
        borra el blob del bucket y la metadata; no se puede deshacer.
      </p>
      <template #footer="{ close }">
        <BaseButton variant="ghost" :disabled="deletingId !== null" @click="close">
          Cancelar
        </BaseButton>
        <BaseButton
          variant="danger"
          :loading="deletingId !== null"
          @click="confirmarEliminar"
        >
          Eliminar
        </BaseButton>
      </template>
    </BaseModal>
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
  max-width: 70ch;
}

.page__filters {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
@media (max-width: 980px) {
  .page__filters {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 540px) {
  .page__filters {
    grid-template-columns: 1fr;
  }
}

.page__center {
  display: flex;
  justify-content: center;
  padding: var(--space-12);
}
.page__more {
  display: flex;
  justify-content: center;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.tbl th,
.tbl td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}
.tbl th {
  background: var(--color-bg-alt);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}
.tbl tbody tr:hover {
  background: var(--color-bg-alt);
}
.tbl__nombre {
  font-weight: var(--font-semibold);
  word-break: break-all;
}
.tbl__col-actions {
  white-space: nowrap;
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
}

.form__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
