# Integración con `40db-backend`

Documentación operativa de la conexión del frontend (`40db-frontend`) con el backend (`40db-backend`). El contrato autoritativo del backend vive en `../../../40db-backend/docs/` (ver `CLAUDE.md` en la raíz de este repo). Este folder no lo duplica: lo **adapta** al front.

## Para qué existe este folder

El frontend nació con **todo el data layer mockeado** (`src/services/*.service.ts`) y un `auth.ts` que simula login con un selector de rol. Cuando se ratificó el contrato del back, surgieron desalineaciones de fondo (roles, modelo de datos, autenticación) que no se resuelven con un find/replace. Este folder documenta:

1. **Qué desalineaciones existen** y cómo se resuelven (`01-mapeo-contrato.md`).
2. **Qué le falta al back** para que el front pueda dejar atrás todos los mocks (`02-endpoints-faltantes-back.md`).
3. **En qué orden se va a migrar** (`03-plan-migracion.md`).

## Documentos

| # | Doc | Para qué |
|---|---|---|
| 1 | [`01-mapeo-contrato.md`](./01-mapeo-contrato.md) | Tabla concepto-por-concepto: qué hay en el front vs qué hay en el back, y cómo se reconcilian. Incluye qué se deprecia del front. |
| 2 | [`02-endpoints-faltantes-back.md`](./02-endpoints-faltantes-back.md) | Lista priorizada de endpoints que el front necesita y el back todavía no ofrece. Este es el documento que se le pasa al equipo de backend. |
| 3 | [`03-plan-migracion.md`](./03-plan-migracion.md) | Plan de ramas/commits iterativos para ir adaptando el front sin romper la demo intermedia. |

## Decisiones tomadas (sesión 2026-05-20)

Estas decisiones aplican a toda la migración. Si cambian, **actualizar este doc primero** y después el código.

| # | Tema | Decisión | Motivo |
|---|---|---|---|
| F1 | **Rol `admin`** | Se mantiene en el front como UI-only con datos mock y banner *"funcionalidad pendiente en backend"*. Las vistas `/admin-dashboard/*` siguen renderizando, pero **no consumen back** hasta que existan los endpoints. | El back no expone hoy panel admin / hardware / usuarios. Se anota en `02-endpoints-faltantes-back.md` para implementación próxima en el back. |
| F2 | **Auth** | Supabase Auth nativo (email + password) vía `@supabase/supabase-js` con `anon_key`. El JWT que devuelve la sesión se manda al backend en `Authorization: Bearer <token>`. **Se elimina** el botón "Continuar con Google" del `LoginView.vue`. | `auth.md §1 A2` declara Google OAuth como roadmap (no MVP); §12 lo deprecó explícitamente. Anon key + JWT verificado en backend vía JWKS o HS256. |
| F3 | **Roles** | El front mapea **`ciudadano` → vecino** y **`municipalidad` → funcionario**. El rol se deriva de `GET /api/v1/usuarios/me` (`tipo`). `admin` no proviene del back (ver F1). | `auth.md §6` define solo dos `tipo` en `public.usuario`. No hay endpoint de promoción. |
| F4 | **Ubicación del reporte** | Map picker (clic sobre Leaflet, ya instalado) para fijar `latitud` / `longitud`. Reverse-geocode opcional para mostrar dirección legible al usuario, pero **solo display**: lo que viaja al back es lat/lng. | `api.md §4.5` pide `latitud` y `longitud` como floats. No hay campo `direccion`/`zona`. |
| F5 | **Evidencia IoT** | El form del vecino expone el botón **"Comprobar si hay micrófonos de evidencia cercanos"** que llama `GET /api/v1/reportes/buscar-evidencia?lat=&lng=`. Si hay match, ofrece "Adjuntar al reporte". Al hacer submit, el front **vuelve a llamar** ese GET con lat/lng/now para revalidar antes del `POST /reportes`. | Anti-forgery + staleness explícitos: `backend.md §5.1` paso 3 documenta el ciclo (preview → submit con re-validación). Aunque el back también revalida server-side, hacerlo en el front mejora UX (mensajes claros si la evidencia salió de la ventana). |
| F6 | **`Alert` → `Reporte`** | Se elimina la entidad `Alert` y todo su layer (`types/alert.ts`, `services/alerts.service.ts`, mocks). La vista del funcionario pasa a consumir `GET /api/v1/reportes/comuna/{id}` y el modal de cambio de estado a `PATCH /api/v1/reportes/{id}/estado`. Estados del back: `En espera` / `En atencion` / `Atendido` / `Descartado`. | `bbdd.md §3.6/§3.7` y `api.md §4.7/§4.9`. Mantener dos modelos paralelos (Alert y Reporte) duplica lógica de transición y dispara bugs de sync. |
| F7 | **`category` / `zone` del reporte** | Quedan **fuera** del body que viaja al back. Si la categorización vuelve a ser requirement, el front la pide como endpoint adicional en `02-endpoints-faltantes-back.md`. | El back hoy guarda solo `titulo` + `descripcion` + lat/lng + `comuna_id` (derivado de lat/lng en server). Forzarlos en el body causa 422 Pydantic. |
| F8 | **Heatmap** | Se reescribe el consumo a `GET /api/v1/heatmaps?bbox&time_start&time_end&bucket_minutes` que devuelve **GeoJSON `FeatureCollection`**. Los KPIs (`avgDb`, `zonesOverStandard`, `noisiestZone`) se derivan client-side sobre los features. `alertSustained` queda como roadmap del back (ver `02-endpoints-faltantes-back.md`). | `api.md §4.3`. El back es agregado on-demand, no entrega lista de puntos. Sin WebSockets en MVP — polling 60 s del cliente sigue siendo válido. |

## Convenciones de este folder

- **Idioma**: español (consistente con el repo del back).
- **Identificadores**: respetan los del back (`reporte`, `usuario`, `comuna`, `lectura_evidencia_id`, etc.). El front mantiene su prefijo legible (`vecino`, `funcionario`) **solo en UI/routing**, no en payloads.
- **Cuando una decisión del front contradiga el contrato del back**, gana el back. Comentar el conflicto en el `.md` correspondiente, no en código.
