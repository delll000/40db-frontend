/**
 * Spec 03 — Flujo E2E completo del Vecino (ciudadano)
 *
 * Tipo de prueba: E2E / Funcional
 * Pregunta: ¿El vecino puede ver su panel, abrir el modal para reportar
 * y visualizar sus reportes anteriores de punta a punta?
 *
 * Backend: completamente mockeado con cy.mockBackend().
 * Auth: sesión falsa inyectada con cy.loginAs('vecino').
 */
describe('Flujo E2E: Vecino', () => {
  beforeEach(() => {
    cy.mockBackend()
    cy.loginAs('vecino')
  })

  it('vecino autenticado accede a /vecino-home y ve saludo personalizado', () => {
    cy.visit('/vecino-home')
    // El h1 muestra "Hola, {nombre}" donde nombre viene del fixture perfil_vecino.json
    cy.get('h1').should('contain.text', 'Hola')
    cy.get('h1').should('contain.text', 'Vecino Prueba')
  })

  it('sección KPIs muestra las tarjetas de resumen de zona', () => {
    cy.visit('/vecino-home')
    cy.contains('Resumen de tu zona').should('be.visible')
    // KPI cards deben estar presentes
    cy.contains('Nivel medio actual').should('be.visible')
    cy.contains('Mis reportes').should('be.visible')
  })

  it('botón "Realizar reporte" abre el modal con el formulario', () => {
    cy.visit('/vecino-home')
    cy.contains('button', 'Realizar reporte').should('be.visible').click()
    // El modal usa role="dialog" (según BaseModal.vue)
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"] h2').should('contain.text', 'Realizar un reporte de ruido')
  })

  it('flujo completo: rellena el formulario de reporte, intenta enviar y ve validación', () => {
    cy.visit('/vecino-home')

    // Abrir el modal de reporte
    cy.contains('button', 'Realizar reporte').click()
    cy.get('[role="dialog"]').should('be.visible')

    // Rellenar título y descripción
    cy.get('input[placeholder*="Ej:"]').type('Ruido excesivo del vecino del 3B')
    cy.get('textarea').type(
      'El vecino pone música a todo volumen desde las 10pm todos los días de semana.',
    )
    cy.get('input[placeholder*="Ej:"]').should('have.value', 'Ruido excesivo del vecino del 3B')

    // Intentar enviar sin ubicación → validación del formulario
    cy.contains('button', 'Enviar reporte').click()
    cy.contains('Haz clic en el mapa para fijar la ubicación').should('be.visible')

    // Cancelar y verificar que el modal se cierra correctamente
    cy.contains('button', 'Cancelar').click()
    cy.get('[role="dialog"]').should('not.exist')
  })

  it('sección "Mis reportes recientes" muestra los reportes del mock', () => {
    cy.visit('/vecino-home')
    cy.contains('h2', 'Mis reportes recientes').should('be.visible')
    // Los títulos vienen del fixture reportes.json
    cy.contains('Ruido excesivo vecino del 3B').should('be.visible')
    cy.contains('Fiesta con música hasta las 4am').should('be.visible')
    cy.contains('Obras sin permiso en fin de semana').should('be.visible')
  })

  it('al hacer clic en un reporte de la lista se abre el modal de detalle', () => {
    // Interceptar el endpoint GET /reportes/:id para el detalle
    cy.intercept('GET', '**/api/v1/reportes/rep-00000001', {
      body: {
        id: 'rep-00000001',
        titulo: 'Ruido excesivo vecino del 3B',
        descripcion: 'El vecino del 3B tiene música muy alta todos los días.',
        estado_actual: 'En espera',
        created_at: '2025-06-01T14:30:00Z',
        latitud: -33.4,
        longitud: -70.6,
        comuna_id: 1,
        usuario: null,
        lectura_evidencia: null,
        atendido_por: null,
        historial: [],
        comentarios: [],
      },
    }).as('detalleReporte')

    cy.visit('/vecino-home')
    cy.contains('Ruido excesivo vecino del 3B').click()

    cy.wait('@detalleReporte')
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"] h2').should('contain.text', 'Detalle del reporte')
  })
})
