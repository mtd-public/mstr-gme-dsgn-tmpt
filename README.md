# mstr-gme-dsgn-tmpt: master game design resource

The combined knowledge, techniques, code and assets of every game project in
[`mtd-public`](https://github.com/mtd-public), except modern-portfolio. Start
any new game here.

It's built for **agents and humans who need to recreate solutions and avoid
repeating solved problems**:

- how the old games were built
- what worked
- the exact numbers that shipped
- every gauge and indicator
- every bug that recurred and its fix
- verified starters to copy

```
.
├── AGENTS.md           ← read first if you are an agent (rules + where to look)
├── docs/               ← the knowledge base (16 topic files; start at docs/README.md)
├── starters/           ← verified, copy-and-go game skeletons
│   ├── react-board-game/     Vite+React+TS shell, 2D + three.js renderers, demo game
│   └── vanilla-three-toy/    no-build three.js diorama game with thumbstick
├── kits/               ← reusable modules (input, audio, HUD/gauges, three, pixel, sims, CSS)
├── assets/
│   ├── models-3d/            61 chibi low-poly GLBs + manifest + Blender generator + contact sheets
│   └── screenshots/          reference shots of the old games and the verified starters
├── reference/          ← verbatim source snapshots of all 11 non-empty game repos (grep here)
├── templates/          ← GAME_DESIGN.template.md
└── tools/              ← headless smoke tests (Playwright)
```

## Start a new game in 10 minutes

1. **Decide the stack:**

   | Your game… | Start from |
   |---|---|
   | plays inside a rectangle (lanes, scroller, shmup, puzzle), with a UI shell around it | `starters/react-board-game` |
   | is a full-screen world with a following camera and a thumbstick | `starters/vanilla-three-toy` |
   | is a 16-bit side-scroller | copy `reference/sub-sinkers` + `kits/touch-zoom-guard` |
   | is a marble or physics course | `reference/labyrinth-larry` (ASCII levels + autopilot proof) |

2. Copy the starter into the new repo. Rename it (title, wordmark, best-score
   key). Run its checks.
3. Write `GAME_DESIGN.md` from `templates/GAME_DESIGN.template.md`, using
   `docs/04` (controls), `docs/05` (HUD), `docs/06` (art) and `docs/11`
   (mechanics).
4. Replace the demo simulation. Keep the loop, the input wiring and the shell.
5. Before every push, go through `docs/14-pitfalls-and-fixes.md` and
   `docs/16-new-game-checklist.md`.

## The games this was mined from

| Game | One line | Stack | Best thing to reuse |
|---|---|---|---|
| splashy-fish | Flappy Bird turned 90° under the sea | React + three.js | portrait-immersive layout, frameCamera, ink outlines, depth palette lerp |
| prof-whip-dash | three-lane runner, boulders grind from behind, gold in the danger lane | React + three.js low-poly | TUNING + fx pattern, health ring on the character, countdown numerals, biome/world tables, art bible + camera study pages |
| dive-depths | vertical sub shooter with bosses, the Kracken, achievements | React + pixel 2D (was 3D) | renderer swap, boss gauge and banner, weapon badge, pixel sprite generator, two-tone palettes, attract mode |
| gig-ambulance | Crazy Taxi with an ambulance in a pastel toy town | vanilla three.js + Blender | robust thumbstick, nav compass, 61 GLB assets, bakeStatic, breakables, x-ray silhouette |
| finger-skater | Paperboy-style skateboarding | vanilla three.js | twin-zone input, charge ring, air bar, balance meter |
| space-lion | Xevious/Sinistar top-down shooter | vanilla three.js | canvas toy HUD, persistent-phase boss health, procedural toy asset factory |
| labyrinth-larry | Marble Madness in Hell | vanilla three.js | ASCII level builder, autopilot proof, rolling-ball physics, light pool, formant screams |
| sub-sinkers | 16-bit side-scrolling sub shooter | vanilla canvas 2D | touch-zoom-guard, material-mask sprite shader, bitmap font, stage tables |
| word-drop | Tetris × word game | React DOM | rigid rotations, word scan, fit-to-screen layouts, modal auto-pause |
| generic-game-template | React UI shell | React | superseded by `starters/react-board-game` |
| zine-machine | zine editor (app) | React + MUI | pointer drag / resize / rotate hooks |

The empty repos (beast-bear, chaichill, instruct-ins, metal-bug, office-game,
reverse-cam, three-dee-demo, word-monster) had nothing to extract.

## Keeping this repo useful

When a game solves something new, add the module to `kits/` (with its source
in the file name), a row to `kits/README.md`, the numbers to the relevant
`docs/` file, and any bug you hit to `docs/14-pitfalls-and-fixes.md`. Refresh
`reference/` snapshots with the commit SHAs in `reference/SOURCES.md`.
