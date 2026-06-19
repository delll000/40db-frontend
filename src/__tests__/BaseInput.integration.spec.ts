import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseInput from '@/components/common/BaseInput.vue'

describe('BaseInput', () => {
  it('emite update:modelValue con lo que se escribe', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '', label: 'Título' } })

    await wrapper.get('input.field__control').setValue('Ruido en la calle')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1]).toEqual(['Ruido en la calle'])
  })

  it('muestra el error y marca el control como inválido', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: 'ab', label: 'Título', error: 'Mínimo 3 caracteres' },
    })

    const err = wrapper.get('.field__error')
    expect(err.text()).toBe('Mínimo 3 caracteres')

    const input = wrapper.get('input.field__control')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(err.attributes('id'))
  })

  it('refleja required y disabled en el DOM', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '', label: 'Comuna', required: true, disabled: true },
    })

    const input = wrapper.get('input.field__control')
    expect(input.attributes('required')).toBeDefined()
    expect(input.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.field__req').exists()).toBe(true)
  })

  it('renderiza un textarea cuando textarea=true', () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '', label: 'Descripción', textarea: true },
    })

    expect(wrapper.find('textarea.field__control').exists()).toBe(true)
    expect(wrapper.find('input.field__control').exists()).toBe(false)
  })
})
