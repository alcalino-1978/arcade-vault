# 09 — Snake jugable con frutas del atlas y HUD de la plataforma

**Estado:** approved
**Depende de:** SPEC 05, SPEC 06, SPEC 07
**Fecha:** 2026-08-20

**Objetivo:** Crear el juego Snake clásico en canvas desde cero (sin código de referencia), usando el atlas de frutas de `references/source-assets/snake-assets/`, registrado con `id: "snake"` en `components/games/registry.ts`.

## Alcance

**Incluye:**

- Crear `components/games/SnakeGame.tsx`: componente canvas 800×600 con grid de celdas de 20px (40 columnas × 30 filas). Snake clásico: la serpiente se mueve en una dirección continua sobre el grid, avanzando una celda por tick; crece un segmento al comer fruta; termina la partida al chocar contra cualquier borde del área de juego o contra su propio cuerpo (sin wrap-around). Sigue el mismo patrón que `ArkanoidGame.tsx`/`TetrisGame.tsx`: estado encapsulado en el `useEffect` del componente, usando `useLatestRef`/`useCanvasKeyboard` de `lib/games/` en vez de listeners manuales.
- Control por teclado: flechas **y** WASD simultáneamente (`↑`/`W`, `↓`/`S`, `←`/`A`, `→`/`D`). No se admite invertir la dirección hacia el segmento inmediatamente anterior (evita game over accidental al pulsar la tecla opuesta).
- Cuerpo de la serpiente dibujado como bloques sólidos de color (`ctx.fillRect`) sobre el grid — no hay sprite de serpiente disponible. Color de la serpiente: magenta, consistente con el `color` de la ficha del juego.
- Fruta: en cada aparición se elige al azar una entre las 21 frutas del atlas `fruits` de `sprites.js` (banana, orange, grape, garlic, eggplant, strawberry, cherry, carrot, mushroom, broccoli, watermelon, pepper, kiwi, lemon, peach, peanut, apple, tomato, berries, grapes2, pineapple, melon), dibujada con `ctx.drawImage` recortando el sprite correspondiente de `fruits.png`. Todas las frutas otorgan el mismo puntaje al comerse: **+10 puntos**. Al comer, se coloca una nueva fruta en una celda libre aleatoria del grid (no ocupada por el cuerpo).
- Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png`, y portar las coordenadas de `references/source-assets/snake-assets/sprites.js` (objeto `fruits`) a `lib/games/snakeSprites.ts`, apuntando al nuevo path público.
- HUD: el canvas no dibuja score/longitud (lo cubre el HUD React de la plataforma, igual que tetris/arkanoid). El componente invoca `onScoreChange` y `onLengthChange` cuando esos valores cambian, y `onGameOver(score)` al chocar contra el borde o contra sí misma.
- Ampliar `GameStat` en `components/games/registry.ts` de `'lives' | 'lines'` a `'lives' | 'lines' | 'length'`.
- Ampliar `CanvasGameProps` en `lib/games/types.ts` con `onLengthChange?: (length: number) => void`, siguiendo el mismo patrón opcional que `onLivesChange`/`onLinesChange`.
- Añadir la clase `.cover-snake` a `app/globals.css`, con el mismo patrón visual (gradiente + pseudo-elementos) que `.cover-rocas`/`.cover-tetro`/`.cover-arkanoid`.
- Registrar `snake` en `components/games/registry.ts`: `{ Component: SnakeGame, stats: ['length'] }`.
- Alta de la fila `snake` en la tabla `games` de Supabase (SQL manual, ver Modelo de datos).

**No incluye:**

- Wrap-around en los bordes — chocar contra cualquier borde termina la partida.
- Subconjunto de frutas con distinto puntaje por tipo — todas valen 10 puntos por igual.
- Sprite propio de la serpiente — se dibuja con bloques sólidos de color.
- Niveles de dificultad o incremento de velocidad progresivo.
- Soporte táctil/móvil o controles alternativos a flechas/WASD.
- Canvas responsive/escalable — se mantiene fijo a 800×600, igual que asteroids/tetris/arkanoid.
- Efectos de sonido.
- Cambios en `app/games/[id]/play/page.tsx`, `app/games/[id]/page.tsx` o `app/hall-of-fame/page.tsx` — ya resuelven cualquier `id` del registro/Supabase de forma genérica (SPEC 06/07), no requieren cambios de código.
- Ampliar el union type `cat`/`color` de `lib/supabase/types.ts` — Snake encaja en los valores ya existentes (`ARCADE`, `magenta`).

## Modelo de datos

Esta spec no cambia el esquema de `games` ni `scores`. Añade una fila nueva a `games`:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'snake', 'SNAKE', 'Come frutas y crece sin chocar contigo mismo.',
  'El clásico juego de la serpiente. Guíala por el tablero para comer frutas del huerto y crecer segmento a segmento. Un choque contra el borde o contra tu propia cola termina la partida al instante.',
  'ARCADE', 'cover-snake', 'magenta'
);
```

`cat: 'ARCADE'` y `color: 'magenta'` ya encajan en los union types actuales de `lib/supabase/types.ts` (`GameRow['cat']` y `GameRow['color']`) — no requieren ampliarlos. `magenta` es el único color de los cuatro disponibles aún sin usar (asteroids=yellow, tetris=cyan, arkanoid=green).

`GameStat` en `components/games/registry.ts` se amplía:

```ts
// components/games/registry.ts
export type GameStat = 'lives' | 'lines' | 'length';

const registry: Record<string, GameRegistryEntry> = {
  asteroids: { Component: AsteroidsGame, stats: ['lives'] },
  tetris: { Component: TetrisGame, stats: ['lines'] },
  arkanoid: { Component: ArkanoidGame, stats: ['lives'] },
  snake: { Component: SnakeGame, stats: ['length'] },
};
```

`CanvasGameProps` en `lib/games/types.ts` gana un callback opcional:

```ts
export interface CanvasGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onLivesChange?: (lives: number) => void;
  onLinesChange?: (lines: number) => void;
  onLengthChange?: (length: number) => void;
  onPauseToggle?: () => void;
}
```

Atlas de sprites — `lib/games/snakeSprites.ts` (portado de `sprites.js`, coordenadas idénticas):

```ts
export const SNAKE_FRUITS_SRC = '/games/snake/fruits.png';

export const SNAKE_FRUITS = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  // ...resto de las 21 frutas, coordenadas idénticas a sprites.js
} as const;
```

## Plan de implementación

1. Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png`.
   Verificación: el archivo existe en `public/games/snake/`.
2. Crear `lib/games/snakeSprites.ts`: portar el objeto `fruits` completo (21 entradas) de `references/source-assets/snake-assets/sprites.js`, apuntando a `/games/snake/fruits.png`.
   Verificación: TypeScript no reporta errores.
3. Ampliar `GameStat` en `components/games/registry.ts` a `'lives' | 'lines' | 'length'`, y `CanvasGameProps` en `lib/games/types.ts` con `onLengthChange?: (length: number) => void`.
   Verificación: TypeScript no reporta errores en los consumidores existentes (`AsteroidsGame`, `TetrisGame`, `ArkanoidGame` no usan el nuevo campo opcional, no rompen).
4. Crear `components/games/SnakeGame.tsx`: grid 40×30 (celda 20px), estado de la serpiente (array de segmentos), dirección actual/pendiente, fruta activa (tipo aleatorio de `SNAKE_FRUITS` + posición libre aleatoria), tick de movimiento por `setInterval`/acumulador de tiempo dentro del loop de `requestAnimationFrame`, colisión contra bordes y contra el propio cuerpo, crecimiento al comer. Usa `useLatestRef`/`useCanvasKeyboard` para capturar flechas y WASD, bloqueando el giro de 180°. Dibuja el cuerpo con `fillRect` (magenta) y la fruta con `drawImage` recortando `SNAKE_FRUITS`. Invoca `onScoreChange`, `onLengthChange` al cambiar, y `onGameOver(score)` en colisión.
   Verificación: el juego arranca en `/games/snake/play` y es jugable con teclado (flechas y WASD).
5. Añadir `.cover-snake` a `app/globals.css`, siguiendo el mismo patrón visual (gradiente de fondo + pseudo-elementos) que `.cover-rocas`/`.cover-tetro`/`.cover-arkanoid`.
   Verificación: la card de Snake en `/games` muestra la portada nueva.
6. Registrar `snake` en `components/games/registry.ts` como en el Modelo de datos.
   Verificación: `/games/snake/play` monta `SnakeGame` (vía `registry`) en vez del reproductor simulado, con HUD de Puntuación/Longitud.
7. Documental: ejecutar en el SQL Editor de Supabase el `INSERT INTO games` del Modelo de datos.
8. Verificación final: `npm run lint` y `npm run build` sin errores; `/games/asteroids/play`, `/games/tetris/play` y `/games/arkanoid/play` siguen funcionando igual que antes de esta spec; `/games/snake/play` es jugable (mover la serpiente, comer frutas, crecer, game over al chocar); tras una partida el score aparece en `/games/snake` y en `/hall-of-fame`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] La fila `snake` existe en la tabla `games` de Supabase con los valores del Modelo de datos.
- [ ] `components/games/registry.ts` expone `asteroids`, `tetris`, `arkanoid` y `snake`.
- [ ] `/games/asteroids/play`, `/games/tetris/play` y `/games/arkanoid/play` siguen siendo jugables sin regresiones.
- [ ] `/games/snake/play` muestra un canvas 800×600 con la serpiente dibujada en bloques sólidos y la fruta activa dibujada con el sprite correspondiente del atlas.
- [ ] Las flechas y WASD mueven la serpiente; no se puede invertir la dirección 180° en un solo tick.
- [ ] Al comer una fruta, la serpiente crece un segmento, el score sube +10, y aparece una nueva fruta aleatoria del atlas en una celda libre.
- [ ] Chocar contra cualquier borde del canvas termina la partida.
- [ ] Chocar contra el propio cuerpo termina la partida.
- [ ] Al terminar la partida se dispara el modal "FIN DEL JUEGO" de la plataforma con la puntuación final.
- [ ] El HUD React muestra Puntuación y Longitud para snake.
- [ ] El botón "PAUSA" de la plataforma detiene realmente el juego (la serpiente se congela); "REANUDAR" lo reanuda.
- [ ] "JUGAR DE NUEVO" desde el modal inicia una partida nueva (score 0, longitud inicial, posición de salida).
- [ ] "GUARDAR PUNTUACIÓN" inserta el score en Supabase con `game_id: 'snake'`, y aparece en `/games/snake` y en `/hall-of-fame` al recargar.
- [ ] La card de Snake en `/games` usa la clase `cover-snake` y se distingue visualmente de `cover-rocas`/`cover-tetro`/`cover-arkanoid`.

## Decisiones tomadas y descartadas

- **Sí: Spec primero, implementación después** — esta skill solo genera el `.md`; el usuario lo revisa, lo pasa a `Approved`, y ejecuta `/spec-impl 09-snake` para implementarlo.
- **Sí: Reutilizar el wrapper genérico (`useLatestRef`, `useCanvasKeyboard`) y `registry.ts` ya extraídos en SPEC 07** — no se vuelven a crear; `SnakeGame.tsx` solo se registra.
- **Sí: `app/games/[id]/play/page.tsx` genérica resuelve `snake` sin archivos nuevos por juego** — mismo patrón que asteroids/tetris/arkanoid desde SPEC 07.
- **Sí: Alta en Supabase vía SQL manual** — consistente con SPEC 06/07/08 y con las decisiones de arquitectura fijas de esta skill; no hay automatización vía MCP en este flujo.
- **Sí: Snake sin código de referencia** — a diferencia de asteroids/tetris/arkanoid, no hay carpeta en `references/started-games/`; el game loop se define en este spec como Snake clásico estándar (grid fijo, sin wrap-around, crecimiento al comer, game over en borde o cuerpo propio), confirmado explícitamente por el usuario.
- **Sí: Ampliar `GameStat` a `'lives' | 'lines' | 'length'`** — Snake no tiene vidas ni líneas; su stat natural es la longitud del cuerpo, no cubierta por los valores existentes.
- **Sí: `onLengthChange` opcional en `CanvasGameProps`** — sigue el mismo patrón que `onLivesChange`/`onLinesChange`, no rompe los juegos existentes que no lo usan.
- **Sí: Fruta única aleatoria entre las 21 del atlas, mismo puntaje (+10) para todas** — aprovecha visualmente todo el atlas sin lógica de puntajes diferenciados; simplicidad confirmada por el usuario.
- **Sí: Cuerpo de la serpiente en bloques sólidos (`fillRect`)** — no existe sprite de serpiente en los assets aportados; confirmado por el usuario como solución aceptada en vez de esperar un asset adicional.
- **Sí: Controles flechas + WASD simultáneos** — a diferencia de asteroids/tetris/arkanoid (solo flechas), confirmado explícitamente por el usuario para este juego.
- **Sí: `cat: 'ARCADE'`, `color: 'magenta'`, `cover: 'cover-snake'` (nueva clase)** — magenta es el único color de los cuatro sin usar (asteroids=yellow, tetris=cyan, arkanoid=green).
- **No: Wrap-around en bordes** — el usuario confirmó explícitamente el comportamiento clásico (choque = game over) frente a la variante con reaparición en el lado opuesto.
- **No: Subconjunto de frutas con puntajes distintos** — descartado a favor de simplicidad; todas las frutas valen igual.
- **No: Efectos de sonido, soporte táctil, niveles de dificultad** — ningún otro juego de la plataforma los tiene; fuera de alcance salvo que se pida en spec propio.

## Qué **no** está en este spec

- Wrap-around en los bordes del grid.
- Frutas con puntaje diferenciado por tipo.
- Sprite propio de la serpiente.
- Niveles de dificultad o velocidad progresiva.
- Soporte táctil, móvil o controles adicionales a flechas/WASD.
- Canvas responsive.
- Efectos de sonido.
- Cambios en `app/games/[id]/play/page.tsx`, `app/games/[id]/page.tsx` o `app/hall-of-fame/page.tsx`.
- Ampliación de los union types `cat`/`color` de `lib/supabase/types.ts`.

Cada uno de estos, si se pide, va en su propio spec.
