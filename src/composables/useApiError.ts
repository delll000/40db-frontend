import { useToast } from './useToast'
import {
  ApiHttpError,
  NetworkError,
  isApiHttpError,
} from '@/services/errors'

/**
 * Convierte errores del cliente HTTP en toasts uniformes.
 *
 * Uso típico:
 *   const { showError } = useApiError()
 *   try { await reportesService.crear(...) }
 *   catch (e) { showError(e, 'No se pudo crear el reporte') }
 *
 * Para casos donde el llamador quiere distinguir un código específico
 * (ej. `invalid_state_transition`), usar `isApiError(e, 'codigo')` antes
 * de delegar al toast.
 */
export function useApiError() {
  const toast = useToast()

  function showError(error: unknown, fallbackTitle = 'Ocurrió un error'): void {
    if (isApiHttpError(error)) {
      toast.error(fallbackTitle, formatApiMessage(error))
      return
    }
    if (error instanceof NetworkError) {
      toast.error('Sin conexión', 'No se pudo contactar al servidor. Revisa tu conexión.')
      return
    }
    const message = error instanceof Error ? error.message : 'Error desconocido.'
    toast.error(fallbackTitle, message)
  }

  return { showError }
}

function formatApiMessage(error: ApiHttpError): string {
  if (!error.correlationId) return error.message
  return `${error.message}\n\nReferencia: ${error.correlationId}`
}
