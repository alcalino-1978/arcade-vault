# 02 — Home landing de Arcade Vault

**Estado:** Implemented
**Depende de:** SPEC 01
**Fecha:** 2026-08-13

**Objetivo:** Portar la pantalla Home (landing) de `references/templates/home-about/home.jsx` a la ruta raíz `/`, moviendo la actual pantalla Biblioteca de `/` a `/games`.

## Alcance

**Incluye:**
- Portar `home.jsx` como el nuevo `app/page.tsx` (client component, ya que usa `useState`/`useEffect`/`IntersectionObserver`): hero con siluetas flotantes animadas, sección "¿Por qué Arcade Vault?" (feature grid), preview de 6 juegos (`MiniCard`, tomados de `GAMES` en `lib/data.ts`), sección de stats, sección "Actividad en vivo" (ticker de puntuaciones + top jugadores, con los mismos arrays de datos mock hardcodeados del template, sin conectarlos a `lib/data.ts`), sección de precios (plan único gratis + FAQ) y CTA final.
- Subcomponentes de Home (`FloatingSilhouettes`, `MiniCard`, `FeatureIcon`) definidos dentro del propio `app/page.tsx`, igual que en el template — no se extraen a `components/`.
- Efecto "reveal on scroll" (`useReveal`, `IntersectionObserver` sobre `.reveal`) portado tal cual.
- Mover la pantalla Biblioteca actual (contenido de `app/page.tsx` existente: hero, buscador, chips, grid de `GameCard`) a `app/games/page.tsx`.
- Actualizar `components/nav.tsx`:
  - Añadir un enlace "Inicio" hacia `/` (desktop y menú móvil).
  - Renombrar el identificador interno `isActive("biblioteca")` a `isActive("games")`; el link pasa a apuntar a `/games` y su texto visible cambia de "Biblioteca" a "Juegos".
  - El logo (`onClick`) sigue navegando a `/` (ahora el nuevo Home).
  - No se añade ningún enlace "Acerca de" (fuera de alcance).
- Actualizar las 4 redirecciones/enlaces internos que hoy apuntan a `/` para que apunten a `/games` (preservan su comportamiento de "volver a la biblioteca"):
  - `app/salon/page.tsx`: botón "VOLVER A LA BIBLIOTECA".
  - `app/juego/[id]/page.tsx`: botón "VOLVER AL VAULT".
  - `app/juego/[id]/jugar/page.tsx`: botón "VOLVER AL VAULT".
  - `app/login/page.tsx`: `router.push("/")` tras enviar el formulario y tras "Jugar como invitado".
- Los botones internos de Home que navegan a la biblioteca (`EXPLORAR JUEGOS`, `VER TODOS LOS JUEGOS →`, `INSERTAR MONEDA →`, click en `MiniCard`) usan `next/link` / `useRouter` hacia `/games` (o `/juego/[id]` para las `MiniCard`); los que navegan a login (`CREAR CUENTA`, `EMPEZAR GRATIS →`) apuntan a `/login`.
- Portar a `app/globals.css` los estilos de `references/templates/home-about/styles.css` correspondientes a las clases usadas por Home: `.home-*`, `.mini-*`, `.feature-*`, `.ft-*`, `.stat-*`, `.activity-*`, `.ac-*`, `.ticker`, `.tick-*`, `.tp-*`, `.top-*`, `.pricing-*`, `.price-*`, `.pc-*`, `.faq-*`, `.final-*`, y las variantes responsive (`@media`) que las acompañen.
- Verificación visual con Playwright MCP: navegar a `/` y `/games` en viewport desktop y en viewport móvil (<840px), capturar screenshots de ambas rutas y ambos breakpoints, y revisar que las secciones, el Nav (incluyendo el menú hamburguesa en móvil) y el layout general coincidan con el diseño del template.

**No incluye:**
- La pantalla "Acerca de" (`about.jsx`) ni ninguna ruta `/about` — explícitamente fuera de alcance de este spec.
- Cambiar el contenido, estructura interna o estilos propios de la pantalla Biblioteca — solo se mueve de ruta.
- Renombrar `components/game-card.tsx` ni otros componentes compartidos que no son específicos de la pantalla Biblioteca.
- Conectar las secciones "Actividad en vivo" / "Top jugadores" a datos reales de `lib/data.ts` (`seededScores`) — se portan como arrays estáticos igual que en el template.
- Persistencia, autenticación real o cualquier lógica de backend (sigue fuera de alcance, igual que en SPEC 01).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Modelo de datos

Esta pantalla no introduce estructuras de datos nuevas. Reutiliza `GAMES` de `lib/data.ts` (ya existente, portado en SPEC 01) para la sección de preview de juegos. Las secciones "Actividad en vivo" y "Top jugadores" usan arrays literales locales al componente `Home` (mismos valores del template), sin tipo exportado.

## Plan de implementación

1. Leer `node_modules/next/dist/docs/01-app/` según lo indicado en `AGENTS.md` antes de tocar rutas (nueva carpeta `app/games/`, cambios en `app/page.tsx`).
2. Crear `app/games/page.tsx` moviendo el contenido actual de `app/page.tsx` (pantalla Biblioteca) sin cambios funcionales.
3. Reescribir `app/page.tsx` con la pantalla Home portada de `home.jsx`: hero + `FloatingSilhouettes`, sección de features, preview de juegos con `MiniCard` (usa `GAMES.slice(0, 6)` y navega a `/juego/[id]`), sección de stats, sección de actividad (ticker + top jugadores con datos mock), sección de precios/FAQ, CTA final. Todos los `navigate(...)` del template se traducen a `next/link` / `useRouter().push(...)` hacia `/games`, `/login` o `/juego/[id]` según corresponda.
4. Portar los estilos de `references/templates/home-about/styles.css` relevantes para Home a `app/globals.css` (clases listadas en Alcance), sin tocar las clases ya portadas en SPEC 01.
5. Actualizar `components/nav.tsx`: añadir enlace "Inicio" (`/`), renombrar `isActive("biblioteca")` a `isActive("games")` y apuntar el link a `/games` con el texto "Juegos" (en versión desktop y en el panel móvil).
6. Actualizar los 4 puntos de navegación interna que hoy apuntan a `/` (`app/salon/page.tsx`, `app/juego/[id]/page.tsx`, `app/juego/[id]/jugar/page.tsx`, `app/login/page.tsx`) para que apunten a `/games`.
7. Verificar con `npm run lint` y `npm run build` que no haya errores de tipos ni de ESLint.
8. Levantar `npm run dev` y usar Playwright MCP para navegar a `/` y `/games` en desktop y en viewport móvil (<840px), capturar screenshots y revisar visualmente cada sección, el Nav y el menú hamburguesa contra el diseño del template.

## Criterios de aceptación

- [x] `npm run build` compila sin errores.
- [x] `npm run lint` pasa sin errores.
- [x] `/` muestra la pantalla Home: hero con siluetas flotantes, sección de features (4 tarjetas), preview de 6 juegos desde `GAMES`, sección de stats, sección de actividad (ticker + top jugadores), sección de precios con FAQ, y CTA final.
- [x] `/games` muestra la pantalla Biblioteca (buscador, chips de categoría, grid de `GameCard`) exactamente como antes de este spec.
- [x] El Nav muestra "Inicio" (activo en `/`) y "Juegos" (activo en `/games` y en `/juego/[id]`), en desktop y en el panel móvil.
- [x] En Home, los botones "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/login`; cada `MiniCard` navega a `/juego/[id]` correspondiente.
- [x] "VOLVER A LA BIBLIOTECA" (salón) y "VOLVER AL VAULT" (detalle y reproductor) navegan a `/games`.
- [x] Tras enviar el formulario de login o pulsar "JUGAR COMO INVITADO" en `/login`, la navegación resultante es a `/games`.
- [x] El efecto "reveal on scroll" de las secciones de Home se activa al hacer scroll (las secciones aparecen con la clase `.in` al entrar en viewport).
- [x] El menú hamburguesa móvil (`< 840px`) en `/` y en `/games` abre/cierra el panel lateral y navega correctamente, incluyendo el nuevo enlace "Inicio".
- [x] Ninguna pantalla usa `window.X` global ni hash-routing: toda la navegación usa rutas reales de Next.js.
- [x] Verificación visual con Playwright MCP completada: screenshots de `/` y `/games` en desktop y móvil revisados sin discrepancias visuales relevantes contra el template.

## Decisiones tomadas y descartadas

- **Home reemplaza a Biblioteca en `/`, Biblioteca se muda a `/games`**: se descarta añadir Home en una ruta secundaria (ej. `/inicio`) porque replica fielmente la separación "Inicio" / "Biblioteca" del `nav.jsx` del template, donde ambas son pantallas de primer nivel distintas.
- **Sin enlace "Acerca de" en el Nav**: dado que la pantalla `about` está fuera de alcance, se omite el enlace por completo en vez de dejarlo como placeholder apuntando a `/`, para no mostrar navegación a contenido inexistente.
- **Datos de "Actividad en vivo" y "Top jugadores" como arrays estáticos en el componente**: se descarta generarlos desde `seededScores`/`GAMES` de `lib/data.ts` porque el template no lo hace así y añadiría lógica no solicitada; se prioriza fidelidad al template, igual que el criterio ya usado en SPEC 01.
- **Renombrado mínimo (solo ruta + `isActive` en Nav)**: se descarta renombrar `components/game-card.tsx` u otros archivos compartidos porque no son específicos de la pantalla Biblioteca y renombrarlos aumentaría el diff sin beneficio funcional.
- **El link del Nav hacia `/games` se muestra como "Juegos" (no "Biblioteca")**: decisión revisada durante la implementación (Fase 4) a petición explícita del usuario. El resto de textos que mencionan "biblioteca" en la UI (ej. botón "VOLVER A LA BIBLIOTECA" en `/salon`) quedan sin cambios — el pedido fue acotado al link principal del Nav.
- **Home como un único client component en `app/page.tsx` con subcomponentes internos**: se descarta extraer `MiniCard`, `FeatureIcon` y `FloatingSilhouettes` a `components/` porque ninguno se reutiliza fuera de Home, igual que en el template original.
- **Los 4 puntos de navegación interna que apuntaban a `/` (salón, detalle, reproductor, login) se actualizan a `/games`**: preservan su comportamiento original de "volver a la biblioteca / lista de juegos" en vez de heredar el nuevo significado de `/` como landing.

## Riesgos identificados

- **Colisión de nombres de clase CSS al portar `styles.css` de Home**: las clases `.home-*`, `.feature-*`, `.stat-*`, etc. son nuevas, pero conviven en el mismo `app/globals.css` con las clases ya portadas en SPEC 01 (`.card`, `.btn`, `.chip`, etc.) bajo Tailwind v4. Mitigación: portar solo las clases listadas en el Alcance y verificar visualmente que no haya solapamiento con clases existentes.
- **`IntersectionObserver` en un componente Server-first (App Router)**: `app/page.tsx` debe marcarse `"use client"` para poder usar `useEffect`/`useState`, igual que ya ocurre en el `app/page.tsx` actual de Biblioteca. Mitigación: mantener el mismo patrón ya validado en SPEC 01.
- **Next.js 16 más nuevo que la mayoría de los datos de entrenamiento**: según `AGENTS.md`, hay que leer `node_modules/next/dist/docs/01-app/` antes de crear la nueva carpeta `app/games/` y modificar `app/page.tsx`.
