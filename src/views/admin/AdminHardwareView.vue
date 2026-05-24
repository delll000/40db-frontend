<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { useApiError } from '@/composables/useApiError'
import { sensorsService } from '@/services/sensors.service'
import { catalogosService } from '@/services/catalogos.service'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ReporteMapPicker from '@/components/reportes/ReporteMapPicker.vue'
import {
  ESTADO_SALUD_LABEL,
  type Sensor,
  type SensorEstadoSalud,
} from '@/types/sensor'
import type { Comuna } from '@/types/api'

const toast = useToast()
const { showError } = useApiError()

// ── Catálogo de comunas (cacheado) ─────────────────────────────────
const comunas = ref<Comuna[]>([])
const comunaOptions = computed(() => [
  { value: '', label: 'Todas las comunas' },
  ...comunas.value.map((c) => ({ value: String(c.id), label: c.nombre })),
])
const comunaOptionsRequired = computed(() =>
  comunas.value.map((c) => ({ value: String(c.id), label: c.nombre })),
)

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

onMounted(async () => {
  try {
    comunas.value = await catalogosService.getComunas()
  } catch {
    // El listado sigue funcionando aunque no tengamos catálogo (mostramos `comuna_nombre` que viene del JOIN).
  }
  await loadSensors()
})

watch([filterEstado, filterComuna, filterActivo], () => loadSensors())

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
// inputs quedan editables como fallback / ajuste fino).
const createUbicacion = ref<{ latitud: number; longitud: number } | null>(null)

watch(createUbicacion, (next) => {
  if (!next) return
  createForm.latitud = String(next.latitud)
  createForm.longitud = String(next.longitud)
  delete createErrors.value.latitud
  delete createErrors.value.longitud
})

function openCreate() {
  createForm.nombre = ''
  createForm.comuna_id = ''
  createForm.latitud = ''
  createForm.longitud = ''
  createErrors.value = {}
  createdSensor.value = null
  createUbicacion.value = null
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

    <!-- Filtros -->
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

    <!-- Listado -->
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

        <BaseSelect
          v-model="createForm.comuna_id"
          :options="comunaOptionsRequired"
          label="Comuna"
          placeholder="Selecciona una comuna"
          :error="createErrors.comuna_id"
        />
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
