<script setup lang="ts">
import { computed, useId } from 'vue'

interface Option {
  value: string | number
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined
    options: Option[]
    label?: string
    placeholder?: string
    hint?: string
    error?: string
    required?: boolean
    disabled?: boolean
    id?: string
  }>(),
  {
    required: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const autoId = useId()
const inputId = computed(() => props.id ?? `sel-${autoId}`)
const describedById = computed(() =>
  props.error ? `${inputId.value}-err` : props.hint ? `${inputId.value}-hint` : undefined,
)

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <div class="field" :class="{ 'is-invalid': !!error, 'is-disabled': disabled }">
    <label v-if="label" :for="inputId" class="field__label">
      {{ label }}
      <span v-if="required" class="field__req" aria-hidden="true">*</span>
    </label>

    <div class="field__wrap">
      <select
        :id="inputId"
        class="field__control"
        :value="modelValue ?? ''"
        :required="required"
        :disabled="disabled"
        :aria-invalid="!!error || undefined"
        :aria-describedby="describedById"
        @change="onChange"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <span class="field__chev" aria-hidden="true">▾</span>
    </div>

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

.field__wrap {
  position: relative;
}

.field__control {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  min-height: 40px;
  padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--text-base);
  font-family: var(--font-body);
  transition: border-color 150ms ease, box-shadow 150ms ease;
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

.field__control:disabled {
  background: var(--color-bg-alt);
  cursor: not-allowed;
  opacity: 0.7;
}

.field__chev {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
  font-size: var(--text-sm);
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
