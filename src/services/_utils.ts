/**
 * Utilidades para el layer de servicios mock.
 *
 * Cuando se conecte al backend real, se reemplazan los `mock(...)` por
 * llamadas axios manteniendo la misma firma async/Promise.
 */

export const delay = (ms = 300) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Simula una llamada al backend que siempre resuelve con éxito.
 * Clona profundamente el valor para evitar mutaciones accidentales del JSON.
 */
export async function mock<T>(value: T, ms = 300): Promise<T> {
  await delay(ms)
  return clone(value)
}

/**
 * Variante con probabilidad de fallo (útil para testing manual de toasts de error).
 * Pasa `failRate=1` para forzar el error.
 */
export async function mockMaybeFail<T>(
  value: T,
  failRate = 0,
  ms = 300,
): Promise<T> {
  await delay(ms)
  if (Math.random() < failRate) {
    throw new Error('Mock failure')
  }
  return clone(value)
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}
