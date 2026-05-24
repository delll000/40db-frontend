# Endpoints faltantes en `40db-backend`

Lista priorizada de endpoints/funcionalidades que el frontend necesita y que el contrato actual del backend (`../../../40db-backend/docs/api.md`) **no expone**. Cada item incluye: para qué lo usa el front, propuesta de shape, prioridad y workaround actual.

> Este documento es lo que se le pasa al equipo de backend. Si un item se implementa, **mover a `01-mapeo-contrato.md`** y dejar acá una entrada cerrada con la fecha + commit donde se cubrió.

## Estado (2026-05-23)

El backend ratificó **6 items** en su sesión de planificación admin/sensores. Los items marcados ✅ ya tienen spec autoritativa en `api.md` / `auth.md` / `bbdd.md`. El frontend puede implementar contra esos endpoints (cuando el backend los implemente — ver `40db-backend/docs/PLAN.md` pasos 10-13).

Resumen rápido al final del documento.

---

## Convenciones

- **Prioridad** = qué tan crítico es para cerrar la migración del front:
  - 🔴 **alta** — bloquea una vista que hoy está visible al usuario final.
  - 🟡 **media** — habilita una vista del rol `admin` que hoy es UI-only con mocks.
  - 🟢 **baja** — mejora de UX o métricas, no bloqueante.
- **Workaround** = qué hace el front mientras no exista el endpoint.
- Los shapes propuestos siguen el estilo del back (`api.md §4`): JSON, snake_case, paginación cursor donde aplique.

---

## 1. ✅ Panel admin — listar sensores — RESUELTO 2026-05-23

**Spec autoritativa:** `40db-backend/docs/api.md §4.14`.

`GET /api/v1/sensores?comuna_id=&estado_salud=&activo=&limit=&cursor=`. Listo en backend. Filtros agregados respecto a la propuesta original: `activo` (filtro sobre `sensor.activo`). El response trae además `comuna_nombre` (resuelto en backend con JOIN).

**Auth:** `municipalidad` (su comuna; ignora `comuna_id` query) o `admin` (global o filtrado).

**Cierre del workaround del front:** se puede reemplazar el mock de `services/sensors.service.ts` por llamada real. Mantener banner "datos demo" hasta validar en producción con datos reales (paso 11 del PLAN del backend).

### 1.1 ✅ Definición de "estado de salud" — RESUELTO con umbrales 10/20 min

**Spec autoritativa:** `40db-backend/docs/bbdd.md §5.5` (RPC `sensores_con_salud`, D10).

El backend fija los umbrales **más estrictos** que la propuesta original del front (porque el firmware publica cada 5s, así que 5 min sin lectura ya es señal fuerte):

- `online`: última lectura ≤ 10 min.
- `intermitente`: entre 10 min y 20 min.
- `offline`: > 20 min, **o** `sensor.activo = false`.
- `sin_lecturas`: el sensor nunca publicó (recién provisionado).

El front debe soportar el cuarto estado `sin_lecturas` (que la propuesta original no contemplaba). Sugerencia UI: gris o ícono de "esperando primera lectura".

---

## 2. ✅ Panel admin — resumen de salud de sensores — RESUELTO 2026-05-23

**Spec autoritativa:** `40db-backend/docs/api.md §4.16`.

`GET /api/v1/sensores/resumen?comuna_id=`. El response trae un campo extra `sin_lecturas` (cuarto estado, ver §1.1). El front debe agregarlo a los KPIs del Home admin.

```json
{
  "total": 12,
  "online": 8,
  "intermitente": 2,
  "offline": 1,
  "sin_lecturas": 1,
  "calculado_at": "2026-05-23T02:38:00Z"
}
```

**Cierre del workaround del front:** reemplazar `kpisService.adminSummary()` por llamada real. Mantener UI compatible con `sin_lecturas`.

---

## 3. ✅ Panel admin — CRUD de sensores ("hardware") — RESUELTO 2026-05-23

**Spec autoritativa:** `40db-backend/docs/api.md §4.17 (POST)`, `§4.18 (PATCH)`, `§4.19 (DELETE)`.

Confirmaciones del backend respecto a la propuesta original:

- `POST /api/v1/sensores` con `{nombre, comuna_id, latitud, longitud}` → 201 con sensor completo incluido el UUID generado. Ese UUID **debe copiarse al firmware** del ESP32 que va a publicar a `40db/sensores/{id}/lectura` (ver `iot.md §10.4`).
- `PATCH /api/v1/sensores/{id}` acepta `nombre`, `latitud`, `longitud`, `activo`. **No acepta `comuna_id`** — mover físicamente un sensor de comuna = darlo de baja y crear uno nuevo (decisión del backend, evita orfandad de lecturas históricas).
- `DELETE /api/v1/sensores/{id}` es **soft-delete** (`activo=false`). Las lecturas históricas permanecen y siguen alimentando heatmap.

**Auth:** solo `admin` para las tres operaciones (`current_user_admin`).

**Cierre del workaround del front:** reemplazar `devices.service.ts` por servicio real. Quitar flag `VITE_ENABLE_ADMIN_DEMO`. Para crear un sensor nuevo, el UI debe **mostrar el UUID retornado** al admin con instrucción "copiar al firmware del ESP32".

---

## 4. 🟢 Categoría y zona del reporte (UX legacy)

**Para qué:** el form original del vecino pedía `category` (Fiesta / Comercio / Tránsito / etc.) y `zone`. El equipo decidió quitarlos del MVP, pero **siguen siendo útiles para análisis**.

**Propuesta (cuando se reactive):**

```sql
ALTER TABLE reporte ADD COLUMN categoria text
  CHECK (categoria IN ('fiesta','vecinos','comercio','construccion','transito','otro'));
```

Y aceptar `categoria` opcional en `POST /api/v1/reportes`.

**Zona:** no agregar columna. Si surge el reporting por zona, derivar en consulta (`comuna` + clustering de lat/lng) o usar nombres del catálogo de sensores cercanos.

**Workaround:** no se incluye en el body. La descripción suele dejar la categoría implícita.

---

## 5. 🟢 Heatmap — alerta sostenida ("alertSustained")

**Para qué:** KPI del front `HeatmapKpis.alertSustained` muestra "zona X supera 75 dB durante Y minutos". Hoy es cálculo mock.

**Propuesta:**

```http
GET /api/v1/heatmaps/alertas-sostenidas?bbox=&umbral_db=75&duracion_min=10
Authorization: opcional (lo dejaría público como `/heatmaps`)
```

**Response 200:**

```json
{
  "alertas": [
    {
      "centro": { "lat": -33.4372, "lng": -70.6483 },
      "nivel_db_avg": 78.2,
      "duracion_minutos": 14,
      "desde": "2026-05-19T22:01:00Z"
    }
  ]
}
```

**Workaround:** el front pasa a derivar la "alerta sostenida" recorriendo los `features` del heatmap por `bucket_start` consecutivos, sin garantía de exactitud temporal. Documentar como aproximación.

---

## 6. ✅ Rol `admin` — semántica explícita en el back — RESUELTO 2026-05-23

**Spec autoritativa:** `40db-backend/docs/auth.md` D9 + §6 (matriz extendida) + §8 (bootstrap + endpoint).

El backend ahora reconoce **tres roles**: `ciudadano`, `municipalidad`, `admin` (CHECK constraint en `usuario.tipo`). Confirmaciones:

1. **Schema extendido** en `bbdd.md §3.3`: `CHECK (tipo IN ('ciudadano', 'municipalidad', 'admin'))`.
2. **Endpoint de promoción** en `api.md §4.22`:
   ```http
   PATCH /api/v1/usuarios/{id}/promover
   body: { nuevo_tipo: "ciudadano" | "municipalidad" | "admin", comuna_id?: int }
   ```
   Reglas: solo admin puede invocar, `comuna_id` obligatorio si `nuevo_tipo='municipalidad'`, no se puede degradar a sí mismo.
3. **Bypass de comuna**: la dependency `current_user_municipal_o_admin` aplica filtro de comuna para municipalidad pero lo omite para admin. Aplicada en endpoints de sensores y usuarios.
4. **Bootstrap del primer admin**: SQL manual una sola vez (`auth.md §8.1`). Después todo via endpoint.

**Mapeo front → back actualizado:**

| UI front | `usuario.tipo` |
|---|---|
| `vecino` | `ciudadano` |
| `funcionario` | `municipalidad` |
| `admin` | **`admin`** ← ahora real, ya no UI-only |

**Cierre del workaround del front:** quitar flag `VITE_ENABLE_ADMIN_DEMO`. El guard del router consulta `usuario.tipo === 'admin'` real (no más selector mock). El store `auth.ts` ya tenía el campo, solo había que mapear el tercer valor. Decisión F1 del README **se revierte** ahora — `admin` consume backend real.

---

## 7. ✅ Usuarios — administrarlos desde el panel — RESUELTO 2026-05-23

**Spec autoritativa:** `40db-backend/docs/api.md §4.20 (GET listado)`, `§4.21 (PATCH activo)`, `§4.22 (PATCH promover)`.

Confirmaciones del backend:

- `GET /api/v1/usuarios?tipo=&comuna_id=&activo=&q=&limit=&cursor=`. Soporta búsqueda por nombre/email (ILIKE) vía `q` query — útil para el buscador del panel admin. **El `email` viene del JOIN** a `auth.users` (no se duplica en `public.usuario`).
- `PATCH /api/v1/usuarios/{id}/activo` body `{activo: bool}`. No se puede desactivar a sí mismo.
- `PATCH /api/v1/usuarios/{id}/promover` (ver §6) cubre cambio de rol + comuna.

**Cierre del workaround del front:** la vista `/admin-dashboard/usuarios` ahora puede salir del estado oculto. Implementar con paginación cursor (mismo encoding que `/reportes/mios`).

---

## 8. 🟢 Reportes — exportes y agregaciones para admin

**Para qué:** vista `/admin-dashboard/reportes` (generar PDF, CSV institucionales). Hoy el front tiene `jspdf` + `html2canvas` para hacerlo client-side, pero necesita un endpoint que devuelva datos cross-comuna o agregados temporales.

**Propuesta:**

```http
GET /api/v1/reportes/agregado?comuna_id=&desde=&hasta=&group_by=estado|comuna|dia
Authorization: Bearer <jwt> (rol admin)
```

**Response 200:**

```json
{
  "bucket": "estado",
  "data": [
    { "key": "En espera", "total": 18 },
    { "key": "En atencion", "total": 12 },
    { "key": "Atendido", "total": 45 },
    { "key": "Descartado", "total": 3 }
  ]
}
```

**Workaround:** vista oculta. Si se exhibe, mostrar mock con banner.

---

## 9. 🟢 Historial de conectividad de sensores

**Para qué:** vista `/admin-dashboard/historial` mostraba los últimos 30 días de eventos por sensor.

**Propuesta:**

```http
GET /api/v1/sensores/{id}/conectividad?desde=&hasta=
```

**Response 200:**

```json
{
  "data": [
    { "timestamp": "2026-05-19T22:01:00Z", "evento": "online" },
    { "timestamp": "2026-05-19T23:14:00Z", "evento": "offline", "duracion_minutos": 12 }
  ]
}
```

**Workaround:** vista oculta.

---

## 10. 🟢 Catálogo de comunas — filtro geográfico

`GET /api/v1/comunas` ya existe (`api.md §4.12`). El front pide mantener `region` y `codigo` (vienen) y considerar agregar `bbox: [minLng, minLat, maxLng, maxLat]` para inicializar el viewport del heatmap centrado en la comuna del usuario.

**No bloqueante.** El front puede mantener un mapa hardcodeado `comuna_id → bbox` por ahora.

---

## 11. 🟢 Avatar / foto del usuario

`usuarios/me` no devuelve `avatar_url`. El front lo tiene como opcional en `User.avatar` (UI muestra inicial si no hay). Si se quiere foto real, el back debería exponer:

```json
"avatar_url": "https://..."
```

y permitir subirlo via `PATCH /usuarios/me/avatar` (multipart o URL signed con Supabase Storage).

**No bloqueante.**

---

## 12. ✅ `reporte.comuna_id` — derivación — RESUELTO 2026-05-23 con opción 3 + Nominatim

**Spec autoritativa:** `40db-backend/docs/api.md §4.5` (body actualizado) + `§4.5.1` (contrato cliente-side).

**Decisión.** El backend acepta `comuna_id` opcional en el body de `POST /reportes`. **El frontend es responsable de resolverlo** desde lat/lng usando Nominatim (que el front ya tiene integrado para reverse-geocode de la dirección — decisión F4 del README).

Esta es la **opción 3 con variante "front resuelve"** del análisis original. Se eligió porque la opción 2 (polígonos del INE) implicaba 2-4 horas de data work + riesgos geo (proyección UTM/WGS84, comunas no cubiertas, ambigüedad de solapamientos) sin valor agregado para el MVP. Si en el futuro Nominatim da problemas reales, se migra a opción 2 (queda en roadmap del backend).

**Pipeline del frontend** (ver detalle completo en `01-mapeo-contrato.md §3.5`):

1. Usuario marca punto en map picker → `lat, lng`.
2. Front llama Nominatim reverse-geocode (`https://nominatim.openstreetmap.org/reverse?...`).
3. Extrae nombre de comuna (probar `address.county` → `address.city_district` → `address.suburb` → `address.town`).
4. Matchea contra catálogo `GET /api/v1/comunas` (cacheado al boot).
5. Si match → envía `comuna_id` resuelto. Si no → omite el campo (backend usa `usuario.comuna_id` como fallback).

**Comportamiento del backend:**

| Caso | Backend |
|---|---|
| `comuna_id` viene y existe | Se usa. |
| `comuna_id` viene pero no existe | 422 `validation_error`. |
| Omitido + `usuario.comuna_id` no null | Fallback al del usuario. |
| Omitido + `usuario.comuna_id` null | 422 (debe completar onboarding o enviar `comuna_id`). |

**Cierre del workaround del front:** implementar el helper en `src/services/nominatim.service.ts` (cliente Nominatim) + `src/services/comunas.service.ts` (catálogo). Detalle de implementación en `01-mapeo-contrato.md §3.5`.

---

## Resumen rápido

| Estado | Prio orig | Item | Bloquea vista |
|---|---|---|---|
| ✅ | 🟡 | §1 Listar sensores | `/admin-dashboard/hardware` (real) |
| ✅ | 🟡 | §2 Resumen salud sensores | `/admin-dashboard/` (KPIs reales) |
| ✅ | 🟡 | §3 CRUD sensores | `/admin-dashboard/hardware` (real) |
| ✅ | 🟡 | §6 Rol admin server-side | Todo `/admin-dashboard/*` (real) |
| ✅ | 🟡 | §12 derivación de `reporte.comuna_id` | Reportes cross-comuna mal-ruteados |
| ✅ | 🟢 | §7 CRUD usuarios | `/admin-dashboard/usuarios` (real) |
| ⏳ | 🟢 | §4 `categoria` en reportes | Análisis post-MVP |
| ⏳ | 🟢 | §5 Alerta sostenida | KPI del heatmap |
| ⏳ | 🟢 | §8 Reportes agregados admin | `/admin-dashboard/reportes` (real) |
| 🚫 | 🟢 | §9 Conectividad sensores | `/admin-dashboard/historial` — descartado en MVP del back (D10 computa estado on-demand, no persiste transiciones) |
| ⏳ | 🟢 | §10 bbox por comuna | Inicializar viewport del heatmap |
| ⏳ | 🟢 | §11 avatar usuario | Cosmético |

**6 items cerrados** en `40db-backend` el 2026-05-23 (sesión de planificación admin/sensores). Todos los items 🟡 (los que bloqueaban vistas admin reales) están resueltos. Lo que queda son 🟢 mejoras no-bloqueantes y §9 que el back descartó para MVP.

**Roadmap del backend para los ⏳ pendientes:** `40db-backend/docs/backend.md §9`.
