# 04 · Input & controls

## Pick a scheme (every one below has shipped)

| Scheme | Used by | Touch | Keyboard | Code |
|---|---|---|---|---|
| **One action** | splashy-fish | tap the board anywhere, or a big footer button | Space / ↑ / W | `onPointerDown` on `.board-shell` |
| **Lanes: swipe or tap a side + action button** | prof-whip-dash, starter | swipe ←/→ (fires on threshold) or tap left/right half of the board; action bar at the bottom | ←/→ A/D, Space/↑ | `kits/react/hooks/useBoardControls.swipe-or-tap-side.ts` |
| **Swipe steers, tap fires** | dive-depths | swipe steps left/right; any tap = fire; no fire button at all | ←/→ A/D, Space | `…/useBoardControls.swipe-steer-tap-fire.ts` |
| **Flick on release (puzzle)** | word-drop, template | touch-only; net movement at pointerup picks ←/→/↓ (hard drop); rotate is a button | ←/→, ↑/X rotate, ↓/Space drop | `…/useSwipeControls.flick-on-release.ts` |
| **Floating stick + hold buttons** | gig-ambulance, vanilla starter | stick anywhere in the left 60%; DRIFT/BRAKE/BOOST hold buttons at the right | WASD/arrows, Space/X/Shift, Q/E | `kits/vanilla-js/input/floating-stick-and-hold-buttons.js` |
| **Twin full-height zones** | finger-skater | left half = stick appears under the thumb; right half = one hold button (press/release events) | ←/→ A/D, hold Space/↑/W | `…/twin-zones-stick-and-hold.js` |
| **Stick + tap-anywhere fire** | space-lion | stick zone bottom-left (x < 50%, y > 52%); every other touch fires while held | WASD, Space | `…/stick-plus-tap-anywhere-fire.js` |
| **Stick + two fire buttons** | sub-sinkers | stick zone left 55%; ▶ torpedo and ▲ missile buttons | arrows/WASD, Space/J/Z, K/X/Shift | `…/stick-plus-two-fire-buttons.js` |
| **Drag toward target** | labyrinth-larry | press anywhere and drag toward where the ball should roll; deflection = throttle | WASD | reference/labyrinth-larry/js/input.js |

Choose by the **verb count**:

- One verb: tap anywhere.
- Steer plus one verb: swipe or stick, plus tap or a button.
- Steer plus several verbs: stick plus a button pad.

Keep the primary verb reachable by **either** thumb in portrait (a full-width
bar), or by the right thumb in landscape (a big circle, 90–104 px).

## Gesture rules learned the hard way

- **Fire on threshold, not on release.** At speed, waiting for `pointerup` is a
  hit. Fire as soon as |dx| ≥ 28 px and |dx| ≥ |dy|, then **reset the origin**,
  so one long drag crosses two lanes. (whip-dash, dive-depths.)
- **Tap = a press that never swiped.** Decide it at `pointerup` with a `swiped`
  flag.
- **Measure tap sides against the board rect, not the window.** Pillarboxed
  layouts put the board off-centre (`event.currentTarget.getBoundingClientRect()`).
- **Swipe-to-steer means tap is free for another verb.** dive-depths inverted its
  scheme ("swipe steers, tap fires") and deleted the fire button and its CSS.
- Puzzle games may use **flick-on-release**, touch only (`pointerType === 'touch'`),
  so mouse drags on desktop don't trigger moves.
- Discrete actions are called **once per keydown**. Ignore `event.repeat`.
  Holding → does not machine-gun lanes.
- `preventDefault()` on Space and the arrows, or the page scrolls. The shell is
  overflow-hidden, but some embeds still scroll.

## Joystick robustness (gig-ambulance's fix, copy it)

The stick used to "stick" until a reload. The fix:

1. **A new touch in the stick zone always takes the stick over.** The previous
   owner may have vanished without a `pointerup` (system gesture, notification,
   app switch). Refusing new touches is what made it stick.
2. Listen for `pointerup`, `pointercancel` **and `lostpointercapture`**.
3. Handle a mouse released outside the window: on `pointermove` with
   `e.buttons === 0`, release.
4. On `window blur`, `visibilitychange` (hidden) and `pagehide`, call
   `reset()`, which releases the stick, clears keys, clears held buttons and
   removes `.down` classes.
5. Call `input.reset()` whenever the game pauses.
6. Call `setPointerCapture(e.pointerId)` on the element in `pointerdown`,
   wrapped in `try`/`catch` because synthetic events throw.

## Stick maths

```js
// floating base follows the thumb past the rim (gig) — no dead "pinned at edge" feel
if (d > R) { base += (delta / d) * (d - R) }
// dead zone then smoothstep throttle: gentle near the centre
const k = Math.min(1, (dd - DEAD) / (R * 0.75 - DEAD)); magnitude = k * k * (3 - 2 * k)
```

- Radius 52–70 px; dead zone 6–10 px.
- **Screen → world** for tilted or rotated cameras. Use the camera's
  screen-right and screen-up projected onto the ground:
  `world = SCREEN_RIGHT * sx + SCREEN_UP * (-sy)`. Recompute them when the camera
  rotates (gig's ⟳ 90° button).
- A pitched ortho camera foreshortens screen-up by `sin(pitch)`, so correct for it
  or the ship won't fly where you point (space-lion).
- Pushing up always means "up the screen". This is absolute steering, which
  suits phones better than tank or relative steering (gig DESIGN §3).
- **Release behaviour is a design choice.** space-lion keeps flying in the last
  direction. gig-ambulance coasts down at 11 m/s². finger-skater recentres
  (joyAxis → 0).
- Draw the stick while active, and a faint resting hint where it lives while
  idle.
- **Floating vs anchored:** finger-skater clamps the stick centre so the graphic
  never clips the edge (`EDGE_MARGIN`).

## Hold buttons and hold semantics

- Each hold button tracks **its own `pointerId` owner**, so it works alongside the
  stick (multi-touch). Toggle a `.down` class for the pressed look.
  (`input.bindButton(el, name)`, gig-ambulance.)
- **Press/release event queue** (finger-skater): input records
  `'press' | 'release' | 'cancel'` in order, and the game decides what the hold
  *means* from context:
  - Held on the ground = charging an ollie. The charge ring fills over 0.8 s;
    release jumps with `power = min(1, heldTime / CHARGE_TIME)`.
  - Held in the air = a grab. Points only count if released before touchdown.
  - Still holding a charge as you leave a ramp lip converts it into a grab.
  - A `cancel` (pointercancel) must not trigger a jump.
- A keyboard hold and a touch hold can overlap. Only release when **neither** is
  held (`_keyHeld()` check).

## Keyboard map conventions (keep consistent across games)

| Verb | Keys |
|---|---|
| Move / steer | ←/→/↑/↓ and WASD |
| Primary action | Space (also ↑ in lane games; Space starts from the title) |
| Secondary action | X / Shift / K |
| Pause | P and Escape |
| Mute | M |
| Camera / view | C (finger-skater), Q/E rotate (gig-ambulance) |
| Cycle palette | C / Shift+C (dive-depths two-tone; P was taken) |

List them in the `?` popover.

## Touch-zoom guard (mandatory for any touch game)

**Problem:** rapid taps on buttons double-tap-zoom iOS/iPadOS Safari. A joystick
finger plus a button finger reads as a pinch. Once zoomed, the page stays zoomed.
`user-scalable=no` is ignored on iOS, and `preventDefault()` on *pointer* events
does not cancel the gesture recognisers.

**Fix:** `kits/touch-zoom-guard/`. It's a drop-in JS + CSS pair. Read its
`README.md` and `AGENT_BRIEF.md`.

1. Viewport: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`.
2. Include the guard CSS *before* the game CSS and the guard JS before the game
   scripts.
3. Put `data-touch-allow` on menus, cards, the topbar and the footer: anything
   that needs normal taps or scrolling. Put `data-touch-control` on non-button
   control divs (joystick zones).
4. `TouchZoomGuard.init({ onZoomChange: z => { if (z) pause() } })`.
5. Optional, from the Start tap: `TouchZoomGuard.enterFullscreen('landscape'|'portrait')`.
   This works on Android and iPadOS but not on iPhone.
6. **Game controls use Pointer Events only.** `click` is suppressed on the game
   surface, so in-board buttons must act on `pointerdown` (the React starter's
   `.action-tap` does this). Buttons inside `data-touch-allow` can keep `onClick`.
7. Test: `node touch-zoom-guard/test/tap-spam.mjs <url> --start "<sel>" --buttons "#fire,#jump"`.
   It must PASS for both the iPad and iPhone profiles.

`touch-action` is **not inherited**. Every control needs its own
`touch-action: none` (canvas, buttons, joystick zones).

## Haptics

Use `navigator.vibrate?.(pattern)`. It's a no-op on iOS, so never rely on it.
whip-dash: `[30, 40, 30]` on a hit, `12` per grind tick. The design intent is
"a 30 ms tick per HP segment lost, escalating".
