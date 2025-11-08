NBA Gesture Predictor (Live NBA + Webcam Shooting Gesture)
===========================================================

Monorepo structure:
- `server/`: Node.js + Express + Socket.IO backend (proxies NBA JSON, parses states, pushes updates)
- `client/`: React + Vite + Tailwind + Framer Motion + TensorFlow.js (MoveNet) frontend

APIs used:
- Scoreboard: https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json
- Play-by-play: https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_<GAME_ID>.json

Quick start
-----------
1) Install dependencies
   - In `server/`: `npm install`
   - In `client/`: `npm install`

2) Run backend
   - `cd server && npm run start` (defaults to http://localhost:4000)

3) Run frontend
   - `cd client && npm run dev` (defaults to http://localhost:5173)
   - The frontend proxies `/games` to `http://localhost:4000`

Features
--------
- Game list page shows currently active games with team logos and scores.
- Game page subscribes via WebSocket to live play-by-play updates every ~3 seconds.
- Displays ball handler, last shooter, player points and FG% (aggregated from actions).
- Webcam MoveNet multipose gesture detector: raise both arms and extend one forward to register a prediction.
- When the next shot is made/missed, your prediction triggers dramatic overlays and points on correct guess.

Notes
-----
- Player stats are aggregated from play-by-play actions during the session; they are approximate and rely on action semantics available from the JSON.
- Logos are loaded from `https://cdn.nba.com/logos/nba/{teamId}/global/L/logo.svg`.
- WebSocket subscription is room-based per `gameId`; polling starts when first subscriber joins and stops when all leave.


