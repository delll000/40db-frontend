# Plan de migración — frontend → backend real

Plan de **ramas y commits incrementales** para ir adaptando el `40db-frontend` al contrato del backend sin romper la demo intermedia. Cada rama se mergea a `main` (o queda como PR para review) antes de empezar la siguiente.

> **Base actual:** rama `feat/connecting-with-backend` (esta), donde viven solo los docs de `docs/integracion-backend/`. Las ramas siguientes salen de **`main`** después de que esta se mergee.

---

## Principios

1. **Una rama = un concepto.** No mezclar refactors de auth con cambios de reportes.
2. **La app debe levantar y compilar al final de cada rama.** Aunque el feature no esté completo, los mocks viejos siguen funcionando hasta que su rama los reemplace.
3. **No tocar `/admin-dashboard/*` salvo para marcarlo como demo.** Hasta que el back habilite `§6` de `02-endpoints-faltantes-back.md`, la sub-app vive con mocks.
4. **Cada rama actualiza los docs relevantes en el mismo commit.** Si una decisión cambia, primero `01-mapeo-contrato.md`, después el código.
5. **Tipos del back primero, código después.** Antes de tocar un servicio, definir el tipo en `src/types/api.ts` o `src/types/<dominio>.ts`. Sin `any` colado.

---

## Ramas

### Rama 0 — `docs/integracion-backend` (ESTA RAMA)

**Objetivo:** dejar los 4 documentos de `docs/integracion-backend/` mergeados a `main`.

**Diff:**
- `+ docs/integracion-backend/README.md`
- `+ docs/integracion-backend/01-mapeo-contrato.md`
- `+ docs/integracion-backend/02-endpoints-faltantes-back.md`
- `+ docs/integracion-backend/03-plan-migracion.md`

**Done when:**
- Los 4 archivos existen y `README.md` los lista en su tabla.
- Decisiones F1–F8 documentadas en `README.md`.
- `02-endpoints-faltantes-back.md` cubre admin/sensores/usuarios/alert-sustained/admin role.

---

### Rama 1 — `feat/http-client-and-env`

**Objetivo:** crear la base HTTP del front (sin autenticación todavía) y tipar el contrato del back. Cero cambios funcionales: solo nueva infraestructura.

**Diff principal:**
- `+ .env.example` con `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `+ src/env.d.ts` extendido con tipos de `ImportMetaEnv`.
- `+ src/services/http.ts` — wrapper fetch con base URL, JSON, `X-Correlation-Id` opcional, parser de error uniforme (lanza `ApiHttpError`).
- `+ src/types/api.ts` — `ApiError`, `Cursor<T>`, `Comuna`, `TipoEstado`, `UsuarioMe`, `Reporte`, `ReporteListItem`, `ReporteHistorial`, `HeatmapFeatureCollection`, etc.
- `+ src/services/errors.ts` — `ApiHttpError extends Error`, helpers `isApiError(code)`.
- `+ src/composables/useApiError.ts` — convierte `ApiHttpError` en toast con `code` y `correlation_id`.

**No incluye:** cliente Supabase, llamadas reales (los servicios siguen siendo mock).

**Done when:**
- `pnpm/npm run type-check` pasa.
- Una llamada de prueba en una vista a `http.get('/api/v1/comunas')` devuelve la lista o lanza `ApiHttpError` con shape uniforme.

**Spec autoritativa:** `01-mapeo-contrato.md §8` (errores), `api.md §2` (headers, status codes).

---

### Rama 2 — `feat/supabase-auth`

**Objetivo:** reemplazar el mock de auth con Supabase real (email + password). Login + signup + logout + restore de sesión + dependency del JWT en `http.ts`.

**Dependencias:** rama 1 (necesita el cliente HTTP para `GET /usuarios/me`).

**Diff principal:**
- `package.json` + `@supabase/supabase-js`.
- `+ src/services/supabase.ts` — `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` singleton.
- `~ src/services/http.ts` — antes de cada request, leer `supabase.auth.getSession()` y agregar `Authorization: Bearer <jwt>` si existe.
- `~ src/stores/auth.ts` — fuente de verdad: la sesión Supabase. Métodos: `signUp({email, password, nombre})`, `signInWithPassword({email, password})`, `signOut()`, `loadProfile()` (llama `GET /usuarios/me`). Suscribirse a `onAuthStateChange`.
- `~ src/types/auth.ts` — eliminar `Role` mock, derivar `Role` de `Usuario.tipo` (`'ciudadano' → 'vecino'`, `'municipalidad' → 'funcionario'`). Mantener `admin` como flag local opcional (decisión F1).
- `~ src/views/auth/LoginView.vue` — eliminar botón Google + selector de rol. Tabs *Iniciar sesión* / *Crear cuenta*. Validación de email + password.
- `+ src/views/auth/OnboardingView.vue` — si `usuarios/me.comuna_id === null`, redirigir aquí. Form: `telefono` (E.164) + `comuna_id` (select desde `GET /comunas`). PATCH a `/usuarios/me`.
- `~ src/router/index.ts` — guard nuevo: si auth pero `comuna_id` null y la ruta no es `/onboarding`, redirigir a `/onboarding`.
- `~ src/main.ts` — `await auth.restore()` espera la sesión Supabase antes de montar el router.

**Vistas afectadas (sin lógica nueva, solo el saludo personalizado puede cambiar):** `VecinoHomeView.vue`, `FuncionarioHomeView.vue`, `AdminHomeView.vue`.

**Done when:**
- Login con un usuario real de Supabase mete `usuario.tipo` correcto y redirige a su home.
- Logout limpia la sesión.
- F5 (recargar página) restaura la sesión sin volver a `/auth`.
- Si `comuna_id` es null, la app fuerza onboarding.

**Spec autoritativa:** `auth.md §4, §5, §7`.

---

### Rama 3 — `feat/catalogos-comunas-estados`

**Objetivo:** consumir los dos endpoints públicos del back y dejar de hardcodear listas.

**Dependencias:** rama 1.

**Diff principal:**
- `+ src/services/catalogos.service.ts` — `getComunas()`, `getTiposEstado()`. Cache en módulo (los catálogos no cambian en runtime).
- `+ src/stores/catalogos.ts` (opcional) — pinia store si se prefiere reactivo a través de la app.
- `~ Onboarding`, `~ VecinoHomeView`, `~ FuncionarioHomeView` — reemplazar `sensorsService.zones()` por `useCatalogos().comunas` donde aplique.

**Done when:**
- El select de comuna en onboarding muestra los datos del back.
- El filtro de estados en la vista del funcionario usa los nombres reales (`En espera`, etc.).

**Spec autoritativa:** `api.md §4.12, §4.13`.

---

### Rama 4 — `feat/reportes-real`

**Objetivo:** la grande. Reescribir el modelo de reporte, los servicios y los formularios/tablas que lo consumen.

**Dependencias:** ramas 1, 2, 3.

**Diff principal:**

**Tipos:**
- `~ src/types/report.ts` — alinearse al back (ver `01-mapeo-contrato.md §3.1`). Mantener `Reporte`, `NuevoReporteInput`, `ReporteDetalle`, `ReporteEstado`, `ReporteHistorial`, `ReporteLectura`.
- `- src/types/alert.ts` — borrar.

**Servicios:**
- `~ src/services/reportes.service.ts` (renombrado desde `reports.service.ts`) — `crear`, `mios`, `byId`, `porComuna`, `cambiarEstado`, `buscarEvidencia`. Todos con `http`.
- `- src/services/alerts.service.ts` — borrar.
- `- src/services/_mockData/{alerts,reports}.ts` — borrar.
- `~ src/services/kpis.service.ts` — quitar `alertsBreakdown`; derivar breakdown desde el listado de reportes.

**Vistas:**
- `~ VecinoHomeView.vue`:
  - Quitar form `category` / `zone` / `address`.
  - Form nuevo: `titulo`, `descripcion`, **map picker Leaflet** para `latitud`/`longitud`, botón "Comprobar evidencia" → `GET /reportes/buscar-evidencia`, sección que muestra match (sensor + dB + distancia + timestamp) y permite "Adjuntar".
  - Al submit: re-llamar `buscar-evidencia` y comparar con `lectura_evidencia_id` guardado. Si difiere o ya no hay match, mostrar warning antes de POST. POST con el id confirmado o sin él.
  - Lista de "mis reportes" desde `GET /reportes/mios` paginado.
- `~ FuncionarioHomeView.vue`:
  - Reemplazar tabla de alerts por tabla de `Reporte` desde `GET /reportes/comuna/{comuna_id}`.
  - Estados con nombres del back (`En espera`, `En atencion`, `Atendido`, `Descartado`).
  - Modal de cambio de estado → `PATCH /reportes/{id}/estado`. `Descartado` exige `comentario` no vacío (validación cliente + servidor).
  - Historial: mostrar el array `historial[]` del detalle.
  - Indicador "Atendido por: ..." cuando aplica.
  - Quitar `auth.user.email` para filtrar — el back ya scopea por JWT.

**Componentes nuevos:**
- `+ src/components/reporte/ReporteMapPicker.vue` — Leaflet con clic para fijar marker, emite `latitud`/`longitud`.
- `+ src/components/reporte/EvidenciaSensorCard.vue` — render del match de `buscar-evidencia`.

**Done when:**
- Un vecino real puede crear, ver y listar sus reportes contra el back.
- Un funcionario real puede listar los reportes de su comuna y transicionar estados respetando la máquina.
- `Descartado` sin comentario rebota con mensaje claro (no 5xx).

**Spec autoritativa:** `api.md §4.4–§4.9`, `backend.md §5.1`.

---

### Rama 5 — `feat/heatmap-real`

**Objetivo:** consumir el heatmap real del back.

**Dependencias:** rama 1.

**Diff principal:**
- `~ src/types/filters.ts` — `HeatmapQuery` con `bbox`, `timeStart`, `timeEnd`, `bucketMinutes`.
- `~ src/services/heatmap.service.ts` — `GET /api/v1/heatmaps`. Devuelve `FeatureCollection`.
- `+ src/utils/heatmap-features.ts` — adaptador `featureCollectionToPoints(fc) → HeatmapPoint[]` y `deriveKpis(features) → HeatmapKpis`.
- `~ src/composables/useHeatmapData.ts` — listener `map.moveend` recalcula `bbox`. Polling 60 s sigue.
- `~ src/views/heatmap/HeatmapView.vue` — quitar selector de zona / sensor / hora. Selector de rango (Último día / Últimos 7 días) + bucket (1, 5, 15, 60 min).
- `- src/services/_mockData/heatmapPoints.ts` — borrar.

**Done when:**
- El mapa muestra puntos reales del back.
- Cambiar bucket recarga.
- `alertSustained` muestra "—" hasta que el back lo provea (con tooltip explicativo, ver `02-endpoints-faltantes-back.md §5`).

**Spec autoritativa:** `api.md §4.3`, `backend.md §5.3`.

---

### Rama 6 — `chore/limpieza-mocks-sin-back`

**Objetivo:** dejar consistente lo que **sigue siendo mock** y banner-ear las vistas admin.

**Dependencias:** ninguna fuerte, pero conviene tras las 4 y 5.

**Diff principal:**
- `+ src/components/common/BasePendingBanner.vue` — banner amarillo "Funcionalidad pendiente en backend (ver `docs/integracion-backend/02-endpoints-faltantes-back.md §X`)".
- `~ src/views/admin/*.vue` — agregar banner.
- `~ src/router/index.ts` — flag `import.meta.env.VITE_ENABLE_ADMIN_DEMO` controla si `/admin-dashboard/*` es accesible.
- `~ services/sensors.service.ts`, `services/devices.service.ts`, `kpisService.adminSummary` — mantenidos pero con comentario `// MOCK hasta §1/§2/§3 de endpoints-faltantes`.

**Done when:**
- `VITE_ENABLE_ADMIN_DEMO=false` oculta admin completamente (404 → home).
- Con flag en `true`, banner visible en cada subvista admin.

---

### Rama 7 — `docs/actualizar-flujo-usuario`

**Objetivo:** revisar `docs/flujo-usuario/*` y `docs/specs/*` para reflejar:
- Sin Google OAuth.
- Login email + password + signup.
- Onboarding obligatorio.
- Reporte con map picker + evidencia.
- Tabla del funcionario con estados del back.

**Diff:** depende del estado de esos diagramas (los .drawio.png hay que regenerarlos desde sus fuentes; si no están las fuentes, dejar un `TODO.md` con la lista de diagramas a actualizar).

---

## Cronograma sugerido (estimaciones gruesas)

| Rama | Esfuerzo | Riesgo |
|---|---|---|
| 0 (docs) | 1 sesión | bajo |
| 1 (http + tipos) | 1 sesión | bajo |
| 2 (auth) | 2 sesiones | medio — Supabase + onboarding + restore tienen edge cases |
| 3 (catálogos) | < 1 sesión | bajo |
| 4 (reportes) | 3 sesiones | alto — toca 2 vistas, map picker, evidencia, máquina de estados |
| 5 (heatmap) | 1–2 sesiones | medio — bbox + bucket + derivación de KPIs |
| 6 (limpieza) | < 1 sesión | bajo |
| 7 (docs flujo) | depende | bajo |

---

## Ramas explícitamente NO incluidas en este plan

- Reescribir admin contra back real → bloqueado por §6 de `02-endpoints-faltantes-back.md`.
- Realtime / WebSockets de heatmap → `backend.md` ADR 05 lo descarta para MVP.
- Notificaciones push al vecino cuando su reporte cambia de estado → no en el contrato.
- Internacionalización → no es prioridad.

Cuando alguno de estos surja, **se actualiza este doc primero** y se agrega una rama numerada.
