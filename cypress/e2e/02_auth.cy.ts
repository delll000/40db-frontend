/**
 * Spec 02 — Guardas de ruta y formulario de autenticación
 *
 * Tipo de prueba: E2E / Funcional
 * Pregunta: ¿Las rutas protegidas redirigen correctamente y el formulario
 * de login es accesible para el usuario?
 *
 * No requiere sesión activa (salvo el test de guarda por rol).
 */
describe('Guardas de ruta y autenticación', () => {
  // ── Tests sin sesión ──────────────────────────────────────────────────────

  it('ruta protegida /vecino-home redirige a /auth sin sesión', () => {
    cy.visit('/vecino-home')
    cy.location('pathname').should('eq', '/auth')
  })

  it('ruta de admin /admin-dashboard redirige a /auth sin sesión', () => {
    cy.visit('/admin-dashboard')
    cy.location('pathname').should('eq', '/auth')
  })

  it('ruta de funcionario /funcionario-home redirige a /auth sin sesión', () => {
    cy.visit('/funcionario-home')
    cy.location('pathname').should('eq', '/auth')
  })

  it('página /auth muestra los dos tabs del formulario', () => {
    cy.visit('/auth')
    cy.contains('[role="tab"]', 'Iniciar sesión').should('be.visible')
    cy.contains('[role="tab"]', 'Crear cuenta').should('be.visible')
  })

  it('formulario de login tiene los campos de correo y contraseña', () => {
    cy.visit('/auth')
    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('tab Crear cuenta muestra campo adicional de nombre', () => {
    cy.visit('/auth')
    cy.contains('[role="tab"]', 'Crear cuenta').click()
    cy.get('input[placeholder*="nombre"]').should('be.visible')
  })

  it('usuario escribe sus credenciales en el formulario de login', () => {
    cy.visit('/auth')
    cy.get('input[type="email"]').type('usuario@demo40db.cl')
    cy.get('input[type="password"]').type('MiContraseña123!')
    cy.get('input[type="email"]').should('have.value', 'usuario@demo40db.cl')
    cy.get('button[type="submit"]').should('be.visible').and('contain.text', 'Iniciar sesión')
  })

  it('al cambiar a "Crear cuenta" se muestran tres campos y el botón cambia de texto', () => {
    cy.visit('/auth')
    cy.contains('[role="tab"]', 'Crear cuenta').click()
    cy.get('input[placeholder*="nombre"]').type('Juan Pérez')
    cy.get('input[type="email"]').type('juan@demo40db.cl')
    cy.get('input[type="password"]').type('NuevaContraseña123!')
    cy.get('button[type="submit"]').should('contain.text', 'Crear cuenta')
  })

  // ── Test con sesión: guarda por rol ───────────────────────────────────────

  it('vecino autenticado que visita /admin-dashboard es redirigido a /vecino-home', () => {
    cy.mockBackend()
    cy.loginAs('vecino')
    cy.visit('/admin-dashboard')
    cy.location('pathname').should('eq', '/vecino-home')
  })
})
