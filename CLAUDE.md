# 40db-frontend

## Repositorios relacionados

La documentación del backend vive en `../40db-backend/docs/` (ruta relativa a este directorio).

### Docs que el frontend SÍ debe consultar

Estos 3 archivos son el contrato cliente-servidor. Léelos cuando trabajes en integración con la API, autenticación o manejo de errores:

- **`../40db-backend/docs/api.md`** — Endpoints, shapes JSON y status codes. Es el contrato base.
- **`../40db-backend/docs/auth.md`** — Supabase Auth con `anon_key` (§9): signup/login, refresh y cómo enviar el JWT al backend.
- **`../40db-backend/docs/errores.md`** — Forma de los errores (`{error: {code, message, correlation_id}}`) y mapeo HTTP. El front los muestra al usuario.

### Docs que el frontend NO necesita

`backend.md`, `bbdd.md`, `iot.md`, `PLAN.md`, `README.md` son internos del backend; no los leas salvo que se pida explícitamente.
