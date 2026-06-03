<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useApiError } from '@/composables/useApiError'
import { sensorsService } from '@/services/sensors.service'
import { catalogosService } from '@/services/catalogos.service'
import { resolveComunaId, type ResolveComunaResult } from '@/services/nominatim.service'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ReporteMapPicker from '@/components/reportes/ReporteMapPicker.vue'
import HardwareMap from '@/components/mapa/HardwareMap.vue'
import {
  ESTADO_SALUD_LABEL,
  type Sensor,
  type SensorEstadoSalud,
} from '@/types/sensor'
import type { Comuna } from '@/types/api'

const toast = useToast()
const { showError } = useApiError()
const router = useRouter()

// ── Catálogo de comunas (cacheado) ─────────────────────────────────
const comunas = ref<Comuna[]>([])
const comunaOptions = computed(() => [
  { value: '', label: 'Todas las comunas' },
  ...comunas.value.map((c) => ({ value: String(c.id), label: c.nombre })),
])
const comunaOptionsRequired = computed(() =>
  comunas.value.map((c) => ({ value: String(c.id), label: c.nombre })),
)

// ── Vista activa y selección de mapa ───────────────────────────────
const activeView = ref<'map' | 'list'>('map')
const selectedSensor = ref<Sensor | null>(null)
const mapSensors = ref<Sensor[]>([])
const loadingMap = ref(false)

// ── Filtros + listado paginado ─────────────────────────────────────
const filterEstado = ref<SensorEstadoSalud | ''>('')
const filterComuna = ref<string>('')
const filterActivo = ref<'' | 'true' | 'false'>('')

const sensors = ref<Sensor[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(true)
const loadingMore = ref(false)

const estadoOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'online', label: ESTADO_SALUD_LABEL.online },
  { value: 'intermitente', label: ESTADO_SALUD_LABEL.intermitente },
  { value: 'offline', label: ESTADO_SALUD_LABEL.offline },
  { value: 'sin_lecturas', label: ESTADO_SALUD_LABEL.sin_lecturas },
] as const

const activoOptions = [
  { value: '', label: 'Activos e inactivos' },
  { value: 'true', label: 'Solo activos' },
  { value: 'false', label: 'Solo inactivos' },
] as const

async function loadSensors(cursor?: string) {
  const target = cursor ? loadingMore : loading
  target.value = true
  try {
    const res = await sensorsService.list({
      estado_salud: filterEstado.value || undefined,
      comuna_id: filterComuna.value ? Number(filterComuna.value) : undefined,
      activo:
        filterActivo.value === '' ? undefined : filterActivo.value === 'true',
      limit: 20,
      cursor,
    })
    sensors.value = cursor ? [...sensors.value, ...res.data] : res.data
    nextCursor.value = res.next_cursor
  } catch (e) {
    showError(e, 'No se pudieron cargar los sensores')
  } finally {
    target.value = false
  }
}

async function loadMapSensors() {
  loadingMap.value = true
  try {
    const allFetchedSensors: Sensor[] = []
    let cursor: string | null = null
    let hasMore = true
    let pagesFetched = 0

    while (hasMore && pagesFetched < 5) {
      const res = await sensorsService.list({
        estado_salud: filterEstado.value || undefined,
        comuna_id: filterComuna.value ? Number(filterComuna.value) : undefined,
        activo:
          filterActivo.value === '' ? undefined : filterActivo.value === 'true',
        limit: 100, // Máximo permitido por validación del backend (le=100)
        cursor: cursor || undefined,
      })
      allFetchedSensors.push(...res.data)
      pagesFetched++
      if (res.next_cursor) {
        cursor = res.next_cursor
      } else {
        hasMore = false
      }
    }
    
    mapSensors.value = allFetchedSensors

    // Si el sensor seleccionado ya no está en el listado filtrado, deseleccionar
    if (selectedSensor.value && !allFetchedSensors.some((s) => s.id === selectedSensor.value!.id)) {
      selectedSensor.value = null
    }
  } catch (e) {
    showError(e, 'No se pudieron cargar los sensores para el mapa')
  } finally {
    loadingMap.value = false
  }
}

onMounted(async () => {
  try {
    comunas.value = await catalogosService.getComunas()
  } catch {
    // El listado sigue funcionando aunque no tengamos catálogo (mostramos `comuna_nombre` que viene del JOIN).
  }
  
  if (activeView.value === 'map') {
    await loadMapSensors()
  } else {
    await loadSensors()
  }
})

watch([filterEstado, filterComuna, filterActivo], () => {
  if (activeView.value === 'map') {
    loadMapSensors()
  } else {
    loadSensors()
  }
})

watch(activeView, (newView) => {
  selectedSensor.value = null
  if (newView === 'map' && mapSensors.value.length === 0) {
    loadMapSensors()
  } else if (newView === 'list' && sensors.value.length === 0) {
    loadSensors()
  }
})

// ── Modal Nuevo sensor ─────────────────────────────────────────────
const createOpen = ref(false)
const createSaving = ref(false)
const createForm = reactive<{
  nombre: string
  comuna_id: string
  latitud: string
  longitud: string
}>({ nombre: '', comuna_id: '', latitud: '', longitud: '' })
const createErrors = ref<Record<string, string>>({})
const createdSensor = ref<Sensor | null>(null)
// Source of truth del map picker. El watch sincroniza lat/lng al form (los
// inputs quedan editables como fallback / ajuste fino) y dispara la resolución
// de comuna_id contra Nominatim (mismo flujo que el reporte del vecino,
// api.md §4.5.1).
const createUbicacion = ref<{ latitud: number; longitud: number } | null>(null)
const nominatimResolving = ref(false)
const nominatimResult = ref<ResolveComunaResult | null>(null)
// Token para descartar respuestas viejas de Nominatim si el usuario re-clickea
// el mapa antes de que termine la request anterior.
let resolveToken = 0

watch(createUbicacion, async (next) => {
  if (!next) {
    nominatimResult.value = null
    nominatimResolving.value = false
    return
  }
  createForm.latitud = String(next.latitud)
  createForm.longitud = String(next.longitud)
  delete createErrors.value.latitud
  delete createErrors.value.longitud

  if (comunas.value.length === 0) {
    // Sin catálogo cargado no podemos matchear. Dejamos al admin elegir manual.
    nominatimResult.value = null
    return
  }

  const myToken = ++resolveToken
  nominatimResolving.value = true
  nominatimResult.value = null
  try {
    const result = await resolveComunaId(next.latitud, next.longitud, comunas.value)
    if (myToken !== resolveToken) return
    nominatimResult.value = result
    if (result.id !== null) {
      createForm.comuna_id = String(result.id)
      delete createErrors.value.comuna_id
    }
  } finally {
    if (myToken === resolveToken) nominatimResolving.value = false
  }
})

function openCreate() {
  createForm.nombre = ''
  createForm.comuna_id = ''
  createForm.latitud = ''
  createForm.longitud = ''
  createErrors.value = {}
  createdSensor.value = null
  createUbicacion.value = null
  nominatimResult.value = null
  nominatimResolving.value = false
  createOpen.value = true
}

function validateCreate(): boolean {
  createErrors.value = {}
  const nombre = createForm.nombre.trim()
  const lat = Number(createForm.latitud)
  const lng = Number(createForm.longitud)
  if (nombre.length < 3) createErrors.value.nombre = 'Mínimo 3 caracteres.'
  else if (nombre.length > 120) createErrors.value.nombre = 'Máximo 120 caracteres.'
  if (!createForm.comuna_id) createErrors.value.comuna_id = 'Selecciona una comuna.'
  if (!Number.isFinite(lat) || lat < -90 || lat > 90)
    createErrors.value.latitud = 'Latitud entre -90 y 90.'
  if (!Number.isFinite(lng) || lng < -180 || lng > 180)
    createErrors.value.longitud = 'Longitud entre -180 y 180.'
  return Object.keys(createErrors.value).length === 0
}

async function submitCreate() {
  if (!validateCreate()) return
  createSaving.value = true
  try {
    const created = await sensorsService.create({
      nombre: createForm.nombre.trim(),
      comuna_id: Number(createForm.comuna_id),
      latitud: Number(createForm.latitud),
      longitud: Number(createForm.longitud),
    })
    createdSensor.value = created
    sensors.value = [created, ...sensors.value]
    mapSensors.value = [created, ...mapSensors.value]
    selectedSensor.value = created // Seleccionar en el mapa automáticamente
    toast.success('Sensor provisionado', `${created.nombre} listo para vincularse al firmware.`)
  } catch (e) {
    showError(e, 'No se pudo crear el sensor')
  } finally {
    createSaving.value = false
  }
}

async function copyUuid() {
  if (!createdSensor.value) return
  try {
    await navigator.clipboard.writeText(createdSensor.value.id)
    toast.success('UUID copiado', 'Pega este ID en el firmware del ESP32.')
  } catch {
    toast.warning('No se pudo copiar', 'Cópialo manualmente.')
  }
}

// ── Modal Editar sensor ────────────────────────────────────────────
const editOpen = ref(false)
const editSaving = ref(false)
const editTarget = ref<Sensor | null>(null)
const editForm = reactive<{
  nombre: string
  latitud: string
  longitud: string
  activo: boolean
}>({ nombre: '', latitud: '', longitud: '', activo: true })
const editErrors = ref<Record<string, string>>({})

function openEdit(s: Sensor) {
  editTarget.value = s
  editForm.nombre = s.nombre
  editForm.latitud = String(s.latitud)
  editForm.longitud = String(s.longitud)
  editForm.activo = s.activo
  editErrors.value = {}
  editOpen.value = true
}

function validateEdit(): boolean {
  editErrors.value = {}
  const nombre = editForm.nombre.trim()
  const lat = Number(editForm.latitud)
  const lng = Number(editForm.longitud)
  if (nombre.length < 3) editErrors.value.nombre = 'Mínimo 3 caracteres.'
  else if (nombre.length > 120) editErrors.value.nombre = 'Máximo 120 caracteres.'
  if (!Number.isFinite(lat) || lat < -90 || lat > 90)
    editErrors.value.latitud = 'Latitud entre -90 y 90.'
  if (!Number.isFinite(lng) || lng < -180 || lng > 180)
    editErrors.value.longitud = 'Longitud entre -180 y 180.'
  return Object.keys(editErrors.value).length === 0
}

async function submitEdit() {
  if (!editTarget.value || !validateEdit()) return
  editSaving.value = true
  try {
    const updated = await sensorsService.update(editTarget.value.id, {
      nombre: editForm.nombre.trim(),
      latitud: Number(editForm.latitud),
      longitud: Number(editForm.longitud),
      activo: editForm.activo,
    })
    const idx = sensors.value.findIndex((s) => s.id === updated.id)
    if (idx !== -1) sensors.value[idx] = updated

    const idxMap = mapSensors.value.findIndex((s) => s.id === updated.id)
    if (idxMap !== -1) mapSensors.value[idxMap] = updated
    if (selectedSensor.value && selectedSensor.value.id === updated.id) {
      selectedSensor.value = updated
    }

    toast.success('Sensor actualizado', updated.nombre)
    editOpen.value = false
  } catch (e) {
    showError(e, 'No se pudo actualizar el sensor')
  } finally {
    editSaving.value = false
  }
}

// ── Soft-delete ────────────────────────────────────────────────────
const deleteTarget = ref<Sensor | null>(null)
const deleting = ref(false)

function askDelete(s: Sensor) {
  deleteTarget.value = s
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await sensorsService.remove(deleteTarget.value.id)
    const idx = sensors.value.findIndex((s) => s.id === deleteTarget.value!.id)
    if (idx !== -1) {
      sensors.value[idx] = {
        ...sensors.value[idx]!,
        activo: false,
        estado_salud: 'offline',
      }
    }
    const idxMap = mapSensors.value.findIndex((s) => s.id === deleteTarget.value!.id)
    if (idxMap !== -1) {
      mapSensors.value[idxMap] = {
        ...mapSensors.value[idxMap]!,
        activo: false,
        estado_salud: 'offline',
      }
    }
    if (selectedSensor.value && selectedSensor.value.id === deleteTarget.value!.id) {
      selectedSensor.value = {
        ...selectedSensor.value,
        activo: false,
        estado_salud: 'offline',
      }
    }
    toast.success('Sensor dado de baja', deleteTarget.value.nombre)
    deleteTarget.value = null
  } catch (e) {
    showError(e, 'No se pudo dar de baja el sensor')
  } finally {
    deleting.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────
function statusTone(s: SensorEstadoSalud) {
  if (s === 'online') return 'success'
  if (s === 'intermitente') return 'warning'
  if (s === 'sin_lecturas') return 'neutral'
  return 'danger'
}

function formatLastReport(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL')
}
</script>

<template>
  <div class="page">
    <header class="page__head">
      <nav aria-label="Migas de pan" class="page__crumbs">
        <router-link to="/admin-dashboard">Inicio</router-link> ›
        <span>Hardware</span>
      </nav>
      <div class="page__row">
        <div>
          <h1>Gestión de hardware IoT</h1>
          <p class="page__sub">Registra, edita y da de baja sensores acústicos.</p>
        </div>
        <BaseButton @click="openCreate">
          <template #iconLeft>＋</template>
          Nuevo sensor
        </BaseButton>
      </div>
    </header>

    <!-- Selector de vista (Tabs) y Filtros -->
    <div class="page__controls">
      <div class="view-tabs">
        <button
          type="button"
          class="tab"
          :class="{ 'tab--active': activeView === 'map' }"
          @click="activeView = 'map'"
        >
          🗺️ Mapa de Sensores
        </button>
        <button
          type="button"
          class="tab"
          :class="{ 'tab--active': activeView === 'list' }"
          @click="activeView = 'list'"
        >
          📋 Lista de Sensores
        </button>
      </div>

      <div class="page__filters">
        <BaseSelect
          v-model="filterEstado"
          :options="[...estadoOptions]"
          label="Estado de salud"
        />
        <BaseSelect
          v-model="filterComuna"
          :options="comunaOptions"
          label="Comuna"
        />
        <BaseSelect
          v-model="filterActivo"
          :options="[...activoOptions]"
          label="Activo"
        />
      </div>
    </div>

    <!-- Vista de Mapa (Default) -->
    <div v-if="activeView === 'map'" class="map-container">
      <div v-if="loadingMap" class="map-container__loader">
        <BaseSpinner size="lg" />
        <span class="map-container__loader-text">Cargando sensores en el mapa...</span>
      </div>

      <HardwareMap
        v-model="selectedSensor"
        :sensors="mapSensors"
        class="map-container__map"
      />

      <BaseEmpty
        v-if="mapSensors.length === 0 && !loadingMap"
        icon="⚙"
        title="Sin sensores"
        message="No hay sensores que coincidan con el filtro. Provisiona uno con el botón Nuevo sensor."
        class="map-container__empty"
      />

      <!-- Panel lateral de detalle (Drawer flotante) -->
      <transition name="fade">
        <div v-if="selectedSensor" class="sensor-detail">
          <div class="sensor-detail__header">
            <h3>{{ selectedSensor.nombre }}</h3>
            <button type="button" class="sensor-detail__close" @click="selectedSensor = null" aria-label="Cerrar detalle">✕</button>
          </div>
          <div class="sensor-detail__body">
            <div class="sensor-detail__item">
              <span class="sensor-detail__label">Estado:</span>
              <BaseBadge :tone="statusTone(selectedSensor.estado_salud)" dot>
                {{ ESTADO_SALUD_LABEL[selectedSensor.estado_salud] }}
              </BaseBadge>
            </div>
            <div class="sensor-detail__item">
              <span class="sensor-detail__label">Última lectura:</span>
              <span class="sensor-detail__value">{{ formatLastReport(selectedSensor.ultima_lectura_at) }}</span>
            </div>
            <div class="sensor-detail__item">
              <span class="sensor-detail__label">Nivel actual:</span>
              <span class="sensor-detail__value sensor-detail__value--highlight">
                {{ selectedSensor.ultima_lectura_db !== null ? `${selectedSensor.ultima_lectura_db.toFixed(1)} dB(A)` : '—' }}
              </span>
            </div>
            <div class="sensor-detail__item">
              <span class="sensor-detail__label">Comuna:</span>
              <span class="sensor-detail__value">{{ selectedSensor.comuna_nombre }}</span>
            </div>
            <div class="sensor-detail__item">
              <span class="sensor-detail__label">Coordenadas:</span>
              <span class="sensor-detail__value font-mono text-xs">
                {{ selectedSensor.latitud.toFixed(5) }}, {{ selectedSensor.longitud.toFixed(5) }}
              </span>
            </div>
            <div class="sensor-detail__item sensor-detail__item--vertical">
              <span class="sensor-detail__label">UUID:</span>
              <code class="sensor-detail__uuid">{{ selectedSensor.id }}</code>
            </div>
          </div>
          <div class="sensor-detail__actions">
            <BaseButton variant="secondary" size="sm" @click="openEdit(selectedSensor)">Editar</BaseButton>
            <BaseButton
              v-if="selectedSensor.activo"
              variant="danger"
              size="sm"
              @click="askDelete(selectedSensor)"
            >
              Dar de baja
            </BaseButton>
            <BaseButton
              variant="ghost"
              size="sm"
              @click="router.push(`/admin-dashboard/historial?sensor=${selectedSensor.id}`)"
            >
              Ver historial
            </BaseButton>
          </div>
        </div>
      </transition>
    </div>

    <!-- Vista de Lista (Paginada) -->
    <div v-else class="list-container">
      <BaseCard padding="none">
        <div v-if="loading" class="page__center"><BaseSpinner size="lg" /></div>
        <BaseEmpty
          v-else-if="sensors.length === 0"
          icon="⚙"
          title="Sin sensores"
          message="No hay sensores que coincidan con el filtro. Provisiona uno con el botón Nuevo sensor."
        />
        <table v-else class="tbl">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Comuna</th>
              <th>Estado</th>
              <th>Última lectura</th>
              <th>Nivel</th>
              <th class="tbl__col-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sensors" :key="s.id">
              <td>
                <div class="tbl__nombre">{{ s.nombre }}</div>
                <code class="tbl__id">{{ s.id }}</code>
              </td>
              <td>{{ s.comuna_nombre }}</td>
              <td>
                <BaseBadge :tone="statusTone(s.estado_salud)" dot>
                  {{ ESTADO_SALUD_LABEL[s.estado_salud] }}
                </BaseBadge>
              </td>
              <td>{{ formatLastReport(s.ultima_lectura_at) }}</td>
              <td>
                {{ s.ultima_lectura_db !== null ? `${s.ultima_lectura_db.toFixed(1)} dB(A)` : '—' }}
              </td>
              <td class="tbl__col-actions">
                <BaseButton variant="ghost" size="sm" @click="openEdit(s)">Editar</BaseButton>
                <BaseButton
                  v-if="s.activo"
                  variant="danger"
                  size="sm"
                  @click="askDelete(s)"
                >
                  Dar de baja
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
          @click="loadSensors(nextCursor ?? undefined)"
        >
          Ver más sensores
        </BaseButton>
      </div>
    </div>

    <!-- Modal: nuevo sensor -->
    <BaseModal v-model="createOpen" :title="createdSensor ? 'Sensor provisionado' : 'Nuevo sensor'" size="lg">
      <div v-if="createdSensor" class="prov">
        <p>
          El sensor <strong>{{ createdSensor.nombre }}</strong> fue creado.
          Copia este UUID al firmware del ESP32 para que publique sus lecturas a
          <code>40db/sensores/&lt;uuid&gt;/lectura</code>.
        </p>
        <div class="prov__uuid">
          <code>{{ createdSensor.id }}</code>
          <BaseButton variant="secondary" size="sm" @click="copyUuid">Copiar</BaseButton>
        </div>
        <p class="prov__hint">
          Mientras no publique lecturas, el sensor aparece como
          <BaseBadge tone="neutral" size="sm">{{ ESTADO_SALUD_LABEL.sin_lecturas }}</BaseBadge>.
        </p>
      </div>
      <form v-else class="form" @submit.prevent="submitCreate">
        <BaseInput
          v-model="createForm.nombre"
          label="Nombre del sensor"
          placeholder="Ej: Plaza Italia - Norte"
          required
          :error="createErrors.nombre"
        />

        <div class="form__field">
          <label class="form__label">
            Ubicación física del sensor <span class="form__req" aria-hidden="true">*</span>
          </label>
          <ReporteMapPicker v-model="createUbicacion" min-height="320px" />
        </div>

        <div class="form__field">
          <BaseSelect
            v-model="createForm.comuna_id"
            :options="comunaOptionsRequired"
            label="Comuna"
            placeholder="Selecciona una comuna"
            :error="createErrors.comuna_id"
          />
          <p v-if="nominatimResolving" class="form__hint">
            Detectando comuna desde la ubicación…
          </p>
          <p
            v-else-if="nominatimResult?.id !== undefined && nominatimResult?.id !== null"
            class="form__hint form__hint--success"
          >
            Comuna detectada automáticamente: <strong>{{ nominatimResult.nombreSugerido }}</strong>.
          </p>
          <p
            v-else-if="nominatimResult && nominatimResult.nombreSugerido"
            class="form__hint form__hint--warning"
          >
            Detectamos la ubicación en <strong>{{ nominatimResult.nombreSugerido }}</strong>,
            pero esa comuna aún no está habilitada en 40dB. Selecciona manualmente la comuna
            municipal que corresponda.
          </p>
          <p
            v-else-if="nominatimResult && !nominatimResult.nombreSugerido"
            class="form__hint"
          >
            No pudimos detectar la comuna automáticamente. Selecciónala desde el listado.
          </p>
        </div>
        <div class="form__grid">
          <BaseInput
            v-model="createForm.latitud"
            label="Latitud"
            type="number"
            inputmode="decimal"
            step="any"
            placeholder="-33.4372"
            required
            :error="createErrors.latitud"
          />
          <BaseInput
            v-model="createForm.longitud"
            label="Longitud"
            type="number"
            inputmode="decimal"
            step="any"
            placeholder="-70.6483"
            required
            :error="createErrors.longitud"
          />
        </div>
      </form>
      <template #footer="{ close }">
        <template v-if="createdSensor">
          <BaseButton @click="close">Cerrar</BaseButton>
        </template>
        <template v-else>
          <BaseButton variant="ghost" :disabled="createSaving" @click="close">Cancelar</BaseButton>
          <BaseButton :loading="createSaving" @click="submitCreate">Provisionar</BaseButton>
        </template>
      </template>
    </BaseModal>

    <!-- Modal: editar sensor -->
    <BaseModal v-model="editOpen" title="Editar sensor" size="md">
      <form v-if="editTarget" class="form" @submit.prevent="submitEdit">
        <p class="form__hint">
          UUID: <code>{{ editTarget.id }}</code> · Comuna: <strong>{{ editTarget.comuna_nombre }}</strong>
          <span class="form__hint-aside">(mover de comuna = darlo de baja y crear uno nuevo)</span>
        </p>
        <BaseInput
          v-model="editForm.nombre"
          label="Nombre"
          required
          :error="editErrors.nombre"
        />
        <div class="form__grid">
          <BaseInput
            v-model="editForm.latitud"
            label="Latitud"
            type="number"
            inputmode="decimal"
            step="any"
            required
            :error="editErrors.latitud"
          />
          <BaseInput
            v-model="editForm.longitud"
            label="Longitud"
            type="number"
            inputmode="decimal"
            step="any"
            required
            :error="editErrors.longitud"
          />
        </div>
        <label class="form__check">
          <input type="checkbox" v-model="editForm.activo" />
          Sensor activo (recibe lecturas y aparece en el heatmap)
        </label>
      </form>
      <template #footer="{ close }">
        <BaseButton variant="ghost" :disabled="editSaving" @click="close">Cancelar</BaseButton>
        <BaseButton :loading="editSaving" @click="submitEdit">Guardar cambios</BaseButton>
      </template>
    </BaseModal>

    <!-- Confirm soft-delete -->
    <BaseModal :model-value="deleteTarget !== null" title="Dar de baja sensor" size="sm" @update:model-value="(v) => !v && (deleteTarget = null)">
      <p v-if="deleteTarget">
        Vas a marcar <strong>{{ deleteTarget.nombre }}</strong> como inactivo.
        Las lecturas históricas se conservan y siguen alimentando el heatmap,
        pero el sensor deja de generar evidencia para reportes nuevos.
      </p>
      <template #footer>
        <BaseButton variant="ghost" :disabled="deleting" @click="deleteTarget = null">Cancelar</BaseButton>
        <BaseButton variant="danger" :loading="deleting" @click="confirmDelete">Dar de baja</BaseButton>
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
.page__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.page__head h1 {
  margin: 0 0 var(--space-2);
}
.page__sub {
  margin: 0;
  color: var(--color-text-muted);
}

.page__controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.view-tabs {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-alt);
  padding: 4px;
  border-radius: var(--radius-md);
  max-width: 360px;
}

.tab {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font: inherit;
  font-weight: var(--font-semibold);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease;
  text-align: center;
}

.tab:hover:not(:disabled):not(.tab--active) {
  color: var(--color-text);
}

.tab--active {
  background: var(--color-bg);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.page__filters {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}
@media (max-width: 720px) {
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

.map-container {
  position: relative;
  width: 100%;
  height: 550px;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.map-container__map {
  width: 100%;
  height: 100%;
}

.map-container__loader {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  z-index: 1010;
  backdrop-filter: blur(2px);
}

.map-container__loader-text {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-weight: var(--font-medium);
}

.map-container__empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
  background: var(--color-bg);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}

.sensor-detail {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  z-index: 1000;
  width: 340px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  max-height: calc(100% - var(--space-8));
  overflow-y: auto;
  backdrop-filter: blur(4px);
}

@media (max-width: 640px) {
  .sensor-detail {
    top: auto;
    bottom: var(--space-4);
    left: var(--space-4);
    right: var(--space-4);
    width: auto;
    max-height: 250px;
  }
}

.sensor-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-2);
}

.sensor-detail__header h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--color-text);
  word-break: break-word;
  padding-right: var(--space-4);
}

.sensor-detail__close {
  background: transparent;
  border: none;
  font-size: var(--text-base);
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.sensor-detail__close:hover {
  color: var(--color-text);
}

.sensor-detail__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sensor-detail__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-sm);
  gap: var(--space-2);
}

.sensor-detail__item--vertical {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
}

.sensor-detail__label {
  color: var(--color-text-muted);
  font-weight: var(--font-medium);
}

.sensor-detail__value {
  color: var(--color-text);
  text-align: right;
}

.sensor-detail__value--highlight {
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.sensor-detail__uuid {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  word-break: break-all;
  background: var(--color-bg-alt);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  width: 100%;
}

.sensor-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}

.sensor-detail__actions :deep(.btn) {
  flex: 1;
  min-width: 80px;
  justify-content: center;
}

/* Transiciones */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
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
}
.tbl__id {
  display: inline-block;
  margin-top: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.tbl__col-actions {
  white-space: nowrap;
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.form__label {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}
.form__req {
  color: var(--color-danger);
  margin-left: 2px;
}
.form__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.form__check {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}
.form__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.form__hint--success {
  color: var(--color-success, #1f7a4d);
}
.form__hint--warning {
  color: var(--color-warning, #a76512);
}
.form__hint-aside {
  display: block;
  margin-top: 4px;
  font-size: var(--text-xs);
}
.form__hint code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.prov {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.prov__uuid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
}
.prov__uuid code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-sm);
  word-break: break-all;
}
.prov__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
