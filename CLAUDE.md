# CLAUDE.md

Este archivo proporciona guía a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

@AGENTS.md

## Acerca del proyecto

Arcade Vault — una plataforma para jugar online y competir por la mayor cantidad de puntos (según README.md). Es una app Next.js 16 recién generada (App Router), sin funcionalidades propias implementadas todavía más allá de la plantilla por defecto.

## Comandos

- `npm run dev` — inicia el servidor de desarrollo
- `npm run build` — build de producción
- `npm run start` — ejecuta el build de producción
- `npm run lint` — ejecuta ESLint (config plana en `eslint.config.mjs`, extiende `eslint-config-next` core-web-vitals + typescript)

Todavía no hay un test runner configurado.

## Importante: leer antes de escribir código Next.js

Este proyecto fija `next@16.3.0`, una versión más nueva de lo que cubren la mayoría de los datos de entrenamiento — las APIs, convenciones y estructura de archivos pueden diferir de lo esperado. Según `AGENTS.md`, antes de escribir cualquier código de Next.js hay que leer la guía correspondiente en `node_modules/next/dist/docs/` (la documentación del App Router está en `01-app/`) y respetar los avisos de deprecación que se encuentren ahí.

## Arquitectura

- Solo App Router (directorio `app/`) — `app/layout.tsx` es el layout raíz, `app/page.tsx` la página de inicio.
- Estilos con Tailwind CSS v4 (plugin `@tailwindcss/postcss`, configurado a través de `app/globals.css`, sin `tailwind.config` separado).
- El alias de rutas `@/*` apunta a la raíz del repo (ver `tsconfig.json`).
- El modo estricto de TypeScript está activado.

## Flujo de trabajo basado en specs

Este proyecto sigue Spec Driven Design usando las skills `spec` y `spec-impl` (ver https://github.com/Klerith/fernando-skills, instaladas con `npx skills@latest add Klerith/fernando-skills`). Cuando estas skills estén disponibles, se prefiere escribir/actualizar una spec antes de implementar features no triviales.
