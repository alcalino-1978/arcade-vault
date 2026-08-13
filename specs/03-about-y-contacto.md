# 03 — About y formulario de contacto con envío de correo

**Estado:** Implementado
**Depende de:** SPEC 02
**Fecha:** 2026-08-13

**Objetivo:** Portar la pantalla "Acerca de" (`references/templates/home-about/about.jsx`) a la ruta `/about`, conectando su formulario de contacto a un envío de correo real vía Resend.

## Alcance

**Incluye:**
- Portar `about.jsx` a `app/about/page.tsx`: sección hero (misión + 3 `highlight` con iconos SVG), divisor animado, y sección de contacto (`contact-intro` con tips + `contact-form`).
- Efecto "reveal on scroll" (mismo patrón `useReveal` ya usado en `app/page.tsx`) sobre `.about-divider` y `.about-contact`.
- Subcomponente `HighlightIcon` (SVG pixel-art: HEART, BROWSER, PLANT) definido dentro de `app/about/page.tsx`, igual que en el template — no se extrae a `components/`.
- Formulario de contacto (nombre, correo electrónico, mensaje):
  - Validación cliente: campos vacíos disparan el efecto `shake` ya presente en el template; el campo correo además valida formato básico de email antes de invocar el envío.
  - Envío real de correo mediante un **Server Action** (`"use server"`) en `app/about/actions.ts`, que usa el SDK `resend` para enviar el mensaje.
  - Estado de éxito: mismo panel `terminal-success` del template (con el nombre del remitente), con botón "ENVIAR OTRO MENSAJE" que resetea el formulario.
  - Estado de error (si Resend falla — API key inválida, error de red, etc.): se muestra un mensaje de error simple debajo del formulario, los datos escritos por el usuario no se pierden, y puede reintentar el envío.
  - Estado de carga mientras el Server Action está en curso (botón "▶ ENVIAR MENSAJE" deshabilitado con texto "ENVIANDO…").
- Remitente ("from") del correo: `onboarding@resend.dev` (remitente de pruebas de Resend, no requiere dominio propio verificado).
- Destinatario del correo: `alcalino_78@hotmail.com` (fijo, hardcodeado — no configurable desde el formulario).
- Asunto y cuerpo del correo generados a partir de los campos del formulario (nombre, email del remitente como reply-to, mensaje).
- Instalar la dependencia `resend` (paquete npm oficial).
- Variable de entorno `RESEND_API_KEY`, leída en el Server Action vía `process.env.RESEND_API_KEY`. Se crea `.env.local` (ya cubierto por `.env*` en `.gitignore`) con un placeholder, y se documenta en el spec que el usuario debe reemplazarlo con su propia API key de Resend antes de poder enviar correos en desarrollo.
- Actualizar `components/nav.tsx`: añadir el enlace "Acerca de" (desktop y panel móvil) apuntando a `/about`, con `isActive("about")`, en la misma posición relativa que tiene en `nav.jsx` del template (después de "Salón de la Fama").
- Portar a `app/globals.css` los estilos de `references/templates/home-about/styles.css` correspondientes a las clases usadas por About: `.about-*`, `.highlight*`, `.hl-*`, `.contact-*`, `.tip*`, `.terminal-success`, `.term-*`, y las variantes responsive (`@media`) que las acompañen. Se añade además un estilo simple para el mensaje de error del formulario (no presente en el template).
- Verificación visual con Playwright MCP: navegar a `/about` en viewport desktop y móvil (<840px), capturar screenshots, revisar hero, highlights, divisor, formulario y estado de éxito contra el diseño del template. Probar el envío real de un mensaje de prueba (con `RESEND_API_KEY` configurada) y confirmar que llega el correo.

**No incluye:**
- Cambiar el contenido, textos o estructura del resto de pantallas ya implementadas (Home, Juegos, Salón, Login).
- Persistencia de los mensajes de contacto en base de datos — solo se envían por correo, no se guardan.
- Rate limiting, protección anti-spam (captcha, honeypot) o límites de longitud en los campos — fuera de alcance de este spec.
- Verificar un dominio propio en Resend — se usa el remitente de pruebas `onboarding@resend.dev`.
- Permitir configurar el destinatario del correo desde la UI o desde variables de entorno — queda hardcodeado a `alcalino_78@hotmail.com`.
- Tests automatizados (no hay test runner configurado en el proyecto).
- Notificaciones push, confirmación por correo al remitente, u otro tipo de automatización adicional sobre el mensaje recibido.

## Modelo de datos

Esta pantalla no introduce estructuras de datos persistentes. El Server Action recibe un objeto con `{ name: string; email: string; message: string }` (validado en el cliente antes de invocarlo) y lo pasa directamente a la llamada de `resend.emails.send(...)`; no hay tipo exportado ni almacenamiento.

## Plan de implementación

1. Leer `node_modules/next/dist/docs/01-app/` según lo indicado en `AGENTS.md` antes de crear la nueva carpeta `app/about/` y el Server Action.
2. Instalar la dependencia `resend` (`npm install resend`).
3. Crear `.env.local` con `RESEND_API_KEY=` (placeholder vacío o de ejemplo) — no versionado, ya cubierto por `.env*` en `.gitignore`.
4. Crear `app/about/actions.ts` con un Server Action `sendContactMessage(data: { name: string; email: string; message: string })` que:
   - Instancia `Resend` con `process.env.RESEND_API_KEY`.
   - Envía el correo con `from: "onboarding@resend.dev"`, `to: "alcalino_78@hotmail.com"`, `replyTo: data.email`, asunto con el nombre del remitente, y cuerpo con nombre/email/mensaje.
   - Devuelve `{ ok: true }` en éxito o `{ ok: false, error: string }` si Resend lanza un error (capturado con try/catch).
5. Crear `app/about/page.tsx` (client component) portando `about.jsx`: hero con highlights, divisor, sección de contacto con formulario controlado (`useState` para `form`, `sent`, `shake`, `error`, `pending`).
   - `onSubmit` valida campos vacíos (dispara `shake`) y formato de email; si pasa, invoca `sendContactMessage` (mostrando estado `pending`) y según el resultado setea `sent` o `error`.
6. Portar `HighlightIcon` como subcomponente interno de `app/about/page.tsx`.
7. Portar a `app/globals.css` los estilos de `references/templates/home-about/styles.css` relevantes para About (clases listadas en Alcance) y añadir un estilo mínimo para el mensaje de error del formulario.
8. Actualizar `components/nav.tsx`: añadir el enlace "Acerca de" (`/about`) con `isActive("about")` en desktop y en el panel móvil, después de "Salón de la Fama".
9. Verificar con `npm run lint` y `npm run build` que no haya errores de tipos ni de ESLint.
10. Levantar `npm run dev`, configurar `RESEND_API_KEY` real en `.env.local`, y usar Playwright MCP para navegar a `/about` en desktop y móvil, capturar screenshots, revisar visualmente cada sección y el Nav actualizado. Enviar un mensaje de prueba desde el formulario y confirmar que el correo llega a `alcalino_78@hotmail.com`, así como que el estado de error se muestra correctamente si se usa una API key inválida.

## Criterios de aceptación

- [x] `npm run build` compila sin errores.
- [x] `npm run lint` pasa sin errores.
- [x] `/about` muestra la pantalla About: hero con misión y 3 highlights, divisor animado, sección de contacto con tips y formulario.
- [x] El Nav muestra "Acerca de" (activo en `/about`), en desktop y en el panel móvil, después de "Salón de la Fama".
- [x] Enviar el formulario con campos vacíos dispara el efecto `shake` y no invoca el envío de correo.
- [x] Enviar el formulario con un email de formato inválido muestra el efecto `shake` (o feedback equivalente) sin invocar el envío.
- [x] Enviar el formulario con datos válidos y `RESEND_API_KEY` configurada correctamente envía un correo real a `alcalino_78@hotmail.com` con nombre, email (como reply-to) y mensaje del remitente, y muestra el panel `terminal-success` con el nombre del remitente.
- [x] "ENVIAR OTRO MENSAJE" desde el estado de éxito resetea el formulario a sus campos vacíos.
- [x] Si el envío falla (ej. `RESEND_API_KEY` inválida), se muestra un mensaje de error visible, los datos del formulario no se pierden, y el usuario puede reintentar.
- [x] Mientras el envío está en curso, el botón de envío se deshabilita y muestra un estado de carga.
- [x] El efecto "reveal on scroll" se activa en el divisor y en la sección de contacto al hacer scroll.
- [x] Verificación visual con Playwright MCP completada: screenshots de `/about` en desktop y móvil revisados sin discrepancias visuales relevantes contra el template.
- [x] Ninguna pantalla usa `window.X` global ni hash-routing: toda la navegación usa rutas reales de Next.js.

## Decisiones tomadas y descartadas

- **Envío vía Server Action en lugar de Route Handler**: se prefiere un Server Action (`app/about/actions.ts`) invocado directamente desde el formulario porque es el patrón idiomático de App Router para mutaciones simples desde un form, y evita exponer un endpoint HTTP adicional sin necesidad.
- **Remitente `onboarding@resend.dev`**: se descarta usar un dominio propio verificado porque el proyecto no tiene uno configurado en Resend; se documenta como decisión temporal, cambiable más adelante si se verifica un dominio.
- **Destinatario fijo `alcalino_78@hotmail.com`**: se descarta hacerlo configurable vía variable de entorno o UI porque no hay ese requisito — es el único destinatario del proyecto en este momento.
- **Estado de error visible con reintento**: se descarta la alternativa de loguear el error solo en servidor y mostrar siempre éxito en la UI, porque induciría al usuario a creer que su mensaje llegó cuando no fue así.
- **Validación de email añadida sobre el template**: el template original (`about.jsx`) solo valida campos no vacíos. Se añade validación de formato de email porque ahora el envío es real (a diferencia del template, que solo simulaba el éxito) y un email mal formado haría fallar el `replyTo` silenciosamente.
- **Sin rate limiting ni captcha**: se descarta por estar fuera del alcance solicitado; el proyecto no tiene backend con persistencia ni sistema de usuarios que lo justifique todavía.
- **`HighlightIcon` como subcomponente interno de `app/about/page.tsx`**: se descarta extraerlo a `components/` porque no se reutiliza fuera de About, siguiendo el mismo criterio ya aplicado a `FeatureIcon`/`MiniCard` en SPEC 02.
- **Enlace "Acerca de" añadido al Nav ahora**: revierte la decisión de SPEC 02 de omitirlo, dado que ese spec lo excluyó explícitamente solo porque `/about` no existía todavía.

## Riesgos identificados

- **`RESEND_API_KEY` ausente o inválida en desarrollo**: sin la key configurada en `.env.local`, cualquier envío fallará y mostrará el estado de error. Mitigación: el spec documenta la creación de `.env.local` con placeholder y la necesidad de que el usuario configure su propia key antes de probar el envío real.
- **Remitente de pruebas `onboarding@resend.dev` con límites de uso**: Resend puede limitar o marcar como spam los correos enviados desde el remitente compartido de pruebas. Mitigación: aceptable para el alcance actual (sin dominio propio verificado); se documenta como decisión temporal en la sección de decisiones.
- **Next.js 16 más nuevo que la mayoría de los datos de entrenamiento**: según `AGENTS.md`, hay que leer `node_modules/next/dist/docs/01-app/` (en particular la sección de Server Actions / `"use server"`) antes de crear `app/about/actions.ts`.
- **Colisión de nombres de clase CSS al portar `styles.css` de About**: las clases `.about-*`, `.contact-*`, `.terminal-success`, etc. son nuevas, pero conviven en `app/globals.css` con las clases ya portadas en SPEC 01/02. Mitigación: portar solo las clases listadas en el Alcance y verificar visualmente que no haya solapamiento.
