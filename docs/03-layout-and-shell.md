# 03 · Layout & shell: phone, tablet, desktop with no page scroll

Every game here targets **phones first** and must also work on a tablet in
either orientation and on a desktop. Four iterations in word-drop and two in
splashy-fish got to the rules below. Ready-made CSS is in
`starters/react-board-game/src/styles/index.css`, with variants in `kits/css/`.

## The rules

1. **The app is exactly the viewport.**
   ```css
   html, body, #root { height: 100%; }
   .app { height: 100dvh; overflow: hidden; display: flex; flex-direction: column; }
   ```
   Use `dvh`, not `vh`, because mobile browser chrome slides in and out. word-drop
   verified `scrollHeight == innerHeight` at every breakpoint. Make that an
   automated check (`tools/smoke-*.mjs` prints it).
2. **Chrome is `flex: none`. Only the play area flexes. The play area has
   `min-height: 0`.** Without `min-height: 0` a flex child refuses to shrink
   and pushes the footer off-screen.
3. **Layout is chosen by input type and orientation, not width alone.**
   ```css
   /* wide = desktop mouse OR touch device held landscape */
   @media (pointer: fine) and (min-width: 880px),
          (pointer: coarse) and (orientation: landscape) and (min-width: 840px) { … }
   /* immersive portrait = touch upright OR any narrow window */
   @media (orientation: portrait) and (pointer: coarse), (max-width: 839px) { … }
   ```
   A touch tablet in landscape is easily wider than 880 px, so width alone gave
   it the desktop layout (word-drop commit "tablet uses footer bar"). The two
   queries are mutually exclusive, so source order doesn't matter.
4. **Immersive portrait.** Everything below the topbar is board: no border, no
   radius, no footer, no sidebar. Primary info moves onto the board as a
   **badge**; primary actions move onto the board as a **bar button** or a tap.
   (splashy-fish, prof-whip-dash, dive-depths.)
5. **Wide layout: the board is pillarboxed and height-driven.**
   ```css
   .layout { display: grid; grid-template-columns: minmax(0,1fr) 200px; grid-template-rows: minmax(0,1fr); }
   .board-shell { aspect-ratio: 1 / 2; height: 100%; width: auto; max-width: 100%; }
   ```
   A height-driven board shrinks in a short window. A width-driven one pushes
   the footer out of view. Stats card in column 2 with `align-self: start`,
   sized to content, not stretched. Aspect ratios in use: `1/2` (splashy-fish,
   dive-depths, template) and `9/19.5` (prof-whip-dash, phone-shaped, so
   landscape shows the *same* column as portrait and lanes never widen).
6. **Short landscape** (`orientation: landscape and max-height: 560px`): tighten
   padding and shrink the footer buttons.
7. **Very narrow phones** (`max-width: 379px`): drop pill labels and shrink the
   wordmark, so Pause still fits. **Measure the topbar at 360 and 390 px.** The
   starter's first build pushed Pause off-screen at 390 px until the compact
   rules went in.
8. **Safe areas.** `viewport-fit=cover` in the meta, then
   `env(safe-area-inset-top/bottom/left/right, 0px)` on the topbar, footer, HUD
   top and any bottom-anchored button. From canvas code, measure insets with a
   hidden probe:
   ```js
   probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
   safeTop = parseFloat(getComputedStyle(probe).paddingTop)
   ```
   (space-lion).
9. **The play surface ignores the browser.**
   `touch-action: none; user-select: none; -webkit-user-select: none;` on the
   board and canvas, `-webkit-tap-highlight-color: transparent` globally, plus
   `kits/touch-zoom-guard` (see 04).
10. **Thumb zones.** No interactive UI in the bottom ~12% of a portrait phone,
    except a deliberately placed action bar (that's where the home indicator
    is). Pause goes top-right. prof-whip-dash DESIGN §6.

## The shell anatomy (React family)

```
.app
├─ header.topbar            wordmark · score pill · [? help] [Pause]
├─ main.layout
│  ├─ .board-shell          (touch-action:none; gesture handlers spread here)
│  │  ├─ canvas.game-canvas
│  │  ├─ .hud               (pointer-events:none) bars, readouts, toast, grit
│  │  ├─ .depth-badge       top-right pill (level/depth/distance)
│  │  ├─ gauges             boss gauge (left edge), weapon badge (follows player)…
│  │  ├─ .overlay           start / pause / over card (framer-motion)
│  │  └─ button.action-tap  portrait-only primary action bar
│  └─ aside.stats-sidebar   wide layouts only
└─ .footer-bar              ◀ ACTION ▶ — wide layouts only
```

- **Topbar score pill**, plus a **duplicate** of the score in the sidebar,
  marked `.stat--duplicate`. It's hidden on the compact strip and shown on the
  wide card. A value never appears twice on the same screen.
- **In-board action button** (prof-whip-dash `.whip-tap`, dive-depths `.fire-tap`):
  `position:absolute; left:50%; transform:translateX(-50%); bottom:calc(16px + env(safe-area-inset-bottom)); width:90dvw; max-width:calc(100% - 20px); height:62px`.
  - It **stops pointer propagation**, so pressing it never also counts as a board
    tap or lane change.
  - It is `disabled` + `opacity:0; pointer-events:none` when not playing, so it
    never covers the start card.
  - Its `:active` transform must **keep** the `translateX(-50%)`.
  - Trade-off, recorded in whip-dash: the bottom ~9% of the board becomes button,
    not lane.
- **Footer**: side buttons are fixed width (64–72 px) at the outer edges,
  thumb-reachable. The primary action flexes in the middle.
- **Words/history panels** (word-drop): a standing panel on wide layouts, a
  **modal** on phones. The topbar stat becomes the button that opens it.

## The shell anatomy (vanilla family)

```
canvas#game (fixed, inset 0)          — three.js
canvas#overlay (fixed, pointer-events:none) — stick, floating text
div#hud (fixed, pointer-events:none)
   .hud-top: pills · compass · pills
   .side meters, #toasts, .corner-btns (pointer-events:auto; data-touch-allow)
   .pad (right-thumb buttons, pointer-events:auto)
div#screen.screen (data-touch-allow) — title / pause / over card
```

`#hud` is `pointer-events: none` so touches fall through to the canvas (stick
zone). Only real buttons opt back in. For finger-skater's twin zones, give the
zones `pointer-events:auto` and make the drawn joystick and button graphics
`pointer-events:none` decorations.

## Theming by attribute

prof-whip-dash repaints the topbar lintel per world with one attribute:

```css
.app[data-world='Egypt'] { --chrome-stone: #dfc389; --chrome-band: #2b5f9e; --chrome-ink: #241c12; }
```

Layout never moves; only tokens change. Use this for zones, worlds, boss fights
(a `data-boss` tint), and day/night.

## Overlays and cards

- framer-motion `AnimatePresence`. The backdrop fades 0.2 s. The card springs in
  (`y: 16, scale: 0.94` → rest, `stiffness 320, damping 28`).
- **Attract-mode overlay:** a lighter scrim so the demo shows through.
  dive-depths drops the card entirely on the title screen, leaving just a logo
  and a Start button over the live game.
- Game-over card: 2–3 stat columns (score in gold, coins, distance), a
  best/new-best line, and one yellow primary button.
- The ready card should teach the controls in 3 lines max. whip-dash uses a `<dl>`
  of `dt` key-chips + `dd` explanation. Nobody reads a tutorial, so "first session:
  boulders held 14 m back until the first successful crack" (whip-dash).

## Popovers

The keyboard help `?` and the achievements 🏆 popovers are the same component
pattern. `aria-expanded` on the trigger, `role="dialog"` on the panel. Close on
outside `pointerdown` (not click) and on `Escape`. Listeners are attached only
while open. dive-depths' `OptionsMenu` (gear) merges help with an art-style
segmented control and a palette grid.
