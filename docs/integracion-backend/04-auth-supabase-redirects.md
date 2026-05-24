# Redirects de correo en Supabase Auth

Documenta cómo configurar el dashboard de Supabase para que el enlace de
confirmación de correo aterrice en la vista `/auth/confirmado` del front en
lugar de la raíz del sitio (que por defecto queda en blanco si la URL no
matchea una ruta).

Contrato relacionado: `40db-backend/docs/auth.md §3` (signup + correo de
confirmación).

## Por qué

`supabase.auth.signUp(...)` admite `options.emailRedirectTo`. El front lo
setea a `${window.location.origin}/auth/confirmado` (ver `stores/auth.ts`).
Pero **Supabase rechaza cualquier URL que no esté en el whitelist** de
*Redirect URLs* del dashboard y, en ese caso, cae a *Site URL* (que por
defecto suele ser `http://localhost:3000` o la raíz del deploy). Por eso
hay que habilitar explícitamente la URL.

## Pasos

1. Entrar al dashboard del proyecto en `https://supabase.com/dashboard`.
2. Sidebar → **Authentication** → **URL Configuration**.
3. **Site URL**: dejar la URL principal de producción.
   - Dev local: `http://localhost:5173`
   - Producción: `https://<tu-dominio-en-vercel>`
4. **Redirect URLs** (lista): agregar **una entrada por entorno**. Cada una
   apunta a la vista de confirmación:
   - `http://localhost:5173/auth/confirmado`
   - `https://<tu-dominio-en-vercel>/auth/confirmado`
   - Si tu hosting genera preview URLs (Vercel preview deployments), agrega
     el patrón comodín: `https://*-<scope>.vercel.app/auth/confirmado`.
5. **Email Templates** → **Confirm signup**: el template default usa
   `{{ .ConfirmationURL }}`, que ya incorpora el `redirect_to` enviado por
   el SDK. No hay que tocar el HTML.

## Verificación

1. Hacer signup con un correo nuevo desde `/auth`.
2. Abrir el correo y clickear "Confirm your mail".
3. Debe abrirse `/<dominio>/auth/confirmado` con la pantalla de éxito.
4. Si aterriza en `/` en blanco, el `emailRedirectTo` cayó al `Site URL` →
   la URL no está en *Redirect URLs* (paso 4).

## Notas

- Si más adelante se habilita **recuperación de contraseña**, agregar otra
  ruta tipo `/auth/reset-password` y replicar el mismo proceso (otro
  `emailRedirectTo`, otra entrada en *Redirect URLs*).
- El SDK procesa el token automáticamente (`detectSessionInUrl: true` por
  default). Por eso al llegar a `/auth/confirmado` la sesión suele estar
  activa y la vista ofrece "Ir al inicio" en vez de "Iniciar sesión".
