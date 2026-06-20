/**
 * Spec 05 — Flujo E2E completo del Administrador
 *
 * Tipo de prueba: E2E / Funcional
 * Pregunta: ¿El administrador puede ver el panel de control, los KPIs de
 * sensores y navegar a las secciones de gestión de punta a punta?
 *
 * Backend: completamente mockeado con cy.mockBackend().
 * Auth: sesión falsa inyectada con cy.loginAs('admin').
 */
describe('Flujo E2E: Administrador', () => {
  // HardwareMap (Leaflet) lanza uncaught exceptions al inicializar el mapa en el entorno de pruebas.
  // Se suprimen para que los tests de navegación no fallen por errores internos de la librería.
  Cypress.on('uncaught:exception', () => false)

  beforeEach(() => {
    cy.mockBackend()
    cy.loginAs('admin')
  })

  it('admin autenticado accede a /admin-dashboard y ve saludo personalizado', () => {
    cy.visit('/admin-dashboard')
    cy.get('h1').should('contain.text', 'Hola')
    cy.get('h1').should('contain.text', 'Admin Prueba')
  })

  it('dashboard muestra los KPIs de salud de sensores', () => {
    cy.visit('/admin-dashboard')
    // KPI cards con labels del fixture sensores_resumen.json
    cy.contains('Sensores totales').should('be.visible')
    cy.contains('En línea').should('be.visible')
    cy.contains('Intermitentes').should('be.visible')
    cy.contains('Fuera de línea').should('be.visible')
  })

  it('dashboard muestra la sección de accesos rápidos con los 5 módulos', () => {
    cy.visit('/admin-dashboard')
    cy.contains('Accesos rápidos').should('be.visible')
    cy.contains('Hardware IoT').should('be.visible')
    cy.contains('Usuarios').should('be.visible')
    cy.contains('Mapa de ruido').should('be.visible')
    cy.contains('Reportes').should('be.visible')
    cy.contains('Historial conectividad').should('be.visible')
  })

  it('tabla de sensores muestra los datos del mock', () => {
    cy.visit('/admin-dashboard')
    // La sección "Estado de sensores" está al final del dashboard, dentro de un
    // contenedor con overflow; hay que llevarla al viewport antes de aseverar visibilidad.
    cy.contains('Estado de sensores').scrollIntoView().should('be.visible')
    cy.contains('Sensor Norte Las Condes').scrollIntoView().should('be.visible')
    cy.contains('Sensor Sur Las Condes').scrollIntoView().should('be.visible')
  })

  it('navegación a sección Hardware muestra la vista de gestión de sensores', () => {
    cy.visit('/admin-dashboard')
    // Hacer clic en el shortcut "Hardware IoT"
    cy.contains('Hardware IoT').click()
    cy.location('pathname').should('eq', '/admin-dashboard/hardware')
  })

  it('navegación directa a /admin-dashboard/usuarios carga la vista', () => {
    // Interceptar endpoint de usuarios para la vista de admin
    cy.intercept('GET', '**/api/v1/usuarios*', {
      body: { data: [], next_cursor: null },
    }).as('usuarios')

    cy.visit('/admin-dashboard/usuarios')
    cy.location('pathname').should('eq', '/admin-dashboard/usuarios')
    cy.get('h1').should('be.visible')
  })

  it('el sidebar de admin contiene los enlaces de navegación principales', () => {
    cy.visit('/admin-dashboard')
    // El AdminLayout tiene un sidebar con links de navegación
    cy.contains('a', 'Hardware').should('be.visible')
    cy.contains('a', 'Usuarios').should('be.visible')
  })
})
