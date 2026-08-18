---
name: add-game
description: Genera un spec para integrar un nuevo juego canvas con leaderboard en la plataforma (desde references/started-games/ o desde cero). Usa el patrón ya establecido por las specs 05 y 06.
disable-model-invocation: true
argument-hint: '<carpeta en references/started-games/ o nombre del juego nuevo>'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /add-game — Generador de specs para nuevos juegos con leaderboard

## Session context

Today's date (use this for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Juegos disponibles en references/started-games/:
!`ls references/started-games/ 2>/dev/null || echo "references/started-games/ no existe"`

Registro de juegos ya integrado (si existe):
!`cat components/games/registry.ts 2>/dev/null || echo "components/games/registry.ts no existe todavía"`

Componentes de juego existentes:
!`ls components/games/ 2>/dev/null || echo "components/games/ no existe todavía"`

---

Esta skill escribe un spec en `specs/` para integrar un nuevo juego canvas con
leaderboard en la plataforma. **No escribe código.** Es una variante especializada de
`/spec`: las preguntas genéricas de arquitectura (scope, integración con Supabase,
persistencia) ya están resueltas por las specs 05 y 06 y por las decisiones fijadas más
abajo — solo se pregunta lo específico de *este* juego.

Sigue el mismo formato de spec que `.claude/skills/spec/template.md` (Header / Scope /
Data model / Implementation plan / Acceptance criteria / Decisions). Reutilízalo tal
cual: el spec de un juego no debe distinguirse en formato del resto de specs del repo.

## Decisiones de arquitectura ya fijadas (no se vuelven a preguntar)

Estas decisiones vienen de una sesión previa de planificación y deben aparecer en
**todo** spec que genere esta skill, en la sección `## Decisions`:

1. **Spec primero, implementación después.** Esta skill solo genera el `.md` en estado
   `Draft`. El usuario lo revisa, lo pasa a `Approved`, y corre `/spec-impl NN-slug`
   para implementarlo.
2. **Wrapper/hook canvas genérico.** Existe (o debe crearse) un wrapper compartido —
   p.ej. `components/games/CanvasGame.tsx` o un hook `useCanvasGameLoop` — reutilizable
   entre `AsteroidsGame.tsx` y los juegos nuevos, en vez de duplicar la estructura de
   refs + game loop en cada componente de juego.
3. **Registro genérico de play-pages.** `app/games/[id]/play/page.tsx` es la única
   play-page real; resuelve el componente de juego correcto vía un registro
   `id → componente` en `components/games/registry.ts`. Los juegos nuevos **no** crean
   una carpeta `app/games/<id>/play/` propia — solo se registran ahí.
4. **Alta en Supabase vía SQL manual.** La skill redacta el `INSERT INTO games (...)
   VALUES (...)` para que el usuario lo corra en el SQL Editor de Supabase. No hay
   automatización vía MCP en este flujo.

**Caso especial — primera vez.** Revisa el session context: si `components/games/`
no contiene ya un wrapper genérico (busca algo como `CanvasGame.tsx` o un hook
`useCanvasGameLoop`) y `registry.ts` no existe, esto es el **primer** juego añadido con
esta skill. En ese caso el plan de implementación del spec debe incluir, como primeros
pasos, extraer el wrapper genérico desde `components/games/AsteroidsGame.tsx`, crear
`components/games/registry.ts`, migrar Asteroids a ambos, y eliminar la play-page
dedicada `app/games/asteroids/play/page.tsx` en favor de la genérica. Si el wrapper y el
registro ya existen, el spec solo los referencia — no los vuelve a crear.

## Fase 1 — Contexto

1. Lee **completa** `.claude/skills/spec/SKILL.md` — la skill `/spec` de la que esta
   skill hereda el flujo (fases, forma de preguntar, forma de escribir y guardar el
   spec). Úsala como referencia obligatoria: mismas reglas duras, mismo criterio de
   "sección por sección vs. de una vez", mismo procedimiento de guardado en
   `specs/NN-slug.md` y de numeración/estado. Esta skill no reinventa ese flujo, lo
   aplica al dominio "nuevo juego con leaderboard".
2. Lee también `.claude/skills/spec/template.md` — es la plantilla de secciones que
   `/spec` usa y que esta skill reutiliza tal cual.
3. Lee `CLAUDE.md` (o `AGENTS.md`/`GEMINI.md`/`README.md`, el primero que exista) para
   adaptarte a las convenciones del repo.
4. Lee completos `specs/05-asteroids-game.md` y
   `specs/06-games-table-leaderboard-supabase.md` — son la fuente de verdad del patrón
   de integración (componente canvas, callbacks, HUD, modal de game over, tablas
   `games`/`scores`, tipos en `lib/supabase/types.ts`).
5. Revisa el listado de `references/started-games/` y el estado de
   `components/games/` del session context de arriba.
6. Tu respuesta debe estar en el mismo idioma que el prompt inicial del usuario.

Si en algún punto de las fases siguientes hay una duda de proceso (cómo formular una
pregunta, cuándo escribir de una vez vs. sección por sección, cómo numerar o guardar el
archivo) y esta skill no lo especifica explícitamente, resuélvela releyendo
`.claude/skills/spec/SKILL.md` en vez de improvisar un criterio nuevo.

## Fase 2 — Preguntas dirigidas

Usa `AskUserQuestion` en bloques de 3 a 5 preguntas. Espera respuesta antes de
continuar con el siguiente bloque. No asumas nada de lo siguiente:

**Bloque origen del juego:**
- ¿De qué carpeta de `references/started-games/` viene (si aplica), o es un juego sin
  referencia (el usuario debe describir el game loop o aportar el código)?
- Si ya existe una fila con ese `id` en `components/games/registry.ts` o un spec previo
  lo documenta, avisa y pregunta si es una actualización de un juego existente o un
  juego distinto antes de seguir.

**Bloque metadata para la fila `games`:**
- `id` (slug, minúsculas, sin espacios).
- `title`, `short` (una frase), `long` (descripción del juego).
- `cat` — debe encajar en el union type actual de `lib/supabase/types.ts`
  (`'ARCADE' | 'PUZZLE' | 'SHOOTER'`). Si el juego no encaja en ninguna, márcalo como
  decisión pendiente que requiere ampliar el union type.
- `cover` (clase CSS de portada) y `color` (`'cyan' | 'magenta' | 'yellow' | 'green'`).

**Bloque HUD y contrato de props:**
- Además de `score` (siempre presente), ¿qué otros stats expone el juego? (`lives`,
  `level`, `lines`, u otros propios del juego). Esto determina qué callbacks además de
  `onScoreChange`/`onGameOver` necesita el wrapper genérico para este juego.
- Controles del juego (teclado, teclas específicas) — para la sección de UX del spec y
  el texto de ayuda en la play-page.

**Cuando puedas responder sin asumir nada:** qué archivos cambian, cuál es el primer y
último paso ejecutable, y cómo se verifica que el juego funciona — sigue a la Fase 3.

## Fase 3 — Redacción del spec

Sigue las 7 secciones de `.claude/skills/spec/template.md`. Contenido específico que
debes incluir:

1. **Header** — objetivo en una frase, `**Depends on:** SPEC 05, SPEC 06`.
2. **Scope** — In: adaptar el game loop de referencia (si aplica) al wrapper genérico,
   registrar el juego, dar de alta la fila en Supabase, guardar scores. Out: todo lo que
   ya está fuera de alcance en las specs 05/06 (Auth, RLS, panel admin, realtime,
   paginación) más cualquier cosa que el usuario haya mencionado y decidido diferir.
3. **Data model** — la fila nueva de `games` con el `INSERT INTO games (...) VALUES
   (...)` completo y correcto; confirma explícitamente que `scores` no cambia de forma
   (acepta cualquier `game_id` de tipo `text`).
4. **Implementation plan** — pasos numerados, cada uno dejando el sistema funcional:
   - (Solo si es la primera vez, ver "Caso especial" arriba) extraer el wrapper
     genérico desde `AsteroidsGame.tsx`, crear `registry.ts`, migrar Asteroids, borrar
     `app/games/asteroids/play/page.tsx`.
   - Crear `components/games/<Nombre>Game.tsx` adaptando el loop de
     `references/started-games/<carpeta>/game.js` (si aplica) al contrato del wrapper.
   - Registrar el `id` del juego en `components/games/registry.ts`.
   - Confirmar que `app/games/[id]/play/page.tsx` (genérico) resuelve HUD, pausa, modal
     de game over y guardado en `scores` para este `id` sin archivos nuevos por juego.
   - Paso documental: el `INSERT INTO games` a ejecutar manualmente en Supabase.
   - Verificación final: `npm run build` sin errores; el juego es jugable en
     `/games/<id>/play`; el score se guarda y aparece en `/games/<id>` y
     `/hall-of-fame`.
5. **Acceptance criteria** — checklist booleano, incluyendo explícitamente que la fila
   de Supabase existe, que el juego es jugable, y que el score persiste y aparece en
   ambos leaderboards.
6. **Decisions** — las 4 decisiones fijadas arriba (spec primero, wrapper genérico,
   registro genérico, INSERT manual) más cualquier decisión propia de este juego que
   haya salido en la Fase 2 (p.ej. ampliar el union type de `cat`).

Si tienes toda la información sin asumir nada, escribe el spec completo de una vez (no
lo muestres sección por sección). Si algo quedó impreciso, desarróllalo sección por
sección pidiendo confirmación tras cada una, igual que `/spec`.

## Fase 4 — Guardar el spec

1. Número secuencial siguiente según el listado de `specs/` del session context
   (máximo existente + 1, dos dígitos).
2. Slug kebab-case desde el objetivo, p.ej. `07-tetris-game.md`.
3. Usa la fecha del session context — nunca la adivines.
4. Escribe el archivo directamente en `specs/NN-slug.md`. No pidas permiso para el
   nombre; solo pregunta si el archivo ya existe.
5. Estado `Draft` por defecto. No lo marques `Approved`.
6. Confirma al usuario: ruta del archivo creado, recordatorio de pasarlo a `Approved`
   tras revisarlo, y que el siguiente paso es `/spec-impl NN-slug`.
7. **Detente aquí.** No propongas implementar el spec ni escribir código.

## Reglas duras

- **Nunca escribas código.** Solo el `.md` del spec.
- **Nunca implementes ni propongas implementar** después de guardar el spec.
- **Nunca asumas** metadata del juego, stats del HUD, o si es la primera vez que se usa
  esta skill — verifícalo en el session context o pregúntalo en la Fase 2.
- **No repitas en la Fase 3 preguntas ya resueltas** por las decisiones de arquitectura
  fijadas arriba — esas van directas a la sección de Decisions, no se vuelven a
  plantear como pregunta.
