# 05 — Asteroids jugable en "ROCAS"

**Estado:** Approved
**Depende de:** SPEC 01
**Fecha:** 2026-08-17

**Objetivo:** Portar el clon de Asteroids en canvas vanilla de `references/started-games/02-asteroids/game.js` a un motor TypeScript propio y conectarlo a `app/juego/[id]/jugar/page.tsx` para que el juego con `id: "rocas"` sea real y jugable, con paridad de features respecto al original y reutilizando el HUD y el modal de fin de partida ya existentes en la plataforma.

## Alcance

**Incluye:**

- Crear `lib/games/rocas/engine.ts`: motor del juego portado desde `references/started-games/02-asteroids/game.js`, con las mismas clases (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`) y la misma lógica de física, colisiones, wrap toroidal, niveles, vidas, invencibilidad temporal, partículas de explosión y power-up de disparo triple (3x) que el original.
- El motor se expone como una factory `createRocasEngine(canvas, callbacks)` que encapsula **todo su estado en un closure/instancia**, no en variables de módulo globales (a diferencia del original), para poder montarse y desmontarse limpiamente desde un componente de React sin fugas de estado entre partidas o entre remontajes de React Strict Mode.
- La factory recibe callbacks `{ onScoreChange(score), onLivesChange(lives), onLevelChange(level), onGameOver(finalScore) }`, invocados por el motor cuando cambian esos valores, y devuelve un controlador `{ start(), destroy(), setPaused(paused) }`.
- El motor añade sus propios listeners de teclado (`keydown`/`keyup` en `window`) al iniciar y los retira en `destroy()`.
- Modificar `app/juego/[id]/jugar/page.tsx`: cuando `game.id === "rocas"`, renderizar un `<canvas>` de 800×600 dentro de `.crt-screen` (reemplazando el contenido decorativo `.game-arena` que se sigue usando para el resto de juegos), montar el motor en un `useEffect`, y alimentar los mismos `score`/`lives`/`level` del HUD React existente desde los callbacks del motor en vez de con el `setInterval` simulado actual (ese `setInterval` se mantiene, sin cambios, para cualquier `id` distinto de `"rocas"`).
- El canvas se muestra a tamaño fijo 800×600, centrado dentro de `.crt-screen`, con letterboxing (barras) si el contenedor tiene otra proporción — no se reescribe la lógica de coordenadas del motor para hacerlo responsive.
- El botón "PAUSA"/"REANUDAR" ya existente llama a `engine.setPaused(paused)`, deteniendo/reanudando de verdad el bucle (`requestAnimationFrame`) del motor cuando `id === "rocas"`.
- El botón "FIN" ya existente sigue forzando el modal de fin de partida (comportamiento sin cambios); adicionalmente, cuando el motor llama a `onGameOver` (0 vidas) se activa el mismo modal automáticamente con la puntuación real alcanzada.
- "JUGAR DE NUEVO" (`restart`) desmonta y vuelve a montar el motor desde cero (nueva partida limpia) cuando `id === "rocas"`.
- El modal de fin de partida (input de iniciales + "GUARDAR PUNTUACIÓN") se reutiliza tal cual, mostrando la puntuación real del motor; "GUARDAR PUNTUACIÓN" sigue sin persistir en ningún backend, igual que hoy para todos los juegos.
- Controles: idénticos al original — `←`/`→` rotan la nave, `↑` propulsa, `Espacio` dispara. Sin controles táctiles ni alternativa WASD.
- El motor no dibuja su propio HUD (SCORE/NIVEL/vidas/3x) sobre el canvas; esa información se muestra únicamente vía el HUD React ya existente en la página.

**No incluye:**

- Ningún otro `id` de juego de `GAMES` recibe un motor real — el resto sigue con el reproductor simulado (`setInterval` + arena decorativa CSS) sin cambios.
- Persistencia real de puntuaciones (Supabase, localStorage o cualquier otra) — "GUARDAR PUNTUACIÓN" sigue siendo un cambio de estado local únicamente, igual que en SPEC 01.
- Soporte táctil/móvil o controles alternativos (WASD, botones en pantalla).
- Canvas responsive/escalable — se mantiene fijo a 800×600 con letterboxing.
- Sonido/audio (el original no lo tiene).
- Cambios en `lib/data.ts` (el juego `"rocas"` ya existe con su `title`, `short`, `long`, `cat`, `cover`, etc.) o en `app/juego/[id]/page.tsx` (pantalla de detalle, sigue usando `seededScores` mock sin cambios).
- Cambios en `app/salon/page.tsx` (Salón de la Fama) — sigue usando datos mock para todos los juegos, incluido `"rocas"`.

## Modelo de datos

Esta spec no introduce datos persistentes nuevos. El estado del motor vive completamente dentro de la instancia devuelta por `createRocasEngine` (no en `localStorage`, no en Supabase, no en variables de módulo compartidas).

```ts
// lib/games/rocas/engine.ts
interface RocasEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

interface RocasEngineController {
  start: () => void;
  destroy: () => void;
  setPaused: (paused: boolean) => void;
}

function createRocasEngine(
  canvas: HTMLCanvasElement,
  callbacks: RocasEngineCallbacks
): RocasEngineController;
```

Las clases internas (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`) y las constantes (`RADII`, `SPEEDS`, `POINTS`, `POWERUP_DROP_CHANCE`, etc.) del `game.js` original se portan sin cambios de comportamiento, solo reorganizadas dentro del closure de la factory.

## Plan de implementación

1. Leer `node_modules/next/dist/docs/01-app/` según `AGENTS.md` en las partes relevantes a Client Components y `useEffect` antes de tocar `app/juego/[id]/jugar/page.tsx`.
2. Crear `lib/games/rocas/engine.ts`: portar las clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp` y las funciones `wrap`/`dist`/`rand`/`randInt` desde `references/started-games/02-asteroids/game.js`, encapsuladas dentro de `createRocasEngine`, sin lógica de HUD dibujada en canvas (se elimina `drawHUD`/`drawLifeIcon`/`drawOverlay` de "GAME OVER", ya que ese rol lo cumple el HUD/modal de React).
3. Dentro de `createRocasEngine`, implementar el bucle (`requestAnimationFrame`) y la máquina de estados `'playing' | 'dead' | 'gameover'` igual que el original, invocando `onScoreChange`/`onLivesChange`/`onLevelChange` cada vez que esos valores cambian y `onGameOver(finalScore)` una sola vez al llegar a 0 vidas.
4. Implementar `setPaused(paused)`: cuando `paused === true`, detener el `requestAnimationFrame` (sin llamar a `update`); al reanudar, continuar el bucle sin resetear el estado de la partida.
5. Implementar `destroy()`: cancela el `requestAnimationFrame` pendiente y retira los listeners de `keydown`/`keyup` añadidos por esta instancia.
6. Modificar `app/juego/[id]/jugar/page.tsx`: añadir un `canvasRef` y un `useEffect` que, solo cuando `game?.id === "rocas"`, llama a `createRocasEngine(canvas, { onScoreChange: setScore, onLivesChange: setLives, onLevelChange: setLevel, onGameOver: () => setOver(true) })` y hace `engine.start()`; el `useEffect` devuelve `engine.destroy()` en su cleanup. Se sustituye el `level` calculado (`Math.floor(score / 2500) + 1`) por un `useState` propio para `"rocas"`, dejando la fórmula anterior intacta para el resto de juegos.
7. En el JSX de `.crt-screen`, renderizar condicionalmente: si `game.id === "rocas"`, un `<canvas ref={canvasRef} width={800} height={600} />` centrado (CSS ya existente en `.crt-screen`/`.game-arena` adaptado para centrar y hacer letterbox); si no, el `.game-arena` decorativo actual sin cambios.
8. Conectar el botón de pausa existente a `engineRef.current?.setPaused(paused)` cuando `game.id === "rocas"` (sin tocar su comportamiento para otros juegos).
9. Conectar `restart()` para que, cuando `game.id === "rocas"`, además de resetear `score`/`lives`/`over`/`saved`, fuerce un remontaje del motor (p. ej. cambiando una `key` en el `<canvas>` o llamando explícitamente a `destroy()` + `start()` de una nueva instancia).
10. Verificar con `npm run lint` y `npm run build` que no haya errores de tipos ni de ESLint.
11. Levantar `npm run dev`, navegar a `/juego/rocas/jugar` y probar manualmente (o con Playwright MCP): moverse con flechas, disparar con espacio, destruir asteroides y ver el score subir en el HUD React, perder las 3 vidas y ver el modal "FIN DEL JUEGO" con la puntuación real, pausar/reanudar durante una partida, y "JUGAR DE NUEVO" reinicia una partida limpia.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] Navegar a `/juego/rocas/jugar` muestra un canvas 800×600 con la nave, en vez de la arena CSS decorativa.
- [ ] Las flechas rotan/propulsan la nave y Espacio dispara balas, igual que en `references/started-games/02-asteroids`.
- [ ] Destruir un asteroide grande lo divide en dos medianos, y un mediano en dos pequeños; un pequeño desaparece sin dividirse.
- [ ] El HUD React de la página (no un HUD dibujado en canvas) refleja en tiempo real el score, las vidas y el nivel reales del motor.
- [ ] Al chocar con un asteroide se pierde una vida, la nave reaparece con parpadeo de invencibilidad temporal, y al llegar a 0 vidas se dispara automáticamente el modal "FIN DEL JUEGO" con la puntuación real.
- [ ] Limpiar todos los asteroides de un nivel avanza al siguiente nivel (más asteroides, HUD actualizado).
- [ ] El power-up de disparo triple (3x) aparece ocasionalmente al destruir asteroides, y al recogerlo la nave dispara tres balas en abanico durante su duración.
- [ ] El botón "PAUSA" detiene realmente el juego (la nave y los asteroides dejan de moverse) y "REANUDAR" continúa desde donde estaba, sin resetear la partida.
- [ ] "JUGAR DE NUEVO" desde el modal de fin de partida inicia una partida nueva desde cero (score 0, 3 vidas, nivel 1).
- [ ] "GUARDAR PUNTUACIÓN" en el modal sigue sin persistir en ningún backend, mostrando el mismo toast "PUNTUACIÓN GUARDADA_" que hoy.
- [ ] Navegar a `/juego/<otro-id>/jugar` (cualquier `id` distinto de `"rocas"`) sigue mostrando el reproductor simulado actual sin cambios de comportamiento.
- [ ] Salir de la página `/juego/rocas/jugar` (navegación a otra ruta) detiene el bucle del motor y retira sus listeners de teclado (sin errores en consola por `setState` tras desmontar).

## Decisiones tomadas y discartadas

- **Estado del motor encapsulado en un closure/instancia, no en variables de módulo globales**: se descarta portar `game.js` literalmente (que usa `ship`, `bullets`, `asteroids`, etc. como variables de módulo compartidas) porque en React, con Strict Mode montando/desmontando componentes en desarrollo y con navegación entre partidas, variables de módulo globales se compartirían entre instancias y causarían bugs de estado corrupto entre partidas.
- **Motor real solo para `"rocas"`, resto de juegos sin cambios**: se descarta generalizar ya una arquitectura de "selector de motor por id" porque hoy solo existe un juego real portado; añadir esa abstracción ahora sería especular sobre juegos futuros sin necesidad concreta.
- **HUD React existente en vez del HUD dibujado en canvas del original**: se descarta mantener `drawHUD`/`drawOverlay` del `game.js` porque duplicaría información (dos HUDs superpuestos) y rompería la consistencia visual con el resto de la plataforma (fuente, layout, colores ya definidos en `.player-hud`).
- **Modal de fin de partida reutilizado en vez del overlay "GAME OVER" del original**: mismo motivo — consistencia con el resto de la plataforma, y el modal ya soporta guardar puntuación (aunque sea local) y volver al Vault.
- **Canvas fijo 800×600 con letterbox en vez de responsive**: se descarta reescribir la lógica de coordenadas/física del motor (que asume `W=800`, `H=600` en el wrap toroidal y en el spawn de asteroides) porque el beneficio de hacerlo responsive no compensa el riesgo de introducir bugs de colisión/posicionamiento en un motor ya probado.
- **Sin persistencia real de puntuaciones**: fuera de alcance, consistente con SPEC 01 y con el resto de juegos de la plataforma, que tampoco persisten hoy.
- **Paridad completa de features (vidas, invencibilidad, niveles, partículas, power-up 3x)**: se porta todo tal cual porque ya está implementado y probado en el original; recortarlo no ahorra riesgo, solo funcionalidad.
- **Pausa real (detiene el `requestAnimationFrame`) en vez de decorativa**: el botón de pausa ya existe en la UI; dejarlo sin conectar a un juego real habría sido confuso para quien juegue.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| React Strict Mode invoca `useEffect` dos veces en desarrollo, pudiendo montar el motor dos veces sobre el mismo canvas | El `useEffect` debe llamar a `destroy()` en su cleanup de forma idempotente; al encapsular el estado por instancia (ver Decisiones), un doble montaje no corrompe estado compartido, como máximo se ve un parpadeo breve. |
| El motor sigue corriendo `requestAnimationFrame` tras desmontar la página si `destroy()` no cancela correctamente el frame pendiente | `destroy()` debe guardar el id devuelto por `requestAnimationFrame` y llamar a `cancelAnimationFrame` explícitamente en el cleanup del `useEffect`. |
| Canvas fijo 800×600 se corta o se ve minúsculo en pantallas pequeñas/móviles | Aceptado como riesgo conocido para este spec (ver "No incluye": sin responsive); se usa letterboxing con `overflow` controlado en `.crt-screen` para que al menos no rompa el layout de la página. |
| Los listeners de teclado del motor (`window.addEventListener('keydown', ...)`) podrían interferir con otros atajos de teclado de la página (p. ej. si en el futuro se añaden shortcuts globales) | El motor solo escucha `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space`; se retiran en `destroy()` al salir de la página, así que no afectan al resto de la app. |

## Qué **no** está en este spec

- Motor real para ningún otro juego de `GAMES` distinto de `"rocas"`.
- Persistencia de puntuaciones en Supabase, localStorage o cualquier otro backend.
- Soporte táctil, móvil o controles alternativos (WASD, botones en pantalla).
- Canvas responsive.
- Audio/sonido.
- Cambios en el Salón de la Fama (`app/salon/page.tsx`) o en la pantalla de detalle del juego (`app/juego/[id]/page.tsx`).

Cada uno de estos, si se pide, va en su propio spec.
