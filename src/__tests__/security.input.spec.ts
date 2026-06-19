// El front nunca debe interpretar como HTML el texto del usuario o del backend.
// Vue auto-escapa las interpolaciones; aquí lo verificamos sobre componentes reales.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseToast from '@/components/common/BaseToast.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import type { Toast } from '@/stores/toast'

const XSS = `<script>alert('xss')</script>`
const IMG_XSS = `<img src=x onerror="alert(1)">`

function makeToast(overrides: Partial<Toast> = {}): Toast {
  return { id: 't1', tone: 'info', title: 'ok', duration: 0, ...overrides }
}

describe('escape de entradas (XSS)', () => {
  it('un título con <script> se muestra como texto, no como HTML', () => {
    const wrapper = mount(BaseToast, { props: { toast: makeToast({ title: XSS }) } })

    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.get('.toast__title').text()).toBe(XSS)
  })

  it('un message con <img onerror> no crea el elemento', () => {
    const wrapper = mount(BaseToast, {
      props: { toast: makeToast({ message: IMG_XSS }) },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('.toast__message').text()).toBe(IMG_XSS)
  })

  it('BaseInput guarda un valor malicioso como texto del control', () => {
    const wrapper = mount(BaseInput, { props: { modelValue: XSS, label: 'Título' } })

    expect(wrapper.find('script').exists()).toBe(false)
    const input = wrapper.get('input.field__control').element as HTMLInputElement
    expect(input.value).toBe(XSS)
  })

  it('BaseInput expone la restricción required', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '', label: 'Comuna', required: true },
    })
    expect(wrapper.get('input.field__control').attributes('required')).toBeDefined()
  })
})
