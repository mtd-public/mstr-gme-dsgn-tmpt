# 01 · Game catalog: what exists, and what to steal from each

Every project in `mtd-public`, except `modern-portfolio`, as of 2026-09-23. Full
source snapshots are in `reference/<repo>/`, with commit SHAs listed in
`reference/SOURCES.md`.

These repos are **empty**, with no commits on any branch: `beast-bear`,
`chaichill`, `instruct-ins`, `metal-bug`, `office-game`, `reverse-cam`,
`three-dee-demo`, `word-monster`. They contribute nothing yet.

## Lineage at a glance

```
word-drop (React Tetris-like) ──strip──► generic-game-template (React shell)
                                              │
                           ┌──────────────────┴──────────────────┐
                    splashy-fish (3D, 1 action)          prof-whip-dash (3D runner)
                           │   └───── both ─────┐               │
                           └──────────────► dive-depths ◄───────┘
                                   (3D → pixel 2D → two-tone 2D)

gig-ambulance (Blender GLB kit + vanilla three.js) ── toy-ink art direction ──►
   splashy-fish (restyle), space-lion (restyle), finger-skater (reuses GLBs),
   labyrinth-larry (reuses input)
space-lion (vanilla three.js) ── floating stick ──► gig-ambulance ──► labyrinth-larry
sub-sinkers (vanilla canvas 2D, procedural 16-bit) ── touch-zoom-guard ──► everyone
zine-machine (React + MUI app, not a game) ── pointer-drag transform hooks
```

There are two stack families:

- **React family.** Vite + React 18 + TS + framer-motion, with an optional
  three.js scene. It has a DOM shell (topbar, board, sidebar, footer, overlay)
  and the game runs in a canvas inside `.board-shell`. Members: word-drop,
  generic-game-template, splashy-fish, prof-whip-dash, dive-depths.
- **Vanilla family.** No build step. Plain ES modules; three.js is vendored and
  loaded through an import map (or as a classic `<script>` global in
  space-lion). A full-screen canvas sits under a DOM or canvas HUD overlay.
  Members: gig-ambulance, finger-skater, space-lion, labyrinth-larry,
  sub-sinkers.

Starters for both families are in `starters/`.

---

## splashy-fish: vertical Flappy Bird
- **Concept:** Flappy Bird turned 90°. The fish holds a fixed row and obstacles scroll up. A current pulls it left, the way gravity pulls the bird down, and **splash** snaps it right, like a flap. It descends from the reef shallows into the purple abyss.
- **Stack:** React shell, three.js `scene3d.ts`, `palette.ts` SURFACE→DEEP lerp.
- **Controls:** tap the board, press Space/↑, or use the Splash button.
- **Steal:**
  - The **portrait-immersive / wide-pillarbox CSS**: `kits/css/toy-ink-shell.splashy-fish.css`.
  - `frameCamera`, which keeps the full board width in view on any aspect.
  - The **inverted-hull ink outline** with welded normals.
  - The shadow-only backdrop plane.
  - `paletteAt(t)` depth lerp, which lerps **in HSL for the water** so mid-depth isn't grey.
  - The instanced bubble and splash particle pools.
  - Obstacles tethered to the gap edge ("the hazard sits exactly where you thread").
  - The obstacle-type cycle `['coral','anchor','coral','mine']`.
- **Numbers:** board 400×800 units. Fish at 0.32·H, r=18. Current 900 u/s², splash vx 340. Gap 152→100 (−1.5/pt). Speed 190→380 (+5/pt). Spawn spacing 420. Fully dark at score 50.

## prof-whip-dash: three-lane endless runner (Maya → Egypt)
- **Concept:** a fedora'd professor outruns boulders that **grind** instead of killing. Share a lane with one and you bleed until you move. 70% of coins spawn in the dangerous lane, with payout ×1/×2/×3 by lane danger. A whip cracks vermin 2–5 m ahead, in your own lane only.
- **Stack:** React shell. three.js **flat-shaded low-poly kit built from primitives** (`kit.ts`, 1,248 lines, no textures or meshes). `board.html` is a live art bible; `camera.html` is a camera-rig study page with sliders. `tools/inline.mjs` builds single-file artifacts (kit copy: `kits/three-ts/inline-single-file-build.mjs`).
- **Controls:** swipe (fires as soon as the swipe crosses the threshold) or tap a side of the board to change lane. Whip is a full-width bar button at the bottom of the board in portrait; the footer holds ◀ WHIP ▶ in landscape/desktop.
- **Steal:**
  - `TUNING` table.
  - `fx` event counters.
  - HUD throttled to 12 Hz.
  - `useBoardControls`.
  - Health **ring on the character's back**: 6 torus segments; a lost segment breaks off as a tumbling shard.
  - Countdown numeral sprites over threats.
  - Level meter plus "m to next level".
  - The biome/world table, where **difficulty keys off the level, never the zone**.
  - Seam-module biome transitions.
  - Zoomorphic gates.
  - Pooled ground-aligned dust quads.
  - Sky dome.
  - ACES tone mapping.
  - A key light **behind** the runner so threats cast shadows forward.
  - The per-world chrome repaint via `.app[data-world]`.
- **Docs:** `reference/prof-whip-dash/DESIGN.md`, `reference/prof-whip-dash/docs/BIOMES.md`, `reference/prof-whip-dash/docs/WORLD-2.md`. These are the best design docs in the org, so read them.

## dive-depths: vertical sub shooter (the most evolved React game)
- **Concept:** a sub descends endlessly. Steer with discrete steps and fire down at fish, subs, mines, squids and tentacles. It has formations, power-ups (shotgun, laser ultimate, health, extra life), a boss every 2,500 leagues, the Kracken at 20,000 (the win condition), achievements, and a self-playing title screen.
- **Stack:** React shell. It began as a fork of splashy-fish (three.js) and later swapped to an **In the Hunt–style procedural pixel renderer** (`pixelArt.ts` + `render2d.ts`, 256×512 internal). Then it added a **two-tone Downwell-style indexed renderer** with 26 swappable palettes (`twoTone/`). All three renderers sit behind the same interface.
- **Controls:** swipe to steer, tap anywhere to fire (no fire button), keyboard ←/→ Space.
- **Steal:**
  - The renderer-swap architecture.
  - `BossGauge` thermometer.
  - `BossBanner` SVG ring.
  - `WeaponBadge` that follows the player via its own rAF.
  - Achievements with localStorage and toasts.
  - `OptionsMenu`, which is an art-style toggle with a palette picker.
  - URL-param settings (`?art=twotone&palette=kelp`).
  - Attract-mode AI.
  - dt clamped at both ends.
  - Small visible hitbox recoloured by lives.
  - Mine proximity fuse → 8-way shrapnel.
  - Boss mine-squad formations with a **guaranteed open lane per row**.
  - Threat unlocks by distance milestone.
  - Re-rolled spawn gaps.
  - Laser that tracks the player and extends on pickup.
  - Pixel sprite generator: string-map legend, parametric hulls, explosion generator.
  - Palette LUT swap.
- **Docs:**
  - `reference/dive-depths/GAME_DESIGN.md`: a reuse plan, then a delta log per feature branch. This is the model for documenting iterations.
  - `reference/dive-depths/REVAMP_IN_THE_HUNT.md`: how to write a full art-direction revamp plan.

## gig-ambulance: Crazy Taxi with an ambulance (the asset source)
- **Concept:** isometric, rush-delivery. Pick up patients (green beam) and deliver them to *their* hospital (red beam) before the fare timer runs out. A pizza side gig runs in parallel. The shift clock is extended by good deliveries.
- **Stack:** vanilla three.js r160 with no build step. **61 procedural chibi GLBs built in Blender Python** (`assets/models-3d/tools/blender/`), with a manifest and preview contact sheets.
- **Controls:** floating thumbstick on the left 60% of the screen, giving an **absolute screen direction** with a smoothstep throttle. DRIFT/BRAKE/BOOST hold-buttons on the right. ⟳ rotates the camera 90°.
- **Steal:**
  - The **robust joystick**: a new touch always takes over the stick; input resets on blur, visibility and pagehide.
  - Hold buttons with per-pointer ownership.
  - Stick-to-world projection.
  - Spring-damped yaw-rate steering.
  - Surface grip table.
  - Airborne detection ("ground drops faster than a ballistic arc").
  - **X-ray silhouette** of the player behind buildings, using `depthFunc: GreaterDepth` plus renderOrder.
  - `bakeStatic`, which merges static meshes by material.
  - Instanced breakables that topple, fly off and regrow.
  - The top **nav compass** measured in screen space.
  - Floating world-space "+$" text.
  - Toasts.
  - Synth siren.
  - Base64 GLB bundle fallback for hosts that won't serve `.glb`.
- **Docs:** `reference/gig-ambulance/DESIGN.md`: pillars, core-loop diagram, formulas, and the asset pipeline conventions.

## finger-skater: Paperboy-style skateboarding
- **Concept:** an endless toy-town street. Weave through traffic, ollie with a hold-to-charge jump, grab in the air (let go before landing or you crash), and grind rails with a balance meter. Three hits and you bail. A clean-streak multiplier builds by distance.
- **Stack:** vanilla three.js, reusing gig-ambulance GLBs. The skateboard and helmet are built in code.
- **Controls:** **twin full-height touch zones**. Anywhere on the left drops a joystick under the thumb; anywhere on the right is the hold button. Holding the button also gives +12% speed.
- **Steal:**
  - Twin-zone input with a press/release event queue.
  - SVG **charge ring**.
  - **Air-time bar** that turns red under 0.3 s.
  - **Balance meter** with a needle and a warn pulse.
  - Lives as pips.
  - Multiplier pill with a "hot" state.
  - Camera views persisted to localStorage.
  - `window.SKATE` debug handle.
  - Noise-based roll loop and grind-scrape loop.

## space-lion: Xevious/Sinistar top-down shooter
- **Concept:** the ship always flies forward, steered by a thumbstick. Tap anywhere to fire at a reticle ahead of the nose. Towers shoot back. There are gold pickups and ring courses. A recurring mini-boss (the Sentinel) has **persistent health across encounters**. The final boss is the Space Lion.
- **Stack:** vanilla three.js r136 as a classic global. `space-assets.js` is a large **procedural toy asset factory**: ship, towers, reticle, rings, bosses, particles and a shock ring, each exposing a `userData.update()` API.
- **Steal:**
  - `BossHealth(max, phases)`, extracted to `kits/sim/boss-health.js`.
  - **Canvas-drawn toy HUD**: card, pill, segmented bar, boss bar, pop-in toasts, ink-stroked combat text, drawn stick. See `kits/vanilla-js/hud/canvas-toy-hud.js`.
  - Measuring safe-area insets from canvas code with a hidden probe div.
  - Pitched ortho "diorama" camera with pitch-corrected stick input.
  - Toy FX: star bursts, puffs, debris, shock rings.
  - Shared-resource disposal (`userData.shared`).

## labyrinth-larry: Marble Madness in Hell
- **Concept:** roll a caged screaming soul down five hell circles to the hellmouth before the sands run out. Falls over 4.6 units kill. Rune checkpoints. Lament boxes give +5 s. Hazards include hooks, spikes, flame vents, lava, crumbling bone and chasing soul orbs.
- **Stack:** vanilla three.js. Levels are **ASCII map patches joined by ramps** (`levels.js`). The world is a height grid where every cell is a plane (`world.js`), with a lava shader. Physics is a rolling ball on that grid.
- **Steal:**
  - The ASCII level `Builder` with its glyph legend.
  - **`tools/autopilot.js`** (kit copy: `kits/sim/marble-grid/autopilot.js`): BFS path plus replaying the real physics to *prove* every level is finishable.
  - Rolling-ball physics (5/7 slope pull, wall push-out, fatal-fall tracking, ball-ball bounce).
  - **Light pool**: 6 real PointLights handed to the torches nearest the player each frame, instead of one light per torch.
  - Formant-synthesised screams.
  - Hellish Impact-font chrome with a big glowing timer.

## sub-sinkers: 16-bit side-scrolling sub shooter
- **Concept:** four depth-themed stages (sunlit, twilight, midnight, hadal ice). Forward-only camera with a free-movement zone. Torpedo forward, missile up. Weapon power levels. Two boss types. Nine enemy types.
- **Stack:** vanilla canvas 2D at **384×216**, scaled to fit. Fixed 1/60 s step accumulator. **All art generated in code** by `sprites.js`.
- **Steal:**
  - `sprites.js` **material-mask shader**. You paint material ids into a buffer; each material has a palette ramp and a shading model (`cyl`, `hcyl`, `sph`, `vert`, `flat`). It then adds rim light/shadow, 4×4 Bayer dither and a 1 px dark outline. That gives the 16-bit look with no assets.
  - `util.js` 3×5 bitmap font and hash/fbm noise.
  - The level theme table (palettes + enemy mix + boss per stage).
  - Stage banner and WARNING flash.
  - Arcade bottom HUD: score padded to 8 digits, hull pips blinking at ≤2, power pips, depth readout, level progress bar.
  - **`touch-zoom-guard/`**, the canonical fix, with a Playwright tap-spam test and an agent brief.

## word-drop: Tetris × word game
- **Concept:** pieces carry letters (red = vowels, blue = consonants). Words of 3–6 letters formed horizontally or vertically clear. Cells self-destruct after N turns. Gravity settles columns.
- **Stack:** React + framer-motion, DOM grid (no canvas).
- **Steal:**
  - **Index-rigid rotation tables**: block i is the same physical block in every rotation, so per-block colour and letter never swap.
  - Greedy longest-word line scan.
  - `settleColumns`.
  - Gold outline drawn only on the outward edges of a matched word.
  - A modal that auto-pauses and resumes **only if it paused**.
  - 7-bag randomizer.
  - Scoring credited the instant a piece locks, not after the animation.

## generic-game-template: the React UI shell
- Topbar, board-shell placeholder, stats sidebar, footer (◀ Rotate ▶), overlay, keyboard help, swipe hook, stub reducer.
- It was superseded by `starters/react-board-game`, which merges in the later improvements.

## zine-machine: zine editor (an app, not a game)
- React + MUI. The reusable bits for game UIs, such as level editors or drag-to-arrange screens, are:
  - `usePointerDrag` (cumulative-delta drag on window listeners).
  - `useBlockTransform` (move, resize, rotate in *virtual page units* with a screen-to-virtual scale, local-axis resize for rotated blocks, live preview then commit on release).
  - `useElementSize`.
- These live in `kits/react/hooks/`.
