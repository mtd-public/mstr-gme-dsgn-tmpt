# 12 · Levels, worlds & progression

## Progression shapes that shipped

| Shape | Game | Structure |
|---|---|---|
| Endless, continuous darkening | splashy-fish | palette lerps surface → abyss over 50 points; "Depth" badge = score/5 + 1 |
| Endless, zones by distance | dive-depths | water zone every 5,000 leagues (4 palettes, cycling); boss every 2,500; the Kracken at 20,000 is the ending |
| Endless, levels × zones × worlds | prof-whip-dash | level every 500 m; `zone = (level−1) % 3`; `world = floor((level−1)/3) % 2` → Maya 1–3, Egypt 4–6, Maya 7–9… |
| Stage select, 4 handmade stages | sub-sinkers | stage table: palette + scenery + enemy mix + boss + length; unlock the next on clear |
| 5 handmade courses | labyrinth-larry | ASCII maps; time budget per course; leftover time carries forward |
| Timed shift | gig-ambulance | 90 s clock extended by performance; score = cash |
| Endless street + streak | finger-skater | speed and clean-streak multiplier; three hits and you bail |
| Endless puzzle | word-drop | level = words/5 + 1 speeds up drops |

## The biome / zone table pattern (whip-dash `palette.ts`, sub-sinkers `levels.js`)

Everything that changes between zones lives in **one data table**. Code
branches on its fields. Physics never reads it.

```ts
interface Biome {
  name: string
  surfaceLight, surfaceDark, divider, marker, markerInlay, edge, ground, dust: number
  trees: 'jungle' | 'palm' | 'none'
  props: 'scatter' | 'stelae' | 'statues' | 'desert' | 'sphinxes' | 'avenue'
  edging: 'verge' | 'balustrade' | 'wall' | 'berm' | 'relief' | 'plinths'
  heart: number
  skyline: { kind: 'stepped' | 'smooth'; near: number; scale: number; z?: number }
  gate: { face, brow, jaw, fang, eye, pupil, pupilGlow, crest, vines, tunnel, height, style: 'mask' | 'pylon' }
}
interface WorldTheme { name; zones: Biome[]; sky: [4 stops]; fog; fogDensity; chrome: { stone, band, ink } }
```

sub-sinkers' stage record:
`{ name, zone, surf, skyline, boss, maxDepth, len, seed, sky[3], water[3], far, rays, snow, stars, ice, air, groundBase, groundAmp, deco[], theme: {ramps…}, mix: {enemy: weight…}, gap: [min,max], bossHp }`.

## Rules

1. **Difficulty keys off the level index, never the zone or world.** Themes
   loop. "Level 7's jungle is much harder than level 1's, same trees."
2. **Keep the speed read constant across biomes.** Put the same cadence marker
   every 2.86 m on every surface. Dirt gets plank sleepers and cart ruts on lane
   lines, stone gets cinnabar bands and carved grooves. Otherwise one biome
   feels slower for reasons nobody can name.
3. **Value steps signal arrival.** Earth sits below limestone in value on
   purpose, "the step up at level 2 should read as an arrival".
4. **Transitions sweep, never pop.** Rebuild each recycled module in the new
   biome as it wraps behind the camera. The seam enters far away and reaches
   the player in about 7 s.
5. **Gates mark boundaries.** One builder, three dressings (timber idol with
   vines, Kukulkán plaster mask, city maw with flaming eyes). Egypt uses a
   pylon between colossal jackals. The gate motif echoes the chaser and the
   pickup: "something you take, something that hunts you, something you run
   inside". **Gate geometry never enters a lane.**
6. **A destination grows as you approach.** Egypt's pyramids move up the track
   and scale up across three levels, which gives World 2 a direction World 1
   never had. Near the vanishing point, because portrait fov 43 is about 21°
   wide.
7. **Name the zone on arrival:** a toast with the zone name (whip-dash), a
   STAGE card (sub-sinkers), a planned AREA card (dive REVAMP).
8. **Flood the boss's lair:** the water recolours toward the boss's own palette
   while it's alive. Confine it to the bottom quarter so the play area stays
   readable (it once crept past half the screen).
9. **Zone-specific enemy rosters and weights** (sub-sinkers `mix`), and a
   themed boss per stage.
10. **Chrome follows the world:** `.app[data-world]` repaints topbar tokens.

## Handmade levels: the ASCII builder (labyrinth-larry `levels.js`)

```js
new Builder(24, 24)
  .map(1, 1, 14, [          // patch at (i0, j0), height 14
    't...t',
    '..@..',
  ])
  .ramp(9, 5, 3, 4, 14, 10, 'z')   // plane from h14 to h10 along z
  .map(6, 9, 10, ['...c....', '.k.....r'])
  .chain(3, 8, 14)                  // decorative
  .done({ name: 'The Threshold', sub: 'Mind the edges, Larry.', time: 45 })
```

Legend: `.` floor, `#` wall (+1.2), `t` wall + torch, `@` start, `P` exit, `g`
exit floor, `c` checkpoint, `k` +time box, `o` enemy spawn, `S` spike trap,
`F` flame vent, `L` lava (sunk), `B` crumbling bone, `H`/`V` hook swinging
along x/z, `x` hole, `r` decor, space = untouched. Unknown glyphs throw.
`done()` throws if `@` or `P` is missing.

**Prove every level is finishable** with `kits/sim/marble-grid/autopilot.js`. It runs a BFS
over cells, treating an edge as passable when the rise is ≤ STEP and the drop
is < FATAL_FALL − 0.3. It then rolls the real physics body along the path at
dt = 1/240, steering to waypoints with braking against drift, and reports
`{ok, t, maxFall, budget}` or the failure reason (fatal fall, abyss, timeout).
Run it after every level edit, and compare `t` against the course's time budget.

## Checkpoints & time economy (larry, gig)

- Checkpoints are floor runes. Rolling over one activates it and deactivates the
  rest. Respawn at the last active one, and **death costs time**, not the level
  ("the sands run while Larry dies").
- Time pickups (+5 s) and a leftover-time bonus carried to the next course.
- gig: every delivery extends the shift clock, so "good driving snowballs".

## Pacing aids

- **Level meter** plus "m to next level". Levels arrive faster as speed ramps,
  giving pacing a shape (43 s, 39 s, 35 s, 33 s, 29 s for whip-dash's first five).
- **Boss thermometer** showing the current leg to the next boss (dive-depths).
- **Attract mode** seeded into a more interesting zone than the opening
  (dive-depths' demo starts in the blue or purple zone, with the next boss
  pushed out so the demo doesn't walk into a fight).
