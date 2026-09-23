# 16 · New-game checklist

Copy this into the new repo's first PR description and tick it off.

## 0. Decide (30 minutes, in writing)
- [ ] One-line pitch plus the classic it riffs on ("Flappy Bird turned 90°", "Crazy Taxi with an ambulance").
- [ ] Verb count, which gives the control scheme: pick a row in [04](04-input-and-controls.md).
- [ ] Stack: **React starter** (board or lane game in a shell with sidebar and overlays) or **vanilla three starter** (full-screen diorama with a stick). See the decision table in the root README.
- [ ] Art style: one of the six in [06](06-art-direction.md). Palette table first.
- [ ] Progression shape from [12](12-levels-worlds-progression.md).
- [ ] `GAME_DESIGN.md` from `templates/GAME_DESIGN.template.md`: pillars, loop, numbers with *why*, cast, art, controls, budget, open questions.

## 1. Scaffold
- [ ] Copy `starters/react-board-game` or `starters/vanilla-three-toy` into the new repo.
- [ ] Rename it: `package.json` name, `<title>`, wordmark, overlay copy, `BEST_KEY` (`'<game>.best'`).
- [ ] Keep the deploy workflow (build everywhere, deploy only from main) and `base: './'`.
- [ ] Keep the touch-zoom guard. Add `data-touch-allow` to every menu or card you add.
- [ ] `npm run build` + `npm run sim` + smoke test green before writing game code.

## 2. Simulation
- [ ] `TUNING` table with a comment per value.
- [ ] `World` + `createWorld()` + `step(w, dt)` + discrete action functions + `score(w)`.
- [ ] `fx` counters reset each step. No UI or audio calls inside the sim.
- [ ] Spawns are distance-driven with re-rolled gaps, beyond the tallest view.
- [ ] Every row or wave provably leaves a way through. Heals only in safe spots.
- [ ] Difficulty keys off the level index. Level 1 is an on-ramp.
- [ ] Damage hitbox is smaller than the visual. Pickup radius is generous.
- [ ] Headless checks in `tools/sim-check.ts` for each invariant (template: `starters/react-board-game/tools/sim-check.ts`).

## 3. Rendering
- [ ] Implements `Renderer { resize, update, dispose }`. Owns no game state.
- [ ] DPR ≤ 2. Pools, not churn. Shared materials. No per-projectile lights.
- [ ] Full play width visible at any aspect. Nothing pops in at the top of tall phones.
- [ ] Reserved colours respected: danger, reward, player, good.
- [ ] Telegraph every source of damage.
- [ ] An art-bible or preview page for the cast (optional but a house habit).

## 4. HUD & UI
- [ ] Choose indicators from [05](05-hud-gauges-indicators.md). Put info where the eyes already are.
- [ ] `tabular-nums` on every ticking number. HUD `pointer-events:none`.
- [ ] Health readable at a glance, with a critical state (pulse or vignette).
- [ ] Toasts for moments. Floating numbers at the spot.
- [ ] Start card teaches controls in ≤ 3 lines. Attract mode behind it.
- [ ] Pause top-right. Auto-pause on blur, visibility and zoom. Input reset on pause.
- [ ] Keyboard map follows the conventions table, listed in the `?` popover.

## 5. Feel & sound
- [ ] Shake scaled by impact. Hit flash or hitstop on the key action. Invincibility blink.
- [ ] Pops on pickups. Dust or trails on movement.
- [ ] Synth sfx for every fx counter (`sfx-synth.js`). Unlock on the Start gesture. Mute toggle.

## 6. Verify
- [ ] Smoke test at phone, phone-landscape, tablet-landscape and desktop: zero console errors, zero page scroll.
- [ ] Tap-spam zoom test PASS (touch games).
- [ ] Real phone check: stick never sticks after a notification or app switch; buttons respond to rapid taps.
- [ ] Temporary test toggles reverted (`grep -n TEST_ src`).
- [ ] `tsc -b` clean after every merge.

## 7. Document
- [ ] README: pitch, run, controls table, code map, lineage (which kits and starters).
- [ ] Delta log section in `GAME_DESIGN.md` for each feature branch.
- [ ] Anything new and reusable goes back into this repo's `kits/`, with a line in `kits/README.md` and a pitfall entry in [14](14-pitfalls-and-fixes.md) if you hit one.
