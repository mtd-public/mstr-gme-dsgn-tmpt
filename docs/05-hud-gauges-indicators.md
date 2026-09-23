# 05 · HUD, gauges & indicators: the complete catalog

Every readout, meter, gauge and indicator built across the games, with what it
communicates, where the code is, and the rule behind it. Code paths are
relative to the repo root.

## Principles (distilled from the design docs)

1. **Put the information where the eyes already are.**
   - whip-dash moved health *off* the top bar and **onto the runner's back**. The
     locked overhead camera always looks at his back.
   - dive-depths' weapon badge **follows the sub**.
   - Lane danger reads from the scene itself: shadows and boulders.
2. **Confirm what's visible, don't duplicate it.** whip-dash deleted its
   three-pip lane ribbon once the camera showed all lanes: "the pips were
   confirming what the player could already see."
3. **Countable without clutter.** One long bar with **quarter marks** beats six
   separate segments (whip-dash). Segment the bar only when segments *mean*
   something: lives, boss retreat phases, hull pips.
4. **Colour by remaining fraction, one rule everywhere.**
   - Green > 60%, yellow > 35%, red below. Used for space-lion HP, gig fare bar
     (`> .5 green, > .2 yellow, else red`) and dive-depths' hitbox
     (green > ⅔, yellow > ⅓, red).
   - A **pulse** at critical: whip-dash `hp ≤ 34`, sub-sinkers hull ≤ 2 blinks,
     larry's timer pulses when low.
5. **When there's no bar to watch, the frame carries the state.** whip-dash's
   "grit" is a bottom-edge vignette of red dust that tightens as danger closes
   and pulses at critical HP. It's peripheral and never blocks.
6. **Turn hidden timers into visible ones.** whip-dash's boulder countdown
   numerals (5-4 pale, 3-2 amber, 1 green) made the despawn timer "something to
   plan a lane change around rather than infer". This is the single
   biggest-leverage HUD idea in the org.
7. **Numbers that tick use `font-variant-numeric: tabular-nums`**, or they
   jitter.
8. **The HUD never steals input.** `.hud { pointer-events: none }`. Only real
   buttons opt back in.
9. **Throttle React HUD updates** (12 Hz) and animate between values with CSS
   `transition: width .12s linear` so bars stay smooth.
10. **Reserved colours:** red = danger/urgent/medical, green = pickup/good/safe,
    yellow/gold = reward and primary action, violet/aqua = tech/special. Keep
    them reserved (gig DESIGN §8, dive REVAMP "saturation is information").

---

## A. Score & counters

| Indicator | Where | Notes |
|---|---|---|
| **Topbar score pill** | all React games; `starters/react-board-game/src/App.tsx` | cream pill, 3 px ink border, `box-shadow: 0 3px 0 ink`; label 11 px uppercase + value 16–18 px 900 weight |
| **Stat with pop** | `kits/react/components/StatsSidebar.tsx` | framer-motion `key={value}` remount → `initial {scale:1.25, color:accent}` → rest. Every change "pops" |
| **Best score** | sidebar `.stat__value--best` in accent colour | localStorage `<game>.best`, try/catch |
| **Readout line** | whip-dash `Hud.tsx` `.readout` | mono, uppercase, letter-spaced: "**12** coins · **×3 DANGER** · **233** m to Lv 4" |
| **Arcade score** | sub-sinkers `drawHud()` | `'1P ' + score.padStart(8,'0')` in a 3×5 bitmap font, bottom bar |
| **Cash / gems pill** | gig-ambulance `.pill.cash` (green value), vanilla starter | with icon; space-lion draws a coin icon in-canvas (`coinIcon()`) |
| **Multiplier pill** | finger-skater `.pill.mult` (`.hot` = yellow + scale 1.12), whip-dash `.multiplier` (hazard red pill "×3 danger") | appears only when > 1 |
| **Lives as pips** | finger-skater `.life` (red circles with a tiny deck; `.lost` greyed; `.pop` animation on loss) | discrete lives ≤ 5 |
| **Lives as text** | dive-depths topbar "Lives 6" | numeric when lives can exceed max (extra-life pickups are uncapped) |

## B. Health

| Indicator | Where | How |
|---|---|---|
| **Long bar + quarter marks** | whip-dash (pre-ring), React starter `Hud.tsx` + `.health` | `<i style={{width: hp%}}/>` + three `<u>` ticks at 25/50/75%. `.health--low` = hazard gradient + `pulse-low` animation |
| **Segmented canvas bar** | space-lion `bar(ctx, x, y, w, h, pct, color, segments)` in `kits/vanilla-js/hud/canvas-toy-hud.js` | rounded trough `#e7def8`, fill, a highlight strip (`rgba(255,255,255,.45)` top 22%), ink dividers per segment, ink border. HP colour by fraction; flashes pink when low |
| **3D health ring on the character** | whip-dash `makeHealthRing / setHealthRing / makeRingShard` (`kits/three-ts/lowpoly-kit.whip-dash.ts`) | 6 torus arcs (`TorusGeometry(R, tube, 5, 8, step - gap)`) on a dark backing disc, parented to the runner at `(0, 1.34, -0.26)` facing the camera. Gold → ochre at 2 → hazard red + emissive pulse at 1. Losing a segment spawns a pooled **shard** that tumbles off (v = random x, +3.4 y, +5..8 z; gravity 14; spin). dive-depths planned the same for its sub |
| **Hitbox that is the health readout** | dive-depths `render2d.ts` | the real damage box drawn at exact size under the sub, recoloured green/yellow/red by `lives / LIVES_MAX`. It teaches the hitbox *and* shows health |
| **Pixel hull pips** | sub-sinkers | 4×4 squares in a row, black backing; red blink when hp ≤ 2 |
| **Invincibility blink** | all | skip drawing every other ~1/12 s while `invincible > 0` (`Math.floor(t*12) % 2`) |
| **Damage meter (inverse health)** | gig-ambulance vertical `DMG` bar | damage lowers top speed up to 35%. A cost you *feel*, not a death clock |
| **Grit / critical vignette** | whip-dash `.grit`, starter | bottom 40–46% gradient `rgba(hazard,.5) → transparent`; opacity by state (critical .85 / grinding .7 / contested .3 / else 0); `data-critical` pulses |

## C. Progress, level & distance

| Indicator | Where | How |
|---|---|---|
| **Level meter** | whip-dash `.level` / starter | thin bar (5–9 px) filling across one level + "Lv n" tag + "**n** m to Lv n+1" readout. Levels arrive faster as speed ramps (43 s, 39 s, 35 s…) and give pacing a shape |
| **Depth / distance badge** | splashy-fish/dive-depths/starter `.depth-badge` | top-right pill on the board, every layout. "Depth 7" / "Distance 12450L" / "Lv 3" |
| **Boss thermometer** | dive-depths `BossGauge.tsx` + `.boss-gauge` in `kits/css/gauges-dive-depths.css` | vertical tube on the left edge: leg start at top ("2.5kL"), boss bulb at the bottom, a **sub icon marker** sliding down with "−850L" to go; fill `linear-gradient(aqua → accent)`; `--gauge-accent` swaps red/orange for the Kracken; bulb pulses during the fight ("FIGHT!"). `formatLeagues` compacts 12345 → "12.3kL" |
| **Level progress strip** | sub-sinkers | 90 px line with a gold marker for camX / level length and a red end cap |
| **Depth readout** | sub-sinkers `DEPTH 3120M` | derived from stage max depth × progress × the player's vertical position |
| **Stage card** | sub-sinkers banner ("STAGE 2 / TWILIGHT REEF / MESOPELAGIC ZONE - 1000M", 2× bitmap text, fades) | zone arrivals; whip-dash toasts the zone name on level-up |
| **Water / zone colour** | splashy-fish continuous lerp; dive-depths zone per 5000 leagues with a cross-fade | the background itself is a depth gauge |

## D. Timers

| Indicator | Where | How |
|---|---|---|
| **Shift clock pill** | gig-ambulance `#hud-time`, vanilla starter | `.pill.warn` (pink + scale pulse) under 10 s |
| **Fare timer bar** | gig-ambulance `.fare` card | label "🚑 → St. Bandage", seconds, 8 px bar coloured by fraction |
| **Hot-pizza secondary timer** | gig-ambulance pizza row | "hot 12s" / "cold 🥶" |
| **Big glowing countdown** | labyrinth-larry `.time` | Impact 54 px, gold with fire glow `text-shadow: 0 0 12px #ff3a00, 3px 3px 0 #3a0804`; `.low` = red + pulse |
| **Countdown numerals over threats** | whip-dash `tallyTextures()` + pooled `THREE.Sprite`s | pre-rendered canvas textures for 5..1 (rounded dark plate, coloured top band, Cinzel numeral); pale 5–4 / amber 3–2 / green 1; swap `material.map` only when the frame changes |
| **Air-time bar** | finger-skater `.air` (follows the skater on screen) | drains toward touchdown; `.warn` red under 0.3 s; shows the live grab name and points ("MELON +340") |

## E. Charge, balance & cooldown

| Indicator | Where | How |
|---|---|---|
| **Charge ring** | finger-skater `#charge` SVG | `<circle pathLength="100">` + `stroke-dasharray: ${pct} 100`, rotated −90°; orange → green `.full`; positioned above the player's projected screen point; a `charged()` blip at 100% |
| **Balance meter** | finger-skater `.balance` | horizontal bar with gradient `red → yellow 25% → cream 40–60% → yellow 75% → red`, a centre tick, a purple needle at `(balance + 1) * 50%`; `.warn` pulse when |balance| > 0.7; label "GRIND 1.4s +620" |
| **Boost / siren meter** | gig-ambulance vertical `SIREN` bar (`linear-gradient(#3f7dff, #ff3d52)`), vanilla starter | vertical 12–14 px × 90 px, fills from the bottom |
| **Weapon badge (follows player)** | dive-depths `WeaponBadge.tsx` | own rAF writes `style.left = subX/BOARD_W %`; anchored by **`bottom`** so adding a row grows upward, not over the sub; rows "Ultimate firing 4s" (violet, pulsing) / "Shotgun 7s" (amber) |
| **Button state as indicator** | dive-depths Fire button read "Firing…" during the laser; finger-skater jump button turns green when fully charged | the control is the gauge |
| **Whip/cooldown animation** | whip-dash `world.whipK` 0→1 drives the whip model | the animation *is* the cooldown |

## F. Bosses

| Indicator | Where | How |
|---|---|---|
| **Boss banner + radial ring** | dive-depths `BossBanner.tsx` | pill top-centre: SVG circle `r=16`, `strokeDasharray = 2πr`, `strokeDashoffset = C·(1 − hpFrac)`; pulsing; `--kracken` variant orange with a "KRACKEN FIGHT" label |
| **Boss card + segmented bar** | space-lion `drawBossBar(ctx, w, y, label, fraction, segments, color)` | cream card centred under the top row; the segment count = `health.phases`, **read from the boss**, never hard-coded (a commit fixed exactly this) |
| **Pixel boss bar** | sub-sinkers | name in 3×5 font + 160 px red bar top-centre, hidden while entering |
| **WARNING flash** | sub-sinkers `G.warn` (3× text blinking at 4 Hz) + `sfx.warn` klaxon; dive REVAMP plans hazard-stripe borders | boss arrival |
| **Lair tint** | dive-depths | the bottom quarter of the water recolours to the boss's palette with a bubble shroud on the seam: "its whole lair reads as its domain" |
| **Boss HP via visuals** | space-lion Sentinel: the eyelid lowers and bandages/smoke appear as it's hurt | diegetic damage states |

## G. Navigation & targeting

| Indicator | Where | How |
|---|---|---|
| **Top nav compass** | gig-ambulance `hud.js _nav()`, vanilla starter | SVG ring + arrow, rotated to the **screen-space** angle from player to target (project both points, `atan2(dx·W, dy·H)`), eased along the shortest arc (`atan2(sin, cos)`); label + distance "PATIENT 42m"; the arrow colour encodes the target kind (green pickup / red drop / orange pizza); `.near` pulses under 12 m; `.none` = 35% opacity; a second smaller compass for a secondary objective |
| **World beams** | gig-ambulance marker GLBs (`marker_pickup/dropoff/pizza`) with a bobbing `icon` node | green = load, red = deliver, orange = side gig |
| **World guide arrow** | gig-ambulance `makeGuideArrow()` in fares.js | a 3D arrow near the van pointing at the target |
| **Reticle** | space-lion `makeReticle()` | four ink-backed corner brackets ahead of the nose; snap in and turn red on lock; kick out when firing |
| **Telegraphs** | whip-dash lanes go `1 = committing` for 1.2 s before `2 = claimed`; the Overgrown boulder wobbles with an amber pip; dive mines blink faster as they approach fuse range; space-lion towers' pupils glow and heads shake before firing | always warn before damage |
| **Shadows as distance** | whip-dash key light behind the runner so boulders cast forward: "shadow width reads as distance" | lighting as HUD |

## H. Feedback text

| Indicator | Where | How |
|---|---|---|
| **Toast (React)** | whip-dash `Hud.tsx`, starter | one at a time, `key` re-animates: `{opacity 0, y 14, scale .7} → {1, −18, 1} → exit {0, −44}` over 0.45 s; tones gold / hazard / jade(good) with a coloured 3 px text-shadow "drop" |
| **Toast (DOM stack)** | gig-ambulance/finger-skater `toast(text, cls)` + `@keyframes toast` | pill cards; `good`/`bad`/`big`; auto-remove after 1.6 s; **cap the stack at 3** |
| **Toast (canvas)** | space-lion `messages` | pop-in scale 1.12 → settle, rise + fade out; colour by kind (bad/warn/good/gold/ring) |
| **Floating world text** | gig-ambulance `hud.float("+$12", x,y,z)`, space-lion floatingTexts, vanilla starter | projected each frame, rises 60 px/s, fades over 1.2 s; **ink stroke (lineWidth 5–6) under a coloured fill** for legibility on any background |
| **Achievement toast** | dive-depths `AchievementToasts.tsx` | top-centre stack, trophy icon, "Achievement unlocked / <name>", 4.5 s, click to dismiss |
| **Word toast** | word-drop `WordToast.tsx` | pills listing the words just matched |
| **Match outline** | word-drop `Cell.tsx` `matchSides` | gold border only on the outward-facing edges of a matched run, so a word reads as one shape |
| **Cell countdown badge** | word-drop `cell__age` | per-tile turns-to-live number |

## I. Meta UI

| Indicator | Where |
|---|---|
| Keyboard help `?` popover | `kits/react/components/KeyboardHelp.tsx` |
| Achievements 🏆 n/N popover + list with done state | `kits/react/components/Achievements.tsx`, `kits/react/game/achievements.ts` (validates stored ids against the known list on load) |
| Options gear: art style segmented control, palette grid, zone-cycle toggle | `kits/react/components/OptionsMenu.tsx` |
| Camera view toggle 🎥 persisted | finger-skater `cycleView()` |
| Mute toggle ♪ | labyrinth-larry, vanilla starter (`.mini.off`) |
| "Pinch out to reset zoom" hint | `.tzg-hint` shown by the guard's `.tzg-zoomed` class |
| Rotate-your-device hint | sub-sinkers `#rotate` (portrait + coarse pointer while playing) — for landscape-only games |

---

## Styling recipes

**Toy-ink card/pill** (gig-ambulance → splashy-fish → space-lion → starters):
```css
background:#fffdf8; border:3px solid var(--ink); border-radius:999px /* pill */ or 14–22px /* card */;
box-shadow:0 4px 0 var(--ink);   /* hard shadow, no blur */
:active { transform:translateY(3px); box-shadow:0 1px 0 var(--ink); }  /* pressed into its shadow */
```
Canvas equivalent: `card(ctx,x,y,w,h,r,fill,drop,line)`. Fill the ink shape
offset by `drop`, fill the face, stroke the ink border.

**Dark glass chip** (dive-depths gauges, whip-dash HUD):
`background: rgba(8,20,33,.42); border:1px solid rgba(255,255,255,.18); backdrop-filter: blur(3px); text-shadow: 0 1px 4px #000;`

**Hellish** (larry): Impact / Arial Black, gold `#ffd27a`, `text-shadow: 0 0 14px #ff3a00, 3px 3px 0 #3a0804`.

**Pixel** (sub-sinkers, dive two-tone): a bitmap font drawn *in-canvas* at
integer scale, black 1 px drop shadow, `image-rendering: pixelated` on the
canvas.

**Carved lintel** (whip-dash): the topbar as a stone band. `text-shadow: 0 -1px 0 rgba(0,0,0,.75), 0 1px 0 <light>` gives an incised look, and a `repeating-linear-gradient` painted course sits under it.
