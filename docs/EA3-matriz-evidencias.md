# Matriz de evidencias de pruebas — 40db-frontend

Verificación de la calidad de la solución (Experiencia 3).

Herramientas: Vitest (jsdom) + @vue/test-utils para unitarias e integración,
Cypress para humo y E2E, npm audit para seguridad de dependencias.

Última ejecución: 2026-06-19 · Node 20+ · 6 archivos de prueba, 32 casos.

## Resumen por tipo

| ID | Tipo | Archivo / herramienta | Qué valida | Evidencia | Resultado |
|----|------|-----------------------|------------|-----------|-----------|
| T-01 | Unitaria | `src/__tests__/errors.spec.ts`, `heatmap-features.spec.ts` | Clases de error, guards y normalización GeoJSON→KPIs | `evidencias/test-unit.txt` | PASS |
| T-02 | Humo | `cypress/e2e/home.cy.ts` | La landing pública levanta y responde sin auth | `evidencias/e2e.txt` (correr en local) | Pendiente de captura |
| T-03 | Integración | `src/__tests__/BaseInput.integration.spec.ts`, `toast.integration.spec.ts` | Componente + reactividad + store (v-model, aria, store→UI, auto-cierre) | `evidencias/test-unit.txt` | PASS |
| T-04 | E2E | `cypress/e2e/02_auth…05_admin.cy.ts` | Flujos por rol: auth/guards, vecino, funcionario, admin | `evidencias/e2e.txt` (correr en local) | Pendiente de captura |
| T-05 | Regresión | `src/__tests__/regression.estado-reporte.spec.ts` | BUG-001: estados terminales sin transición + 'Descartado' exige comentario | `evidencias/test-unit.txt` | PASS |
| T-06 | Seguridad | `npm audit --omit=dev` + `src/__tests__/security.input.spec.ts` | Auditoría de dependencias + escape de entradas (XSS) | `evidencias/npm-audit.txt`, `evidencias/test-unit.txt` | PASS con observación |
| T-07 | Carga | — | No aplica al frontend: mide concurrencia del servidor. Se ejecutaría con k6 contra la API. | — | N/A |

## Observación de seguridad (T-06)

`npm audit --omit=dev` reporta una vulnerabilidad de severidad **moderate**:

- `dompurify@3.4.2`, dependencia transitiva de `jspdf@4.2.1` (export a PDF/CSV).
- No hay vulnerabilidades high ni critical.
- Por su severidad moderate y por estar en una ruta no crítica, se documenta en lugar
  de forzar la actualización. Mitigación disponible: `npm audit fix`, verificando que
  no rompa la generación de PDF.

La parte dinámica (`security.input.spec.ts`) confirma que un `<script>` o
`<img onerror>` en título, mensaje o input se renderiza escapado como texto y nunca
como HTML ejecutable. La validación del servidor sigue siendo la defensa final.

## Pruebas de Cypress (T-02 y T-04)

Las suites de humo y E2E ya existen y corren con Cypress. Falta adjuntar su salida:
ejecuta `npm run test:e2e` en tu equipo y guarda el resultado en `evidencias/e2e.txt`.
Requiere el binario de Cypress para tu arquitectura (`npx cypress install` si hiciera falta).

## Regenerar evidencias

```bash
cd 40db-frontend

npm run test:unit:run > evidencias/test-unit.txt 2>&1   # unitarias, integración, regresión, seguridad dinámica
npm run audit > evidencias/npm-audit.txt 2>&1           # seguridad de dependencias
npm run test:e2e > evidencias/e2e.txt 2>&1             # humo + E2E (build de preview + Cypress)
```
