# 02 · Architecture: the shape every good game here converged on

## The three-layer split (non-negotiable)

```
          input (keys / pointer / gestures)
                    │  discrete actions: moveLeft(), fire(), blast()…
                    ▼
┌────────────────────────────────────┐
│ SIMULATION  physics.ts / world.js  │  plain data + step(world, dt)
│  • no React, no DOM, no three.js   │  logical units (board units or metres)
│  • owns ALL game state             │  emits fx counters: world.fx.hit++
└──────────────┬─────────────────────┘
      read every frame │            │ snapshot at ~12 Hz
                       ▼            ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│ RENDERER  scene3d/render2d│   │ UI  React HUD / DOM pills    │
│  • owns NO game state     │   │  • reads snapshots + fx      │
│  • pooled meshes/sprites  │   │  • toasts, overlays, sidebar │
│  • visual-only state OK   │   └──────────────────────────────┘
└──────────────────────────┘
```

Why this matters here specifically:

- **dive-depths replaced its whole renderer twice** (three.js → pixel `Render2D`
  → two-tone `RenderTwoTone`) without touching gameplay. Each commit says
  "physics.ts gameplay is untouched". That was only possible because every
  renderer implements one interface:
  ```ts
  interface Renderer { resize(w, h): void; update(world, phase, dt, t): void; dispose(): void }
  ```
- **prof-whip-dash** runs the *same* engine in three pages: the game, the art
  bible (`board.html`) and the camera study (`camera.html`). The demo autopilot
  lives in `src/board/demoRun.ts`.
- Headless verification (`npm run sim`, labyrinth-larry's `autopilot.js`) is
  only possible when the sim has no DOM dependency.

## World lives in a ref, not in React state

```ts
const world = useRef<World>(createWorld())      // mutated in place 60×/s
const phase = useRef<GamePhase>('ready')        // mirror of phase for callbacks/loop
const [state, setState] = useState<GameState>() // HUD snapshot only
```

- 60 fps motion **never** triggers a React render (splashy-fish's founding comment).
- Sync React only when a displayed value changes. splashy-fish and dive-depths
  compare against `lastTickRef`. prof-whip-dash throttles to `HUD_INTERVAL = 0.08` s,
  which is simpler and bounded. The starter uses the throttle.
- Values that must track the player every frame, like a badge that follows the
  sub, get **their own rAF reading `world.current`** and write
  `el.style.left` directly. See dive-depths `WeaponBadge.tsx`. A badge driven by
  React state visibly lags.
- Callbacks read `phase.current`, not `state.phase`. Otherwise they need to be
  re-created and re-subscribed every phase change, which is the stale-closure trap.

## Two render loops is fine

`GameCanvas` owns a rAF that calls `renderer.update(world.current, …)`. The
engine hook owns another rAF that calls `step(world, dt)`. Both run once per
frame. Don't merge them into React. `GameCanvas` is engine-agnostic and was
copied verbatim between splashy-fish, prof-whip-dash and dive-depths. It
observes the **parent** with a `ResizeObserver`, so the board shell decides the
size and the canvas just fills it.

## The clock

```ts
const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 30))
```

- **Upper clamp (1/30):** a background tab, a debugger pause or a GC hitch
  mustn't teleport the world or tunnel through walls.
- **Lower clamp (0):** a real bug. React StrictMode's dev double-mount, or a tab
  resuming, can hand rAF a timestamp *older* than `last`. The negative dt walked
  dive-depths' depth negative and indexed a negative water zone.
- **Fixed-step alternative** (sub-sinkers): `acc += dt; while (acc >= 1/60) { step(1/60); acc -= 1/60 }`.
  Use it when physics must be deterministic or stiff: collisions against thin
  walls, replays, rolling-ball physics. labyrinth-larry's autopilot uses
  dt = 1/240 for accuracy.

## Events: fx counters, not callbacks

```ts
interface Fx { coin: number; hit: number; crack: number; perfect: number; levelUp: number; … }
function step(w, dt) { w.fx = emptyFx(); … if (hit) w.fx.hit++ }
```

After `step`, the engine hook reads `w.fx` and turns it into toasts,
`navigator.vibrate`, sfx and achievement checks. The sim stays pure, and
multiple listeners can react to the same event. Renderers that need "first
frame of an event" can instead diff state themselves:

- the ring shard fires when `lit < lastLit`;
- the muzzle flash fires when `fireIn` jumps up;
- a pop starts when `thing.gone` is first seen non-zero.

Diffing is more robust than consuming counters, because the two rAF loops can
interleave. dive-depths uses a third pattern: `world.effects.push({x, y, kind})`
plus a `consumedEffects` index in the renderer. That's a fine choice for
positional one-shots like explosions.

## Phases

`'ready' | 'playing' | 'paused' | 'over'`, plus `'won'` when there is an ending
(dive-depths Kracken, space-lion Space Lion), plus game-specific ones like
`'clearing'` (word-drop animation window) or `'loading'` (GLB fetch).

- **ready** = attract mode. dive-depths and prof-whip-dash both run a
  self-playing demo behind the title card, so *the first frame the player sees
  is the game*. `start()` must **replace the world with a fresh one**, because
  the demo has been mutating it.
- **paused**: the renderer keeps drawing the frozen frame. The HUD stays
  visible. Pause triggers on `visibilitychange`, `blur`, a slipped-through zoom,
  and opening any modal. word-drop's modal resumes **only if the modal itself
  paused the game**.
- **over / won**: compute the final score, update best (localStorage with
  try/catch) and show the card. "New best!" means `score >= best && score > 0`.

## Units and coordinates

| Game | Space | Convention |
|---|---|---|
| splashy-fish, dive-depths, starter | 400×800 "board units", y down | the player sits at a fixed row (0.22·H to 0.78·H); the world scrolls |
| prof-whip-dash | metres, runner fixed at z = 0 | z negative = ahead; the world slides toward him |
| gig-ambulance, finger-skater, space-lion, larry, GLB kit | metres, +Y up | **models face +Z → `yaw = atan2(dx, dz)`** (space-lion: models face −Z → `atan2(-dx, -dz)`) |
| sub-sinkers | 384×216 px internal | `camX` scrolls forward only |

Always convert in exactly one place (`boardXToWorld`, `bx`/`by`, `K = RW / BOARD_W`).

## Tuning lives in one table

```ts
export const TUNING = { baseSpeed: 11, grindDrain: 18, whipNear: 1.5, … } as const
```

prof-whip-dash's `TUNING` has a comment on every entry explaining *why* it has
that value (e.g. "never shorter than despawnTime, or a lane could be re-claimed
while its block is still rolling away"). Copy that habit. Constants tuned by
playtest get their history in the design doc delta log (dive-depths
GAME_DESIGN.md "Since the initial build…").

## Determinism where it matters

- Seeded RNG for anything regenerated per instance that must look the same every
  run: track modules, obstacle dressing, level layout. The seeds in use are
  splashy-fish `seededRandom(id * 977 + 31)`, whip-dash `rnd(seed)`, and
  gig/sub-sinkers `mulberry32`.
- A deterministic hash for pixel dither/speckle: `hash(x, y, seed)` in
  dive-depths and sub-sinkers.
- Gameplay randomness can use `Math.random()`.

## Pools, not churn

Create meshes and sprites up front and toggle `visible`. prof-whip-dash stocks
6 spiders, 6 scarabs, 44 coins, 3 idols, 4 hearts and 40 dust quads, then hides
any beyond `used[kind]` each frame. splashy-fish creates and disposes obstacle
groups per spawn. That works, but disposal is where leaks come from: dispose
geometry, and only dispose materials that aren't shared. space-lion marks shared
resources with `userData.shared` and skips them in `disposeObject3D`.

## Debug handles

`window.SKATE` (finger-skater), `window.GAME` (vanilla starter): expose state,
player, world and camera for console poking. Add `?param` overrides for
settings (dive-depths `?art=twotone&palette=kelp&zones=1`, starter
`?renderer=3d`). Add test toggles as named constants and turn them off before
merging. dive-depths had `KRACKEN_TEST_AS_FIRST_BOSS`, and a whole commit
exists just to flip it back.
