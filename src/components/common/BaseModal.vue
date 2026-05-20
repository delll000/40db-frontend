<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    size?: Size
    closeOnOverlay?: boolean
    closeOnEsc?: boolean
    /** Si true, oculta el botón "X" del header */
    hideClose?: boolean
  }>(),
  {
    size: 'md',
    closeOnOverlay: true,
    closeOnEsc: true,
    hideClose: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const dialogRef = ref<HTMLDivElement | null>(null)
const previouslyFocused = ref<HTMLElement | null>(null)
const titleId = useId()

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (!props.modelValue) return
  if (e.key === 'Escape' && props.closeOnEsc) {
    e.preventDefault()
    close()
    return
  }
  if (e.key === 'Tab') {
    trapFocus(e)
  }
}

function trapFocus(e: KeyboardEvent) {
  const container = dialogRef.value
  if (!container) return
  const focusables = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  if (focusables.length === 0) return
  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  const active = document.activeElement as HTMLElement | null

  if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

function onOverlay() {
  if (props.closeOnOverlay) close()
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      previouslyFocused.value = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      await nextTick()
      const firstInput = dialogRef.value?.querySelector<HTMLElement>(
        'input, textarea, button:not([data-modal-close]), select, a[href]',
      )
      firstInput?.focus()
    } else {
      document.body.style.overflow = ''
      previouslyFocused.value?.focus?.()
    }
  },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeydown)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
</script>

<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @mousedown.self="onOverlay">
        <div
          ref="dialogRef"
          :class="['modal', `modal--${size}`]"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
        >
          <header v-if="title || !hideClose" class="modal__head">
            <h2 v-if="title" :id="titleId" class="modal__title">{{ title }}</h2>
            <button
              v-if="!hideClose"
              type="button"
              class="modal__close"
              data-modal-close
              aria-label="Cerrar"
              @click="close"
            >
              ✕
            </button>
          </header>
          <div class="modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal__foot">
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 1000;
}

.modal {
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-height: calc(100vh - var(--space-8));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal--sm {
  max-width: 420px;
}
.modal--md {
  max-width: 600px;
}
.modal--lg {
  max-width: 880px;
}

.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.modal__title {
  margin: 0;
  font-size: var(--text-lg);
}

.modal__close {
  background: transparent;
  border: 0;
  font-size: 1.2rem;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.modal__close:hover {
  background: var(--color-bg-alt);
  color: var(--color-text);
}

.modal__body {
  padding: var(--space-6);
  overflow-y: auto;
}

.modal__foot {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-alt);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 180ms ease;
}
.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 180ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: translateY(8px) scale(0.98);
}
</style>
