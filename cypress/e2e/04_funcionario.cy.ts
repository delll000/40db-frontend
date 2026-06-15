/**
 * Spec 04 — Flujo E2E completo del Funcionario (municipalidad)
 *
 * Tipo de prueba: E2E / Funcional
 * Pregunta: ¿El funcionario puede ver, filtrar y gestionar los reportes
 * de su comuna de punta a punta?
 *
 * Backend: completamente mockeado con cy.mockBackend().
 * Auth: sesión falsa inyectada con cy.loginAs('funcionario').
 */
describe('Flujo E2E: Funcionario', () => {
  beforeEach(() => {
    cy.mockBackend()
    cy.loginAs('funcionario')
  })

  it('funcionario autenticado accede a /funcionario-home y ve el título principal', () => {
    cy.visit('/funcionario-home')
    cy.get('h1').should('contain.text', 'Reportes a gestionar')
  })

  it('se muestran los KPIs de estado (En espera, En atención, Atendidos, Descartados)', () => {
    cy.visit('/funcionario-home')
    cy.contains('En espera').should('be.visible')
    cy.contains('En atención').should('be.visible')
    cy.contains('Atendidos').should('be.visible')
    cy.contains('Descartados').should('be.visible')
  })

  it('la tabla de reportes muestra los datos del mock', () => {
    cy.visit('/funcionario-home')
    // Esperar a que el spinner desaparezca y la tabla esté visible
    cy.get('table').should('be.visible')
    cy.contains('td', 'Ruido excesivo vecino del 3B').should('be.visible')
    cy.contains('td', 'Fiesta con música hasta las 4am').should('be.visible')
    cy.contains('td', 'Obras sin permiso en fin de semana').should('be.visible')
  })

  it('el select de filtro por estado está disponible y dispara un nuevo request al cambiar', () => {
    cy.visit('/funcionario-home')
    cy.wait('@reportesComuna') // Esperar carga inicial
    // BaseSelect renderiza un <select> nativo
    cy.get('select').should('be.visible').select('En espera')
    // Al cambiar el filtro, la vista dispara un nuevo request (interceptado)
    cy.wait('@reportesComuna')
  })

  it('al hacer clic en "Ver detalle" se abre el modal de detalle del reporte', () => {
    cy.intercept('GET', '**/api/v1/reportes/rep-00000001', {
      body: {
        id: 'rep-00000001',
        titulo: 'Ruido excesivo vecino del 3B',
        descripcion: 'Descripción detallada del reporte.',
        estado_actual: 'En espera',
        created_at: '2025-06-01T14:30:00Z',
        latitud: -33.4,
        longitud: -70.6,
        comuna_id: 1,
        usuario: { nombre: 'Usuario Test' },
        lectura_evidencia: null,
        atendido_por: null,
        historial: [],
        comentarios: [],
      },
    }).as('detalleReporte')

    cy.visit('/funcionario-home')
    cy.get('table').should('be.visible')
    // El primer botón "Ver detalle" corresponde al primer reporte
    cy.contains('button', 'Ver detalle').first().click()

    cy.wait('@detalleReporte')
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"] h2').should('contain.text', 'Detalle del reporte')
  })

  it('flujo completo: abre detalle, escribe comentario y cambia estado a En atención', () => {
    const mockReporte = {
      id: 'rep-00000001',
      titulo: 'Ruido excesivo vecino del 3B',
      descripcion: 'Descripción del reporte.',
      estado_actual: 'En espera',
      created_at: '2025-06-01T14:30:00Z',
      latitud: -33.4,
      longitud: -70.6,
      comuna_id: 1,
      usuario: { nombre: 'Usuario Test' },
      lectura_evidencia: null,
      atendido_por: null,
      historial: [],
      comentarios: [],
    }

    cy.intercept('GET', '**/api/v1/reportes/rep-00000001', { body: mockReporte })
    cy.intercept('PATCH', '**/api/v1/reportes/rep-00000001/estado', {
      statusCode: 200,
      body: { ...mockReporte, estado_actual: 'En atencion' },
    }).as('cambiarEstado')

    cy.visit('/funcionario-home')
    cy.get('table').should('be.visible')
    cy.contains('button', 'Ver detalle').first().click()

    cy.get('[role="dialog"]').within(() => {
      cy.contains('Cambiar estado').should('be.visible')

      // Clic en la transición → aparece el formulario de comentario
      cy.contains('button', /atenci/i).click()

      cy.get('textarea').type('Se inicia gestión del caso con visita programada.')

      // Confirmar → el PATCH se dispara (interceptado) y el modal actualiza
      cy.contains('button', 'Confirmar cambio').click()
    })

    cy.wait('@cambiarEstado').its('response.statusCode').should('eq', 200)
  })

  it('el modal de detalle muestra información del reporte y sección de cambio de estado', () => {
    cy.intercept('GET', '**/api/v1/reportes/rep-00000001', {
      body: {
        id: 'rep-00000001',
        titulo: 'Ruido excesivo vecino del 3B',
        descripcion: 'Descripción del reporte de prueba.',
        estado_actual: 'En espera',
        created_at: '2025-06-01T14:30:00Z',
        latitud: -33.4,
        longitud: -70.6,
        comuna_id: 1,
        usuario: { nombre: 'Usuario Test' },
        lectura_evidencia: null,
        atendido_por: null,
        historial: [],
        comentarios: [],
      },
    })

    cy.visit('/funcionario-home')
    cy.get('table').should('be.visible')
    cy.contains('button', 'Ver detalle').first().click()

    cy.get('[role="dialog"]').within(() => {
      cy.contains('Ruido excesivo vecino del 3B').should('be.visible')
      // La sección de cambio de estado se muestra cuando el estado no es terminal
      cy.contains('Cambiar estado').should('be.visible')
    })
  })
})
