// Smoke mínimo: la landing pública debe levantar sin auth ni back operativo.
// Para un E2E más profundo (signup → reporte → cambio de estado) ver el plan
// post-migración punto #5 — requiere backend y Supabase reales.

describe('Landing pública', () => {
  it('carga / y renderiza el hero de la home', () => {
    cy.visit('/')
    // El router redirige `/` → `/home`
    cy.location('pathname').should('eq', '/home')
    cy.get('h1').should('contain.text', 'Reporta')
  })

  it('expone el CTA de iniciar sesión', () => {
    cy.visit('/home')
    cy.contains('a, button', /iniciar sesi[óo]n/i).should('be.visible')
  })
})
