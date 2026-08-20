# 08 — Arkanoid jugable con sprites y HUD de la plataforma

**Estado:** approved
**Depende de:** SPEC 05, SPEC 06, SPEC 07
**Fecha:** 2026-08-20

**Objetivo:** Portar el clon de Arkanoid en canvas vanilla de `references/started-games/04-arkanoid/game.js` a un componente React con `id: "arkanoid"`, registrado en `components/games/registry.ts`, con control por teclado y sprites del spritesheet original, sin audio ni overlay de pausa propios.

## Alcance

**Incluye:**

- Crear `components/games/ArkanoidGame.tsx`: componente canvas que porta el estado (`paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `currentLevel`) y la lógica (`update`, colisiones AABB, `loadLevel`, animación de explosiones) de `references/started-games/04-arkanoid/game.js`, siguiendo el mismo patrón de props (`CanvasGameProps`) que `AsteroidsGame.tsx`/`TetrisGame.tsx`: estado encapsulado en el `useEffect` del componente, usando `useLatestRef`/`useCanvasKeyboard` de `lib/games/` en vez de listeners manuales.
- Portar `references/started-games/04-arkanoid/levels.js` (los 5 niveles `LEVELS` con `blocks[]` y `speed`) a `lib/games/arkanoidLevels.ts`.
- Copiar el spritesheet `assets/spritesheet-breakout.png` a `public/games/arkanoid/spritesheet-breakout.png`, y portar los helpers de `assets/spritesheet.js` (`loadSpritesheet`, `drawSprite`, `drawFrame`, `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`) a `lib/games/arkanoidSprites.ts`, apuntando al nuevo path público. El canvas dibuja paddle, pelota, bloques y la animación de explosión (4 frames) igual que el original.
- Control de la paddle **solo por teclado** (`←`/`→`) — se elimina el control por mouse/click del original (no hay overlay de pausa que requiera clics).
- HUD: el canvas ya no dibuja score/nivel/vidas (lo cubre el HUD React de la plataforma, igual que tetris). El componente invoca `onScoreChange`, `onLevelChange`, `onLivesChange`, `onGameOver` del contrato `CanvasGameProps` cuando esos valores cambian.
- Al completar el nivel 5 (todos los bloques destruidos), se invoca `onGameOver(score)` con la puntuación final — la plataforma no distingue victoria de derrota en el modal de fin de partida.
- Añadir la clase `.cover-arkanoid` a `app/globals.css`, con el mismo patrón visual (gradiente + pseudo-elementos) que `.cover-rocas`/`.cover-tetro`.
- Registrar `arkanoid` en `components/games/registry.ts`: `{ Component: ArkanoidGame, stats: ['lives'] }` — reutiliza el `GameStat` `'lives'` ya existente, sin ampliar el union type.
- Alta de la fila `arkanoid` en la tabla `games` de Supabase (SQL manual, ver Modelo de datos).

**No incluye:**

- Control de la paddle por mouse (`mousemove`/`click` sobre el canvas) — se descarta junto con el overlay de pausa que lo usaba.
- Efectos de sonido (`ball-bounce.mp3`, `break-sound.mp3`) — no se portan los assets de audio ni `new Audio(...)`.
- Overlay de pausa propio con selector de nivel (botones 1–5) — la plataforma ya controla pausa/reanudar vía la prop `paused`, igual que asteroids/tetris.
- Pantalla de victoria distinta al modal de game over — completar el nivel 5 dispara el mismo modal "FIN DEL JUEGO" con el score final, sin texto ni estado visual diferenciado de "ganaste".
- Soporte táctil/móvil o controles alternativos (WASD, botones en pantalla).
- Canvas responsive/escalable — se mantiene fijo a 800×600, igual que asteroids/tetris.
- Ampliar `GameStat` o el union type `cat`/`color` de `lib/supabase/types.ts` — Arkanoid encaja en los valores ya existentes.
- Cambios en `app/games/[id]/play/page.tsx`, `app/games/[id]/page.tsx` o `app/hall-of-fame/page.tsx` — ya resuelven cualquier `id` del registro/Supabase de forma genérica (SPEC 06/07), no requieren cambios de código.

## Modelo de datos

Esta spec no cambia el esquema de `games` ni `scores` (`lib/supabase/types.ts` no cambia). Solo añade una fila nueva a `games`:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'arkanoid', 'ARKANOID', 'Destruye bloques antes de perder la pelota.',
  'El clásico rompe-bloques. Mueve la paleta para rebotar la pelota y pulverizar las hileras de bloques de cada uno de los 5 niveles, cada vez más veloces. Pierdes una vida cada vez que la pelota cae al vacío.',
  'ARCADE', 'cover-arkanoid', 'green'
);
```

`cat: 'ARCADE'` y `color: 'green'` ya encajan en los union types actuales de `lib/supabase/types.ts` (`GameRow['cat']` y `GameRow['color']`) — no requieren ampliarlos.

`components/games/registry.ts` gana una entrada nueva (mismo tipo `GameStat`/`GameRegistryEntry` ya definido en SPEC 07, sin cambios de tipo):

```ts
// components/games/registry.ts
const registry: Record<string, GameRegistryEntry> = {
  asteroids: { Component: AsteroidsGame, stats: ['lives'] },
  tetris: { Component: TetrisGame, stats: ['lines'] },
  arkanoid: { Component: ArkanoidGame, stats: ['lives'] },
};
```

## Plan de implementación

1. Copiar `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` a `public/games/arkanoid/spritesheet-breakout.png`.
   Verificación: el archivo existe en `public/games/arkanoid/`.
2. Crear `lib/games/arkanoidSprites.ts`: portar `loadSpritesheet`, `drawSprite`, `drawFrame`, `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` de `assets/spritesheet.js`, apuntando a `/games/arkanoid/spritesheet-breakout.png`.
   Verificación: TypeScript no reporta errores.
3. Crear `lib/games/arkanoidLevels.ts`: portar el array `LEVELS` (5 niveles, `blocks[]` + `speed`) de `references/started-games/04-arkanoid/levels.js` tal cual.
   Verificación: TypeScript no reporta errores.
4. Crear `components/games/ArkanoidGame.tsx`: portar `initPaddle`, `initBall`, `loadLevel`, `collideAABB`, `update` (paddle por teclado, rebotes en paredes/paddle, colisión de bloques, explosiones, pérdida de vida) y `draw` (sprites de paddle/pelota/bloques/explosiones, sin HUD ni overlays de pausa/game over dibujados en canvas) desde `game.js`, usando `useLatestRef`/`useCanvasKeyboard` para `pausedRef` y las teclas `←`/`→`. Invoca `onScoreChange`, `onLevelChange`, `onLivesChange` cuando cambian, y `onGameOver(score)` tanto al perder la última vida como al destruir todos los bloques del nivel 5.
   Verificación: el juego arranca en `/games/arkanoid/play` y es jugable con teclado.
5. Añadir `.cover-arkanoid` a `app/globals.css`, siguiendo el mismo patrón visual (gradiente de fondo + pseudo-elementos) que `.cover-rocas`/`.cover-tetro`.
   Verificación: la card de Arkanoid en `/games` muestra la portada nueva.
6. Registrar `arkanoid` en `components/games/registry.ts` como en el Modelo de datos.
   Verificación: `/games/arkanoid/play` monta `ArkanoidGame` (vía `registry`) en vez del reproductor simulado, con HUD de Puntuación/Nivel/Vidas.
7. Documental: ejecutar en el SQL Editor de Supabase el `INSERT INTO games` del Modelo de datos.
8. Verificación final: `npm run lint` y `npm run build` sin errores; `/games/asteroids/play` y `/games/tetris/play` siguen funcionando igual que antes de esta spec; `/games/arkanoid/play` es jugable (mover paddle, rebotar pelota, romper bloques, subir de nivel, perder vidas, game over al perder la última vida o al completar el nivel 5); tras una partida el score aparece en `/games/arkanoid` y en `/hall-of-fame`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] La fila `arkanoid` existe en la tabla `games` de Supabase con los valores del Modelo de datos.
- [ ] `components/games/registry.ts` expone `asteroids`, `tetris` y `arkanoid`.
- [ ] `/games/asteroids/play` y `/games/tetris/play` siguen siendo jugables con el mismo comportamiento que antes de esta spec (sin regresiones).
- [ ] `/games/arkanoid/play` muestra un canvas 800×600 con paddle, pelota y bloques dibujados con sprites (no rectángulos planos).
- [ ] Las flechas `←`/`→` mueven la paddle; no hay control por mouse.
- [ ] La pelota rebota en paredes, techo y paddle; al romper un bloque suma 10 puntos y aparece la animación de explosión de 4 frames.
- [ ] Al destruir todos los bloques de un nivel, se carga el siguiente nivel (velocidad y patrón de bloques distintos) hasta el nivel 5.
- [ ] Al completar el nivel 5, se dispara el modal "FIN DEL JUEGO" de la plataforma con la puntuación final (mismo modal que al perder todas las vidas).
- [ ] Cuando la pelota cae al vacío se resta una vida y la pelota se reposiciona; al llegar a 0 vidas se dispara el modal "FIN DEL JUEGO".
- [ ] El HUD React muestra Puntuación, Nivel y Vidas para arkanoid.
- [ ] El botón "PAUSA" de la plataforma detiene realmente el juego (paddle y pelota se congelan); no aparece ningún overlay de pausa dibujado en el canvas.
- [ ] "JUGAR DE NUEVO" desde el modal inicia una partida nueva (score 0, nivel 1, 3 vidas, bloques del nivel 1).
- [ ] "GUARDAR PUNTUACIÓN" inserta el score en Supabase con `game_id: 'arkanoid'`, y aparece en `/games/arkanoid` y en `/hall-of-fame` al recargar.
- [ ] La card de Arkanoid en `/games` usa la clase `cover-arkanoid` y se distingue visualmente de `cover-rocas`/`cover-tetro`.

## Decisiones tomadas y descartadas

- **Sí: Spec primero, implementación después** — esta skill solo genera el `.md`; el usuario lo revisa, lo pasa a `Approved`, y ejecuta `/spec-impl 08-arkanoid` para implementarlo.
- **Sí: Reutilizar el wrapper genérico (`useLatestRef`, `useCanvasKeyboard`) y `registry.ts` ya extraídos en SPEC 07** — no se vuelven a crear; `ArkanoidGame.tsx` solo se registra.
- **Sí: `app/games/[id]/play/page.tsx` genérica resuelve `arkanoid` sin archivos nuevos por juego** — mismo patrón que asteroids/tetris desde SPEC 07.
- **Sí: `stats: ['lives']` en el registro** — Arkanoid tiene vidas (como asteroids), reutiliza el `GameStat` existente sin ampliar el union type.
- **Sí: Alta en Supabase vía SQL manual** — consistente con SPEC 06/07 y con las decisiones de arquitectura fijas de esta skill; no hay automatización vía MCP en este flujo.
- **Sí: Solo control por teclado (`←`/`→`)** — se elimina el control por mouse del original. Razón: consistencia con asteroids/tetris (100% teclado) y porque el overlay de pausa que dependía de clics también se descarta.
- **No: Efectos de sonido** — no se portan `ball-bounce.mp3`/`break-sound.mp3` ni `new Audio(...)`. Razón: ningún otro juego de la plataforma tiene audio; añadirlo solo para arkanoid rompería la consistencia sin que se haya pedido audio en general.
- **No: Overlay de pausa propio con selector de nivel** — la plataforma ya tiene su botón de pausa/reanudar vía la prop `paused`; el selector de nivel 1–5 del original no tiene equivalente en la plataforma y se descarta junto con el overlay.
- **Sí: Victoria (completar nivel 5) tratada como game over con el score final** — el contrato `CanvasGameProps` no distingue victoria de derrota; reutilizar `onGameOver` evita ampliar el contrato para un caso que el modal de la plataforma no necesita mostrar de forma distinta.
- **Sí: Portar el spritesheet original (`spritesheet-breakout.png`) en vez de dibujar formas planas** — conserva el look visual del juego de referencia, incluida la animación de explosión de 4 frames, sin coste de complejidad relevante (son helpers de dibujo puros, ya escritos en el original).
- **Sí: `cat: 'ARCADE'`, `color: 'green'`, `cover: 'cover-arkanoid'` (nueva clase)** — Arkanoid no es ni `SHOOTER` ni `PUZZLE`; verde queda libre (asteroids usa amarillo, tetris usa cian).

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Cargar el spritesheet de forma asíncrona (`loadSpritesheet(cb)`) dentro de un componente React con `useEffect` puede dejar el canvas en blanco un frame si no se gestiona el estado de "cargado" | El paso 4 debe esperar el callback de `loadSpritesheet` antes de arrancar el loop `requestAnimationFrame`, igual que hace el original antes de `initPaddle()`/`loadLevel(1)`. |
| Eliminar el control por mouse puede sentirse como una regresión de UX frente al original | Aceptado como riesgo conocido y confirmado explícitamente por el usuario en la fase de preguntas; consistente con el resto de juegos de la plataforma. |
| La ruta pública del spritesheet (`/games/arkanoid/spritesheet-breakout.png`) debe coincidir exactamente entre el archivo copiado en `public/` y la referencia en `arkanoidSprites.ts` | El paso 1 y 2 del plan fijan el mismo path explícito; se verifica visualmente en el paso 4 (sprites se ven, no aparecen huecos en blanco). |

## Qué **no** está en este spec

- Control de la paddle por mouse.
- Efectos de sonido (`ball-bounce.mp3`, `break-sound.mp3`).
- Overlay de pausa propio con selector de nivel.
- Pantalla de victoria visualmente distinta al modal de game over estándar.
- Soporte táctil, móvil o controles alternativos (WASD, botones en pantalla).
- Canvas responsive.
- Ampliación de los union types `GameStat`, `cat` o `color`.
- Cambios en `app/games/[id]/play/page.tsx`, `app/games/[id]/page.tsx` o `app/hall-of-fame/page.tsx`.

Cada uno de estos, si se pide, va en su propio spec.
