<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useApiError } from '@/composables/useApiError'
import { usuariosService } from '@/services/usuarios.service'
import { catalogosService } from '@/services/catalogos.service'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import type {
  Comuna,
  UsuarioAdminListItem,
  UsuarioTipo,
} from '@/types/api'

const auth = useAuthStore()
const toast = useToast()
const { showError } = useApiError()

// ── Catálogo de comunas ────────────────────────────────────────────
const comunas = ref<Comuna[]>([])
const comunaOptionsRequired = computed(() =>
  comunas.value.map((c) => ({ value: String(c.id), label: c.nombre })),
)
const comunaOptionsAll = computed(() => [
  { value: '', label: 'Todas las comunas' },
  ...comunaOptionsRequired.value,
])

// ── Filtros + listado ──────────────────────────────────────────────
const filterTipo = ref<UsuarioTipo | ''>('')
const filterComuna = ref<string>('')
const filterActivo = ref<'' | 'true' | 'false'>('')
const search = ref<string>('')

const usuarios = ref<UsuarioAdminListItem[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(true)
const loadingMore = ref(false)

const tipoOptions = [
  { value: '', label: 'Todos los roles' },
  { value: 'ciudadano', label: 'Vecino' },
  { value: 'municipalidad', label: 'Funcionario' },
  { value: 'admin', label: 'Administrador' },
] as const

const activoOptions = [
  { value: '', label: 'Activos e inactivos' },
  { value: 'true', label: 'Solo activos' },
  { value: 'false', label: 'Solo inactivos' },
] as const

const tipoLabel: Record<UsuarioTipo, string> = {
  ciudadano: 'Vecino',
  municipalidad: 'Funcionario',
  admin: 'Administrador',
}
const tipoTone: Record<UsuarioTipo, 'info' | 'warning' | 'success'> = {
  ciudadano: 'info',
  municipalidad: 'warning',
  admin: 'success',
}

async function loadUsuarios(cursor?: string) {
  const target = cursor ? loadingMore : loading
  target.value = true
  try {
    const res = await usuariosService.list({
      tipo: filterTipo.value || undefined,
      comuna_id: filterComuna.value ? Number(filterComuna.value) : undefined,
      activo:
        filterActivo.value === '' ? undefined : filterActivo.value === 'true',
      q: search.value.trim() || undefined,
      limit: 20,
      cursor,
    })
    usuarios.value = cursor ? [...usuarios.value, ...res.data] : res.data
    nextCursor.value = res.next_cursor
  } catch (e) {
    showError(e, 'No se pudieron cargar los usuarios')
  } finally {
    target.value = false
  }
}

onMounted(async () => {
  try {
    comunas.value = await catalogosService.getComunas()
  } catch {
    // sigue sin catálogo
  }
  await loadUsuarios()
})

// Debounce simple para la búsqueda
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadUsuarios(), 300)
})

watch([filterTipo, filterComuna, filterActivo], () => loadUsuarios())

// ── Activar / desactivar ───────────────────────────────────────────
const togglingId = ref<string | null>(null)

async function toggleActivo(u: UsuarioAdminListItem) {
  if (u.id === auth.profile?.id) {
    toast.warning('Acción bloqueada', 'No puedes desactivarte a ti mismo.')
    return
  }
  togglingId.value = u.id
  try {
    const updated = await usuariosService.setActivo(u.id, !u.activo)
    const idx = usuarios.value.findIndex((x) => x.id === updated.id)
    if (idx !== -1) usuarios.value[idx] = updated
    toast.success(
      updated.activo ? 'Usuario reactivado' : 'Usuario desactivado',
      updated.nombre,
    )
  } catch (e) {
    showError(e, 'No se pudo cambiar el estado del usuario')
  } finally {
    togglingId.value = null
  }
}

// ── Promover ───────────────────────────────────────────────────────
const promoteOpen = ref(false)
const promoteSaving = ref(false)
const promoteTarget = ref<UsuarioAdminListItem | null>(null)
const promoteForm = reactive<{
  nuevo_tipo: UsuarioTipo | ''
  comuna_id: string
}>({ nuevo_tipo: '', comuna_id: '' })
const promoteErrors = ref<Record<string, string>>({})

const promoteTipoOptions = [
  { value: 'ciudadano', label: 'Vecino' },
  { value: 'municipalidad', label: 'Funcionario' },
  { value: 'admin', label: 'Administrador' },
] as const

function openPromote(u: UsuarioAdminListItem) {
  if (u.id === auth.profile?.id) {
    toast.warning('Acción bloqueada', 'No puedes cambiar tu propio rol.')
    return
  }
  promoteTarget.value = u
  promoteForm.nuevo_tipo = u.tipo
  promoteForm.comuna_id = u.comuna_id ? String(u.comuna_id) : ''
  promoteErrors.value = {}
  promoteOpen.value = true
}

const requiresComuna = computed(() => promoteForm.nuevo_tipo === 'municipalidad')

function validatePromote(): boolean {
  promoteErrors.value = {}
  if (!promoteForm.nuevo_tipo) {
    promoteErrors.value.nuevo_tipo = 'Selecciona un rol.'
  }
  if (requiresComuna.value && !promoteForm.comuna_id) {
    promoteErrors.value.comuna_id = 'Funcionario requiere comuna asignada.'
  }
  return Object.keys(promoteErrors.value).length === 0
}

async function submitPromote() {
  if (!promoteTarget.value || !validatePromote()) return
  promoteSaving.value = true
  try {
    const updated = await usuariosService.promover(promoteTarget.value.id, {
      nuevo_tipo: promoteForm.nuevo_tipo as UsuarioTipo,
      ...(promoteForm.comuna_id && { comuna_id: Number(promoteForm.comuna_id) }),
    })
    const idx = usuarios.value.findIndex((x) => x.id === updated.id)
    if (idx !== -1) usuarios.value[idx] = updated
    toast.success(
      'Rol actualizado',
      `${updated.nombre} ahora es ${tipoLabel[updated.tipo]}.`,
    )
    promoteOpen.value = false
  } catch (e) {
    showError(e, 'No se pudo cambiar el rol del usuario')
  } finally {
    promoteSaving.value = false
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
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
        Administra cuentas de vecinos, funcionarios y otros administradores.
      </p>
    </header>

    <!-- Filtros -->
    <div class="page__filters">
      <BaseInput
        v-model="search"
        label="Buscar"
        placeholder="Nombre o correo…"
        hint="Búsqueda parcial sobre nombre o email."
      />
      <BaseSelect v-model="filterTipo" :options="[...tipoOptions]" label="Rol" />
      <BaseSelect v-model="filterComuna" :options="comunaOptionsAll" label="Comuna" />
      <BaseSelect v-model="filterActivo" :options="[...activoOptions]" label="Estado" />
    </div>

    <!-- Listado -->
    <BaseCard padding="none">
      <div v-if="loading" class="page__center"><BaseSpinner size="lg" /></div>
      <BaseEmpty
        v-else-if="usuarios.length === 0"
        icon="◉"
        title="Sin coincidencias"
        message="Ajusta los filtros o limpia la búsqueda."
      />
      <table v-else class="tbl">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Comuna</th>
            <th>Activo</th>
            <th>Creado</th>
            <th class="tbl__col-actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id" :class="{ 'tbl__row--self': u.id === auth.profile?.id }">
            <td>
              <div class="tbl__nombre">{{ u.nombre }}</div>
              <div class="tbl__email">{{ u.email }}</div>
            </td>
            <td>
              <BaseBadge :tone="tipoTone[u.tipo]" size="sm">
                {{ tipoLabel[u.tipo] }}
              </BaseBadge>
            </td>
            <td>{{ u.comuna_nombre ?? '—' }}</td>
            <td>
              <BaseBadge :tone="u.activo ? 'success' : 'neutral'" dot size="sm">
                {{ u.activo ? 'Activo' : 'Inactivo' }}
              </BaseBadge>
            </td>
            <td>{{ formatDate(u.created_at) }}</td>
            <td class="tbl__col-actions">
              <BaseButton
                variant="ghost"
                size="sm"
                :disabled="u.id === auth.profile?.id"
                @click="openPromote(u)"
              >
                Cambiar rol
              </BaseButton>
              <BaseButton
                :variant="u.activo ? 'danger' : 'primary'"
                size="sm"
                :loading="togglingId === u.id"
                :disabled="u.id === auth.profile?.id"
                @click="toggleActivo(u)"
              >
                {{ u.activo ? 'Desactivar' : 'Reactivar' }}
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
        @click="loadUsuarios(nextCursor ?? undefined)"
      >
        Ver más usuarios
      </BaseButton>
    </div>

    <!-- Modal: cambiar rol -->
    <BaseModal v-model="promoteOpen" title="Cambiar rol del usuario" size="md">
      <div v-if="promoteTarget" class="form">
        <p class="form__hint">
          Cambiando rol de <strong>{{ promoteTarget.nombre }}</strong>
          ({{ promoteTarget.email }}). Rol actual:
          <BaseBadge :tone="tipoTone[promoteTarget.tipo]" size="sm">
            {{ tipoLabel[promoteTarget.tipo] }}
          </BaseBadge>
        </p>
        <BaseSelect
          v-model="promoteForm.nuevo_tipo"
          :options="[...promoteTipoOptions]"
          label="Nuevo rol"
          :error="promoteErrors.nuevo_tipo"
        />
        <BaseSelect
          v-if="requiresComuna"
          v-model="promoteForm.comuna_id"
          :options="comunaOptionsRequired"
          label="Comuna asignada"
          placeholder="Selecciona la comuna del funcionario"
          hint="Obligatorio para funcionarios — su acceso queda scoped a esta comuna."
          :error="promoteErrors.comuna_id"
        />
      </div>
      <template #footer="{ close }">
        <BaseButton variant="ghost" :disabled="promoteSaving" @click="close">Cancelar</BaseButton>
        <BaseButton :loading="promoteSaving" @click="submitPromote">Guardar cambio</BaseButton>
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
.tbl__row--self {
  background: var(--color-bg-alt);
}
.tbl__nombre {
  font-weight: var(--font-semibold);
}
.tbl__email {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
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
.form__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
