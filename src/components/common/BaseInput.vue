<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined
    label?: string
    type?: string
    placeholder?: string
    hint?: string
    error?: string
    required?: boolean
    disabled?: boolean
    readonly?: boolean
    autocomplete?: string
    inputmode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel' | 'search' | 'url'
    /** Si true, renderiza un <textarea> en vez de <input> */
    textarea?: boolean
    rows?: number
    id?: string
    min?: number | string
    max?: number | string
    step?: number | string
  }>(),
  {
    type: 'text',
    required: false,
    disabled: false,
    readonly: false,
    textarea: false,
    rows: 3,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const autoId = useId()
const inputId = computed(() => props.id ?? `inp-${autoId}`)
const describedById = computed(() => (props.error ? `${inputId.value}-err` : props.hint ? `${inputId.value}-hint` : undefined))

function onInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="field" :class="{ 'is-invalid': !!error, 'is-disabled': disabled }">
    <label v-if="label" :for="inputId" class="field__label">
      {{ label }}
      <span v-if="required" class="field__req" aria-hidden="true">*</span>
    </label>

    <textarea
      v-if="textarea"
      :id="inputId"
      class="field__control"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :rows="rows"
      :aria-invalid="!!error || undefined"
      :aria-describedby="describedById"
      @input="onInput"
      @blur="(e: FocusEvent) => emit('blur', e)"
      @focus="(e: FocusEvent) => emit('focus', e)"
    />
    <input
      v-else
      :id="inputId"
      class="field__control"
      :type="type"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :min="min"
      :max="max"
      :step="step"
      :aria-invalid="!!error || undefined"
      :aria-describedby="describedById"
      @input="onInput"
      @blur="(e: FocusEvent) => emit('blur', e)"
      @focus="(e: FocusEvent) => emit('focus', e)"
    />

    <p v-if="error" :id="`${inputId}-err`" class="field__error">{{ error }}</p>
    <p v-else-if="hint" :id="`${inputId}-hint`" class="field__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
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
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

textarea.field__control {
  resize: vertical;
  min-height: 80px;
  font-family: var(--font-body);
}

.field__control::placeholder {
  color: var(--color-text-muted);
}

.field__control:hover:not(:disabled):not(:focus) {
  border-color: var(--color-text-muted);
}

.field__control:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 77, 64, 0.2);
}

.field.is-invalid .field__control {
  border-color: var(--color-danger);
}

.field.is-invalid .field__control:focus {
  box-shadow: 0 0 0 3px rgba(183, 28, 28, 0.2);
}

.field__control:disabled {
  background: var(--color-bg-alt);
  cursor: not-allowed;
  opacity: 0.7;
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
