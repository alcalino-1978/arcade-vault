# 04 — Autenticación real con Supabase

**Estado:** Approved
**Depende de:** SPEC 02
**Fecha:** 2026-08-17

**Objetivo:** Reemplazar el login/registro mock (`lib/session.tsx`, `app/login/page.tsx`) por autenticación real con Supabase Auth (email + contraseña), manteniendo intacto el modo invitado y el resto de la UI ya implementada.

## Alcance

**Incluye:**

- Instalar la dependencia `@supabase/supabase-js`.
- Crear `lib/supabase.ts` con un cliente de navegador único (`createClient(url, anonKey)`), usando `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` leídas de variables de entorno.
- Variables de entorno en `.env.local` (no versionado, ya cubierto por `.env*` en `.gitignore`):
  - `NEXT_PUBLIC_SUPABASE_URL=https://wrzehjnbwgxfpqjqpsay.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (la publishable/anon key del proyecto ya existente).
- Reescribir `lib/session.tsx` (`SessionProvider`/`useSession`) para que:
  - Al montar, lea la sesión actual con `supabase.auth.getSession()` y se suscriba a `supabase.auth.onAuthStateChange` para mantener `user` sincronizado.
  - `user` se deriva de la sesión de Supabase cuando existe (`{ name: session.user.user_metadata.display_name ?? session.user.email }`), o del estado local de invitado (`loginAsGuest`) cuando no hay sesión de Supabase.
  - `signOut()` invoca `supabase.auth.signOut()` cuando hay sesión de Supabase; si el usuario actual es invitado, solo limpia el estado local (comportamiento actual).
  - Se añaden `signUpWithPassword(email, password, displayName)` y `signInWithPassword(email, password)` que devuelven `{ ok: true }` o `{ ok: false, error: string }` (usando el mensaje de error que devuelve Supabase), consumidos desde `LoginPage`.
  - `loginAsGuest()` se mantiene exactamente igual que hoy (estado local, sin llamar a Supabase).
- Reescribir `app/login/page.tsx`:
  - El campo "Usuario" del tab "INICIAR SESIÓN" cambia a "Correo electrónico" (`type="email"`).
  - El tab "CREAR CUENTA" mantiene su campo "Correo electrónico" existente y añade un campo "Nombre de jugador" (el actual campo "Usuario", renombrado) que se guarda como `display_name` en `options.data` de `supabase.auth.signUp`.
  - `onSubmit` valida campos vacíos (dispara el efecto `shake` ya usado en SPEC 03) y, si pasan, invoca `signInWithPassword` o `signUpWithPassword` según el tab activo, mostrando un estado de carga en el botón de submit ("ENTRANDO…" / "CREANDO…") mientras la llamada está en curso.
  - Si Supabase devuelve error (credenciales inválidas, email ya registrado, contraseña débil, etc.), se muestra el mensaje de error de Supabase debajo del formulario junto con el efecto `shake`; los datos escritos no se pierden y el usuario puede reintentar.
  - En éxito, navega a `/games` igual que hoy.
  - "JUGAR COMO INVITADO" sigue llamando a `loginAsGuest()` y navegando a `/games`, sin tocar Supabase.
  - Los botones sociales (Google/GitHub) se mantienen como placeholder visual sin funcionalidad (igual que hoy).
- `components/nav.tsx` no cambia de estructura: ya usa `user`/`signOut` de `useSession`, que ahora reflejan sesión real de Supabase cuando corresponda.
- Configurar en el proyecto de Supabase (`wrzehjnbwgxfpqjqpsay`) la desactivación de "Confirm email" en Auth settings, para que el usuario quede autenticado inmediatamente tras `signUp` (paso manual del usuario en el dashboard — no hay herramienta MCP disponible para cambiar esta configuración).
- Verificación con Playwright MCP: registrar un usuario de prueba real contra el proyecto de Supabase, confirmar redirección a `/games` y que el Nav muestra el nombre de jugador; cerrar sesión y volver a iniciar sesión con las mismas credenciales; probar credenciales inválidas y ver el mensaje de error; recargar la página tras iniciar sesión y confirmar que la sesión persiste (comportamiento por defecto de `@supabase/supabase-js`, que guarda la sesión en `localStorage`).

**No incluye:**

- OAuth con Google/GitHub — los botones quedan como placeholder, sin conectar (decisión explícita en Fase 2).
- `@supabase/ssr`, middleware, o cualquier verificación de sesión en Server Components/rutas de servidor — no existen rutas protegidas en servidor hoy que lo requieran.
- Persistencia de puntuaciones, Salón de la Fama, o cualquier tabla nueva en la base de datos (`lib/data.ts` y `seededScores()` no se tocan) — el proyecto de Supabase no tiene tablas hoy y este spec no crea ninguna.
- Recuperación de contraseña ("olvidé mi contraseña"), cambio de contraseña, o edición de perfil.
- Mensajes de error traducidos/mapeados por tipo — se muestra el mensaje que devuelve Supabase tal cual (decisión explícita en Fase 2).
- Convertir una sesión de invitado en una cuenta real ("upgrade" de invitado a usuario registrado).
- Rutas protegidas: `/games`, `/salon`, `/juego/[id]` siguen siendo accesibles sin sesión, igual que hoy.
- Tests automatizados (no hay test runner configurado en el proyecto).

## Modelo de datos

Esta pantalla no introduce tablas nuevas en Supabase — usa exclusivamente `auth.users`, ya provisto por Supabase Auth. El único dato adicional es la metadata `display_name` guardada en `user_metadata` al hacer `signUp`:

```ts
// options.data pasado a supabase.auth.signUp
{ display_name: string } // nombre de jugador introducido en "Crear cuenta"
```

`SessionUser` en `lib/session.tsx` mantiene su forma actual (`{ name: string }`), derivada de `user_metadata.display_name` o del email cuando no hay `display_name`.

## Plan de implementación

1. Leer `node_modules/next/dist/docs/01-app/` según lo indicado en `AGENTS.md` antes de tocar `lib/session.tsx` (Client Components, contexto de React) y `app/login/page.tsx`.
2. Instalar la dependencia `@supabase/supabase-js` (`npm install @supabase/supabase-js`).
3. Crear/actualizar `.env.local` con `NEXT_PUBLIC_SUPABASE_URL=https://wrzehjnbwgxfpqjqpsay.supabase.co` y `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del proyecto>`.
4. Crear `lib/supabase.ts` exportando un cliente único `supabase = createClient(...)` construido con esas variables de entorno.
5. Reescribir `lib/session.tsx`: `SessionProvider` sincroniza `user` con `supabase.auth.getSession()` + `onAuthStateChange`, añade `signUpWithPassword`/`signInWithPassword`, mantiene `loginAsGuest`/`signOut` con la lógica híbrida (Supabase si hay sesión real, local si es invitado) descrita en Alcance.
6. Reescribir `app/login/page.tsx`: campo email en ambos tabs, campo "Nombre de jugador" en registro, `onSubmit` async con estado de carga y de error conectado a `signInWithPassword`/`signUpWithPassword`.
7. En el dashboard de Supabase del proyecto `wrzehjnbwgxfpqjqpsay`, desactivar "Confirm email" en Authentication → Settings (paso manual, documentado también en Riesgos).
8. Verificar con `npm run lint` y `npm run build` que no haya errores de tipos ni de ESLint.
9. Levantar `npm run dev` y usar Playwright MCP para: registrar un usuario nuevo (ver redirección a `/games` y nombre en Nav), cerrar sesión, iniciar sesión con esas credenciales, probar credenciales inválidas (ver mensaje de error + shake), y recargar la página para confirmar que la sesión persiste.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] Registrarse con email, contraseña y nombre de jugador válidos crea el usuario en Supabase, autentica la sesión y redirige a `/games`.
- [ ] Tras registrarse/iniciar sesión, el Nav muestra el nombre de jugador (`display_name` o email) en lugar de "Iniciar Sesión".
- [ ] Cerrar sesión desde el Nav (botón con el nombre de usuario) invoca `supabase.auth.signOut()` y vuelve a mostrar "Iniciar Sesión".
- [ ] Iniciar sesión con un email y contraseña ya registrados autentica correctamente y redirige a `/games`.
- [ ] Iniciar sesión con credenciales inválidas muestra el mensaje de error devuelto por Supabase junto con el efecto `shake`, sin perder los datos escritos, y permite reintentar.
- [ ] Registrarse con un email ya usado muestra un mensaje de error equivalente, sin crear una sesión.
- [ ] Enviar el formulario con campos vacíos dispara el efecto `shake` y no llama a Supabase.
- [ ] Mientras la petición a Supabase está en curso, el botón de submit se deshabilita y muestra un estado de carga.
- [ ] "JUGAR COMO INVITADO" sigue funcionando exactamente igual que antes (sin crear usuario en Supabase) y redirige a `/games`.
- [ ] Recargar la página después de iniciar sesión mantiene la sesión activa (no hay que volver a loguearse).
- [ ] Los botones sociales (Google/GitHub) siguen presentes visualmente pero sin funcionalidad.
- [ ] Ninguna pantalla usa `window.X` global ni hash-routing: toda la navegación usa rutas reales de Next.js.

## Decisiones tomadas y discartadas

- **Cliente de navegador (`@supabase/supabase-js`) en lugar de `@supabase/ssr`**: se descarta la variante SSR/cookies + middleware porque hoy no existe ninguna ruta protegida en servidor; todas las pantallas ya son Client Components. Se prioriza la opción más simple que cubre el alcance actual.
- **Autenticación solo email + contraseña**: se descarta conectar OAuth (Google/GitHub) en este spec porque los botones ya existen como placeholder sin funcionalidad y añadir providers reales requiere configuración adicional en el dashboard de Supabase fuera del alcance pedido.
- **Login por email en lugar de "usuario"**: el campo "Usuario" del tab de login se renombra a "Correo electrónico" porque Supabase Auth con contraseña autentica por email; mantener un username distinto habría requerido una tabla/RPC adicional para resolver username → email, fuera de alcance.
- **`display_name` como metadata de `auth.users` en lugar de una tabla `profiles`**: se descarta crear una tabla nueva porque el único dato adicional necesario es el nombre visible en el Nav, y `user_metadata` de Supabase Auth ya lo cubre sin introducir modelo de datos nuevo.
- **Modo invitado se mantiene 100% local**: se descarta crear una sesión anónima de Supabase (`signInAnonymously`) para el invitado porque el comportamiento actual (sin persistencia, solo estado en memoria) ya cumple lo que la app necesita y evita usuarios anónimos acumulándose en el proyecto de Supabase.
- **Mensajes de error de Supabase sin traducir**: se descarta mapear cada código de error a un mensaje en español porque no fue solicitado y añade superficie de mantenimiento; se reutiliza el patrón ya validado en SPEC 03 (mensaje de error simple + reintento).
- **Sin recuperación de contraseña ni edición de perfil**: quedan fuera porque no se pidieron y ampliarían el spec por encima de una funcionalidad ("un spec, una funcionalidad").

## Riesgos identificados

- **"Confirm email" activado por defecto en Supabase**: si el proyecto tiene la confirmación de email activada, `signUp` no autenticará inmediatamente al usuario y el flujo de "crear cuenta → redirigir a /games" fallará. Mitigación: paso manual documentado en el plan (paso 7) para desactivarlo en Authentication → Settings antes de probar; no hay herramienta MCP para automatizar este cambio.
- **Exposición de la anon key en el cliente**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` es pública por diseño (protegida por Row Level Security en las tablas, que hoy no existen). Mitigación: no se crea ninguna tabla en este spec, así que no hay datos sensibles expuestos todavía; cualquier tabla futura deberá definir políticas RLS explícitas.
- **Next.js 16 más nuevo que la mayoría de los datos de entrenamiento**: según `AGENTS.md`, hay que leer `node_modules/next/dist/docs/01-app/` antes de modificar `lib/session.tsx` (Context/Client Components) y `app/login/page.tsx`.
- **Persistencia de sesión vía `localStorage`**: el comportamiento por defecto de `@supabase/supabase-js` en navegador guarda la sesión en `localStorage`, lo que no funciona en modo incógnito/privado restringido. Mitigación: aceptable para el alcance actual (no hay requisito de soportar ese caso); si falla, el usuario simplemente vuelve a loguearse.
