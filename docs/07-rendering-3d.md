# 07 · 3D rendering recipes (three.js)

Versions in use: r169 via npm (React family), r160 vendored as a module
(`kits/vendor/three-r160/`, gig/finger/larry), r136 as a classic global
(space-lion, old: `outputEncoding`/`physicallyCorrectLights` naming). New work:
npm `three@^0.169` or the vendored r160 module with an import map.

## Renderer baseline

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))   // ALWAYS cap at 2
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
// low-poly premium: renderer.toneMapping = THREE.ACESFilmicToneMapping; toneMappingExposure = 1.05
// toy pastel: NO tone mapping (keeps pastels true)
```

Resize with `renderer.setSize(w, h, false)`. The `false` means CSS sizes the
canvas, and a ResizeObserver on the parent drives it. Guard against `!w || !h`,
because a hidden board reports 0.

## Cameras

**A. Fit-the-board perspective** (splashy-fish `frameCamera`, starter `scene3d.ts`).
The full board width is always visible, and taller windows see further. The
player stays at a fixed fraction of the view height.

```ts
const visibleH = BOARD_W / aspect
const centerY = playerWorldY + visibleH * (PLAYER_SCREEN_FRAC - 0.5)
camera.position.set(0, centerY, visibleH / 2 / Math.tan(FOV / 2 * DEG))
```

Spawn things beyond the tallest possible view (`BOARD_H + 260` or
`SPAWN_AHEAD = 1150`) so nothing pops into existence on a tall phone.

**B. Chase / overhead-diagonal rig** (whip-dash `CameraRig`): `{height, back, side, lookAhead, lookSide, lookHeight, fov, follow}`.

- Shipping rig: `16, 18, 8, -12.5, -2, -0.1, 43°, follow 0`.
- `follow: 0` locks the camera laterally, so lane changes move the runner across
  the frame.
- `side` turns a straight chase into an overhead diagonal. `lookSide` keeps the
  runner framed once the camera is off-axis.
- Tune it on a **camera study page** with presets and sliders
  (`reference/prof-whip-dash/src/board/camera.ts`) instead of editing numbers
  blind.
- Portrait at fov 43 is only about **21° horizontal**. Anything at a large
  lateral offset is off-screen. Put skyline "destinations" near the vanishing
  point (Egypt's pyramids move *up the track*: z −175 → −135 → −100 with scale
  0.9 → 2.8).

**C. Orthographic toy diorama** (gig-ambulance, finger-skater, space-lion, vanilla starter).

```js
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500)
CAM_OFFSET = (sin(yaw)·cos(pitch), sin(pitch), cos(yaw)·cos(pitch)) × 140
// resize: half = aspect < 1 ? VIEW / aspect * 0.7 : VIEW    (portrait shows more height)
camera.left = -half*aspect; right = half*aspect; top = half; bottom = -half
// follow: focus = damp(focus, player + velocity*0.35, 4, dt); camera = focus + CAM_OFFSET; lookAt(focus)
```

- Pitch: 52° for gig. 38° hid the van behind buildings too often. space-lion
  uses 58°, finger-skater 34–35°.
- Yaw: 45°, rotatable in 90° steps with easing (gig ⟳). finger-skater stores
  named views (`Classic` / `Low-left`) and persists the choice.
- Frame the player off-centre toward where the action comes from. finger-skater
  sits the skater about 30% up from the bottom (`camAhead = 0.4 * half / sin(pitch)`).
- **Crash shake:** add `random * shake` to the camera position, and let shake
  decay in the fx update (`shake -= dt * 2.5`). Scale it with impact.

## Materials

| Recipe | Code | Notes |
|---|---|---|
| Toy plastic | `new MeshStandardMaterial({ color, roughness: 0.6 })` | vary roughness per surface: glass 0.08, metal 0.35, grass 0.95 |
| Flat low-poly | cached `mat(color, opts)` → `MeshLambertMaterial({ color, flatShading: true })`, key = `color + JSON.stringify(opts)` | a shared cache keeps draw calls and state changes down |
| Ink outline (inverted hull) | `kits/three-ts/…splashy-fish.ts`, `starters/react-board-game/src/game/toyKit.ts` | BackSide ShaderMaterial pushing vertices along **view-space normals**; build the hull from `mergeVertices(position-only copy)` + `computeVertexNormals()` so hard edges don't split. Skip outlines on tiny details (eyes, blush, tips) |
| Shadow catcher | `new ShadowMaterial({ color: ink, opacity: 0.2 })` on a plane | soft drop shadows under a floating diorama with no visible ground |
| Emissive glow | `emissive = color, emissiveIntensity` animated (lamps pulse `0.65 + 0.35·sin(t·6)`) | reserved for things that matter |
| Sprite billboards | `MeshBasicMaterial({ map, transparent, depthWrite: false, fog: false })` | numerals, orbs, glow discs |

**Colour-mix traps** (dive-depths flashy-bullet commit):

- Gradients that fade to `rgba(0,0,0,0)` interpolate through **black** and leave a
  dark halo. Fade to the *same RGB* at alpha 0 (`hexToTransparent`).
- `AdditiveBlending` or `'lighter'` on a bright, mostly opaque sprite **clips to
  white** on any non-black background. Use normal alpha blending and design the
  glow into the texture.
- Tint rings about 45% toward white, not 100%.

**Lerping palettes:** mix normal colours in RGB, but mix *background water* in
**HSL** (`lerpHSL`). Otherwise aqua → purple passes through grey (splashy-fish).
Repainting a gradient texture is costly, so step it (24 steps) while scalar
values track continuously.

## Lighting

- **Rig:** hemisphere (sky/ground tint) plus one shadow-casting directional
  "sun" plus an optional unshadowed rim or fill. That's all.
- **Shadow frustum follows the action:** `sun.position = focus + OFFSET; sun.target = focus`,
  with a tight box (gig ±40 m at 2048²; whip-dash 32×40 m; starter ±visible).
  Widen it when the camera sees further, or shadows visibly stop mid-road
  (whip-dash overhead-camera commit).
- **Key light placement is a design tool.** whip-dash puts it *behind* the runner
  so boulders throw shadows forward up the lane, "shadow width reads as distance".
- **Never one light per projectile.** dive-depths gave each bullet a PointLight.
  Cost is (lit objects × lights), and a mine spray plus shotgun swung the light
  count by a dozen within one frame, which caused the slowdown. The lights were
  removed and the bullets looked identical, because their material was unlit anyway.
- **Light pool** (labyrinth-larry): a fixed number of real PointLights (6),
  reassigned each frame to the torches nearest the player. Torch flames are
  emissive meshes.
- The player's own light can be a fake: a radial-gradient disc on an additive
  plane, sized to match the real light's falloff (dive-depths sub light pool).

## Backgrounds & atmosphere

- **Sky dome:** `SphereGeometry(190)`, `BackSide`, canvas gradient 4×256 with
  4 stops, `fog: false`, `depthWrite: false`, `renderOrder = -1`. Keep one dome per
  world and **toggle visibility** rather than rebuilding (whip-dash).
- **Gradient background:** a 2×256 canvas texture as `scene.background` (splashy-fish).
- **Fog:** `FogExp2(color, 0.011)` jungle / `0.0072` desert. Fog colour = background
  colour, lerped per world at `dt * 0.6`.
- **Water darkness** as a continuous 0..1 depth parameter driving palette,
  fog, lights and emissives together (splashy-fish `paletteAt`).

## Pools, instancing & merging

- **Pools:** see 02-architecture. Hide unused members every frame.
- **InstancedMesh** for many identical things: bubbles (30), splash particles (48),
  breakable props (hundreds). Write `dummy.updateMatrix()` → `setMatrixAt(i)`,
  then `instanceMatrix.needsUpdate = true`. Scale 0 hides an instance. Set
  `frustumCulled = false` when instances span the map.
- **`bakeStatic(root)`** (gig `kits/vanilla-js/three/gltf-assets-and-bake.js`):
  merges every static mesh into one mesh per material, so a whole town is a few
  dozen draw calls instead of thousands. Strip every attribute except
  position/normal before merging, and split indexed from non-indexed geometry.
- **Instanced breakables** (gig `instanced-breakables.js`): trees, lamps, cones
  and benches as instances with a per-item state machine
  `idle → topple|fly → down → gone → regrow (25 s)`. Hitting them never hurts:
  "chaos is cute".

## GLTF assets

`loadAssets(names, onProgress)` reads `assets/manifest.json`. It loads GLBs, or
decodes a **base64 bundle** (`models.bundle.json`) for hosts that refuse `.glb`.
It enables shadows and turns off `depthWrite` and shadow casting on transparent
materials.

- `spawn(name)` does a shallow clone that shares geometry and materials.
- `cloneMaterials(obj)` gives per-instance tweaks, such as flashing sirens.
- Animate named nodes: `wheel_fl/fr/rl/rr` (spin local X), `siren_l/r`,
  `rotor`, `light_red/amber/green`, `head`, `icon`, `lamp`.

## The x-ray silhouette (player hidden behind buildings)

```js
const xray = new THREE.MeshBasicMaterial({ color: 0x7a66c9, depthWrite: false, depthFunc: THREE.GreaterDepth })
for (const mesh of playerMeshes) { mesh.renderOrder = 10; const ghost = new THREE.Mesh(mesh.geometry, xray); ghost.renderOrder = 5; mesh.add(ghost) }
```
The ghost draws only where something is in front of it (gig-ambulance `player.js`).

## Endless tracks & biome transitions (whip-dash `scene3d.ts`)

- **N recycled modules** (8 × 12 m = 96 m), positioned by
  `z = mod(scroll + i*LEN, SPAN) - (SPAN - BEHIND)`. BEHIND (26 m) must cover what
  the camera sees behind the runner.
- **Biome change:** set `pendingBiome`. When a module *wraps* (its z jumps
  backwards), dispose it and rebuild it in the new biome. The seam enters about
  96 m out and sweeps toward the player over about 7 s. **Never swap all modules
  at once**, because the world visibly pops.
- The **gate** spawns on the first rebuilt seam and scrolls with the world. Its
  geometry must stay out of the lanes: jaws clear the 5.6 m road, fangs sit at
  the corners and teeth sit outside.
- **Skyline easing:** lerp the position and scale of distant props per zone, but
  **snap** when the *kind* changes. Stepped and smooth pyramids are different
  shapes, not different sizes, and a mid-lerp showed a half-grown cone over the road.
- **Fixed-size bases for anything near the road.** A random base size
  (`30 + r()*14`) produced a 100 m mass across the lanes.
- **Ground-aligned dust quads** for overhead cameras: billboards go edge-on and
  vanish. Pool 40. Puff every 0.14 s, grow from 0.26 to 0.72 m, fade by k²,
  and burst 6 on a lane change. The dust is world-anchored, sliding back at world
  speed.
- Roll rate from true ground speed: `rotation.x -= max(0, speed - zDrift) / radius * dt`,
  so a block dropping back visibly slows its spin.
- While a block is **despawning fast**, set its position directly instead of
  easing it. Easing lag reads as sliding.

## One WebGL context for many views

Phones cap WebGL contexts. whip-dash's art bible renders every turntable
through **one** offscreen renderer with `setScissorTest(true)` and blits each
view into its own 2D canvas. `IntersectionObserver` skips off-screen panels.

## Performance budget (whip-dash DESIGN §8, used as the house target)

| Budget | Target |
|---|---|
| Draw calls / frame | ≤ 90 (share materials) |
| Triangles on screen | ≤ 45k |
| Shadow map | one directional light, 1024–2048², tight frustum |
| Device pixel ratio | ≤ 2 |
| Real-time lights | hemisphere + sun + rim; pool anything else |
| Post-processing | CSS layers only (vignette, grit); space-lion dropped bloom |

## Disposal

Dispose geometry of removed groups. Dispose materials **only if they aren't
shared** (mark shared ones `userData.shared = true`). On unmount, cancel the
rAF, disconnect the ResizeObserver, and call `renderer.dispose()`. With StrictMode
in dev, everything mounts twice, so a leak doubles.
