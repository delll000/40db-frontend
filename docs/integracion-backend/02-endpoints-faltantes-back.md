# Endpoints faltantes en `40db-backend`

Lista priorizada de endpoints/funcionalidades que el frontend necesita y que el contrato actual del backend (`../../../40db-backend/docs/api.md`) **no expone**. Cada item incluye: para qué lo usa el front, propuesta de shape, prioridad y workaround actual.

> Este documento es lo que se le pasa al equipo de backend. Si un item se implementa, **mover a `01-mapeo-contrato.md`** y dejar acá una entrada cerrada con la fecha + commit donde se cubrió.

---

## Convenciones

- **Prioridad** = qué tan crítico es para cerrar la migración del front:
  - 🔴 **alta** — bloquea una vista que hoy está visible al usuario final.
  - 🟡 **media** — habilita una vista del rol `admin` que hoy es UI-only con mocks.
  - 🟢 **baja** — mejora de UX o métricas, no bloqueante.
- **Workaround** = qué hace el front mientras no exista el endpoint.
- Los shapes propuestos siguen el estilo del back (`api.md §4`): JSON, snake_case, paginación cursor donde aplique.

---

## 1. 🟡 Panel admin — listar sensores

**Para qué:** vista `/admin-dashboard/hardware` y `/admin-dashboard/` (Home admin) listan sensores con su estado de salud. Hoy todo es mock.

**Propuesta:**

```http
GET /api/v1/sensores?comuna_id=&estado=&limit=20&cursor=
Authorization: Bearer <jwt>
```

| Query | Tipo | Notas |
|---|---|---|
| `comuna_id` | int | opcional. Sin él, devuelve todos los sensores accesibles al rol. |
| `estado` | string | opcional. `online` / `intermitente` / `offline` (definición de salud: ver §1.1). |
| `limit`, `cursor` | — | paginación cursor como en `/reportes/mios`. |

**Auth:** `tipo='municipalidad'` para sensores de su comuna; `admin` global (cuando exista). Ver §6 (rol admin).

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Plaza Italia - Norte",
      "comuna_id": 13,
      "latitud": -33.4372,
      "longitud": -70.6483,
      "activo": true,
      "estado_salud": "online",
      "ultima_lectura_at": "2026-05-19T22:14:33Z",
      "ultima_lectura_db": 62.3
    }
  ],
  "next_cursor": null
}
```

### 1.1 Definición de "estado de salud"

Hoy el front asume `online | intermitente | offline`. Propuesta de cómputo server-side:

- `online`: lectura más reciente en últimos 5 min.
- `intermitente`: última lectura entre 5 min y 1 h atrás.
- `offline`: > 1 h sin lectura, o `activo=false`.

Si el back implementa esto, el front cae el mock por completo.

**Workaround:** `services/sensors.service.ts` mantiene mocks. La vista admin lleva banner "datos demo".

---

## 2. 🟡 Panel admin — resumen de salud de sensores

**Para qué:** KPIs del Home admin (`AdminHomeView.vue`): total / online / intermitente / offline.

**Propuesta:**

```http
GET /api/v1/sensores/resumen?comuna_id=
Authorization: Bearer <jwt>
```

**Response 200:**

```json
{
  "total": 12,
  "online": 8,
  "intermitente": 2,
  "offline": 2,
  "calculado_at": "2026-05-19T22:15:00Z"
}
```

**Workaround:** mock estático en `kpisService.adminSummary()`. Banner "datos demo".

---

## 3. 🟡 Panel admin — CRUD de sensores ("hardware")

**Para qué:** vista `/admin-dashboard/hardware` permite crear / editar / dar de baja sensores. Hoy en `devices.service.ts` con mocks.

**Propuesta:**

```http
POST   /api/v1/sensores                  body: { nombre, comuna_id, latitud, longitud }
PATCH  /api/v1/sensores/{id}             body: { nombre?, latitud?, longitud? }
DELETE /api/v1/sensores/{id}             → marcado como activo=false (no DELETE físico)
```

**Auth:** rol admin global. Hoy `auth.md §8` indica que la inserción se hace por SQL editor con `service_role` — esto no escala, conviene endpoint cuando admin esté online.

**Workaround:** vista oculta detrás de flag `VITE_ENABLE_ADMIN_DEMO`. CRUD sigue siendo mock.

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

## 6. 🟡 Rol `admin` — semántica explícita en el back

**Para qué:** el front mantiene `admin` como UI-only (decisión F1) sobre tres áreas que **necesitan visibilidad cross-comuna**: hardware, usuarios, reportes históricos. El back hoy solo conoce `ciudadano` / `municipalidad`, ambas comuna-scoped.

**Propuesta (cuando se decida):**

1. Extender `usuario.tipo` con `'admin'` y/o introducir tabla `rol`.
2. Endpoint de promoción auditado:
   ```http
   PATCH /api/v1/usuarios/{id}/promover  body: { nuevo_tipo: "admin" | "municipalidad", comuna_id?: int }
   ```
3. Bypass de la regla de comuna para endpoints de listado (`GET /reportes` sin scope de comuna, `GET /sensores` global, etc.).

`auth.md §8 / §12` ya lo lista como roadmap. Este doc lo prioriza desde la perspectiva del front.

**Workaround:** flag `VITE_ENABLE_ADMIN_DEMO` para mostrar vistas admin con mocks. Cero acceso al back desde rol admin.

---

## 7. 🟢 Usuarios — administrarlos desde el panel

**Para qué:** vista `/admin-dashboard/usuarios`.

**Propuesta (mínimo):**

```http
GET   /api/v1/usuarios?tipo=&comuna_id=&limit=&cursor=    (rol admin)
PATCH /api/v1/usuarios/{id}/activo                         body: { activo: bool }   (rol admin)
```

**Workaround:** vista oculta hasta que exista el back.

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

## 12. 🟡 `reporte.comuna_id` — derivación ambigua

**Para qué:** decidir y documentar **de qué fuente** se toma el `comuna_id` que se guarda en cada `reporte`. El front no lo envía en el body de `POST /reportes` (`api.md §4.5`); lo elige el server.

**Estado actual.** Detectado al testear el flow end-to-end con un usuario en Maipú (fuera del seed `Santiago / Providencia / Las Condes`):

- La RPC `crear_reporte_con_validacion(p_usuario_id, p_comuna_id, ...)` recibe `p_comuna_id` ya resuelto desde Python (`migrations/20260519000000_initial_schema.sql §9.3`).
- El use case (no inspeccionado, pero implícito en `backend.md §5.1`) pasa **`usuario.comuna_id`** — la comuna del reportante, no la del lugar del incidente.
- Consecuencia: un vecino de Santiago que reporta ruido en Maipú genera un `reporte` con `comuna_id = Santiago`. El panel del funcionario de Maipú **no lo verá** porque `GET /reportes/comuna/13` filtra por `reporte.comuna_id`.

**Opciones:**

1. **Mantener `usuario.comuna_id`** (status quo). Pro: simple, no requiere mapeo geo→comuna. Con: el reporte queda mal-ruteado si el ciudadano denuncia fuera de su comuna.
2. **Derivar de `(latitud, longitud)`** via una función `point_to_comuna(lat, lng)` con polígonos de comuna. Requiere cargar los polígonos (shapefile del INE o similar) y agregar PostGIS query. Pro: el reporte llega al municipio correcto. Con: trabajo extra de data.
3. **Pedir comuna al usuario en el form** (campo explícito en `POST /reportes`). Pro: control del usuario; trivial de implementar en el back y el front. Con: extra step en UX, posible error humano.

`backend.md §5.1` listaba esto como decisión abierta:

> "Validar en el use case: `usuario.comuna_id` está seteado (si no, derivar de lat/lng o rechazar — decidir al implementar)."

**Recomendación del front:** opción 2 (geo-derivada) es la correcta para producción. Como bridge, el back puede empezar con opción 1 + agregar warning en respuesta si `usuario.comuna_id ≠ comuna_polígono(lat, lng)`, y migrar a 2 cuando se cargen los polígonos.

**Workaround actual del front:** ninguno — el front no controla esto. El issue se manifiesta solo cuando vecino y funcionario están en comunas distintas. Para testing E2E, ambos deben estar en la misma comuna seeded.

---

## Resumen rápido

| Prio | Item | Bloquea vista |
|---|---|---|
| 🟡 | §1 Listar sensores | `/admin-dashboard/hardware` (real) |
| 🟡 | §2 Resumen salud sensores | `/admin-dashboard/` (KPIs reales) |
| 🟡 | §3 CRUD sensores | `/admin-dashboard/hardware` (real) |
| 🟡 | §6 Rol admin server-side | Todo `/admin-dashboard/*` (real) |
| 🟡 | §12 derivación de `reporte.comuna_id` | Reportes cross-comuna mal-ruteados |
| 🟢 | §4 `categoria` en reportes | Análisis post-MVP |
| 🟢 | §5 Alerta sostenida | KPI del heatmap |
| 🟢 | §7 CRUD usuarios | `/admin-dashboard/usuarios` (real) |
| 🟢 | §8 Reportes agregados admin | `/admin-dashboard/reportes` (real) |
| 🟢 | §9 Conectividad sensores | `/admin-dashboard/historial` (real) |
| 🟢 | §10 bbox por comuna | Inicializar viewport del heatmap |
| 🟢 | §11 avatar usuario | Cosmético |

No hay items 🔴: lo crítico de las vistas accesibles a vecino y funcionario está cubierto por el contrato actual del back.
