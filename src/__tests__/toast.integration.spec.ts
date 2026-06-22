import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BaseToastContainer from '@/components/common/BaseToastContainer.vue'
import { useToastStore } from '@/stores/toast'

// El contenedor usa <Teleport to="body">, así que los toasts salen al body.
function toastsEnPantalla(): NodeListOf<Element> {
  return document.body.querySelectorAll('.toast')
}

describe('toasts (store + contenedor)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('al hacer push el contenedor renderiza el toast', async () => {
    mount(BaseToastContainer)
    const store = useToastStore()

    expect(toastsEnPantalla()).toHaveLength(0)

    store.push({ tone: 'success', title: 'Reporte creado' })
    await nextTick()

    const toasts = toastsEnPantalla()
    expect(toasts).toHaveLength(1)
    expect(toasts[0]!.textContent).toContain('Reporte creado')
  })

  it('un toast con duración se cierra solo al pasar el tiempo', async () => {
    vi.useFakeTimers()
    mount(BaseToastContainer)
    const store = useToastStore()

    store.push({ tone: 'info', title: 'Guardado', duration: 4000 })
    await nextTick()
    expect(toastsEnPantalla()).toHaveLength(1)

    vi.advanceTimersByTime(4000)
    await nextTick()
    expect(toastsEnPantalla()).toHaveLength(0)
  })

  it('dismiss quita solo el toast indicado', async () => {
    mount(BaseToastContainer)
    const store = useToastStore()

    const id1 = store.push({ tone: 'info', title: 'Uno', duration: 0 })
    store.push({ tone: 'error', title: 'Dos', duration: 0 })
    await nextTick()
    expect(toastsEnPantalla()).toHaveLength(2)

    store.dismiss(id1)
    await nextTick()
    const toasts = toastsEnPantalla()
    expect(toasts).toHaveLength(1)
    expect(toasts[0]!.textContent).toContain('Dos')
  })
})
