# kits/: reusable code, ready to copy

Every file here is either **copied verbatim** from a game (the file name says
which) or **consolidated and verified** in this repo (`sfx-synth.js`,
`boss-health.js`). Copy files into your game and adapt them. Don't import across
repos.

**Import paths inside copied files still point at the source game's modules**
(e.g. `../game/physics`, `../game/types`). After copying, repoint each one at
your own module or replace the constant. The *Wires to* column lists what each
file expects.

Want a working whole rather than parts? Start from `starters/`, which already
wires the best of these together and is verified.

## touch-zoom-guard/ (use in every touch game)
| File | What |
|---|---|
| `touch-zoom-guard.js` + `.css` | Stops iOS/Android double-tap and pinch zoom on the game surface, keeps menu taps and scrolling working, detects a zoom that slips through, resets it and calls `onZoomChange` so you can pause. Optional `enterFullscreen(orientation)`. From sub-sinkers |
| `README.md`, `AGENT_BRIEF.md` | Why it happens, integration steps, rules for input code |
| `test/tap-spam.mjs` | Playwright regression test: iPhone + iPad, a joystick finger plus 60 taps |

## vanilla-js/ (no-build ES modules, three.js via import map)
| File | Source | What | Wires to |
|---|---|---|---|
| `input/floating-stick-and-hold-buttons.js` | gig-ambulance | **Best general input.** Floating stick (screen direction + smoothstep magnitude, base follows the thumb), `bindButton(el, name)` per-pointer hold buttons, keyboard, `onKey` one-shots, robust `reset()` | a canvas element; `read()` → `{x, y, mag}` or null |
| `input/twin-zones-stick-and-hold.js` | finger-skater | Left half = stick under the thumb; right half = one hold button with a press/release/cancel **event queue** | zone divs + stick and button graphics |
| `input/stick-plus-tap-anywhere-fire.js` | space-lion | Stick in the bottom-left zone; any other touch fires while held; the direction persists after release | canvas |
| `input/stick-plus-two-fire-buttons.js` | sub-sinkers | Stick zone + two fire buttons (per-pointer Sets), pause button, keyboard codes | `window.SS`, DOM ids `joy-zone/joy-base/joy-knob/btn-fwd/btn-up/btn-pause` |
| `audio/sfx-synth.js` | **consolidated** (gig + skater + larry + sub-sinkers) | `Sfx` class: unlock, master gain and mute, `tone`, `burst`, `arp`, named `play()` with rate limiting, loops (`setRoll`, `setSiren`, `setScrape`, `startDrone`), formant `scream()`. Exercised by the vanilla starter | nothing |
| `audio/sfx-*.js` | each game | the originals, for their specific sounds | — |
| `hud/canvas-toy-hud.js` | space-lion | Canvas-drawn toy HUD: `roundRect`, `card`, segmented `bar`, `statPill`, coin icon, HP bar, boss card, pop-in toasts, ink-stroked floating text, drawn thumbstick | `drawHUD(ctx, w, h, {score, gold, player, sentinel, spaceLion, floatingTexts, messages, input, playing, time, safeTop, safeBottom})` |
| `hud/dom-hud-nav-compass.js` | gig-ambulance | DOM HUD glue: timers, cash, fare bar, vertical meters, stacked toasts, **screen-space nav compass** (two targets), projected floating text, stick drawing on an overlay canvas | gig's DOM ids (see `reference/gig-ambulance/index.html`) |
| `three/fx-pool.js` | gig-ambulance | Pooled particles (140 meshes): `dust`, `confetti`, `sparkle`, `update(dt)`, `shake` | a three scene |
| `three/fx-toy-bursts.js` | space-lion | Star, puff, chunk and debris bursts + shock rings (`explode`, `hit`, `hurt`, `sparkle`) | `window.SpaceAssets` |
| `three/gltf-assets-and-bake.js` | gig-ambulance | `loadAssets` (manifest + optional base64 bundle), `spawn`, `cloneMaterials`, `bakeStatic` (merge per material), `meta` | `./vendor/addons/GLTFLoader.js`, `BufferGeometryUtils.js`, `assets/manifest.json` |
| `three/instanced-breakables.js` | gig-ambulance | Hundreds of props as InstancedMesh with topple / fly / regrow | `spawn()` from the assets module |
| `three/space-assets.js` | space-lion | Procedural toy asset factory (ship, towers, reticle, rings, UFO boss, lion boss, particles, shock ring, decor) + `BossHealth` | three r136 **global** `window.THREE` (port to modules for r160+) |
| `three/three-utils.js` | space-lion | `yawForDirection`, `worldToScreen`, `disposeObject3D` (skips `userData.shared`) | — |
| `util/utils.js` | gig-ambulance | `clamp`, `lerp`, `damp` (frame-rate independent), `wrapAngle`, `mulberry32`, `pick`, `shuffle` | — |
| `util/pixel-util-and-3x5-font.js` | sub-sinkers | seeded rng, hash, noise1, fbm, colour mix, **3×5 bitmap font** `SS.text()` | `window.SS` |

## react/ (TSX for the React shell)
| File | Source | What | Wires to |
|---|---|---|---|
| `hooks/useBoardControls.swipe-or-tap-side.ts` | prof-whip-dash | Swipe fires on threshold; a tap picks the board side | `{onLeft, onRight}` |
| `hooks/useBoardControls.swipe-steer-tap-fire.ts` | dive-depths | Swipe steers; a tap fires | `{onSwipeLeft, onSwipeRight, onTap}` |
| `hooks/useSwipeControls.flick-on-release.ts` | generic-game-template | Touch-only flick at release, ←/→/↓ | puzzle games |
| `hooks/useArtSettings.ts` | dive-depths | Settings persisted in localStorage **plus URL-param overrides**, a palette cycle hotkey | `../game/twoTone/palettes` |
| `hooks/usePointerDrag.ts`, `useElementSize.ts`, `useBlockTransform.move-resize-rotate.ts` | zine-machine | Drag, resize and rotate in virtual units (editors, arrange screens) | `../data/sections` constants |
| `components/GameCanvas.tsx` | splashy-fish | canvas + ResizeObserver(parent) + rAF → `scene.update(world, …)` | your renderer |
| `components/GameOverlay.tsx` | splashy-fish | ready / paused / over card with framer-motion | `GamePhase` |
| `components/KeyboardHelp.tsx` | template | `?` popover | edit `SHORTCUTS` |
| `components/StatsSidebar.tsx` | splashy-fish | `Stat` with pop-on-change, duplicate-hiding | `GameState` |
| `components/Hud.level-meter-toast-grit.tsx` | prof-whip-dash | level meter, readout, multiplier pill, keyed toast, grit vignette | `GameState`, `Toast` |
| `components/BossGauge.tsx` | dive-depths | vertical thermometer to the next boss, with a player icon marker | `BOSS_INTERVAL_LEAGUES`, `KRACKEN_LEAGUES` |
| `components/BossBanner.tsx` | dive-depths | pulsing banner + SVG radial HP ring, variant colours | `BossVariant` |
| `components/WeaponBadge.tsx` | dive-depths | badge following the player's x via its own rAF | `world.current.subX`, `BOARD_W` |
| `components/Achievements.tsx`, `AchievementToasts.tsx`, `game/achievements.ts` | dive-depths | trophy popover n/N + unlock toasts + a persisted, validated registry | `AchievementToast` type from your engine |
| `components/OptionsMenu.tsx` | dive-depths | gear popover: art-style segmented control, palette grid, zone-cycle toggle, controls list | `useArtSettings`, two-tone palettes |
| `components/WordToast.tsx`, `Cell.grid-tile.tsx` | word-drop | word pills; grid tile with burst / clear anims, age badge, **outward-edge match outline** | word-drop types |

## css/ (styles matching the above; tokens at the top of each)
| File | Contains |
|---|---|
| `toy-ink-shell.splashy-fish.css` | the canonical toy-ink React shell: portrait-immersive + wide pillarbox + short landscape + narrow phones, pills, cards, depth badge |
| `neutral-shell.generic-template.css` | neutral grey/white shell (Inter + Space Mono) |
| `dark-lintel-shell.whip-dash.css` | dark committed chrome, carved lintel topbar, `.app[data-world]` repaint, health bar with quarter marks, level meter, readout, multiplier, toasts, grit, `.whip-tap` bar button, overlay, key chips |
| `gauges-dive-depths.css` | options menu, achievements, achievement toasts, depth badge, **boss gauge**, **weapon badge**, **boss banner**, title screen |
| `meters-finger-skater.css` | lives pips, score/mult pills, toasts, floating text, **charge ring**, **air bar**, **balance meter**, twin zones, joystick, big jump button, cards |
| `hud-gig-ambulance.css` | pills with warn pulse, **nav compass**, fare card + bar, **vertical meters**, toasts, mini round buttons, right-thumb pad |
| `toy-screens.space-lion.css` | start / pause / over / victory screens and icon buttons |
| `hell-impact.labyrinth-larry.css` | Impact chrome, glowing timer, panels, level buttons |
| `pixel-arcade.sub-sinkers.css` | Press Start 2P panels, pixelated canvas, fire buttons, rotate hint |

## three-ts/ (three.js in TypeScript, r169)
| File | What |
|---|---|
| `lowpoly-kit.whip-dash.ts` | cached `mat()`, `box()`, `cyl()`, seeded `rnd()`; the full Maya/Egypt cast; track segments per biome; gates; sky dome; light rig; **health ring + shard**; **countdown numeral textures** |
| `runner-scene.whip-dash.ts` | `CameraRig`, module recycling with biome rebuild on wrap, gate spawn, pooled actors, dust pool, ring shards, tally sprites, key light behind the runner |
| `world-biome-palettes.whip-dash.ts` | `PAL`, the `Biome`/`WorldTheme` tables, `worldForLevel`, `biomeForLevel` |
| `toy-scene.splashy-fish.ts` | toy materials, **inverted-hull outlines**, shadow-catcher backdrop, `frameCamera`, fish, coral, anchor, mine, chain, instanced bubbles and splash |
| `depth-palette-lerp.splashy-fish.ts` | SURFACE → DEEP palette with `paletteAt(t)`, HSL water mixing |
| `inline-single-file-build.mjs` | Vite multi-page → single-file HTML artifacts |

## pixel/ (2D renderers & procedural sprites)
| File | What |
|---|---|
| `pixelArt.in-the-hunt.ts` | `Frame` RGBA buffers, `parseMap` legend, `blit`, `mirrorX`, `shear`, `hash`, `hullTopDown`, `buildExplosion`, the full sprite set, water palettes, `frameToCanvas` (no DOM except the last) |
| `render2d.in-the-hunt.ts` | fixed 256×512 pixel renderer implementing the Renderer interface (water zones, dithered bands, trails, wakes, explosions, laser, boss lair tint) |
| `twoTone/` | indexed two-tone sprite set (`art.ts`), 26 `palettes.ts` + LUT, `scene.ts` board renderer, `renderTwoTone.ts` front end, `sheets.ts` and `shots.ts` for concept renders |
| `sprites.material-mask-shader.js` | `Buf` material masks + `render(buf, mats)` ramp shading (cyl / hcyl / sph / vert / flat), Bayer dither, rim light, outline; the full sub-sinkers sprite set |
| `png-encode-node.ts` | minimal PNG encoder for rendering concept sheets in Node |

## sim/ (simulation modules, renderer-free)
| File | What |
|---|---|
| `boss-health.js` | **extracted** persistent-phase boss HP (`damage()` → hit / retreat / defeated) |
| `lane-runner/physics.ts` | whip-dash sim: lanes, boulder rows with telegraph, lifetimes, cooldowns, swerve, grind drain / regen, whip windows, coin runs in the danger lane, hearts in clear lanes, levels |
| `lane-runner/demoRun.autopilot.ts` | a self-playing demo driving the real engine (for art bibles and attract mode) |
| `vertical-scroller/physics.flappy-vertical.ts` | splashy-fish: current + splash impulse, gap bands, score on pass |
| `vertical-scroller/physics.shmup.ts` | dive-depths: step-and-ease steering, missiles, enemy fire, mines with fuse, formations, power-ups, bosses and squads, unlocks, achievements counters |
| `marble-grid/` | labyrinth-larry: height-grid world, rolling-ball physics, ASCII level builder, **autopilot proof** |
| `word-grid/` | word-drop: rigid rotation tables, 7-bag, board ops, settle, word scan, dictionary, scoring |
| `arcade-car/player.ambulance.js` | gig: stick-to-heading arcade car, drift, surfaces, air, crashes, x-ray silhouette, sirens |
| `arcade-car/skater.ollie-grab-grind.js` | finger-skater: charge ollie, grabs, rail grind balance, bail |

## vendor/
`three-r160/`: `three.module.min.js` + `addons/GLTFLoader.js` +
`addons/BufferGeometryUtils.js` + MIT licence. For no-build games, use it with
the import map `{ "three": "./js/vendor/three.module.min.js" }` (addons import
`'three'`).
