# 15 · Tooling, deployment & verification

## Build & deploy

**React family (Vite):**
- `npm run dev` / `npm run build` (`tsc -b && vite build`) / `npm run preview`.
- `vite.config.ts`: **`base: './'`**. The older games used `base: '/<repo>/'` and
  needed editing on every rename or fork.
- Multi-page builds: add `rollupOptions.input: { main, board, camera }` for art
  bibles and study pages (whip-dash).
- Single-file artifact build: `kits/three-ts/inline-single-file-build.mjs` (whip-dash, copied into the
  React starter as `npm run build:single`). It inlines JS and CSS, strips the
  viewport meta and document skeleton for artifact hosts, and uses a
  **replacer function** in `String.replace`, because minified code is full of
  `$&` and `$'` sequences that template strings would expand.
- Deploy: `.github/workflows/deploy.yml` in the starter.
  - `npm ci && npm run build` on every push and PR.
  - Upload and deploy **only on main**.
  - `configure-pages` with `enablement: true`.

**Vanilla family (no build):**
- Serve the folder: `python3 -m http.server 8080` or `npx http-server -p 8080`.
  Never `file://`.
- three.js is vendored as `js/vendor/three.module.min.js`, with the
  `THREE_LICENSE` file kept next to it.
- The import map `{ "three": "./js/vendor/three.module.min.js" }` must appear
  **before** any module script.
- Pages workflow: copy only the shipped folders to `_site/` (`index.html css js …`),
  `touch _site/.nojekyll`, then upload and deploy (labyrinth-larry
  `pages.yml`, copied into the vanilla starter).

## Verify before you push: the practices that caught real bugs

1. **Headless sim checks** (no browser): `starters/react-board-game/tools/sim-check.ts`,
   run with `npm run sim` (Node ≥ 22.6 `--experimental-strip-types`).
   - Assert invariants: an idle player dies, level-ups land on exact multiples,
     no fully blocked rows, first-appearance distances respect unlock gates.
   - whip-dash verified timing, path and clearance per lane this way; dive-depths
     logged 676 spawns.
2. **Level provability**: `kits/sim/marble-grid/autopilot.js` (labyrinth-larry). BFS plus the real
   physics on every course.
3. **Headless browser smoke test**: `tools/smoke-react-starter.mjs` and
   `tools/smoke-vanilla-starter.mjs` (Playwright + Chromium, SwiftShader WebGL).
   - Loads the game at iPhone, iPad-landscape, phone-landscape and desktop
     profiles, plays a few seconds (keys, taps, mouse-drag the stick) and
     screenshots.
   - Prints **console errors** and **scrollHeight vs innerHeight**. Both must be
     clean.
   - It found the GLSL `#include` bug and the Pause-overflow bug in this repo's
     own starters.
   - In the cloud container: `CHROMIUM=/opt/pw-browsers/chromium node tools/…`.
     Serve `dist/` (React) or the folder (vanilla) first.
4. **Tap-spam zoom test**: `node kits/touch-zoom-guard/test/tap-spam.mjs <url> --start "<sel>" --buttons "<sels>" [--joystick x,y] [--menu "<sel>"]`.
   It must PASS for iPad and iPhone. Headless can't truly zoom, so the key check
   is `touchendCancelled`. Finish with a real-device check.
5. **Temporary overrides for rare states.** Shorten `levelDistance`, bump speed,
   `KRACKEN_TEST_AS_FIRST_BOSS = true`, verify, then **revert before committing**
   and say so in the commit message. This is the house habit.
6. **Visual check at the layout matrix**: phone portrait (360/390 wide), phone
   landscape, tablet portrait, tablet landscape, desktop. Make zero page scroll
   an assertion.
7. **Typecheck after merges.** A merge that took one side of `pixelArt.ts` dropped
   exports and broke main's build.
8. **Debug handles**: `window.GAME` / `window.SKATE` for console poking and for
   Playwright `page.evaluate` assertions.

## Preview & study pages (build them early)

| Page | What | Where |
|---|---|---|
| Art bible | live engine hero + turntables of every model + palette + HUD mock | `reference/prof-whip-dash/board.html`, `src/board/board.ts` |
| Camera study | presets + sliders for every rig field, prints the rig to paste | `reference/prof-whip-dash/camera.html`, `src/board/camera.ts` |
| Sprite/asset preview | animated roster, live-fire scene, palette, boss hangar | `reference/dive-depths/asset-preview.html`, `src/assetPreview.ts` |
| Two-tone concepts | live game + staged shots + sprite sheets | `reference/dive-depths/two-tone.html` |
| Sprite gallery | every procedural sprite | `reference/sub-sinkers/sprites.html` |
| Blender contact sheets | per-category renders | `assets/models-3d/previews/sheet_*.png` |

They share the real engine and kit code, so "the board can never drift from the
build it is documenting".

## Documentation habits worth copying

- **Design doc before code** (`DESIGN.md` / `GAME_DESIGN.md`):
  - pillars
  - core-loop diagram
  - a numbers table with a *why* column
  - cast table
  - art direction with hex palettes
  - controls
  - performance budget
  - open questions
  - Template: `templates/GAME_DESIGN.template.md`.
- **Reuse plan table** when forking: file | source | action (copy verbatim /
  copy then extend / rewrite on the same skeleton / new) | notes (dive-depths
  GAME_DESIGN §Reuse plan).
- **Delta log**: every feature branch appends a section describing what changed
  and why, with old → new numbers (dive-depths GAME_DESIGN "Since the initial
  build…"). The doc stays the record of the current build.
- **Concept docs for big changes** (`reference/dive-depths/REVAMP_IN_THE_HUNT.md`,
  `reference/prof-whip-dash/docs/BIOMES.md`, `reference/prof-whip-dash/docs/WORLD-2.md`): "what we're stealing", the one big call, a file-by-file
  plan, implementation order where every step leaves the game playable, and
  open questions with the defaults chosen.
- **Commit messages** explain the design reason, list the verification done,
  and name any temporary overrides that were reverted.
- **README**: one-paragraph pitch, how to run, controls table, a code map table
  (file → role), lineage (what it was built from).
- **Agent briefs** for cross-repo fixes (`kits/touch-zoom-guard/AGENT_BRIEF.md`):
  the problem, then numbered integration steps, then the test command.

## Branching

Feature work goes on `feature/<name>` or `claude/<name>` branches and is merged
by PR. Keep the default branch deployable. Delete or ignore stale branches. The
snapshot in `reference/` is always the default branch.
