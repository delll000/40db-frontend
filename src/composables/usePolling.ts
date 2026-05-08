import { onScopeDispose } from 'vue'

/**
 * Ejecuta `fn` cada `intervalMs` milisegundos. Limpia automáticamente
 * cuando el scope (componente o setup) se desmonta.
 *
 * Devuelve `{ stop, start }` por si se necesita controlar manualmente.
 */
export function usePolling(fn: () => void | Promise<void>, intervalMs: number) {
  let handle: ReturnType<typeof setInterval> | null = null

  function start() {
    if (handle !== null) return
    handle = setInterval(fn, intervalMs)
  }

  function stop() {
    if (handle === null) return
    clearInterval(handle)
    handle = null
  }

  start()
  onScopeDispose(stop)

  return { start, stop }
}
