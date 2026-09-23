# react-board-game — starter

The merged, verified best-practice shell for **board/lane/scroller games** built
with Vite + React + TypeScript. It combines the most refined version of each piece
from the older games:

| Piece | Came from |
|---|---|
| Topbar / overlay / sidebar / keyboard help | generic-game-template (via word-drop) |
| Immersive portrait + pillarboxed wide layout, toy-ink chrome, depth badge | splashy-fish |
| Engine hook: World in a ref, throttled HUD state, fx counters → toasts, TUNING table, level meter, portrait action bar | prof-whip-dash |
| Renderer interface + swap, dt clamp at both ends, attract-mode autopilot | dive-depths |
| Swipe-on-threshold + tap-a-side controls | prof-whip-dash `useBoardControls` (optional `onTap` = dive-depths variant) |
| Tap-to-zoom defence | sub-sinkers `touch-zoom-guard` |
| Single-file HTML build for artifact previews | prof-whip-dash `tools/inline.mjs` |
| Deploy workflow gated to `main` | prof-whip-dash fix |

It ships a tiny playable demo ("Starter Dash": three lanes, dodge, grab coins,
blast) so you can see every wire connected. Replace the demo, keep the wiring.

## Run

```
npm install
npm run dev            # http://localhost:5173
npm run build          # tsc + vite → dist/ (what Pages serves)
npm run sim            # headless physics checks (node ≥ 22.6)
npm run build:single   # artifact/game.html — one self-contained file
```

`?renderer=3d` switches to the three.js toy renderer (same World, same interface).

## Where to change what

| To change… | Edit |
|---|---|
| Rules, numbers, spawning, scoring | `src/game/physics.ts` (`TUNING` first) |
| What the HUD shows | `src/game/types.ts` (`GameState`) + `snapshot()` in `useGameEngine.ts` + `components/Hud.tsx` |
| Reactions to events (toasts, haptics, sfx) | the `fx` block in `useGameEngine.ts` |
| Drawing | `src/game/render2d.ts` or `scene3d.ts` — both implement `renderer.ts` |
| Controls | `hooks/useBoardControls.ts`, keyboard switch in `useGameEngine.ts`, `.action-tap` + footer in `App.tsx` |
| Look | tokens at the top of `styles/index.css` (`--board-aspect` sets the wide-layout board shape) |
| Title / copy | `index.html` `<title>`, `App.tsx` wordmark, `GameOverlay.tsx` |
| Best-score key | `BEST_KEY` in `useGameEngine.ts` — namespace it per game |

## Rules this starter encodes (don't undo them by accident)

- The simulation never imports React, the DOM, or three.js. Renderers own no game state.
- Per-frame values are never React state. The HUD is a snapshot pushed about 12 times a second.
- `dt` is clamped to `[0, 1/30]`. The negative case really happens (StrictMode double-mount, tab resume).
- Controls are discrete actions called once per keydown, swipe or tap. A swipe fires when it crosses the threshold, not when the finger lifts.
- In-board buttons stop pointer propagation so pressing them never also counts as a board tap. They fire on `pointerdown`, because `click` is suppressed on the game surface by the zoom guard.
- Menus and chrome carry `data-touch-allow`. The board doesn't.
- Every layout is exactly `100dvh`, with no page scroll and no JS breakpoints. The wide layout is chosen by `pointer` plus orientation, not width alone.
- The app auto-pauses on `visibilitychange`, `blur`, and when a zoom slips through.
- `localStorage` access is always wrapped in `try`/`catch`.

See `../../docs/` for the reasoning and the history behind each rule.
