# vanilla-three-toy — starter

A **no-build** three.js game starter for isometric / top-down toy-diorama games in
the style of gig-ambulance, finger-skater, space-lion and labyrinth-larry. Plain
ES modules plus an import map. three.js r160 is vendored. It has no npm, no
bundler, and no files for art or audio.

The demo, *Gem Rush*, is a small but complete game. You drive a blob around an
arena with the floating thumbstick, hold BOOST, bounce off bumpers, and grab gems
before the clock runs out. A compass points to the nearest gem.

## Run

```
python3 -m http.server 8080      # or: npx http-server -p 8080
```

Open `http://localhost:8080` on a phone, or in a narrow desktop window. You need
a server, not `file://`, because ES modules and the import map don't load from
disk.

## What's in it

| File | Origin | Role |
|---|---|---|
| `js/main.js` | new, patterns from all four games | renderer, ortho camera, world, player, loop, state machine, HUD glue |
| `js/input.js` | gig-ambulance (verbatim) | floating thumbstick (screen direction + smoothstep throttle), per-pointer hold buttons, keyboard, reset on blur/visibility/pagehide/lostpointercapture |
| `js/fx.js` | gig-ambulance (verbatim) | pooled particles: dust, confetti, sparkle, plus `shake` |
| `js/sfx-synth.js` | kits (merged from 4 games) | WebAudio synth, named SFX, roll/siren/scrape/drone loops, mute |
| `js/utils.js` | gig-ambulance | `clamp`, `lerp`, `damp` (frame-rate independent), `wrapAngle`, `mulberry32`, `pick`, `shuffle` |
| `touch-zoom-guard/` | sub-sinkers | stops iOS/Android tap- and pinch-zoom on the game surface |
| `css/style.css` | gig-ambulance / finger-skater | toy-ink pills, compass, vertical meter, toasts, mini buttons, pad button, cards |
| `.github/workflows/pages.yml` | labyrinth-larry | deploys `index.html css js touch-zoom-guard` to Pages on push to main |

## Conventions (same as the GLB library in `assets/models-3d`)

- 1 unit is 1 metre, +Y is up, and models face +Z, so `yaw = atan2(dx, dz)`.
- Stick direction is a **screen** direction. Convert it with
  `world = SCREEN_RIGHT * sx + SCREEN_UP * (-sy)`, with both vectors derived from the camera yaw.
- The compass angle is measured **on screen**: project the player and the target, then take `atan2(dx·W, dy·H)`.
- Menus and HUD buttons carry `data-touch-allow`. The canvas and pad buttons use pointer events only.

## Next steps

- Load real models: `kits/vanilla-js/three/gltf-assets-and-bake.js` plus
  `assets/models-3d/manifest.json`. Copy `kits/vendor/three-r160/addons/` in
  alongside it for GLTFLoader.
- Static towns or levels: use `bakeStatic()` to merge them into one mesh per material.
- For hundreds of props, use `instanced-breakables.js`.
- For a canvas-drawn HUD instead of DOM, use `kits/vanilla-js/hud/canvas-toy-hud.js` (space-lion).
