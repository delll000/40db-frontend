# Mapeo de contrato — frontend ↔ backend

Este documento es la **tabla de equivalencias** entre lo que vive hoy en `src/` y lo que el backend ratificó en `../../../40db-backend/docs/`. Cada sección lista: qué hay en el front, qué hay en el back, cómo se reconcilian y qué se deprecia.

> Base URL del backend (Render): `https://four0db-backend.onrender.com`
> Prefijo de negocio: `/api/v1`
> Health checks: `/health/live`, `/health/ready` (sin prefijo)

---

## 1. Autenticación

| Aspecto | Frontend actual | Backend | Reconciliación |
|---|---|---|---|
| Provider | Botón "Continuar con Google" + selector de rol mock (`LoginView.vue`) | Supabase Auth nativo, email + password (`auth.md §1 A2`). Google OAuth **deprecado** (`auth.md §12`). | **Eliminar** botón Google. Implementar formulario email/password con tabs *Iniciar sesión* / *Crear cuenta*, usando `@supabase/supabase-js` con `anon_key`. |
| Sesión | `localStorage` clave `40db.session.v1` con `{ user, role }` ad-hoc | Sesión administrada por Supabase JS SDK (refresh automático del JWT). | Reescribir `stores/auth.ts`: la fuente de verdad es `supabase.auth.getSession()`. En `restore()` se llama `onAuthStateChange` para reaccionar a refresh/expiración. |
| JWT al backend | No se envía (no hay cliente HTTP). | `Authorization: Bearer <jwt>` (`api.md §2`). Verificado local en FastAPI (JWKS o HS256, `auth.md §5`). | El cliente HTTP del front (rama #2) lee la sesión vigente de Supabase y agrega el header en cada request a `/api/v1/*`. |
| Rol | Selector manual de `admin` / `vecino` / `funcionario` | `usuario.tipo ∈ {ciudadano, municipalidad}` (`auth.md §2`). Sin `admin`. | Tras login exitoso, llamar `GET /api/v1/usuarios/me`. Mapear `tipo='ciudadano' → 'vecino'`, `tipo='municipalidad' → 'funcionario'`. `admin` queda como UI-only (ver F1 en `README.md`). |
| Onboarding | No existe | `comuna_id` es NULL hasta que el usuario hace `PATCH /api/v1/usuarios/me` con `telefono`, `comuna_id` (`auth.md §7`). | Crear vista `OnboardingView.vue` a la que el router redirige cuando `usuarios/me` devuelve `comuna_id: null`. |
| Logout | Limpia `localStorage` | Supabase: `supabase.auth.signOut()`. | Llamar `signOut()`, limpiar pinia, redirigir a `/auth`. |

**Archivos del front afectados:** `src/stores/auth.ts`, `src/types/auth.ts`, `src/views/auth/LoginView.vue`, `src/router/index.ts`, `src/main.ts` (restore inicial).

**Archivos nuevos:** `src/services/supabase.ts` (cliente JS), `src/views/auth/OnboardingView.vue`.

---

## 2. Roles y rutas

| Front (UI) | Back (`usuario.tipo`) | Rutas que aplica |
|---|---|---|
| `vecino` | `ciudadano` | `/vecino-home` |
| `funcionario` | `municipalidad` | `/funcionario-home` |
| `admin` | **— sin contrato —** | `/admin-dashboard/*`, `/heatmap` (acceso interno) |

**Implementación.**
- `HOME_BY_ROLE` se mantiene como mapa visual.
- El guard del router consulta el `usuario.tipo` del store (no el selector). Para `admin`, el guard valida un flag local (`isInternalAdmin`) que **no proviene del back** y por defecto está en `false`. Para desarrollo / demo, se puede toggle via env (`VITE_ENABLE_ADMIN_DEMO=true`).
- Si el back agrega `tipo='admin'` o un endpoint de promoción, se reemplaza el flag local por la consulta al back. Está documentado en `02-endpoints-faltantes-back.md`.

---

## 3. Reporte (entidad central)

### 3.1 Modelo

| Campo | Front actual (`types/report.ts`) | Back (`api.md §4.5/§4.8`, `bbdd.md §3.6`) | Acción |
|---|---|---|---|
| `id` | `string` (`r-${Date.now()}`) | `uuid` | Renombrar tipo a `string` UUID, aceptar lo que llegue. |
| `citizenName` / `citizenEmail` | Campos sueltos en el modelo | `usuario.nombre` se incluye en `GET /reportes/{id}` bajo `usuario.{id, nombre}` | Eliminar del modelo plano del front. Reemplazar por anidado `usuario: { id, nombre }`. |
| `category` | `string` (`fiesta`, `comercio`, `vecinos`, ...) | **No existe** | **Quitar** del modelo y del body POST. Documentar como `02-endpoints-faltantes-back.md §4`. |
| `description` | `string` | `descripcion` (10–2000 chars) | Renombrar a `descripcion`. Validación min 10 chars. |
| `zone` | `string` | **No existe** | **Quitar**. Se deriva de `comuna_id`. Pedir como mejora en `02-endpoints-faltantes-back.md §4`. |
| `address` | `string` | **No existe** | **Quitar** del payload. Si se requiere mostrar en UI, hacer reverse-geocode client-side (Nominatim) — solo display. |
| `createdAt` | ISO string | `created_at` | Renombrar. Sigue ISO. |
| — | — | `titulo` (3–120) | **Agregar** al form del vecino. Obligatorio. |
| — | — | `latitud`, `longitud` | **Agregar**. Captura por map picker (decisión F4). |
| — | — | `lectura_evidencia_id?: int` | **Agregar**. Lo setea el botón "Adjuntar evidencia" tras `GET /reportes/buscar-evidencia` (decisión F5). |
| — | — | `estado_actual: string` | Nombre del estado actual (`En espera`, etc.). Reemplaza el concepto de `Alert.status`. |
| — | — | `comuna_id` | Sale del server (derivado de lat/lng). No se manda en el body. |
| — | — | `lectura_evidencia: { lectura_id, sensor_id, sensor_nombre, nivel_db, timestamp_medicion } \| null` | Anidado en `GET /reportes/{id}`. Usar para badge "Validado con sensor X" en la UI. |
| — | — | `historial: [{ estado, comentario, created_at, usuario }]` | Reemplaza `AlertHistoryEntry`. |
| — | — | `atendido_por: { id, nombre } \| null` | Solo en detalle. |

### 3.2 Endpoints relacionados

| Operación | Front actual | Back |
|---|---|---|
| Listar mis reportes | `reportsService.byCitizen(email)` | `GET /api/v1/reportes/mios?limit=20&cursor=` (paginado cursor, `api.md §4.6`) |
| Listar reportes de la comuna (funcionario) | `alertsService.list()` (sin filtrar) | `GET /api/v1/reportes/comuna/{comuna_id}?limit=&cursor=&estado=` (`api.md §4.7`) |
| Detalle | — | `GET /api/v1/reportes/{id}` (`api.md §4.8`) |
| Crear | `reportsService.create(input)` | `POST /api/v1/reportes` (`api.md §4.5`) |
| Buscar evidencia previa | — | `GET /api/v1/reportes/buscar-evidencia?lat=&lng=` (`api.md §4.4`) |
| Cambiar estado | `alertsService.changeStatus(...)` | `PATCH /api/v1/reportes/{id}/estado` con body `{ nuevo_estado, comentario }` (`api.md §4.9`) |
| Historial | `alertsService.historyFor(id)` | Viene anidado en `GET /reportes/{id}.historial` |

### 3.3 Máquina de estados

Front actual (`types/alert.ts`):

```
activa → atendida → cerrada
```

Back (`bbdd.md §7` referenciado desde `api.md §4.9`):

```
En espera → En atencion → Atendido
           ↘            ↘
              Descartado (terminal, requiere comentario)
```

**Acción:** reescribir `ALERT_NEXT_STATUS` como `REPORTE_NEXT_ESTADO` con los nombres del back. El front muestra labels localizados (los que están en español del back ya sirven). `Descartado` exige comentario no vacío — el modal lo valida del lado cliente, pero la verdad la dicta el back (422).

### 3.4 Side effect: `atendido_por_id`

`api.md §4.9` aclara: si la transición es `En espera → En atencion`, el back setea `reporte.atendido_por_id = auth.uid` en el mismo update. **El front no debe enviarlo** — basta con el PATCH del estado.

---

## 4. Alert — DEPRECADO

`src/types/alert.ts`, `src/services/alerts.service.ts`, `src/services/_mockData/alerts.ts`: **borrar en la rama `feat/reportes-real`**.

Toda referencia en componentes (`FuncionarioHomeView.vue`, `kpisService.alertsBreakdown`) se reescribe contra Reporte. El "breakdown" de alertas pasa a ser un conteo client-side sobre los reportes traídos por `GET /reportes/comuna/{id}` filtrado por `estado=`.

---

## 5. Sensor / Device

| Concepto front | Back | Estado |
|---|---|---|
| `Sensor` (zone, battery, signal, status, lastReportAt) | `sensor` (id, comuna_id, nombre, latitud, longitud, activo) — `bbdd.md §3.4` | **No hay endpoint público de listado de sensores.** El back solo expone sensores indirectamente vía `GET /heatmaps` (lo que importa son las **lecturas agregadas**, no el catálogo) y vía `GET /reportes/buscar-evidencia` (un sensor a la vez). |
| `SensorStatusSummary` (online/intermitente/offline) | Estado de salud derivado de `lectura.timestamp_medicion` reciente | **No hay endpoint.** Roadmap del back. |
| `Device` (CRUD, técnico → activo / decommissioned) | Inserción manual en tabla `sensor` (SQL editor) | **No hay endpoint.** Roadmap del back. |
| `sensorsService.zones()` | No existe el concepto "zona", solo `comuna_id` | Reemplazar UI por comunas. |

**Acción inmediata (rama `chore/limpieza-mocks-sin-back`):**
- Marcar las vistas `/admin-dashboard/hardware`, `/admin-dashboard/usuarios`, `/admin-dashboard/reportes`, `/admin-dashboard/historial` con un banner `<BasePendingBanner>` indicando "MVP del backend no provee este endpoint; datos mock por ahora".
- Mantener `services/sensors.service.ts` con mocks pero **no exponer** desde rutas autenticadas reales hasta que el back exponga `GET /api/v1/sensores` (ver `02-endpoints-faltantes-back.md`).

---

## 6. Heatmap

| Aspecto | Front | Back (`api.md §4.3`) |
|---|---|---|
| Endpoint | `heatmapService.points(filters)` (mock) | `GET /api/v1/heatmaps?bbox&time_start&time_end&bucket_minutes` |
| Auth | — | Público (sin Bearer) |
| Filtros del front | `dateFrom`, `dateTo`, `hourFrom`, `hourTo`, `zone`, `sensorId` | `bbox` (CSV `minLng,minLat,maxLng,maxLat`), `time_start`, `time_end` ISO 8601, `bucket_minutes ∈ {1,5,15,60}` |
| Response | `HeatmapPoint[]` con `{ lat, lng, intensity, db, zone }` | `FeatureCollection` con `features: [{ geometry: Point, properties: { nivel_db_avg, nivel_db_max, lectura_count, bucket_start } }]` |
| Polling | 60 s en `useHeatmapData.ts` | Backend no empuja; on-demand. Polling sigue válido (`backend.md` ADR 05). |

**Acción (rama `feat/heatmap-real`):**

1. Reescribir `types/filters.ts` como `HeatmapQuery { bbox: [number,number,number,number]; timeStart: string; timeEnd: string; bucketMinutes: 1|5|15|60 }`.
2. `bbox` se deriva del `map.getBounds()` de Leaflet. Recalcular en `moveend`.
3. `HeatmapPoint` se mantiene como tipo del front, pero se **construye** desde cada `Feature`: `lat = coordinates[1]`, `lng = coordinates[0]`, `db = properties.nivel_db_avg`, `intensity = normalize(db, [40,90])`.
4. KPIs (`avgDb`, `zonesOverStandard`, `noisiestZone`) se derivan client-side recorriendo `features[]`. `alertSustained` queda en `null` hasta que el back lo provea (ver `02-endpoints-faltantes-back.md`).
5. Quitar `hourFrom`/`hourTo`/`zone`/`sensorId` de la UI de filtros. Reemplazar por un selector de **rango temporal** (último día / última semana, etc.) que se traduce a `time_start`/`time_end`, y un selector de `bucket_minutes`.

---

## 7. Catálogos públicos

| Catálogo | Back | Front |
|---|---|---|
| Comunas | `GET /api/v1/comunas` → `[{ id, nombre, region, codigo }]` (`api.md §4.12`) | Crear `services/comunas.service.ts`. Usar en onboarding (select de comuna) y para deducir nombre legible de `comuna_id` en perfiles/reportes. |
| Tipos de estado | `GET /api/v1/tipos-estado` → `[{ id, nombre, descripcion, orden }]` (`api.md §4.13`) | Crear `services/tiposEstado.service.ts`. Reemplaza el array hardcodeado `ALERT_STATUS_LABELS` y la lista de "filtrar por estado" del funcionario. |

Ambos son **públicos**, sin auth. Pueden cargarse al boot de la app (en `main.ts` o un store dedicado) y cachearse en memoria.

---

## 8. Errores

El front actual maneja errores ad-hoc (`e instanceof Error ? e.message : '...'`). El back devuelve un shape uniforme (`errores.md §4`):

```json
{
  "error": {
    "code": "reporte_not_found",
    "message": "El reporte solicitado no existe o fue eliminado.",
    "details": null,
    "correlation_id": "01HF8K..."
  }
}
```

**Acción (rama `feat/http-client-and-env`):**

1. Crear `src/types/api.ts` con `ApiError { code, message, details?, correlationId }`.
2. El cliente HTTP del front detecta `response.ok === false`, parsea `error.error`, lanza una `ApiHttpError` (Error nativa enriquecida).
3. El toast/UI muestra `error.message` y guarda `correlation_id` en un atributo `data-correlation-id` por si el usuario reporta el bug.
4. Códigos a tratar de forma especial:
   - `401 invalid_token` / `unauthorized` → cerrar sesión local + redirigir a `/auth`.
   - `403 comuna_mismatch` → mensaje específico "Este reporte pertenece a otra comuna".
   - `409 invalid_state_transition` → mostrar mensaje y refrescar el reporte (otro funcionario pudo cambiar el estado primero).
   - `503 external_service_error` → toast "Servicio temporalmente no disponible".

---

## 9. Resumen de deprecaciones del front

Para hacer un grep rápido cuando empecemos a borrar:

| Lo que se elimina | Razón |
|---|---|
| Botón "Continuar con Google" + flujo OAuth en `LoginView.vue` | Google OAuth deprecado (`auth.md §12`). |
| Selector de rol mock en `LoginView.vue` | El rol viene de `usuarios/me`. |
| `src/types/alert.ts` (entero) | Unificado en Reporte (decisión F6). |
| `src/services/alerts.service.ts` (entero) | Idem. |
| `src/services/_mockData/alerts.ts` | Idem. |
| `Report.citizenName`, `Report.citizenEmail`, `Report.category`, `Report.zone`, `Report.address` | No existen en el back (decisión F7). |
| `HeatmapFilters.zone`, `HeatmapFilters.sensorId`, `HeatmapFilters.hourFrom/To` | El back no filtra por esos campos. |
| `sensorsService.zones()` (concepto "zona") | No existe en el back; se sustituye por `comuna`. |
| `auth.ts buildMockUser`, `auth.ts login(role)` con selector | Reemplazado por Supabase signIn. |
| Acceso real a `/admin-dashboard/hardware|usuarios|reportes|historial` | Marcadas como pendientes hasta que el back exponga endpoints (ver `02-endpoints-faltantes-back.md`). |

Lo que **se conserva como mock** hasta que haya endpoints (decisión F1):

- `services/devices.service.ts`
- `services/sensors.service.ts` (`statusSummary`, `list`)
- `services/kpis.service.ts` `adminSummary`
- Toda la sub-app `/admin-dashboard/*`

Estos mocks **no se mezclan** con datos reales: viven en vistas independientes y muestran banner de "datos demo".
