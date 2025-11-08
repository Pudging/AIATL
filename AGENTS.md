# Repository Guidelines

## Project Structure & Module Organization
This Next.js App Router app keeps all routes in `app/`. `app/page.tsx` handles the live scoreboard, `app/game/[id]/page.tsx` drives the in-game viewer and gesture UI, and `app/globals.css` hosts Tailwind layers. API handlers live beside the routes: `app/api/games/route.ts` polls the scoreboard, and `app/api/games/[id]/route.ts` merges play-by-play and box score data. UI primitives and typed payloads sit in `components/`, while NBA fetchers, mock data, and parsing logic stay in `lib/` (`lib/nba.ts`, `lib/testGameData.ts`). Add assets to `public/` and keep heavy camera logic isolated to `components/WebcamGestureDetector.tsx`.

## Build, Test, and Development Commands
`pnpm install` installs dependencies (pnpm is required). `pnpm dev` runs the local server on :3000; hit `/game/TEST001` for deterministic fixtures. `pnpm build` performs production compilation and route validation, and `pnpm start` serves that output. `pnpm lint` wraps `next lint` for ESLint + TypeScript checks—treat this as the minimum gate before opening a PR.

## Coding Style & Naming Conventions
The repo enforces strict TypeScript with the `@/*` alias. Use 2-space indentation, prefer `const`, and keep React components as typed functions that run client-only logic under `"use client"`. Name components and files in PascalCase, helpers in camelCase, and export shared shapes through `components/types.ts`. Use Tailwind utility classes for layout/animation, falling back to `app/globals.css` for tokens or resets. Heavy dependencies such as TensorFlow should only be imported where they are used.

## Testing Guidelines
Automated tests are not configured yet. Manually verify scoreboard and game views with `pnpm dev` and the `TEST001` flow, noting gesture latency, overlays, and API fallbacks. When you add a testing harness (Vitest, Jest, or Playwright), place specs alongside the feature (`components/__tests__/`, `lib/__tests__/`) and document the command in the PR. Regardless of framework, list the scenarios you exercised and cover edge cases—timeouts, missing NBA data, camera failures—before requesting review.

## Commit & Pull Request Guidelines
Recent history favors short imperative commit subjects (`better camera ui and shot detection`). Follow that style, adding detail in the body if needed. For every PR include: (1) a concise summary, (2) linked issue or task id, (3) screenshots or videos for UI/gesture changes, and (4) the commands or manual steps you ran (`pnpm lint`, `/game/TEST001`). Call out data-source updates, new configuration, or migration steps so reviewers can reproduce your setup quickly.
