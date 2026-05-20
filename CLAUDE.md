# CLAUDE.md — 40db-frontend

Guía para que Claude Code entienda dónde consultar la documentación del backend al trabajar en este repo.

## Stack del front

Vue 3 + Vite + TypeScript + Pinia + vue-router. Mapas con Leaflet, exportes con jspdf / html2canvas. Auth vía Supabase (anon key). Los datos vienen del backend del repo hermano `40db-backend`.

## Documentación del backend

La documentación canónica del backend vive en el repo hermano, en la ruta relativa:

```
../40db-backend/docs/
```

Es decir, desde la raíz de este repo:
`/Users/joaquin/Documents/DuocUC/ProyectoTitulo/repositorios/40db-backend/docs/`

Asume que ese repo está clonado en paralelo. Si no existe, pídeme que lo clone antes de avanzar con tareas que requieran consultar contratos.

### Archivos relevantes para el front

De los 6 documentos del backend, **solo 3 son contrato cliente-servidor** y son los que importan al trabajar en este repo:

| Doc | Ruta | Por qué importa al front |
|---|---|---|
| **api.md** | `../40db-backend/docs/api.md` | Esencial. Endpoints, shapes JSON, status codes. Es **el contrato**. Consúltalo antes de tipar respuestas, armar stores o llamar al backend. |
| **auth.md** | `../40db-backend/docs/auth.md` | El front usa Supabase Auth con `anon_key` (§9): signup/login, refresh, y **cómo mandar el JWT al backend**. Léelo al tocar login, guards de router, interceptores, o cabeceras `Authorization`. |
| **errores.md** | `../40db-backend/docs/errores.md` | Forma de los errores (`{ error: { code, message, correlation_id } }`) y mapeo HTTP. El front los muestra al usuario, así que es la fuente para componentes de error, toasts y manejo en stores. |

### Archivos del backend que **no** necesita el front

`backend.md`, `bbdd.md`, `iot.md`, `PLAN.md`, `README.md` describen interna del servidor (arquitectura, esquema de BD, ingesta IoT, planificación). No los leas para tareas de front salvo que yo lo pida explícitamente — desviaría el foco del contrato HTTP.

## Cómo usar estos docs

- **Antes de implementar una llamada al backend**: lee `api.md` para confirmar método, path, payload y forma de la respuesta. No inventes endpoints.
- **Antes de tocar autenticación**: lee `auth.md` §9 (flujo con anon key) y la sección de envío del JWT.
- **Al tipar/manejar errores**: usa la forma `{ error: { code, message, correlation_id } }` de `errores.md` — no inventes otra estructura.
- Si detectas una contradicción entre lo que dice el doc del backend y lo que hace el código del front, **el doc gana** salvo que yo diga lo contrario; coméntamelo antes de "arreglar" el front.

## Docs propios del front

La carpeta `docs/` de este repo contiene material del front (HU, diseño, etc.). Es complementaria, no reemplaza al contrato del backend.
