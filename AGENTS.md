# AGENTS.md: how to use this repo when building a game

You are building or changing a browser game for `mtd-public`. This repo is the
organisation's game memory. Use it before inventing anything.

## Where to look (fast)

| You need… | Look in |
|---|---|
| a working skeleton | `starters/react-board-game` or `starters/vanilla-three-toy` (both verified) |
| a drop-in module (input, audio, HUD gauge, three kit, pixel kit, sim) | `kits/README.md` → the file |
| how something was done in an old game | `grep -rn "<term>" reference/` (full sources, SHAs in `reference/SOURCES.md`) |
| numbers that shipped (speeds, timers, HP, spawn gaps, boss cadence) | `docs/11-mechanics-cookbook.md`, then `reference/*/DESIGN.md` / `GAME_DESIGN.md` |
| a gauge, meter or indicator | `docs/05-hud-gauges-indicators.md` |
| why something breaks on phones | `docs/14-pitfalls-and-fixes.md` (68 entries), `docs/04-input-and-controls.md` |
| 3D models | `assets/models-3d/` (61 GLBs + manifest; conventions in `docs/13-assets.md`) |
| art style and palettes | `docs/06-art-direction.md` |

## Non-negotiable rules (each one exists because it broke before)

1. **Sim / render / UI split.** The simulation has no React, DOM or three.js
   imports. Renderers own no game state and implement
   `resize / update(world, phase, dt, t) / dispose`. React state holds only
   throttled HUD snapshots.
2. **Clamp dt at both ends:** `Math.max(0, Math.min(raw, 1/30))`. Negative dt
   really happens.
3. **Touch games ship `kits/touch-zoom-guard`.** Controls use Pointer Events.
   Menus, cards and chrome get `data-touch-allow`. Every control gets its own
   `touch-action: none`. In-game buttons act on `pointerdown` and stop
   propagation.
4. **Joysticks:** a new touch always takes the stick. Reset input on blur,
   visibilitychange, pagehide, lostpointercapture and pause.
5. **Layout:** `100dvh`, no page scroll at any size. Chrome is `flex:none`; the
   play area has `min-height:0`. The wide layout is chosen by
   `pointer` + orientation, not width. Safe-area insets. Pause top-right.
6. **Spawns beyond the tallest view.** Guarantee a way through every row or
   wave. Heals only in safe spots. Difficulty keys off the level, never the
   zone.
7. **No per-projectile lights. DPR ≤ 2. Pools, not churn. Shared materials.**
8. **localStorage in try/catch**, with namespaced keys (`'<game>.best'`).
9. **Deploy only from main** (build on every branch), with `base: './'`.
10. **Verify before pushing:**
    - `tsc -b`
    - headless sim checks
    - `tools/smoke-*.mjs` (0 console errors, 0 page scroll at phone, landscape, tablet and desktop)
    - the tap-spam zoom test for touch games
    - revert any temporary test toggles, and say so in the commit

## House conventions

- A design doc before code (`templates/GAME_DESIGN.template.md`), with a
  delta-log section per feature branch.
- A `TUNING` table with a *why* comment per value.
- `fx` counters for events.
- A title-screen attract mode.
- Reserved colours: red = danger, green = good or pickup, yellow/gold = reward
  and primary action.
- Everything procedural (code-built meshes and sprites, synth audio) unless
  there's a reason not to.
- Commit messages explain the design reason and list the verification done.

## When you finish something reusable

Copy it into `kits/` (source game in the file name), add a row to
`kits/README.md`, update the relevant `docs/` file, and add any bug you fixed to
`docs/14-pitfalls-and-fixes.md`.
