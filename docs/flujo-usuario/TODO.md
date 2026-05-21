# TODO — Diagramas de flujo de usuario

Los `.drawio.png` de esta carpeta capturan los flujos del MVP **antes** de la integración con el backend (mayo 2026). Quedaron desfasados tras las ramas `feat/connecting-with-backend` → `chore/limpieza-mocks-sin-back`. No puedo regenerarlos automáticamente porque solo tenemos los PNG exportados, no las fuentes `.drawio`.

Para regenerarlos hace falta abrir cada archivo en [diagrams.net](https://app.diagrams.net) (el `.drawio.png` se puede importar directo allí — Drawio embebe el XML en la imagen PNG). Después se exporta de vuelta y se sobrescribe el archivo.

---

## Cambios a aplicar por diagrama

### 1. `Flujo de Autenticación (Login).drawio.png`

**Antes:** botón "Continuar con Google" → OAuth → dashboard del rol.

**Ahora:**

1. Usuario en `/auth` ve tabs *Iniciar sesión* / *Crear cuenta*.
2. **Si elige Crear cuenta:** ingresa nombre + email + password → Supabase Auth crea el `auth.users` → trigger `handle_new_user` crea el perfil con `comuna_id=null`.
   - Si Supabase tiene `Confirm email = ON`: front muestra "Revisa tu correo".
   - Si está OFF: pasa directo al paso 3.
3. **Si elige Iniciar sesión:** email + password → JWT en sesión.
4. Front llama `GET /api/v1/usuarios/me` para conocer `tipo` y `comuna_id`.
5. Si `comuna_id == null` → redirige a `/onboarding` (telefono E.164 + select de comuna).
6. Cuando hay `comuna_id`, redirige al home según `tipo`:
   - `ciudadano` → `/vecino-home`.
   - `municipalidad` → `/funcionario-home`.

**Eliminar** del diagrama: caja "whitelist de dominios", caja "Google OAuth".

**Spec relacionada:** [`docs/specs/auth/04. Especificacion Inicio Sesion.md`](../specs/auth/04.%20Especificacion%20Inicio%20Sesion.md) (con banner de estado).

---

### 2. `_Flujo Vecino — Envío de Reporte.drawio.png`

**Antes:** form con `categoría`, `zona`, `dirección`, `descripción`.

**Ahora:**

1. Vecino abre modal "Realizar reporte" desde `VecinoHomeView`.
2. Form pide:
   - `titulo` (3-120 chars).
   - `descripcion` (10-2000 chars).
   - **Map picker (Leaflet)** — clic para fijar `latitud` y `longitud`.
3. Opcional: botón **"Comprobar evidencia cercana"** → `GET /reportes/buscar-evidencia?lat=&lng=`.
   - Si hay match → muestra `EvidenciaSensorCard` (sensor, dB, distancia, timestamp). Checkbox "Adjuntar al reporte" (default check).
   - Si no hay match → mensaje "Puedes enviar sin evidencia".
4. **Submit:** el front llama `buscarEvidencia` **otra vez** (anti-forgery + staleness).
   - Si match nuevo == id adjuntado → POST con ese id.
   - Si difiere → toast "Evidencia actualizada", POST con el nuevo id.
   - Si ya no hay match → toast "Evidencia ya no disponible", POST sin id.
5. `POST /api/v1/reportes` body: `{ titulo, descripcion, latitud, longitud, lectura_evidencia_id? }`.
6. Response 201 → prepend a "Mis reportes" + toast de éxito.

**Eliminar** del diagrama: cajas "categoría", "zona", "dirección" (no existen en el back).

**Spec relacionada:** decisión F4 + F5 + F7 en [`docs/integracion-backend/README.md`](../integracion-backend/README.md).

---

### 3. `Flujo Admin - Ver Alertas.drawio.png`

**Renombrar** el diagrama y archivo a *Flujo Funcionario — Ver Reportes* (o equivalente). El concepto `Alerta` fue unificado con `Reporte` (decisión F6).

**Ahora:**

1. Funcionario (`tipo='municipalidad'`) entra a `/funcionario-home`.
2. Front llama `GET /api/v1/reportes/comuna/{comuna_id}` paginado (cursor).
3. Tabla con columnas: `created_at`, `titulo`, `estado_actual`, acción "Ver detalle".
4. Filtro por estado: `En espera`, `En atencion`, `Atendido`, `Descartado`, todos.
5. KPIs de breakdown derivados de la página actual.
6. Modal de detalle: `GET /api/v1/reportes/{id}` → titulo, descripcion, lat/lng, evidencia (si hay), historial (`bbdd.md §3.7`), atendido_por.
7. Cambio de estado: panel con botones de transiciones permitidas (`ESTADO_TRANSICIONES`). `Descartado` exige comentario; resto opcional.
8. `PATCH /api/v1/reportes/{id}/estado` body `{ nuevo_estado, comentario? }`.
9. Si el back responde 409 `invalid_state_transition` (carrera con otro funcionario) → toast + recarga del detalle.

**Eliminar** del diagrama: estados `Activa/Atendida/Cerrada`, "reversión 5 min", "alerta generada por sensor".

**Spec relacionada:** [`docs/specs/dashboard/02. Modificar Estado Alertas.md`](../specs/dashboard/02.%20Modificar%20Estado%20Alertas.md) (con banner).

---

### 4. `Flujo Vecino - Heatmap.drawio.png`

**Cambios menores.**

- El refresco sigue siendo cada 60 s.
- El bbox lo determina **el viewport del mapa** (no filtros de zona/sensor/hora).
- KPIs derivados client-side desde el GeoJSON.
- Eliminar referencias a filtros por zona/sensor/hora.

**Spec relacionada:** [`docs/specs/dashboard/03. Dashboard Ruido.md`](../specs/dashboard/03.%20Dashboard%20Ruido%20.md) (con banner).

---

### 5. `Diagrama flujo Admin.drawio.png`

**Marcar como "demo / no implementado"** salvo en la home admin que aún consume mocks. Las subvistas `/admin-dashboard/{hardware,usuarios,reportes,historial}` están bandeadas (rama 6) y solo accesibles con `VITE_ENABLE_ADMIN_DEMO=true`.

Cuando el back exponga los endpoints faltantes (ver [`02-endpoints-faltantes-back.md`](../integracion-backend/02-endpoints-faltantes-back.md) §1, §2, §3, §6, §7, §8, §9), este diagrama se vuelve relevante.

---

## Otras tareas

- [ ] Renombrar `Flujo Admin - Ver Alertas.drawio.png` → `Flujo Funcionario - Ver Reportes.drawio.png` (cambio de archivo, no solo de contenido).
- [ ] Eliminar el prefijo `_` de `_Flujo Vecino — Envío de Reporte.drawio.png` si no responde a una convención.
- [ ] Cuando el back agregue los endpoints administrativos, regenerar `Diagrama flujo Admin.drawio.png` completo.
