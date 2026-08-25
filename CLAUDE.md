# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — an online gaming platform where users play and compete for points. Uses **Spec Driven Design** via the `/spec` and `/spec-impl` skills from `npx skills@latest add Klerith/fernando-skills`.

## Stack

- **Next.js 16.2.6** with App Router (`app/` directory) — read `node_modules/next/dist/docs/` before writing Next.js code; APIs differ from training data
- **React 19.2.4**
- **Tailwind CSS v4** (PostCSS plugin via `@tailwindcss/postcss`)
- **TypeScript**
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) — auth (email+password, OAuth Google/GitHub) + scores persistence
- **Resend** — contact form email delivery
- **Prettier** (`.prettierrc`: comillas simples, semi, printWidth 80, LF) + **ESLint** (`eslint-config-next`)

No test runner configured.

### Scripts

`npm run dev` · `build` · `start` · `lint` · `format` · `format:check`

### Entorno

Variables en `.env.local` (plantilla en `.env.template`). MCP de Supabase configurado en `.mcp.json`.

### Automatización

`.claude/settings.json` define un hook `PostToolUse` (Write|Edit|MultiEdit) que ejecuta
`.claude/hooks/format-and-lint.sh` — Prettier + ESLint se aplican automáticamente tras cada edición.

## Skills

Usa siempre `/frontend-design` para diseñar la interfaz de usuario.

- **`/spec`** y **`/spec-impl`** — flujo base de Spec Driven Design (`.agents/skills/`, espejo en `.claude/skills/`).
- **`/spec-impl-game`** — variante de `/spec-impl` para specs de juegos: mismo flujo (Fases 1–4) y al terminar la implementación encadena automáticamente `@skin-designer` y luego `@mobile-porter` de forma secuencial.
- **`/add-game`** (`.claude/skills/add-game/`) — genera el spec de un juego nuevo (componente canvas, play-page, fila en la tabla `games` y wiring del leaderboard) a partir de una carpeta de `references/started-games/` o de una descripción libre. **No escribe código**, solo produce `specs/NN-<slug>-game.md`.

## Agentes

- **`game-planner`** — sugiere el próximo juego a implementar evaluando diversidad, factibilidad y reconocimiento clásico. Úsalo con "qué juego sigue". Detalle: `.claude/agents/game-planner.md`.
- **`game-jam`** — dado un tema, genera ≥2 specs completos en `specs/game-jam/<game-id>/`. Úsalo con "game jam: \<tema\>". Detalle: `.claude/agents/game-jam.md`.
- **`skin-designer`** — aplica los 3 skins canónicos (classic, retro, neon) a un juego. Úsalo con "aplica skins a \<juego\>". Detalle: `.claude/agents/skin-designer.md`.
- **`mobile-porter`** — añade controles táctiles (spec 10) a un juego sin tocar el componente canvas. Úsalo con "porta \<juego\> a mobile". Detalle: `.claude/agents/mobile-porter.md`.
- **`game-performance-booster`** — audita y corrige los 7 patrones de performance (spec 12) en un juego. Úsalo con "optimiza \<juego\>". Detalle: `.claude/agents/game-performance-booster.md`.
- **`security-auditor`** — audita seguridad de DB Supabase (RLS, políticas, advisors) y app Next.js (headers, proxy.ts, secretos, deps). Solo lectura. Bitácora en `references/security/audit-log.md`. Úsalo con "audita seguridad". Detalle: `.claude/agents/security-auditor.md`.

## Architecture

App Router exclusively — no `pages/` directory.

### Routes (`app/`)

- `layout.tsx` — root layout (Geist fonts, global CSS, `UserContext` provider, `Nav`)
- `page.tsx` — home / landing
- `about/` — about + contact form
- `api/contact/` — Resend-backed contact endpoint
- `auth/` — Supabase auth page (login/signup, OAuth Google y GitHub)
  - `auth/callback/route.ts` — intercambio del código OAuth / verificación de email
  - `auth/reset-password/` — flujo de recuperación de contraseña
- `games/` — games index (`GamesGrid.tsx`) + per-game routes: `arkanoid`, `asteroids`, `frogger`, `snake`, `tetris` and more...
  (see `references/implemented-games.md`) when you need to check which games are implemented and how to implement new ones.

- `games/[id]/` — dynamic game detail with nested `play/` route
- `hall-of-fame/` — leaderboard / scores (`HallOfFameClient.tsx`)
- `pokemon-counter/` — demo/playground page
- `context/UserContext.tsx` — client-side auth user context (usuario real de Supabase)
- `data/` — static catalog: `games.ts`, `scores.ts`, `index.ts`
- `RevealObserver.tsx` — scroll-reveal animations

### Shared code

- `components/Nav.tsx` — top navigation
- `components/MobileGamepad.tsx` + `MobileGamepad.module.css` — gamepad táctil reutilizable (skin neon, spec 11)
- `components/games/` — canvas game implementations (`ArkanoidGame`, `AsteroidsGame`, `FroggerGame`, `SnakeGame`, `TetrisGame`)
- `lib/supabase/` — `client.ts` (browser), `server.ts` (RSC/route handlers), `types.ts` (`GameRow`, `ScoreRow`)
- `proxy.ts` — redirige a `/` si ya hay sesión Supabase (matcher: `/auth`)
- `next.config.ts` — headers de seguridad HTTP (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-DNS-Prefetch-Control`) + `allowedDevOrigins` para pruebas en móvil
- `public/` — sprite sheets (`spritesheet-breakout.png`, `fruits.png`) and audio (`ball-bounce.mp3`, `break-sound.mp3`)

### Seguridad

RLS activo en `games` y `scores`, política de contraseña robusta, protección de leaked-passwords
y hardening del flujo de auth (specs 14 y 15). Checklist y bitácora en `references/security/`.

### Referencias (`references/`)

- `implemented-games.md` — catálogo de juegos implementados y cómo añadir uno nuevo
- `game-with-themes.md` — estado de skins (classic/retro/neon) por juego, mantenido por `skin-designer`
- `game-suggestions-todo.md` — to-do persistente de `game-planner`
- `security/` — `security-checklist.md` y `audit-log.md` (mantenido por `security-auditor`)
- `started-games/`, `source-assets/`, `gamepad-assets/`, `templates/` — material fuente para nuevos juegos y UI

### Specs

`specs/` holds the spec-driven design history (01–15: pantallas, landing, contacto, Supabase,
juegos, controles táctiles, performance, auth y seguridad), plus `specs/game-jam/` for thematic
jams (`frogger`, `space-invaders`).

## Conventions

- Server Components by default; add `"use client"` only when needed (game canvases, auth context, interactive forms).
- New routes: folder under `app/` with `page.tsx`.
- Shared UI in `components/`; game logic colocated in `components/games/<Game>.tsx`.
- Supabase: import from `lib/supabase/server` in RSC / route handlers, `lib/supabase/client` in client components.
- New games follow the existing pattern: spec in `specs/`, canvas component in `components/games/`, route under `app/games/<name>/`, score writes through `lib/supabase`.
- Cada juego nuevo debe cerrar el ciclo: implementación → `@skin-designer` (3 skins) → `@mobile-porter` (controles táctiles) → registro en `references/implemented-games.md` y `references/game-with-themes.md`.
- Los controles táctiles se cablean en la play-page con `MobileGamepad`, **sin modificar** el componente canvas.
- Formato y lint automáticos vía hook; aun así, respeta `.prettierrc` al escribir código.
- Git: nunca usar `--no-verify`; si un hook falla, corrige la causa.
