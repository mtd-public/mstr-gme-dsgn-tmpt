# 14 · Pitfalls & fixes: every repeated issue, with its fix

Mined from all commit histories plus the verification runs done while building
this repo. **Read this before shipping anything.** Each entry lists the
symptom, the cause, the fix, and where it happened.

## Mobile & input

| # | Symptom | Cause | Fix | Source |
|---|---|---|---|---|
| 1 | Rapid taps on fire buttons **zoom the page** on iPhone/iPad, and it stays zoomed | iOS double-tap zoom ignores `user-scalable=no`; `preventDefault` on pointer events doesn't cancel the gesture recognisers; joystick + button reads as a pinch | `kits/touch-zoom-guard` (non-passive touch cancel, gesture events, zoom detection → reset → pause) + `touch-action:none` on **every** control (not inherited) + pointer events only | sub-sinkers |
| 2 | Joystick **gets stuck** until reload | a system gesture, notification or app switch swallowed `pointerup`; the stick refused new touches while "owned" | a new touch always takes the stick; also listen to `pointercancel`, `lostpointercapture`, mouse `buttons===0`; `reset()` on blur/visibilitychange/pagehide and on pause | gig-ambulance |
| 3 | Swipes feel laggy; hits land before the move | the move fired on `pointerup` | fire as soon as the swipe passes 28 px, and reset the origin so long drags chain | prof-whip-dash |
| 4 | Pressing an on-board button **also moves** the player | the button's pointer events bubbled to the board's gesture handler | `e.stopPropagation()` in the button's pointerdown and pointerup | prof-whip-dash |
| 5 | Tap-a-side picks the wrong side in landscape | measured against `window` while the board is pillarboxed | measure with `event.currentTarget.getBoundingClientRect()` | prof-whip-dash |
| 6 | Buttons inside the game surface don't respond on touch once the zoom guard is on | the guard suppresses `click` on non-allow areas | act on `pointerdown`, or put the control inside `[data-touch-allow]` | starter |
| 7 | Tablet in landscape gets the desktop layout | breakpoint on width only (a tablet is > 880 px wide) | gate on `pointer: fine` vs `pointer: coarse` + orientation | word-drop |
| 8 | Holding an arrow key machine-guns moves | keydown auto-repeat | ignore `event.repeat` for discrete actions | starter |
| 9 | Page scrolls on Space / arrows | default browser action | `preventDefault()` for those keys | all |
| 10 | Touch game unplayable because tap = mouse drag on desktop too | swipe hook reacting to mouse drags in a puzzle game | gate flick detection on `pointerType === 'touch'` (puzzle games); gesture games deliberately accept mouse | template |

## Layout

| # | Symptom | Cause | Fix | Source |
|---|---|---|---|---|
| 11 | Page scrolls, the footer is off-screen | `vh` + chrome, or the flex child refusing to shrink | `.app{height:100dvh;overflow:hidden}`, chrome `flex:none`, play area `flex:1 1 auto; min-height:0` | word-drop, splashy-fish |
| 12 | Short landscape window pushes the footer out | width-driven board | height-driven: `aspect-ratio; height:100%; width:auto; max-width:100%` in a `minmax(0,1fr)` grid row | splashy-fish |
| 13 | Pause button off-screen on a 390 px phone | wordmark + pill + buttons too wide | compact topbar under 840 px, drop labels under 380 px; screenshot at 360/390 | starter (caught by the smoke test) |
| 14 | HUD pinned under the notch or home bar | no safe-area insets | `viewport-fit=cover` + `env(safe-area-inset-*)`; a probe div for canvas code | all |
| 15 | Bottom button's `:active` jumps sideways | `:active{transform:scale()}` replaced the centring `translateX(-50%)` | repeat the centring transform in `:active` (or use the `translate` property) | prof-whip-dash |
| 16 | Toast mis-centred while animating | framer-motion owns `transform`, which overwrote `translateX(-50%)` | centre with the CSS `translate` property, or wrap it | starter |

## Rendering & visuals

| # | Symptom | Cause | Fix | Source |
|---|---|---|---|---|
| 17 | **Framerate collapses** with many bullets | a PointLight per bullet: cost = lit objects × lights | no per-projectile lights; bake glow into the sprite; pool a few real lights | dive-depths, labyrinth-larry |
| 18 | Glow sprites wash out to white | additive / `'lighter'` blending of a bright opaque texture on a non-black background | normal alpha blending; tint the ring ~45% toward white | dive-depths |
| 19 | Dark halo ring around radial glows | gradient faded to `rgba(0,0,0,0)` → interpolates through black | fade to the same RGB at alpha 0 | dive-depths |
| 20 | Distant projectiles murky or invisible | scene fog applied to sprites | `fog: false` on things the player must read | dive-depths |
| 21 | Water mid-depth turns grey | RGB lerp between aqua and purple | lerp in HSL for hue-changing colours | splashy-fish |
| 22 | Outline splits open at hard edges | inverted hull built on split-normal geometry | weld (`mergeVertices` on position only) + `computeVertexNormals` for the hull | splashy-fish |
| 23 | Shader fails: `'#' : invalid character` | `#include <colorspace_fragment>` on the same line as code (a one-line GLSL string) | preprocessor directives on their own line: use template literals | vanilla starter (caught by the smoke test) |
| 24 | The boss "works" but players can't see it | placed at `BOARD_H − 40`, outside the camera on some aspects | position gameplay-critical actors by visible-view fraction; test several aspects | dive-depths |
| 25 | Things pop into existence at the top of tall phones | spawned at the board edge; tall windows see past it | spawn beyond the tallest view (`BOARD_H + 260`, or 1150 ahead) | splashy-fish |
| 26 | Shadows stop mid-road | shadow frustum sized for an older camera | resize the frustum when the camera changes; follow the focus | prof-whip-dash |
| 27 | World pops when the biome changes | all track modules swapped at once | rebuild each module as it wraps behind the camera | prof-whip-dash |
| 28 | A half-grown cone sits over the road | lerping between two *different* shapes | snap when the kind changes, ease only within a kind | prof-whip-dash |
| 29 | A 100 m pyramid lands on the lanes | random base size near the road | fixed sizes for anything near the play space | prof-whip-dash |
| 30 | Distant skyline invisible in portrait | portrait fov 43 ≈ 21° horizontal | put destinations near the vanishing point | prof-whip-dash |
| 31 | A despawning object slides | eased position while it moves fast | set the position directly during fast scripted motion | prof-whip-dash |
| 32 | A boulder spins at chase speed while dropping back | roll rate from world speed | roll from ground speed (`speed − zDrift`) | prof-whip-dash |
| 33 | Overhead dust invisible | billboards go edge-on under a top-down camera | ground-aligned quads | prof-whip-dash |
| 34 | Blocks render tilted after an animation | burst keyframes' `rotate` never returned to 0 and a reused cell inherited it | pin `rotate: 0` in every animation state | word-drop |
| 35 | Artifact preview pages blank | module graph / import map can't resolve on the host | `kits/three-ts/inline-single-file-build.mjs` single-file build | prof-whip-dash |
| 36 | Phone refuses more WebGL contexts on a multi-panel page | one context per panel | one shared renderer + scissor + blit into 2D canvases | prof-whip-dash |
| 37 | Bullets/sprites look soft on the pixel renderer | smoothing re-enabled after a context reset | set `imageSmoothingEnabled = false` before each draw pass; CSS `image-rendering: pixelated` | dive-depths |

## Simulation & logic

| # | Symptom | Cause | Fix | Source |
|---|---|---|---|---|
| 38 | **Negative distance / crash** on resume or in dev | rAF gave a timestamp older than `last` (StrictMode double-mount, tab resume) → negative dt | `dt = max(0, min(raw, 1/30))` in **both** the sim and render loops | dive-depths |
| 39 | Boss re-triggers immediately after it dies | the distance counter was still at the milestone | freeze distance during the fight; resume at milestone + 1 | dive-depths |
| 40 | Off-by-one league after a boss reset | multiplying by a fractional 0.1 constant | integer divisor (`floor(depth / 10)`) and exact inverse functions | dive-depths |
| 41 | Enemy type appears before its unlock | one spawn path (formations) had its own random picker that bypassed the gate | route every spawn path through the unlock and weight function; verify by logging first appearances | dive-depths |
| 42 | Boss beatable without moving (squads too dense) | the formation left no gaps | guarantee an open column per row; test "stand still and only fire" | dive-depths |
| 43 | The ultimate did nothing to the boss | the laser sweep only iterated `threats[]` | every damage source must consider every damageable entity type | dive-depths |
| 44 | Picked-up power-up chains had gaps | a second pickup banked a charge instead of extending | extend the active timer on a same-type pickup | dive-depths |
| 45 | Lane re-claimed while its boulder is still rolling away → teleport | cooldown shorter than the despawn animation | `cooldown ≥ despawnTime` (commented in TUNING) + a guard so not every lane cools at once | prof-whip-dash |
| 46 | Heal pickups kill the player | hearts spawned into danger | spawn heals only in provably clear lanes; retry later if none | prof-whip-dash |
| 47 | Difficulty drops every third level | difficulty keyed to the zone and themes loop | key difficulty to the level index | prof-whip-dash |
| 48 | Rotation does nothing for the O piece | all four rotation arrays identical | index-rigid rotation tables; the O cycles its indices | word-drop |
| 49 | Piece colours swap mid-rotation | colour recomputed from geometry each turn | assign per block index once at spawn | word-drop |
| 50 | Score appears late | credited after the clear animation | credit on lock; animation is purely visual | word-drop |
| 51 | A modal resumes a game the player had paused | resume on close unconditionally | resume only if the modal paused it | word-drop |
| 52 | Boss HUD shows the wrong number of segments after retuning | segment count hard-coded | read `health.phases` from the boss | space-lion |
| 53 | Hitbox "unfair" | collision on the whole hull | small visible damage box; generous pickup radius | dive-depths |
| 54 | Hazard reach "ate the playfield" | tentacle at 55–72% of the width | 32–48% | dive-depths |
| 55 | Achievement impossible | gameplay rules prevented it (laser banking, pickup rarity) | test each achievement with temporary overrides; fix the rules | dive-depths |
| 56 | Stored achievements crash after a rename | stale ids in localStorage | filter stored ids against the known list on load | dive-depths |
| 57 | Best score lost / exception in private mode | `localStorage` throws | wrap every access in try/catch; storage is a convenience | all |
| 58 | Fall-through or tunnelling at low FPS | large dt | clamp dt; a fixed-step accumulator for stiff physics | sub-sinkers, larry |
| 59 | The demo world leaks into the real run | attract mode mutated the same world | `start()` builds a fresh world | dive-depths |

## Process & repo

| # | Symptom | Cause | Fix | Source |
|---|---|---|---|---|
| 60 | **Every feature-branch PR shows red CI** | the Pages deploy job ran on branches; the `github-pages` environment only accepts the default branch | build on all branches, `if: github.ref == 'refs/heads/main'` on deploy (and on the Pages upload steps) | prof-whip-dash |
| 61 | Pages 404 / broken asset paths after a repo rename | `base: '/<repo>/'` hard-coded | `base: './'` | prof-whip-dash |
| 62 | Pages never enabled on a new repo | manual setting | `actions/configure-pages@v5` with `enablement: true` | prof-whip-dash, larry |
| 63 | **Main build broken after a merge** | conflict resolution took one side of a large generated file wholesale, dropping functions another branch added | after resolving conflicts in big files, grep for every exported symbol the importers use, and run `tsc -b` before pushing | dive-depths |
| 64 | Test shortcut shipped | a debug toggle left on | named constant `…_TEST_…`; a checklist item to flip it off | dive-depths |
| 65 | Static host refuses `.glb` | MIME / host limits | a base64 `models.bundle.json` fallback (`assets/models-3d/tools/bundle_models.py`) | gig-ambulance |
| 66 | `file://` shows a blank page | ES modules and the import map need http | always serve (`python3 -m http.server`) | vanilla games |
| 67 | Console 404 noise in smoke tests | no favicon | `<link rel="icon" href="data:,">` | starters |
| 68 | Dupes of a tuned constant drift apart | the segment count duplicated in the kit and physics | import the constant (`LIVES_MAX` from physics into the kit) | dive-depths |
