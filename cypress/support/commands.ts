// Comandos personalizados para tests E2E — 40db-frontend
// Estrategia: sesión falsa via localStorage + backend API mockeado con cy.intercept().
// No se necesita un backend real ni credenciales de Supabase para que los tests corran.

type Role = 'vecino' | 'funcionario' | 'admin'

// Sesión Supabase falsa: expires_at en año 2286, nunca expira ni pide refresh.
const FAKE_SESSION = {
  access_token: 'fake-access-token-cypress-test',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 9999999999,
  refresh_token: 'fake-refresh-token-cypress-test',
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@40db.cl',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    last_sign_in_at: '2024-01-01T00:00:00.000Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
}

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Autentica como el rol indicado inyectando una sesión falsa en localStorage
       * y mockeando GET /api/v1/usuarios/me con el fixture correspondiente.
       * Usa cy.session() para cachear la sesión entre tests del mismo spec.
       */
      loginAs(role: Role): Chainable<void>
      /**
       * Registra cy.intercept() para todos los endpoints del backend que usan
       * las vistas principales. Llamar antes de cy.visit() en cada test.
       */
      mockBackend(): Chainable<void>
    }
  }
}

Cypress.Commands.add('loginAs', (role: Role) => {
  const storageKey = Cypress.env('SUPABASE_STORAGE_KEY') as string

  // Intercept activo para ESTE test (cuando cy.visit() arranca la app).
  cy.intercept('GET', '**/api/v1/usuarios/me', { fixture: `perfil_${role}.json` }).as('perfil')

  cy.session(
    role,
    () => {
      // Intercept también durante el setup inicial de la sesión.
      cy.intercept('GET', '**/api/v1/usuarios/me', { fixture: `perfil_${role}.json` })
      cy.intercept('GET', '**/api/v1/comunas*', { fixture: 'comunas.json' })

      // Inyectar sesión falsa ANTES de que el app js arranque (onBeforeLoad).
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem(storageKey, JSON.stringify(FAKE_SESSION))
        },
      })

      // La app lee la sesión, llama /me (interceptado) y navega a /home (página pública).
      cy.location('pathname').should('eq', '/home')
    },
  )
})

Cypress.Commands.add('mockBackend', () => {
  // Registrar del menos específico al más específico (último registrado = prioridad en Cypress).
  cy.intercept('GET', '**/api/v1/heatmaps*', { fixture: 'heatmap.json' }).as('heatmap')
  cy.intercept('GET', '**/api/v1/comunas*', { fixture: 'comunas.json' }).as('comunas')
  cy.intercept('GET', '**/api/v1/reportes/mios*', { fixture: 'reportes.json' }).as('misReportes')
  cy.intercept('GET', '**/api/v1/reportes/comuna/**', { fixture: 'reportes.json' }).as('reportesComuna')
  cy.intercept('GET', '**/api/v1/reportes/buscar-evidencia*', {
    body: { evidencia: null },
  }).as('evidencia')
  // Sensores: registrar lista primero, resumen después (más específico → gana).
  cy.intercept('GET', '**/api/v1/sensores*', { fixture: 'sensores.json' }).as('sensores')
  cy.intercept('GET', '**/api/v1/sensores/resumen*', {
    fixture: 'sensores_resumen.json',
  }).as('resumen')
})
