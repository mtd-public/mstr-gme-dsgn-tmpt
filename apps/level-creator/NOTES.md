# Level Creator: work-in-progress handoff notes

Status as of 2026-09-23, on branch `claude/level-creator`, which was cut from `main` at `1214c41`.

This file is for the next session or agent that picks the work up. Delete it once the app ships and
[`docs/17-level-creator.md`](../../docs/) exists.

## The goal

The user wants an interactive level creator that works for all existing and future games.

**v1 (now).** It can be generic: one grid-based, top-down game model.

**v2 (later).** It should recreate every current game, with custom levels, enemy spawns and behaviour,
character behaviour, win states, achievements, flavour text for everything, a custom title screen and
custom game-over screens. The hook for v2 is `GameSpec.template`: v1 only has `'grid'`, and v2 adds one
adapter per game family (see the roadmap below).

## Done and verified

| Area | Files | Notes |
|---|---|---|
| Schema | `src/spec/schema.ts` | `GameSpec` JSON. Entities: 10 kinds, 6 shapes, behaviours (static, patrol, wander, chase, flee), stats, spawner, flavour. Also rules, achievements, 6 screens, a text table with `{tokens}`, defaults, `migrate()` and `fillText()`. |
| Validation | `src/spec/validate.ts` | `validateSpec()` returns issues. `reachable()` is a BFS reachability proof; doors count only when the level has enough keys. |
| ASCII | `src/spec/ascii.ts` | `levelToAscii`, `asciiToCells`, `legend`. `.` and space are floor. |
| Presets | `src/spec/presets.ts` | blank, Dungeon Dash, Coin Garden, Hell Circle. Each is also a regression fixture. |
| Runtime | `src/engine/runtime.ts` | Pure sim with no DOM. Exports `createRun`, `loadLevel`, `step(w, dt, input)`, `continueAfterDeath`, `nextLevel`, `isWon`, `winProgress`, `checkAchievements`, `textVars`. Events: toast, sfx, achievement. |
| Rendering | `src/engine/draw.ts`, `src/engine/playRenderer.ts` | One `drawEntity` shared by the editor, the palette and the game. `PlayRenderer` has resize / update / dispose plus `float()` for positioned toasts. |
| Audio | `src/engine/sfx.ts` | `Blips`: WebAudio tones for the runtime's sfx names. Call `unlock()` from a user gesture. |
| Editor state | `src/editor/store.ts` | `useSpecStore()`: the spec, `update(fn, {history})`, `replace`, `checkpoint`, `undo`, `redo`, `canUndo`, `canRedo`. Autosaves to localStorage `level-creator.spec`. Also `downloadJson`. |
| Grid | `src/editor/GridEditor.tsx` | Canvas painter with paint, erase, fill and pick. Bresenham drag, right-click erases, one player start per level, `highlight` rings. |
| Form fields | `src/editor/fields.tsx` | `Field`, `Text`, `Num`, `Select`, `Check`, `Color`, `Section`. |
| Panels | `src/editor/panels.tsx` | `LevelsPanel` (list, reorder, resize, time override, live ASCII box, checks), `EntitiesPanel`, `RulesPanel`, `ScreensPanel`, `AchievementsPanel`, `GamePanel` (meta, theme, presets, import/export JSON). |
| Palette | `src/editor/Palette.tsx`, `src/editor/EntityIcon.tsx` | Tool buttons plus entity chips grouped by kind. Exports `TOOLS`, with shortcut keys b, e, f, i. |

Checks that pass:

- `npx tsc -b` is clean.
- `npm run check` passes 22/22. For every preset it runs a JSON round trip, validation, an ASCII round trip, an autopilot playthrough to the win screen and a 30 s chaos run. It also runs two validator tests.

## Not built yet (the app does not run until 1–4 exist)

`index.html` loads `/src/main.tsx`, which doesn't exist yet, so `npm run dev` and `npm run build` fail
until items 1–4 below are written. The design decisions are already made; follow them rather than
re-deciding.

### 1. `src/editor/PlayView.tsx`

**Props.** `{ spec, startLevel, issues }`. Mount a fresh PlayView each time the user enters Play (no
live spec sync). Disable undo and redo while in Play.

**Phases.** `title → intro → playing ⇄ paused → levelClear → intro …`, ending in `gameOver` or `win`.
Keep the phase in a ref and mirror it into state.

| Phase | Card | Buttons |
|---|---|---|
| `title` | `spec.screens.title` | Primary starts at level 1. A secondary "Test from level N" appears when `startLevel > 0`. |
| `intro` | `levelIntro` plus `level.intro` | |
| `paused` | `pause` | Resume, Quit to title |
| `levelClear` | `levelClear` | Primary runs `nextLevel(w)`, then goes to intro. |
| `gameOver` | `gameOver` | Primary restarts at the same start level; secondary goes to the title. |
| `win` | `win` | Primary replays; secondary goes to the title. |

Every card's text goes through `fillText(text, textVars(world, best))`. Autofocus the primary button.

**The loop.**
- rAF with `dt` clamped to `[0, 1/30]`. Call `step()` only while `playing`. Always call `renderer.update()`, passing `dt = 0` while paused.
- After each `step`, drain `w.events`:
  - `sfx` → `Blips.play`.
  - `toast` with x/y → `renderer.float`; without → the React toast stack, which expires after about 1.8 s.
  - `achievement` → record it.
- `status === 'lifeLost'` → wait a 1.1 s beat, then `continueAfterDeath(w)`.
- `cleared`, `won` and `gameOver` → save progress, then set the phase.
- Clear the input whenever the phase leaves `playing`.

**Starting a run.** `createRun(spec, new Set())`, then `loadLevel(w, from)` if `from > 0`. Use a fresh
unlocked set per run so a designer sees achievement toasts on every playtest.

**Progress.** Persist `{ best, achievements[] }` under `level-creator.play.<slug(title)>`, inside try/catch.
The title card shows the best score, `n/m` achievements and a "Reset progress" button.

**HUD.** A snapshot throttled to about 10 Hz. Pills use `spec.text` labels: hudScore, hudHp (hearts),
hudLives, hudKeys (only if the level has keys or doors), hudTime (a countdown if timed, otherwise elapsed;
red under 10 s), level name, a `winProgress` meter (hidden when the label is empty), and a pause button
that fires on `pointerdown`.

**Keyboard.**
- Arrows and WASD are a stack of held keys, so the last one pressed wins. On a non-repeat keydown, also push to `queued`, capped at 2.
- Space, J and X attack. P and Esc pause and resume.
- `preventDefault` while playing. Ignore keys typed in inputs. Pause on `visibilitychange`.

**Touch.**
- Swipe on the stage: the threshold is 22 px. The dominant axis sets `held`; a change of direction queues one step. The anchor follows the finger. Lifting clears `held`. A tap under 300 ms attacks.
- A D-pad and an attack button show under `(pointer: coarse)`, using `pointerdown`/`pointerup`/`pointercancel`. In portrait they sit below the stage; in landscape they overlay its bottom corners.

### 2. `src/App.tsx`

**Topbar** (`data-touch-allow`):
- Wordmark and game title.
- Validation badge: errors, warnings, or "✓ Playable". Clicking it opens the Level tab.
- Undo and redo buttons.
- A primary ▶ Play / ✎ Edit toggle.

**Edit layout.**
- `palette-col | grid-col | panel-col`.
- The tabs (Level, Entities, Rules, Screens, Achievements, Game) sit at the top of `panel-col`. Play is the topbar toggle, not a tab.
- The grid column has a `‹ Level i/n: name ›` switcher above `GridEditor` and a hint line below it.

**State.**
- `levelIndex` is clamped to `spec.levels.length - 1` after undo, delete or load.
- `brush` falls back to the first entity if it was deleted.
- `selected` is the entity open in the Entities tab. A palette chip's double-click and the pick tool both select it.
- `highlight` is the set of goal and pickup cells that `reachable()` doesn't see.
- `onLoaded` (after a preset or import) resets the level index to 0.

**Shortcuts.**
- Ctrl/Cmd+Z undoes. Ctrl+Y and Ctrl+Shift+Z redo.
- b, e, f and i switch tools.
- Shortcuts don't fire inside input, textarea or select, or while in Play.

### 3. `src/main.tsx`

Import `./lib/touch-zoom-guard.css`, then `./styles/index.css`. Import `./lib/touch-zoom-guard.js` and
call its init, following `starters/react-board-game/src/main.tsx`. Render `<App/>` in `StrictMode`.

### 4. `src/styles/index.css`

**Tokens.** Toy-ink, from `kits/css/toy-ink-shell.splashy-fish.css`: ink `#3b2e5a`, bg `#b9a3e8`, lav
`#dccbf7`, panel `#fffdf8`, yellow primary, accent `#e8792a`.

**Page.** `.app` is `100dvh` with overflow hidden, and there is no page scroll. Every scroll area has
`min-height: 0; overflow: auto`.

**Layout.** Decide it by orientation and pointer, not width alone.
- `(orientation: landscape) and (min-width: 700px)`: three columns, `minmax(150px, 200px) 1fr minmax(300px, 380px)`.
- Otherwise stack: the palette becomes one horizontal scroll row with the group headings hidden, the grid takes `flex: 1 1 50%`, and the panel takes `flex: 1 1 40%`.
- Phone landscape (`max-height: 520px`) gets a compact topbar and icon-only chips.

**Panels.** `.panel-scroll { container-type: inline-size }`. Collapse `.grid3` and `.grid4` to two
columns below 480px wide.

**Fix for iOS.** `input, textarea, select { user-select: text; -webkit-user-select: text }`. The guard's
body `user-select: none` otherwise breaks inputs.

**Classes to style.** These are already used by the components; PlayView and App will add their own.

```
ascii btn btn--sm btn--primary btn--danger card check chip chip__name chips color entity-icon
entity-item entity-list field field__label field__hint grid-canvas grid2 grid3 grid4 is-active
issue issue--error issue--warning issues legend level-item level-list note ok palette
palette__group panel-scroll row wrap section section__head swatch tool tool__label tools
```

### 5. Verify

- `npm run build` and `npm run check`.
- Write `tools/smoke-level-creator.mjs`, copying the Playwright import fallback from `../../tools/smoke-react-starter.mjs`. It should:
  - use phone portrait, phone landscape, tablet and desktop sizes;
  - paint cells and undo;
  - load a preset;
  - play (the title card and intro, move, pause);
  - export JSON (the download event);
  - assert zero console errors and `scrollHeight <= innerHeight`.
- Chromium is at `/opt/pw-browsers/chromium`.

### 6. Docs and wiring

- Write `docs/17-level-creator.md`:
  - the v1 schema and runtime;
  - how to add an entity kind, behaviour or win condition;
  - migrations: bump `SPEC_VERSION` and add a step in `migrate()`;
  - the v2 roadmap below.
- Update `apps/level-creator/README.md`, the root `README.md`, `AGENTS.md` (map and rules) and `docs/README.md`.
- Optional: a CI workflow that builds and checks `apps/level-creator`, and deploys only from `main`.

### 7. Ship

Commit with the attribution lines and push to `claude/level-creator`. Don't open a PR unless the user asks.

## v2 roadmap: one template adapter per game family

Each family reuses its sim kit in `kits/sim/`. The editor gains template-specific panels, and the runtime
gains an adapter that plays the spec.

| Template | Games | Kit | What it authors |
|---|---|---|---|
| `lane-runner` | prof-whip-dash | `kits/sim/lane-runner` | Obstacle and pickup lane schedules, bosses, worlds |
| `vertical-scroller` | splashy-fish, dive-depths | `kits/sim/vertical-scroller` | Depth bands, spawn tables, gauges |
| `marble-grid` | labyrinth-larry | `kits/sim/marble-grid` | Tilt mazes. The ASCII patches map directly. |
| `word-grid` | word-drop | `kits/sim/word-grid` | Word lists, drop speed, bonus rules |
| `arcade-car` | gig-ambulance, finger-skater | `kits/sim/arcade-car` | Tracks, jobs and tricks, timers |
| `side-scroller` | sub-sinkers | (new) | Waves, sub types |
| `shooter` | space-lion | (new) | Wave scripts, boss phases (`kits/sim/boss-health.js`) |

Cross-cutting v2 work:
- Spawn schedules (time- or distance-based waves).
- Scripted behaviour trees.
- Per-character abilities.
- Compound win and lose conditions.
- Achievement icons.
- Rich screens (images, layout presets).
- Per-entity sprite or model references from `assets/`.

## Gotchas already hit

- **Import extensions.** Relative imports use explicit `.ts`/`.tsx` extensions. Node's `--experimental-strip-types` needs this for the headless check, and `tsconfig` has `allowImportingTsExtensions`.
- **Undo history and StrictMode.** Keep history pushes out of setState updaters, because StrictMode runs updaters twice. The store keeps its history in refs. A paint stroke is `checkpoint()` followed by `update(..., { history: false })` for each cell.
- **Touch zoom guard.** It cancels touch events outside `[data-touch-allow]`, so buttons there get no click on touch devices. Put `data-touch-allow` on the topbar, palette, panels and Play cards. In-game buttons use `pointerdown`.
- **Locked-door toast.** The runtime rate-limits it with `bumpCd`, because holding a direction into a locked door would otherwise toast every frame.
- **`defeatAll`.** It counts live enemies, including spawned ones, so it can be satisfied between spawns. Document this, or count spawner capacity, in v2.
- **Per-level panel state.** Keep it in subcomponents keyed by level id (`ResizeForm`, `AsciiBox`) rather than syncing state during render.

## Repo housekeeping

GitHub's default branch is still `claude/festive-lamport-bgv69h`. The user was asked to switch it to
`main` in Settings → General.
