# 08 · 2D rendering & procedural pixel art

Three 2D renderers shipped: dive-depths `render2d.ts` (In the Hunt pixel),
dive-depths `twoTone/` (indexed Downwell), and sub-sinkers (16-bit shaded). The
React starter adds a crisp vector-ish Canvas-2D toy renderer.

## Crisp vector Canvas 2D (starter `render2d.ts`)

- Size the backing store to CSS size × DPR (capped at 2), then
  `ctx.setTransform(dpr,0,0,dpr,0,0)` every frame.
- Map board units with **one scale = canvasWidth / BOARD_W** and a y offset that
  pins the player at a fixed fraction of the view.
- **Toy shapes:** fill an ink copy offset down by `r·0.18` (hard shadow), fill
  the face, then stroke ink at `max(2, r·0.12)`. Eyes are dark ellipses with a
  white glint. Blush is pink ellipses.
- **Screen shake:** `ctx.translate(rand·shake·14, rand·shake·14)` inside save/restore.
- **Scrolling ground:** draw repeated bands and dashes offset by
  `(scroll·scale) % period`. The alternating-tone bands are the speed read.
- **Particles:** a plain array of `{x,y,vx,vy,life,max,color,r}` with gravity,
  shrinking with `1 - life/max`. Spawn them when the renderer *first sees*
  `thing.gone > 0`, and track seen ids in a Set.

## Pixel pipeline (dive-depths `render2d.ts`)

- **Fixed internal canvas** (`RW=256`, `RH=512` for a 400×800 board, so
  `K = 0.64 px/unit`). Set `canvas.width/height` once. `resize()` is a no-op.
  CSS stretches the canvas with `image-rendering: pixelated`.
  - The REVAMP plan wanted **largest integer scale + centring** for perfectly
    even pixels. Stretch-to-fill ships today. For integer scaling, compute
    `s = floor(min(W/RW, H/RH))` and size the element to `RW·s × RH·s`.
  - sub-sinkers fits 384×216 with `min(W/w, H/h)` (non-integer) on the element
    size.
- `ctx.imageSmoothingEnabled = false` after every context reset. Round every
  draw position to whole pixels at draw time. Physics keeps floats.
- **Sprite storage:** `Frame = { w, h, data: Uint8ClampedArray }` (RGBA) with no
  DOM dependency. That means frames can be generated in Node for PNG concept
  sheets (`kits/pixel/png-encode-node.ts`). Convert once to canvases with
  `frameToCanvas` and **cache per frame** (`Map<Frame, HTMLCanvasElement>`).
- **Animations:** `{ frames, fps, loop }`. The frame index is `floor(t·fps) % n`,
  offset per entity by id so a formation doesn't animate in lockstep.
- **Layer order:** water → far parallax → near parallax → terrain → pickups/threats/boss
  → player → projectiles (always over hulls) → FX → surface line → vignette.

### Authoring sprites in code (`kits/pixel/pixelArt.in-the-hunt.ts`)

```ts
// one char per palette entry, '.' = transparent
const PLAYER_WING_L = parseMap([
  '..oo',
  '.oSo',
  'oSdo',
])
```

| Primitive | Use |
|---|---|
| `parseMap(rows)` | hand-placed pixel maps with a legend (o outline, d/s/S/w steel ramp, k/v/V/L olive, r/R/U rust, fire and smoke letters…); **throws on unknown chars**, so typos fail fast |
| `blit(dst, src, x, y)` | compose parts (wings onto hulls) |
| `mirrorX(f)` | symmetric sprites, facing flips |
| `shear(f, maxShift, anchorY)` | **banking poses** without redrawing: rows shift sideways, growing from an anchor row |
| `rot90(f)` | orientation variants |
| `hash(x, y, seed)` | deterministic speckle for weathering (moss, rust, barnacles) |
| `hullTopDown(w, h, edge(y), pal)` | parametric symmetric hull: outline → shadow → dark → mid → light toward the spine, plus seam rows, rivets and speckle |
| `buildExplosion(size, frames, seed)` | flash → fireball → smoke ring, dithered band boundaries, spark speckle early, outline only in the smoke phase. Sizes S16/M32/L48 at 6/8/12 frames, 15 fps |
| `buildChain`, `buildTentacleArm`, `buildBoss(variant)` | parametric long or large pieces; bosses share one generator with per-variant configs |

**Style rules:** outlines one step darker than the darkest hull tone, never pure
black. 2–3 stepped tones plus checker dither. No gradients. Warm saturated
colours only on danger and pickups.

### Effects that sold the pixel look

- Explosion S/M/L chosen by what died, **plus** a pickup ring, spark bursts, and
  a rolling chain of M explosions along a dying boss.
- Bubble wakes behind torpedoes and the player's stern (tiny rising 2–6 px motes).
- Position trails behind wandering enemies: a short per-entity point buffer,
  aged and fading.
- Muzzle flash detected *in the renderer* by watching the enemy's `fireIn` jump
  back up. The sim didn't need a new event.
- Mine lamp blink rate doubles as the mine nears its fuse range.
- Laser: a layered pulsing column with a white core, tracking the player.
- Water: 4 stepped bands per zone, a **dithered seam** between bands (a
  checkerboard row), and a cross-fade between zones.

## Indexed two-tone (dive-depths `twoTone/`)

- Frames store **ink indices**: `0 clear, 1 bg, 2 fg, 3 accent, 4 accent2`
  (`IFrame { w, h, px: Uint8Array }`).
- The scene renders the whole board into one index buffer. `present()` maps it
  through a 5-entry RGBA LUT into a single `ImageData`, then calls
  `putImageData` once per frame.
- **A palette swap is a LUT swap**, not a re-render or remount. `GameCanvas`
  handles palette changes in a separate effect that calls `renderer.setPalette(id)`.
- Moat rule: every sprite gets a 1 px bg border so it cuts into anything behind it.
- The in-board HUD is drawn into the same index buffer, so it recolours with
  the palette too.

## Material-mask shading (sub-sinkers `sprites.js`)

The fastest route to rich 16-bit sprites with zero art.

```js
const b = new Buf(42, 22)
b.ellipse(20, 11, 18, 7, HULL).rect(16, 2, 8, 6, TOWER).circle(30, 11, 3, GLASS)
const canvas = render(b, {
  [HULL]:  { r: P.STEEL, s: 'cyl' },
  [TOWER]: { r: P.STEEL, s: 'cyl', b: 0.1 },
  [GLASS]: { r: P.GLASS, s: 'sph', o: false },
})
```

- **Shading:** per pixel, the lightness L comes from the material's model. `cyl`
  uses vertical runs of the same group, highlighted at 28%. `hcyl` uses
  horizontal runs. `sph` is lit from the upper left. `vert` is top-lit. `flat`
  uses a fixed level.
- Then `+ bias`, `−0.16` on lower-right edges, and `+0.1` on upper-left edges.
- Then `f = L·(n−1) + (BAYER4x4/16 − 0.47)·0.9`, quantised to the ramp.
- Then a 1 px outline `#120a10` around the mask (skip it per material with `o: false`).
- `flip(c)` and `silhouette(c, color)` give facing and hit-flash variants.
  Recolour per stage by passing different ramps.

## Bitmap text

3×5 font as 15-bit strings per glyph (`kits/vanilla-js/util/pixel-util-and-3x5-font.js`):

```js
SS.text(ctx, 'STAGE 2', x, y, '#ffd040', scale, '#000' /* drop shadow */)
SS.textWidth(s, scale) // = len*4*scale - scale; centre with (W - textWidth)/2
```

Covers 0–9, A–Z and `: . - + / ! % > < * '`. Use it for arcade HUDs, stage
cards and WARNING flashes drawn inside the pixel canvas.

## Fixed-step loop for pixel games

```js
acc += Math.min(0.05, dt)
while (acc >= 1/60) { step(1/60); acc -= 1/60 }
render()
```

This gives deterministic movement that is independent of refresh rate
(120 Hz iPads). Render once per rAF.

## Concept renders in Node

dive-depths `scripts/render-two-tone-concepts.ts`, with `npm run concepts:two-tone`,
builds sprite sheets, palette tables and staged game shots as PNGs through the
same generators, with no browser. Commit the PNGs to `docs/` so the art
direction is reviewable in the repo and in PRs.
