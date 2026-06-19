// BUG-001: la UI dejaba transicionar reportes ya terminales (Atendido /
// Descartado) y permitía pasar a 'Descartado' sin comentario obligatorio,
// saltándose la máquina de estados (bbdd.md §7, api.md §4.9).
// Estas pruebas fijan la regla para que el bug no vuelva.
import { describe, it, expect } from 'vitest'
import {
  ESTADO_TRANSICIONES,
  ESTADOS_TERMINALES,
  transicionRequiereComentario,
} from '@/types/report'

describe('estados del reporte (BUG-001)', () => {
  it('los estados terminales no tienen transiciones', () => {
    expect(ESTADO_TRANSICIONES['Atendido']).toEqual([])
    expect(ESTADO_TRANSICIONES['Descartado']).toEqual([])
  })

  it("'En espera' no salta directo a 'Atendido'", () => {
    const permitidas = ESTADO_TRANSICIONES['En espera']
    expect(permitidas).toEqual(['En atencion', 'Descartado'])
    expect(permitidas).not.toContain('Atendido')
  })

  it("'En atencion' solo avanza a 'Atendido' o 'Descartado'", () => {
    expect(ESTADO_TRANSICIONES['En atencion']).toEqual(['Atendido', 'Descartado'])
  })

  it("pasar a 'Descartado' exige comentario; los demás no", () => {
    expect(transicionRequiereComentario('Descartado')).toBe(true)
    expect(transicionRequiereComentario('Atendido')).toBe(false)
    expect(transicionRequiereComentario('En atencion')).toBe(false)
    expect(transicionRequiereComentario('En espera')).toBe(false)
  })

  it('los terminales son exactamente Atendido y Descartado', () => {
    expect(ESTADOS_TERMINALES.has('Atendido')).toBe(true)
    expect(ESTADOS_TERMINALES.has('Descartado')).toBe(true)
    expect(ESTADOS_TERMINALES.has('En espera')).toBe(false)
    expect(ESTADOS_TERMINALES.has('En atencion')).toBe(false)
    expect(ESTADOS_TERMINALES.size).toBe(2)
  })
})
