# 10 · Game feel & juice

"Juice, in build order" from whip-dash DESIGN §7, with everything the other
games actually shipped.

## The juice list (in rough priority order)

| # | Effect | Numbers that worked | Where |
|---|---|---|---|
| 1 | **Hit-stop + flash on the key action** | 2 frames of hitstop, weapon tip flashed white, 0.06 camera punch; ~40 ms hitstop on a boss's killing blow | whip-dash design, dive REVAMP |
| 2 | **Screen shake scaled by impact** | `shake = max(shake, 0.12 hit / 0.22 perfect / 0.4 taking damage)`, decay `dt*1.8`; gig crash shake scales with impact speed; sub-sinkers shake S 1 / M 2.5 / L 5 px | all |
| 3 | **Lean / squash** | runner body roll to 14° on lane change, hat brim lagging 3 frames; sub banks via sheared sprite frames; van tilts on slopes; bumper squash `1+0.15k, 1−0.2k` | whip-dash, dive, gig, starter |
| 4 | **Invincibility blink after a hit** | 1.1–1.5 s, toggle visibility at ~12 Hz | dive, starter, space-lion |
| 5 | **Pickups pop** | scale to 1.4 and vanish in 5 frames / `scale (1+k)(1−0.9k)` while rising 1.6 m; coins spin (`rotation.y = t·3.2 + id` so they're out of phase) | whip-dash, starter |
| 6 | **Toasts for moments** | "CRACK! ×3", "IDOL +75", "×3 DANGER", "LEVEL 4 / zone name", "SMASH +$1", "CLEAN STREAK x3!" | whip-dash, gig, skater |
| 7 | **Floating numbers at the spot** | "+$12", "+100" rise 60 px/s, 1.2 s, ink-stroked | gig, space-lion |
| 8 | **Dust & trails** | heel puff every 0.14 s; 6-puff scuff on lane change; dust on drifts and landings; bubble wakes; position-trail bubbles | whip-dash, gig, dive |
| 9 | **Explosions bigger than the thing that died** | multi-frame flash → fire → smoke; boss death = rolling chain along the hull | dive |
| 10 | **Near-miss reward** | boulder within 0.6 m → FOV +4° and back over 0.5 s (design); gig near miss < 1.6 m at > 12 m/s = combo +1; skater +50 | whip-dash, gig, skater |
| 11 | **Confetti on big success** | 40 boxy particles, 5 palette colours, gravity 14, spin | gig deliveries, starter every 10 gems |
| 12 | **Haptics** | 30 ms tick per HP segment lost; `[30,40,30]` on hit | whip-dash |
| 13 | **Diegetic damage states** | Sentinel's eyelid lowers, bandages and smoke as it's hurt | space-lion |
| 14 | **Telegraphs** | wobble + amber pip before a lane shift; 1.2 s lane commit; mine blink speeds up; turret pupil glows and head shakes before firing | whip-dash, dive, space-lion |
| 15 | **Death sequence** | camera drops to slab height, boulder rolls over the lens, cut to score (design) | whip-dash |
| 16 | **Revive once per run** | idol's eyes go dark, threats reset 18 m back, 40 HP returned (design) | whip-dash |
| 17 | **Scream/character voice** | formant screams on falls and deaths, with a scream bubble | labyrinth-larry |

## Feel of movement

- **Eased discrete steering:** `x += (target - x) * min(1, dt / switchTime)`
  with switchTime 0.12–0.16 s. It responds instantly but never snaps. "Lane
  switch 0.16 s: dodge on reaction; panic-tapping overshoots."
- **Arcade car** (gig `player.js`):
  - Smooth the requested stick angle, then drive the **yaw rate** with a damped
    spring (`rate = clamp(3 × error, ±max)`).
  - Steering authority grows with speed, so a parked van can't pivot.
  - A hard yank at speed drops lateral grip, so the tail steps out.
  - Handbrake: grip 1.3, turn ×1.55. Brake 38 m/s². Coast 11 m/s².
  - Surfaces `[speed×, grip×]`: road 1/1, pavement 0.95/1, grass 0.82/0.7, sand 0.72/0.55, water 0.45/0.5.
  - Airborne when the ground drops away faster than a ballistic arc. Kerbs are
    steps, not launches.
- **Flappy impulse** (splashy-fish): a constant pull of 900 u/s² and an action
  that **snaps velocity** to 340 (not adds), with max opposite velocity −420.
  Tilt = `vx / SPLASH_VX` clamped.
- **Rolling ball** (larry): the slope pull is 5/7 of gravity (a rolling
  sphere), exponential friction `exp(−0.55·dt)`, air control 35%, max speed 17.
  Wall push-out has restitution 0.45. A fall over 4.6 units kills; short drops
  "clank" with a bounce.
- **Weight** (dive REVAMP): steering ease-time about 15% slower "adds 900 tons".
  Compensate with wider threat gaps.
- **Boost while holding:** finger-skater's +12% speed while the trick button is
  held rewards charging instead of coasting.

## Risk ↔ reward economies that worked

- **whip-dash danger lane:** 70% of coin runs thread the lane a boulder owns or
  is about to own. Pay ×1 clear / ×2 contested / ×3 while being ground, against a
  drain of 18 HP/s. Hearts spawn **only** in clear lanes, so gold and life pull
  in opposite directions.
- **dive-depths mines:** shooting a mine early is a clean kill. Letting it close
  to fuse range sprays 8 shrapnel.
- **finger-skater grabs:** points accrue while held but only bank if you release
  before landing. Still grabbing at touchdown is a crash.
- **gig tips:** the tip is `1.2 × seconds left`, cut 20% per crash while the
  patient is aboard. The Heart power-up restores it.
- **Clean-streak multiplier:** +1 step every 150 m without a hit, to ×5 (skater).
  Combo payouts are `min(10, combo)`, and the combo decays after 3 s idle (gig).
