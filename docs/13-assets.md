# 13 · Assets: what's reusable today

## 3D model library: 61 chibi low-poly GLBs (gig-ambulance)

Location: `assets/models-3d/models/<category>/*.glb` (3.7 MB total), metadata in
`assets/models-3d/manifest.json`, contact sheets in
`assets/models-3d/previews/sheet_*.png`. finger-skater already reuses a subset.

| Category | Assets |
|---|---|
| characters | char_medic (player driver), char_doctor, char_patient_bandage, char_patient_granny, char_patient_kid, char_pedestrian |
| vehicles | veh_ambulance, veh_moto_medic, veh_air_ambulance, veh_car_pink, veh_car_blue, veh_taxi, veh_pickup, veh_bus |
| buildings | bld_hospital (2 tiles), bld_house_lilac, bld_house_peach, bld_apartment, bld_cafe, bld_pharmacy, bld_pizzeria, bld_office, bld_lighthouse |
| streets (16 m tiles) | road_straight, road_crosswalk, road_corner, road_t, road_cross, road_end, road_roundabout, hwy_straight, hwy_corner, lot_grass, lot_park |
| props | prop_tree_pine, prop_tree_round, prop_bush, prop_lamp_post, prop_bench, prop_traffic_light, prop_cone, prop_hydrant, prop_bin, prop_guard_rail, prop_fence, prop_ramp, prop_barrier, prop_pizza_box, prop_palm, prop_umbrella |
| powerups & markers | pu_turbo, pu_repair, pu_time, pu_magnet, pu_heart, pu_coin, pu_star, pu_shield, marker_pickup, marker_dropoff, marker_pizza |

**Conventions:**
- Metres, +Y up, models **face +Z**, so `yaw = atan2(dx, dz)`.
- The origin is on the ground at the footprint centre.
- Animatable nodes: `wheel_fl/fr/rl/rr` (spin local X), `siren_l/r`,
  `rotor`/`tail_rotor`, `light_red/amber/green`, `head`, marker `icon`,
  lighthouse `lamp`.
- Manifest entries have `name, category, file, preview, description, size{x,y,z},
  tris, nodes[]`, plus gameplay extras (`tile`, `pickup_spot`, `smashable`).

**Loading:** `kits/vanilla-js/three/gltf-assets-and-bake.js` provides
`loadAssets(names, onProgress)`, `spawn(name)`, `cloneMaterials(obj)`,
`bakeStatic(root)` and `meta(name)`. It needs
`kits/vendor/three-r160/addons/{GLTFLoader,BufferGeometryUtils}.js`. The loader
fetches `assets/manifest.json` and `assets/<file>` relative to the page. The
easy setup is to copy `assets/models-3d/manifest.json` and
`assets/models-3d/models/` into your game's `assets/` folder, keeping only the
models you use (finger-skater shipped a 33-model subset). For hosts that won't serve `.glb`, run
`python3 assets/models-3d/tools/bundle_models.py` to produce
`models.bundle.json` (base64). The loader prefers it when present.

**Rebuild or extend the models** with Blender as a Python module:

```
pip install bpy pillow
cd assets/models-3d && python3 tools/blender/build.py [--only veh_] [--no-render] [--samples 16]
python3 tools/blender/contact_sheet.py
```

`assets/models-3d/tools/blender/kit.py` is a small procedural modelling kit on bpy/bmesh.

- Primitives: `box`, `cyl`, `cone`, `ball`, `ico`, `dome`, `torus`, `prism`, `star_pts`, `heart_pts`, `arch_pts`, `cross_pts`.
- Bevels.
- Named **groups** that become animatable child nodes.
- The master **PALETTE**: name → (hex, roughness, emission, alpha).

Add assets in `assets_<category>.py` and register them in `ALL`. The build
scripts expect to run from the gig-ambulance repo layout, where `ROOT` is two
levels up from `tools/blender`. Here that is `assets/models-3d`, so `assets/`
paths inside the scripts resolve to `assets/models-3d/assets/…`. Either symlink
or edit `MODELS`/`PREVIEWS` in `build.py` when you run it from this repo.

## Procedural 3D kits (code, no files)

| Kit | What it builds | Path |
|---|---|---|
| space-assets.js (toy, r136 global) | player jet with fire/thrust/bank, reticle, one-eyed tower turrets on islands (aim, charge, fire), tower shot, star coin, pool-float rings + ring sets, Sentinel UFO (health states, warp in/out), Space Lion boss, particles (puff/smoke/star/chunk/…), shock ring, buoys, decor; ink outlines, rounded geometry helpers (`rbox`, `capsule`, `roundCyl`, `lathe`, `starGeo`, `blob`) | `kits/vanilla-js/three/space-assets.js` |
| whip-dash low-poly kit (TS, r169) | professor (run cycle, whip crack), 3 boulders (limestone/mossy/Kukulkán), spider, scarab, glyph coin, heart/scarab-heart, jade idol, brazier, stela, serpent head, stepped + smooth pyramids, palm, obelisk, ram sphinx, sphinx, pharaoh, statue, wall runs, track segment per biome, mask gate + pylon gate with jackals, sky dome, contact shadow, light rig, health ring + shard, countdown textures | `kits/three-ts/lowpoly-kit.whip-dash.ts` |
| splashy-fish toy scene (TS) | chibi clownfish, coral (tiered/branching/brain/kelp), anchor, grumpy mine, chain links, tethered segments, bubbles, splash burst | `kits/three-ts/toy-scene.splashy-fish.ts` |
| starter toyKit (TS) | `toy`, `rbox`, `ball`, outline material + welded hull, `inked`, `plain`, `shadowCatcher`, `gradientTexture`, `disposeTree` | `starters/react-board-game/src/game/toyKit.ts` |
| labyrinth-larry props | caged Larry with run cycle and scream bubble, torches, hellmouth, hooks, spike/flame traps, soul orbs, lament boxes, bone slabs, lava shader, canvas textures | `reference/labyrinth-larry/js/{larry,props,textures,world}.js` |
| finger-skater skater | skateboard + helmet built in code on a GLB character | `kits/sim/arcade-car/skater.ollie-grab-grind.js` |

## Procedural 2D sprite kits

| Kit | Style | Path |
|---|---|---|
| pixelArt (In the Hunt) | player sub (idle/bank), enemy sub (+fire frame), frogman, red fish, angler, squid, mine, chain, tentacle arm, bosses Warden/Kracken, torpedo, tracer, shrapnel, bubbles, supply pods (S/L/+/★), explosions S/M/L | `kits/pixel/pixelArt.in-the-hunt.ts` |
| twoTone | every sprite above redrawn as indexed two-tone, plus board, HUD and 26 palettes | `kits/pixel/twoTone/` |
| sub-sinkers sprites | subs, boats, heli, jet, drones, turrets, crab mechs, jellyfish, icicles, bosses, explosions, splashes, pickups, skylines | `kits/pixel/sprites.material-mask-shader.js` (+ `reference/sub-sinkers/sprites.html` gallery) |
| starter render2d | toy vector blob, mine, coin, heart, road | `starters/react-board-game/src/game/render2d.ts` |

## Screenshots & concept art

`assets/screenshots/`:
- gig-ambulance (prototype, park/roundabout/beach)
- finger-skater (street, grind)
- labyrinth-larry (hellmouth, hooks, larry)
- space-lion (toy-style strip)
- dive-depths two-tone (six shots, strip, sprite sheets per palette, palette table, board in all palettes)
- `starters/` (verified starter screenshots)

## Fonts in use

All are Google Fonts or system fonts. Nothing is bundled.

- Toy: `'Trebuchet MS', 'Avenir Next', system-ui`.
- Template: Inter + Space Mono.
- whip-dash: Cinzel, Alfa Slab One, Courier Prime, Public Sans (earlier Anton, IBM Plex Mono).
- Pixel: Press Start 2P plus the 3×5 bitmap font.
- Hell: Impact / Arial Black.
- zine-machine: Fredoka, Nunito.

## Audio

None as files. See 09-audio for the synth library.
