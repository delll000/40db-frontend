# 40db-frontend

Frontend Vue 3 + Vite + TypeScript del proyecto **40dB — Plataforma de Inteligencia Acústica Municipal**. Consume el backend FastAPI del repo hermano `40db-backend` y maneja auth con Supabase.

## Stack

- Vue 3 (Composition API) + Vite + TypeScript.
- Pinia para estado, vue-router para navegación.
- Leaflet + `leaflet.heat` para mapas / heatmap.
- `@supabase/supabase-js` para signup/login/refresh del JWT.
- `jspdf` + `html2canvas` para exportes client-side.

## Setup

```sh
cp .env.example .env.local   # completar valores reales (Render + Supabase)
npm install
npm run dev
```

Variables obligatorias (ver `.env.example` y `docs/integracion-backend/01-mapeo-contrato.md`):

- `VITE_API_BASE_URL` — backend FastAPI (Render).
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — Supabase Auth.
- `VITE_ENABLE_ADMIN_DEMO=true|false` — gatea `/admin-dashboard/*` y `/heatmap` standalone (UI-only sin contrato de back).

## Documentación

| Carpeta | Contenido |
|---|---|
| [`docs/integracion-backend/`](./docs/integracion-backend/) | **Empieza acá.** Mapeo del frontend al contrato del backend, endpoints faltantes y plan de migración por ramas. |
| [`docs/specs/`](./docs/specs/) | Specs funcionales originales (HU) — varias con banner de estado tras la integración. |
| [`docs/flujo-usuario/`](./docs/flujo-usuario/) | Diagramas `.drawio.png` + [`TODO.md`](./docs/flujo-usuario/TODO.md) con lo que falta regenerar. |
| [`CLAUDE.md`](./CLAUDE.md) | Guía para Claude Code sobre dónde consultar la doc del backend. |

El contrato del back vive en `../40db-backend/docs/`.

## Comandos útiles

```sh
npm run dev          # dev server con HMR
npm run build        # type-check + build de producción
npm run type-check   # vue-tsc, sin emitir
npm run lint         # oxlint + eslint
npm run test:unit    # vitest
npm run test:e2e:dev # cypress contra `vite dev`
```

## Setup recomendado

- **IDE:** VS Code + [Vue (Official / Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (sin Vetur).
- **Navegador:** Vue.js devtools — [Chrome](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) o [Firefox](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/).
- **Config Vite:** ver [referencia oficial](https://vite.dev/config/).
