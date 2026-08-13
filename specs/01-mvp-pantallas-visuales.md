# 01 — MVP: pantallas visuales de Arcade Vault

**Estado:** Implemented
**Depende de:** —
**Fecha:** 2026-08-12

**Objetivo:** Maquetar en Next.js 16 (App Router) las cinco pantallas de Arcade Vault definidas en `references/templates/` (Biblioteca, Detalle de juego, Reproductor, Autenticación, Salón de la Fama) como un MVP puramente visual, sin implementar ningún juego real.

## Alcance

**Incluye:**
- Portar el layout de navegación (`Nav`) y el shell de la app (fondo `.av-bg`/`.av-noise`, footer) desde `references/templates/app.jsx` y `nav.jsx` a `app/layout.tsx` (ya tiene fuentes y capas de fondo listas).
- Portar las 5 pantallas como rutas de App Router:
  - `/` — Biblioteca (`biblioteca.jsx`): hero, buscador, chips de categoría, grid de `GameCard`.
  - `/juego/[id]` — Detalle de juego (`detalle.jsx`): portada, tags, descripción, stats, leaderboard, acciones.
  - `/juego/[id]/jugar` — Reproductor (`reproductor.jsx`): HUD, marco CRT con arena decorativa animada, modal de fin de partida.
  - `/login` — Autenticación (`auth.jsx`): tabs iniciar sesión / crear cuenta, invitado, botones sociales decorativos.
  - `/salon` — Salón de la Fama (`salon.jsx`): tabs por juego, podio top 3, tabla de posiciones.
- Portar `data.jsx` a `lib/data.ts` (tipado): los 8 juegos, categorías y `seededScores`.
- Navegación real con `next/link` / `useRouter` (sin hash-routing manual).
- Simulación visual del reproductor conservada tal cual el template: puntuación que sube sola, HUD, pausa, modal de fin con formulario que solo actualiza estado local (sin persistencia).
- Estado de sesión de usuario (login/invitado) y guardado de puntuación **solo visual**: cambian la UI en la sesión de navegación actual (ej. vía Context o estado local elevado), pero no se persiste en localStorage ni hay validación real.
- Responsive: conservar los breakpoints ya definidos en el CSS portado (`@media (max-width: 840px)`, `720px`, `900px`).

**No incluye:**
- Ningún juego jugable real (Bloque Buster, Caída, Serpentina, etc.) — la pantalla de reproductor sigue siendo decorativa/simulada.
- Autenticación real (backend, validación de credenciales, OAuth con Google/GitHub — esos botones quedan decorativos y sin acción).
- Persistencia real de sesión o puntuaciones (ni localStorage ni base de datos).
- Tests automatizados (no hay test runner configurado en el proyecto).
- Cambios al `README.md` o a la metadata del proyecto más allá de lo ya existente.

## Modelo de datos

Se porta `references/templates/data.jsx` a `lib/data.ts` con tipos TypeScript:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS del generador de portada (ej. "cover-bricks")
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export const GAMES: Game[];
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Sesión de usuario visual (no persistida), definida donde se implemente (ej. `lib/session.ts` o Context junto al layout):

```ts
export interface SessionUser {
  name: string;
}
```

## Plan de implementación

1. Crear `lib/data.ts` portando `GAMES`, `CATS` y `seededScores` desde `references/templates/data.jsx`, tipado.
2. Crear un `SessionProvider` (Context de cliente) que exponga `user`, `login(user)`, `loginAsGuest()`, `signOut()` — todo en memoria, sin localStorage — y envolver `app/layout.tsx` con él.
3. Portar `Nav` a `components/nav.tsx` (client component) usando `usePathname`/`next/link` en vez de `route`/`navigate`, y montarlo en `app/layout.tsx` junto al footer ya sugerido por `app.jsx` (`© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0`).
4. Reemplazar `app/page.tsx` (plantilla por defecto de `create-next-app`) por la pantalla Biblioteca, con `components/game-card.tsx` para las tarjetas (incluye el efecto tilt con `onMouseMove`).
5. Crear `app/juego/[id]/page.tsx` con la pantalla Detalle, usando `GAMES.find` y `seededScores`; `notFound()` si el `id` no existe.
6. Crear `app/juego/[id]/jugar/page.tsx` con la pantalla Reproductor (client component por el `setInterval` de puntuación), consumiendo `SessionProvider` para el nombre por defecto y actualizando el estado de "mejor puntuación" solo en memoria (sin `onSaveScore` a localStorage).
7. Crear `app/login/page.tsx` con la pantalla Auth, usando `SessionProvider.login`/`loginAsGuest` y redirigiendo a `/` tras "enviar".
8. Crear `app/salon/page.tsx` con la pantalla Salón de la Fama, con tabs por juego y fila "tu mejor marca" visible solo si hay `user` en el `SessionProvider`.
9. Verificar con `npm run lint` y `npm run build` que no haya errores de tipos ni de ESLint.
10. Revisión visual manual en `npm run dev` de las 5 rutas y la navegación entre ellas (incluyendo el menú móvil hamburguesa).

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] `/` muestra el hero, buscador funcional (filtra por texto), chips de categoría funcionales (filtran por categoría) y grid de 8 juegos.
- [ ] Cada `GameCard` navega a `/juego/[id]` al hacer click en la tarjeta o en "JUGAR".
- [ ] `/juego/[id]` muestra portada, tags, descripción, stats y leaderboard (10 filas) del juego correspondiente; un `id` inexistente muestra 404.
- [ ] El botón "JUGAR AHORA" en detalle navega a `/juego/[id]/jugar`.
- [ ] `/juego/[id]/jugar` incrementa la puntuación automáticamente, permite pausar/reanudar, y el botón "FIN" abre el modal de fin de partida con input de iniciales y botón "GUARDAR PUNTUACIÓN" (guarda solo en estado local del modal, muestra el toast "PUNTUACIÓN GUARDADA").
- [ ] `/login` permite alternar entre tabs "INICIAR SESIÓN"/"CREAR CUENTA", enviar el formulario (navega a `/` y el Nav refleja el nombre del usuario), y "JUGAR COMO INVITADO" también navega a `/` sin usuario logueado.
- [ ] `/salon` muestra tabs por los 8 juegos, podio top 3 y tabla de posiciones (12 filas) que cambian al seleccionar otro juego.
- [ ] El menú hamburguesa móvil (`< 840px`) abre/cierra el panel lateral y navega correctamente.
- [ ] Ninguna pantalla usa `window.X` global ni hash-routing: toda la navegación usa rutas reales de Next.js.

## Decisiones tomadas y descartadas

- **Next.js App Router real en vez de hash-routing SPA**: se descarta replicar el `route`/`navigate` del template porque va contra las convenciones de Next.js indicadas en `CLAUDE.md`/`AGENTS.md`. Se gana URLs limpias y navegación idiomática (`next/link`, `useRouter`).
- **Sin persistencia real (localStorage) para sesión ni puntuaciones**: dado que el alcance es "solo la parte visual", se descarta portar la lógica de `localStorage` de `app.jsx`; el estado de sesión vive en memoria vía Context y se pierde al recargar. Se documenta explícitamente para que no se asuma persistencia real más adelante.
- **Reproductor mantiene la simulación visual completa** (puntuación subiendo sola, vidas, niveles, pausa): se descarta dejarlo estático porque el objetivo del MVP es dar sensación de app completa aunque no haya un juego real detrás.
- **CSS portado casi literal a `globals.css` en vez de reescribir en utilidades Tailwind**: ya está hecho en el repo (`app/globals.css` contiene las clases `.card`, `.btn`, `.chip`, `.crt`, etc. con las CSS vars ajustadas a `--font-pixel`/`--font-mono`). Se prioriza fidelidad visual con el diseño neón/pixel sobre "pureza" de utilidades Tailwind.
- **Un componente cliente por pantalla + `Nav` compartido en el layout**: estructura de carpetas más simple y alineada con App Router (`app/juego/[id]/page.tsx`, `app/juego/[id]/jugar/page.tsx`, etc.) en vez de una sola SPA con switch de rutas.
- **Datos mock tipados en `lib/data.ts`**: se portan los mismos 8 juegos y el generador `seededScores` del template, sin cambiar contenido ni cantidad.

## Riesgos identificados

- **Next.js 16 es más nuevo que la mayoría de los datos de entrenamiento**: según `AGENTS.md`, APIs y convenciones del App Router pueden diferir de lo esperado (ej. tipos de `params` en rutas dinámicas, manejo de `notFound()`, generación de metadata). Mitigación: leer `node_modules/next/dist/docs/01-app/` antes de escribir cada ruta nueva, especialmente `app/juego/[id]/page.tsx` y `app/juego/[id]/jugar/page.tsx`.
- **CSS global custom (`globals.css`) coexistiendo con Tailwind v4**: ambos comparten el mismo archivo vía `@import "tailwindcss"`; hay riesgo de colisión de nombres de clase o de que utilidades de Tailwind sobrescriban las clases custom (`.btn`, `.card`, etc.) según el orden de cascada. Mitigación: evitar mezclar utilidades Tailwind con las clases custom sobre el mismo elemento salvo que se verifique visualmente.
- **Simulación de puntuación con `setInterval` en el reproductor**: si no se limpia correctamente el intervalo al desmontar o navegar fuera de `/juego/[id]/jugar`, puede seguir corriendo en segundo plano o generar fugas de memoria. Mitigación: replicar el cleanup (`return () => clearInterval(t)`) del template al portar el efecto.
- **Estado de sesión solo en memoria (Context)**: al no persistir, cualquier recarga de página (F5) durante la revisión visual perderá el login — puede confundirse con un bug durante la verificación manual. Mitigación: dejarlo documentado en el alcance (ya cubierto) y no "arreglarlo" añadiendo persistencia fuera de este spec.
