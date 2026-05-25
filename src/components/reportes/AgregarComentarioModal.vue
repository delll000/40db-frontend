<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useApiError } from '@/composables/useApiError'
import { useToast } from '@/composables/useToast'
import { reporteComentariosService } from '@/services/reporteComentarios.service'
import { usuariosService } from '@/services/usuarios.service'
import { isApiHttpError } from '@/services/errors'
import type {
  ComentarioVisibilidad,
  ReporteComentario,
  UsuarioAdminListItem,
} from '@/types/api'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'

/**
 * Modal para agregar un comentario interno o externo a un reporte.
 *
 * Spec: `../../40db-backend/docs/frontend-comentarios-reporte.md §1.3` y
 * `api.md §4.28`.
 */

const props = defineProps<{
  modelValue: boolean
  reporteId: string
  /** comuna_id del reporte — usada para listar funcionarios delegables. */
  comunaId: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [comentario: ReporteComentario]
}>()

const { showError } = useApiError()
const toast = useToast()

// ──────────────────────────────────────────────────────────
// Estado del formulario
// ──────────────────────────────────────────────────────────

const visibilidad = ref<ComentarioVisibilidad>('externo')
const cuerpo = ref('')
const cuerpoError = ref('')

const esDelegacion = ref(false)
const delegadoAId = ref<string>('')
const delegadoAt = ref<string>('') // datetime-local: "YYYY-MM-DDTHH:mm"
const delegadoAIdError = ref('')
const delegadoAtError = ref('')

const submitting = ref(false)

// ──────────────────────────────────────────────────────────
// Funcionarios delegables (lazy)
// ──────────────────────────────────────────────────────────

const funcionarios = ref<UsuarioAdminListItem[]>([])
const funcionariosLoading = ref(false)
/**
 * Si el back deniega el listado (típicamente porque /api/v1/usuarios es
 * admin-only), mostramos un mensaje en lugar de un dropdown vacío.
 * Spec: `frontend-comentarios-reporte.md §1.3`.
 */
const funcionariosBloqueado = ref<string | null>(null)
const funcionariosCargados = ref(false)

async function cargarFuncionarios() {
  if (funcionariosCargados.value || funcionariosLoading.value) return
  funcionariosLoading.value = true
  funcionariosBloqueado.value = null
  try {
    const res = await usuariosService.list({
      tipo: 'municipalidad',
      comuna_id: props.comunaId,
      activo: true,
      limit: 100,
    })
    funcionarios.value = res.data
    funcionariosCargados.value = true
  } catch (e) {
    if (isApiHttpError(e) && e.status === 403) {
      funcionariosBloqueado.value =
        'No tenés permiso para listar funcionarios para delegar. Pedile a un administrador que asigne la delegación.'
    } else {
      funcionariosBloqueado.value =
        'No se pudo cargar la lista de funcionarios. Probá de nuevo en unos segundos.'
    }
  } finally {
    funcionariosLoading.value = false
  }
}

// ──────────────────────────────────────────────────────────
// Reset al abrir / cerrar
// ──────────────────────────────────────────────────────────

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      reset()
    }
  },
)

function reset() {
  visibilidad.value = 'externo'
  cuerpo.value = ''
  cuerpoError.value = ''
  esDelegacion.value = false
  delegadoAId.value = ''
  delegadoAt.value = defaultLocalDateTime()
  delegadoAIdError.value = ''
  delegadoAtError.value = ''
}

function close() {
  emit('update:modelValue', false)
}

// Si el usuario cambia a "externo", se cancela la delegación (no aplica).
watch(visibilidad, (v) => {
  if (v === 'externo') {
    esDelegacion.value = false
  }
})

// Al activar la delegación, cargamos la lista y predefinimos "ahora".
watch(esDelegacion, (on) => {
  if (on) {
    if (!delegadoAt.value) delegadoAt.value = defaultLocalDateTime()
    void cargarFuncionarios()
  }
})

// ──────────────────────────────────────────────────────────
// Helpers de fecha
// ──────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** "YYYY-MM-DDTHH:mm" en la zona local del navegador (formato datetime-local). */
function defaultLocalDateTime(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Convierte el valor de un `<input type="datetime-local">` (interpretado en
 * zona horaria local del navegador) a un ISO 8601 UTC para el back.
 */
function localToUtcIso(local: string): string {
  return new Date(local).toISOString()
}

// ──────────────────────────────────────────────────────────
// Validación y submit
// ──────────────────────────────────────────────────────────

const cuerpoLen = computed(() => cuerpo.value.trim().length)

function validate(): boolean {
  cuerpoError.value = ''
  delegadoAIdError.value = ''
  delegadoAtError.value = ''
  let ok = true
  if (cuerpoLen.value < 1) {
    cuerpoError.value = 'Escribe el comentario antes de enviar.'
    ok = false
  } else if (cuerpo.value.length > 2000) {
    cuerpoError.value = 'Máximo 2000 caracteres.'
    ok = false
  }
  if (esDelegacion.value) {
    if (!delegadoAId.value) {
      delegadoAIdError.value = 'Elegí el funcionario al que se delega.'
      ok = false
    }
    if (!delegadoAt.value) {
      delegadoAtError.value = 'Indicá la fecha y hora de la delegación.'
      ok = false
    }
  }
  return ok
}

const funcionarioOptions = computed(() =>
  funcionarios.value.map((u) => ({ value: u.id, label: u.nombre })),
)

async function submit() {
  if (!validate()) return
  submitting.value = true
  try {
    const body =
      esDelegacion.value && visibilidad.value === 'interno'
        ? {
            visibilidad: visibilidad.value,
            cuerpo: cuerpo.value.trim(),
            delegado_a_id: delegadoAId.value,
            delegado_at: localToUtcIso(delegadoAt.value),
          }
        : {
            visibilidad: visibilidad.value,
            cuerpo: cuerpo.value.trim(),
          }

    const creado = await reporteComentariosService.crear(props.reporteId, body)
    emit('created', creado)
    toast.success(
      visibilidad.value === 'externo' ? 'Mensaje enviado al vecino' : 'Nota interna guardada',
      esDelegacion.value && creado.delegado_a
        ? `Delegado a ${creado.delegado_a.nombre}`
        : undefined,
    )
    close()
  } catch (e) {
    showError(e, 'No se pudo agregar el comentario')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Agregar comentario"
    size="md"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <form class="form" @submit.prevent="submit">
      <fieldset class="form__fieldset">
        <legend class="form__legend">¿Qué tipo de comentario querés agregar?</legend>
        <label class="radio">
          <input
            v-model="visibilidad"
            type="radio"
            value="externo"
            name="visibilidad"
            :disabled="submitting"
          />
          <span>
            <strong>Mensaje al vecino</strong>
            <small>Será visible para quien creó el reporte.</small>
          </span>
        </label>
        <label class="radio">
          <input
            v-model="visibilidad"
            type="radio"
            value="interno"
            name="visibilidad"
            :disabled="submitting"
          />
          <span>
            <strong>Nota interna</strong>
            <small>Solo lxs funcionarixs lo ven.</small>
          </span>
        </label>
      </fieldset>

      <BaseInput
        v-model="cuerpo"
        :label="visibilidad === 'externo' ? 'Mensaje para el vecino' : 'Nota interna'"
        textarea
        :rows="5"
        :placeholder="visibilidad === 'externo' ? 'Ej: Esto fue derivado a una patrulla municipal, ya van en camino.' : 'Ej: Pendiente confirmar el horario con el inspector.'"
        :hint="`${cuerpo.length} / 2000 caracteres`"
        :error="cuerpoError"
        :disabled="submitting"
        required
      />

      <!-- Delegación (solo internos) -->
      <div v-if="visibilidad === 'interno'" class="form__delegacion">
        <label class="checkbox">
          <input
            v-model="esDelegacion"
            type="checkbox"
            :disabled="submitting"
          />
          <span>Esta nota es una <strong>delegación</strong> a otro funcionario</span>
        </label>

        <div v-if="esDelegacion" class="form__delegacion-body">
          <div v-if="funcionariosLoading" class="form__loading">
            <BaseSpinner size="sm" />
            <span>Cargando funcionarios…</span>
          </div>
          <p v-else-if="funcionariosBloqueado" class="form__warn">
            {{ funcionariosBloqueado }}
          </p>
          <BaseSelect
            v-else
            :model-value="delegadoAId"
            :options="funcionarioOptions"
            label="Funcionario delegado"
            placeholder="Elegí un funcionario"
            :error="delegadoAIdError"
            :disabled="submitting || funcionarios.length === 0"
            :hint="funcionarios.length === 0 ? 'No hay funcionarios disponibles en esta comuna.' : undefined"
            required
            @update:model-value="(v) => (delegadoAId = v)"
          />

          <div class="field">
            <label for="delegado-at" class="field__label">
              Fecha y hora de la delegación <span class="field__req">*</span>
            </label>
            <input
              id="delegado-at"
              v-model="delegadoAt"
              type="datetime-local"
              class="field__control"
              :disabled="submitting"
              :aria-invalid="!!delegadoAtError || undefined"
            />
            <p v-if="delegadoAtError" class="field__error">{{ delegadoAtError }}</p>
            <p v-else class="field__hint">Por defecto: ahora. Editalo si la delegación es a futuro.</p>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <BaseButton variant="ghost" :disabled="submitting" @click="close">
        Cancelar
      </BaseButton>
      <BaseButton :loading="submitting" @click="submit">
        Agregar comentario
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form__fieldset {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
}

.form__legend {
  padding: 0 var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.radio,
.checkbox {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
}

.radio:hover,
.checkbox:hover {
  background: var(--color-bg-alt);
}

.radio input,
.checkbox input {
  margin-top: 2px;
}

.radio span,
.checkbox span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.radio small {
  color: var(--color-text-muted);
}

.form__delegacion {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}

.form__delegacion-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-alt);
  border-radius: var(--radius-md);
}

.form__loading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.form__warn {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: rgba(255, 171, 145, 0.2);
  color: #b45722;
  font-size: var(--text-sm);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field__label {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.field__req {
  color: var(--color-danger);
  margin-left: 2px;
}

.field__control {
  width: 100%;
  min-height: 40px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--text-base);
  font-family: var(--font-body);
}

.field__control:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 77, 64, 0.2);
}

.field__error {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-danger);
}

.field__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
