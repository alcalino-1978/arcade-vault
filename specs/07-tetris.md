# 07 — Tetris jugable, y extracción del wrapper genérico de juegos canvas

**Estado:** Approved
**Depende de:** SPEC 05, SPEC 06
**Fecha:** 2026-08-18

**Objetivo:** Portar el clon de Tetris en canvas vanilla de `references/started-games/03-tetris/game.js` a un componente React con `id: "tetris"`, y de paso extraer de `AsteroidsGame.tsx` el wrapper/hooks genéricos y el `registry.ts` de juegos que las decisiones de arquitectura de esta skill exigen desde la primera integración adicional.

## Alcance

**Incluye:**

- Crear `components/games/TetrisGame.tsx`: componente canvas que porta el tablero, las piezas, la rotación con wall-kick, el line-clear, el scoring y la aceleración por nivel de `references/started-games/03-tetris/game.js`, siguiendo el mismo patrón de props que `AsteroidsGame.tsx` (estado encapsulado en el `useEffect` del componente, sin variables de módulo compartidas).
- El tablero (10×20 bloques de 30px) y el panel de "siguiente pieza" se dibujan **en el mismo `<canvas width={800} height={600}>`** — sin canvas secundario — el tablero a la izquierda y el panel de siguiente pieza a la derecha, dentro del mismo contexto de dibujo.
- Extraer de `AsteroidsGame.tsx` dos utilidades genéricas reutilizadas por `TetrisGame.tsx`:
  - `lib/games/useLatestRef.ts`: hook `useLatestRef<T>(value: T)` que sustituye los `useEffect` repetidos que sincronizan `pausedRef`/`cbScore`/`cbLives`/`cbLevel`/`cbOver` en un ref siempre actualizado, sin re-disparar el `useEffect` principal del juego.
  - `lib/games/useCanvasKeyboard.ts`: hook que registra `keydown`/`keyup` en `window` al montar y los retira al desmontar, exponiendo `keys` (mapa de teclas activas) y `pressed(code)` (edge-trigger de una sola pulsación) — sustituye el bloque de `onKeyDown`/`onKeyUp`/`justPressed` duplicado en cada motor de juego.
- Crear `components/games/registry.ts`: mapa `id → { Component, stats }`, donde `Component` es el componente canvas del juego (mismo contrato de props que `AsteroidsGame.tsx`: `paused`, `onScoreChange`, `onLevelChange`, `onGameOver`, y opcionalmente `onLivesChange`/`onLinesChange`) y `stats` es la lista de filas extra de HUD que ese juego reporta (`'lives'` para asteroids, `'lines'` para tetris), para que la página de juego sepa qué filas mostrar sin hardcodear por `id`.
- Unificar `app/games/[id]/play/page.tsx` (hoy el reproductor simulado con `setInterval`) con la lógica real de HUD/modal/guardado que hoy vive duplicada en `app/games/asteroids/play/page.tsx`: si `registry[id]` existe, se monta el componente canvas real con el HUD/modal ya conectados a `score`/`level` (siempre) y a `lives`/`lines` (solo si `stats` del registro los incluye); si `registry[id]` no existe, se conserva el reproductor simulado actual sin cambios, para los juegos aún no portados.
- Eliminar `app/games/asteroids/play/page.tsx` (queda cubierto por la página genérica) y `app/games/[id]/play/page.tsx` pasa a resolver también `"asteroids"` vía `registry.ts`.
- Guardado de score en Supabase al terminar la partida: mismo flujo que SPEC 06 pero con `game_id: id` dinámico en vez de `'asteroids'` fijo, reutilizable para `"tetris"` y `"asteroids"`.
- Controles de Tetris: `←`/`→` mueven la pieza, `↓` soft drop (+1 punto/fila), `↑` o `X` rotan (con wall kick `[0,-1,1,-2,2]`), `Espacio` hard drop (+2 puntos/celda). Adicionalmente, `P` y `Escape` togglean el mismo estado `paused` que ya usa el botón "PAUSA" de la plataforma.
- Alta de la fila `tetris` en la tabla `games` de Supabase (SQL manual, ver Modelo de datos).

**No incluye:**

- Menú de pausa avanzado del original (selector de nivel inicial, "ver controles" dentro del overlay) — la plataforma ya tiene su propio botón de pausa/reanudar y modal de fin de partida; no se porta ese overlay.
- Tabla de records local en `localStorage` del original (`tetris_records`, top 5, mejor combo) — la persistencia real de puntuaciones ya la cubre SPEC 06 vía Supabase; duplicarla en `localStorage` sería redundante.
- Selector de skins visuales (Retro/Neon/Pastel/Pixel) del original — se integra únicamente la skin visual equivalente a "Retro", sin selector.
- Sistema de "combo" (`maxCombo`/`currentCombo`) del original — no se reporta en el HUD ni se persiste; sale de alcance junto con la tabla de records que lo mostraba.
- Soporte táctil/móvil o controles alternativos (WASD, botones en pantalla).
- Canvas responsive/escalable — se mantiene fijo a 800×600 con letterboxing, igual que asteroids.
- Sonido/audio (el original no lo tiene).
- Cambios en `app/games/[id]/page.tsx` (pantalla de detalle) más allá de que ya lee cualquier fila de `games` de forma genérica — no requiere cambios de código.
- Cambios en `app/hall-of-fame/page.tsx` — ya itera juegos desde Supabase de forma genérica (SPEC 06).
- Generalizar el registro a más juegos futuros de `references/started-games/` (arkanoid) — cada uno se añade en su propio spec.

## Modelo de datos

Esta spec no cambia el esquema de `games` ni `scores` (`lib/supabase/types.ts` no cambia). Solo añade una fila nueva a `games`:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'tetris', 'TETRIS', 'Encaja piezas antes de que el tablero se desborde.',
  'El clásico rompecabezas de bloques. Rota y desliza piezas para completar líneas horizontales antes de que se acumulen hasta el techo. La velocidad aumenta con cada nivel: cuanto más rápido caen las piezas, más puntos arriesgas por cada línea.',
  'PUZZLE', 'cover-tetro', 'cyan'
);
```

`cat: 'PUZZLE'` y `color: 'cyan'` ya encajan en los union types actuales de `lib/supabase/types.ts` (`GameRow['cat']` y `GameRow['color']`) — no requieren ampliarlos. `cover-tetro` ya existe como clase en `app/globals.css`.

`components/games/registry.ts` introduce un tipo nuevo, solo en el cliente (no en Supabase):

```ts
// components/games/registry.ts
type GameStat = 'lives' | 'lines';

interface GameRegistryEntry {
  Component: ComponentType<CanvasGameProps>;
  stats: GameStat[];
}

const registry: Record<string, GameRegistryEntry> = {
  asteroids: { Component: AsteroidsGame, stats: ['lives'] },
  tetris: { Component: TetrisGame, stats: ['lines'] },
};
```

## Plan de implementación

1. Leer `node_modules/next/dist/docs/01-app/` (partes de Client Components / `useEffect`) según `AGENTS.md`, igual que en SPEC 05, antes de tocar `app/games/[id]/play/page.tsx`.
2. Crear `lib/games/useLatestRef.ts` con el hook genérico, y refactorizar `AsteroidsGame.tsx` para usarlo en vez de sus 5 `useEffect` de sincronización de refs. Verificación: `/games/asteroids` sigue jugándose exactamente igual que hoy.
3. Crear `lib/games/useCanvasKeyboard.ts` con el hook genérico de teclado, y refactorizar `AsteroidsGame.tsx` para usarlo en vez de su bloque `onKeyDown`/`onKeyUp`/`justPressed` manual. Verificación: los controles de asteroids (rotar/propulsar/disparar) siguen funcionando igual.
4. Crear `components/games/TetrisGame.tsx`: portar `board`, `randomPiece`, `collide`, `rotateCW`/`tryRotate`, `merge`, `clearLines`, `ghostY`, `hardDrop`/`softDrop`/`lockPiece`/`spawn` desde `game.js`, usando `useLatestRef`/`useCanvasKeyboard`, dibujando tablero + siguiente pieza en el único canvas 800×600, e invocando `onScoreChange`/`onLevelChange`/`onLinesChange`/`onGameOver` (sin `onLivesChange`) cuando esos valores cambian. Sin HUD dibujado en canvas (lo cubre el HUD React).
5. Crear `components/games/registry.ts` con las entradas `asteroids` y `tetris` como en el Modelo de datos.
6. Reescribir `app/games/[id]/play/page.tsx`: si `registry[id]` existe, montar `registry[id].Component` (con `dynamic(..., { ssr: false })`) igual que hoy hace `app/games/asteroids/play/page.tsx`, mostrando en el HUD la fila "Vidas" solo si `stats.includes('lives')` y "Líneas" solo si `stats.includes('lines')`; el guardado de score en Supabase usa `game_id: id` en vez de `'asteroids'` fijo. Si `registry[id]` no existe, se conserva el bloque `setInterval` simulado actual sin cambios de comportamiento.
7. Eliminar `app/games/asteroids/play/page.tsx` — su lógica ya vive en la página genérica del paso 6.
8. Documental: ejecutar en el SQL Editor de Supabase el `INSERT INTO games` del Modelo de datos.
9. Verificación final: `npm run lint` y `npm run build` sin errores; `/games/asteroids/play` sigue funcionando igual que antes de esta spec; `/games/tetris/play` es jugable (mover, rotar, soft/hard drop, líneas se limpian, sube de nivel, game over al topar pieza en el spawn); tras una partida el score aparece en `/games/tetris` y en `/hall-of-fame`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] La fila `tetris` existe en la tabla `games` de Supabase con los valores del Modelo de datos.
- [ ] `lib/games/useLatestRef.ts` y `lib/games/useCanvasKeyboard.ts` existen y `AsteroidsGame.tsx` los usa (ya no tiene sus propios `useEffect` de sincronización de refs ni su propio bloque de listeners de teclado).
- [ ] `components/games/registry.ts` existe y expone `asteroids` y `tetris`.
- [ ] `/games/asteroids/play` sigue siendo jugable con el mismo comportamiento que antes de esta spec (paridad, sin regresiones).
- [ ] `app/games/asteroids/play/page.tsx` ha sido eliminado.
- [ ] `/games/tetris/play` muestra un canvas 800×600 con el tablero y el panel de siguiente pieza, en vez de la arena CSS decorativa.
- [ ] Las flechas mueven la pieza, `↓` hace soft drop, `↑`/`X` rota con wall kick, `Espacio` hace hard drop.
- [ ] Completar una fila la elimina, suma puntos según `LINE_SCORES × nivel`, y las filas superiores bajan una posición.
- [ ] El HUD React muestra Puntuación, Líneas y Nivel para tetris, y **no** muestra una fila de "Vidas".
- [ ] El nivel sube cada 10 líneas acumuladas y la velocidad de caída aumenta en consecuencia.
- [ ] Cuando una pieza nueva no puede spawnear (tablero lleno), se dispara el modal "FIN DEL JUEGO" con la puntuación real.
- [ ] El botón "PAUSA" y las teclas `P`/`Escape` detienen y reanudan realmente el juego (la pieza deja de caer).
- [ ] "JUGAR DE NUEVO" desde el modal inicia una partida nueva (score 0, líneas 0, nivel 1, tablero vacío).
- [ ] "GUARDAR PUNTUACIÓN" inserta el score en Supabase con `game_id: 'tetris'`, y aparece en `/games/tetris` y en `/hall-of-fame` al recargar.
- [ ] Navegar a `/games/<id>/play` con un `id` sin fila en `registry.ts` (ninguno hoy, salvo los placeholders si existieran) sigue mostrando el reproductor simulado sin cambios de comportamiento.

## Decisiones tomadas y descartadas

- **Sí: Spec primero, implementación después** — esta skill solo genera el `.md`; el usuario lo revisa, lo pasa a `Approved`, y ejecuta `/spec-impl 07-tetris` para implementarlo.
- **Sí: Wrapper/hooks genéricos (`useLatestRef`, `useCanvasKeyboard`) extraídos desde `AsteroidsGame.tsx`** — en vez de duplicar la sincronización de refs de callbacks y el manejo de teclado en `TetrisGame.tsx`. Es la primera vez que se añade un segundo juego, así que corresponde extraerlos ahora en vez de seguir duplicando.
- **Sí: `registry.ts` genérico `id → { Component, stats }`** — la página `app/games/[id]/play/page.tsx` es la única play-page real; los juegos nuevos no crean su propia carpeta de ruta, solo se registran.
- **Sí: `stats: ['lives'] | ['lines']` en el registro en vez de asumir siempre "lives"** — Tetris no tiene vidas (termina por tablero lleno, no por impactos), así que el HUD necesita saber qué filas mostrar por juego en vez de asumir el contrato fijo de asteroids.
- **Sí: Tablero + siguiente pieza en un único `<canvas>`** — se descarta el canvas secundario `next-canvas` del original porque el wrapper genérico de la plataforma monta un solo `<canvas>` por juego dentro de `.crt-screen`; dibujar ambos en el mismo contexto evita introducir una segunda superficie de canvas en el contrato del wrapper.
- **No: Menú de pausa avanzado, tabla de records local y selector de skins del original** — son las 3 features "extra" documentadas en `references/started-games/03-tetris/requirements.md`. Se descartan porque (a) la plataforma ya tiene su propio botón de pausa y modal de fin de partida, (b) la persistencia real de puntuaciones ya la cubre SPEC 06 vía Supabase, y (c) no hay pedido de personalización visual por juego en la plataforma.
- **No: Sistema de combo (`maxCombo`/`currentCombo`)** — solo se usaba para mostrarlo en la tabla de records local descartada arriba; sin esa tabla no tiene dónde mostrarse.
- **Sí: Alta en Supabase vía SQL manual** — consistente con SPEC 06 y con las decisiones de arquitectura fijas de esta skill; no hay automatización vía MCP en este flujo.
- **No: Generalizar a más juegos de `references/started-games/` en este spec** — Arkanoid queda para su propio spec cuando se pida.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Refactor de `AsteroidsGame.tsx` (extraer `useLatestRef`/`useCanvasKeyboard`) introduce una regresión en el juego ya jugable | El paso 2 y 3 del plan verifican explícitamente que asteroids sigue jugándose igual antes de tocar tetris; si algo se rompe, se revierte solo esos dos pasos sin afectar el resto del plan. |
| Eliminar `app/games/asteroids/play/page.tsx` deja sin cubrir algún caso que la página genérica no contemple (p. ej. el `Link` de "SALIR" apuntaba a `/games/asteroids` fijo) | El paso 6 exige que la página genérica derive esos textos/links de `id`, no de un valor fijo `"asteroids"`, antes de borrar la página dedicada en el paso 7. |
| Dibujar tablero + siguiente pieza en el mismo canvas de 800×600 dejando poco espacio visual respecto al original (300×600 + panel aparte) | Aceptado como riesgo conocido: el layout exacto (posición del panel de siguiente pieza dentro del canvas) se ajusta en implementación sin cambiar el contrato de un único `<canvas>` fijo del wrapper genérico. |

## Qué **no** está en este spec

- Menú de pausa avanzado, tabla de records local en `localStorage`, selector de skins y sistema de combo del juego de referencia.
- Soporte táctil, móvil o controles alternativos (WASD, botones en pantalla).
- Canvas responsive.
- Audio/sonido.
- Integración de Arkanoid u otros juegos de `references/started-games/`.
- Cambios en el esquema de `games`/`scores` en Supabase.

Cada uno de estos, si se pide, va en su propio spec.
