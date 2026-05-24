# Deploy del SPA: history fallback y 404

Documenta por qué este repo necesita `vercel.json` y cómo se relaciona con
la vista 404 propia (`src/views/NotFoundView.vue`).

## El problema

El router usa `createWebHistory` (URLs limpias tipo `/admin-dashboard/hardware`,
no hash). En tiempo de ejecución vue-router resuelve esas rutas client-side
sin pedir nada al servidor, así que la navegación interna funciona.

Pero al **pegar la URL en la barra del navegador** o **hacer F5**, el
navegador hace un `GET https://<host>/admin-dashboard/hardware` HTTP. Si el
hosting no tiene history fallback, responde **404** porque ese archivo no
existe — el bundle de la SPA vive en `/index.html`.

Esto se reproduce en Vercel cuando la detección automática de Vite no
aplica los rewrites por algún motivo (proyecto multi-root, configuración
cambiada, etc.).

## La fix

`vercel.json` en la raíz del repo:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Vercel sirve `index.html` para cualquier path; el navegador descarga el
bundle, vue-router se monta y resuelve la ruta correcta.

## ¿No oculta esto el 404 real?

No. El rewrite es **server-side**: cualquier path devuelve `index.html`
(HTTP 200). Una vez en el cliente, el router compara la URL contra las
rutas definidas. Si ninguna matchea, monta `NotFoundView.vue` (catch-all
`/:pathMatch(.*)*`). Así seguimos viendo el 404 cuando corresponde, pero
sin que el servidor le cierre la puerta antes al SPA.

## Verificación

1. Build: `npm run build` → `vite preview`.
2. Pegar `http://localhost:4173/admin-dashboard/hardware` en una pestaña
   nueva.
3. Debe cargar el panel (login redirige si no estás autenticado), **no**
   un 404.
4. Pegar `http://localhost:4173/ruta-inexistente` → debe mostrar la
   `NotFoundView`.

En producción (Vercel) el mismo flujo aplica una vez subido `vercel.json`.

## Cosas relacionadas

- `src/router/index.ts` — catch-all que monta la vista 404.
- `src/views/NotFoundView.vue` — la vista en sí.
- Si en el futuro el proyecto migra a otro hosting (Netlify, Cloudflare
  Pages, S3), replicar el mismo concepto:
  - Netlify: archivo `public/_redirects` con `/*  /index.html  200`.
  - Cloudflare Pages: archivo `_redirects` igual a Netlify.
  - S3/CloudFront: configurar error 404 → `/index.html` con status 200.
