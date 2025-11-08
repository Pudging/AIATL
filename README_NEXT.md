Next.js NBA Gesture Predictor
=============================

Single-app Next.js (TypeScript) implementation with client polling and MoveNet gesture detection.

Run
---
- Install deps: `npm install`
- Dev: `npm run dev` (http://localhost:3000)
- Build: `npm run build` then `npm start`

What’s included
---------------
- App Router pages:
  - `/` Live game list (polls `/api/games` every 10s)
  - `/game/[id]` Live viewer + webcam (polls `/api/games/[id]` every 3s)
- API routes:
  - `GET /api/games` → simplified scoreboard (live games only)
  - `GET /api/games/[id]` → parsed play-by-play state
- Gesture detection (`components/WebcamGestureDetector.tsx`): MoveNet multipose, arms-up + wrist velocity heuristic
- Animations (`components/ScoreAnimation.tsx`): “Scored!” or “Missed!” overlay
- Styling: Tailwind (`app/globals.css`)

Notes
-----
- No WebSockets; all updates via client-side polling.
- Uses official NBA JSON endpoints from cdn.nba.com.


