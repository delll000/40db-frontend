import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  tone: ToastTone
  title: string
  message?: string
  /** Duración en ms; si es 0 o negativo, no se cierra automáticamente. */
  duration: number
}

export interface ToastInput {
  tone: ToastTone
  title: string
  message?: string
  duration?: number
}

const DEFAULT_DURATION = 4000

export const useToastStore = defineStore('toast', () => {
  const items = ref<Toast[]>([])

  function push(input: ToastInput): string {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const duration = input.duration ?? DEFAULT_DURATION
    const toast: Toast = {
      id,
      tone: input.tone,
      title: input.title,
      message: input.message,
      duration,
    }
    items.value.push(toast)
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  function dismiss(id: string) {
    items.value = items.value.filter((t) => t.id !== id)
  }

  function clear() {
    items.value = []
  }

  return { items, push, dismiss, clear }
})
