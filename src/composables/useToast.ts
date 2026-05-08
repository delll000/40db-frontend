import { useToastStore } from '@/stores/toast'

/**
 * Wrapper sobre el toast store con shortcuts por tono.
 * Uso típico:
 *   const toast = useToast()
 *   toast.success('Reporte enviado')
 *   toast.error('No se pudo guardar', 'Verifica tu conexión')
 */
export function useToast() {
  const store = useToastStore()
  return {
    success: (title: string, message?: string, duration?: number) =>
      store.push({ tone: 'success', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      store.push({ tone: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      store.push({ tone: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      store.push({ tone: 'info', title, message, duration }),
    dismiss: store.dismiss,
    clear: store.clear,
  }
}
