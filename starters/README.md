# starters/: verified, copy-and-go game skeletons

| Starter | Stack | Best for | Verified |
|---|---|---|---|
| [`react-board-game/`](react-board-game/) | Vite + React 18 + TS + framer-motion; Canvas-2D renderer **and** a three.js renderer behind one interface (`?renderer=3d`) | lane runners, vertical scrollers, shmups, puzzle boards: any game that lives in a **board** inside a UI shell (topbar, sidebar, overlays, footer) | `tsc` + `vite build` clean; `npm run sim` PASS; headless Chromium at iPhone 13, iPhone landscape, iPad landscape and 1280×800 desktop (2D and 3D): **0 console errors, 0 page scroll** |
| [`vanilla-three-toy/`](vanilla-three-toy/) | plain ES modules, three.js r160 vendored, import map, **no build** | full-screen isometric / top-down diorama games steered with a thumbstick (driving, rolling, flying, skating) | headless Chromium desktop (keyboard, hold boost, mouse-drag stick) + iPhone (start, pause): **0 console errors** |

Screenshots: `../assets/screenshots/starters/`. Re-run the checks with `../tools/smoke-*.mjs`.

## Picking one

- You need an overlay, sidebar, popovers, achievements or options, and the play area is a rectangle: **React**.
- The whole screen is the world and the camera follows the player: **vanilla three**.
- You want pixel art: React starter plus `kits/pixel/` (swap `render2d.ts` for the In the Hunt renderer or the two-tone renderer; the interface is the same).
- A 2D side-scroller with a fixed internal resolution: base it on `reference/sub-sinkers/` (vanilla canvas, fixed step, procedural sprites). That code is small enough to copy whole.

## After copying

1. Rename the game: package name, `<title>`, wordmark, overlay copy, best-score key.
2. Replace the demo sim (`physics.ts` / the `main.js` game section). Keep the loop, the input wiring and the shell.
3. Run the checks again (build, sim, smoke) before your first commit.
