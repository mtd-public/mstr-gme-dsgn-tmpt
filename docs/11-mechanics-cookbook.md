# 11 · Mechanics cookbook: proven systems with their numbers

Each entry lists what it is, the numbers that shipped, and where the code
lives. Tune from these starting points instead of from zero.

## Spawning

**Distance-driven accumulators** (all scrollers). Spawn when *distance
scrolled* passes a gap, not on a timer, so faster speeds keep the same spatial
density:

```ts
w.spawnAccumulator += speed * dt
if (w.spawnAccumulator >= w.spawnGap) { w.spawnAccumulator -= w.spawnGap; w.spawnGap = rand(190, 330); spawn(w) }
```

- **Re-roll the gap every spawn.** A fixed `SPAWN_SPACING` "arrives on a
  metronome" (dive-depths). The gap can shrink with level, e.g.
  `× max(0.7, 1 − (level−1)·0.05)`.
- **Spawn beyond the tallest view** (`BOARD_H + 220..260`, or 1150 above the
  player) and **cull behind** (−200..−260). Otherwise things pop in on tall phones.
- **Weighted type pick by depth:** a weights function with `k = min(1, depth/3600)`
  that skews toward harder types (fish 0.5 → 0.23, monsters 0.05 → 0.23, subs
  0.13 → 0.26), then a roulette pick. splashy-fish's simpler version is a fixed
  cycle `['coral','anchor','coral','mine']`.
- **Unlock types by milestone** (dive-depths `THREAT_UNLOCK_LEAGUES`): each type
  enters the roster at its own distance (redFish/squid/tentacle at 1, fish at 5k,
  mine at 7.5k, sub at 10k). **Every spawn path must respect the gate.** A bug
  let formations bypass it because their picker was a separate random draw. It
  was caught by logging 676 spawns and checking the first appearance of each type.
- **Formations** (Galaga-style): 3–4 same-type threats staggered by a fixed
  `(±50, 60)` step in a random diagonal direction, clamped on board. Because
  everything scrolls at one shared speed, the diagonal holds without any
  per-entity state. The formation chance rises from 18% to 40% with depth.
- **Rows with a guaranteed gap** (whip-dash lanes, dive boss squads, starter):
  choose blocked lanes or cells so **at least one is always open**. That makes
  the game about finding it, "not reacting to a coin flip". Verify it
  headlessly (`npm run sim` checks for fully blocked rows).
- **Rewards go where they create decisions:**
  - Coins thread the dangerous lane 70% of the time.
  - Hearts spawn **only** in a clear lane (none claimed, none committing).
    Without that check "the heal is bait".
  - If no lane qualifies, retry in 1.5 s.
- **Gap-edge placement** (splashy-fish): tethered hazards hang exactly at the
  gap edge, where the player has to thread.

## Difficulty

- **Speed ramps with score or level, capped:**
  - splashy `min(190 + 5·score, 380)`.
  - whip `min(21, 11 + 0.0035·dist)`, with boulders at 1.04× player speed.
  - dive `113 → 240`, cut by a third after playtest: "more time to read and dodge".
- **Gaps shrink with score, floored:** `max(152 − 1.5·score, 100)`.
- **Difficulty keys off the LEVEL, never the zone or theme.** Themes loop, so a
  zone coming back around must not walk difficulty back down (whip-dash).
- **Level 1 is an on-ramp:** one lane claimed, vermin 2.8 s apart, longer row
  gaps. From level 2 the two-lane chance is `min(0.85, 0.3 + (level−2)·0.22)`.
- **First session:** hold threats back until the player's first successful
  action. Nobody reads a tutorial (whip-dash design).
- **Test a fight standing still.** dive-depths' first boss could be beaten
  without steering because its squads were too dense to *need* dodging, which
  meant they were unfair to anyone who tried. After tuning: 3/6/9 mines in 3
  columns 100 units apart (60 clear between mine edges), 3.6–5.5 s between
  volleys. Later this became shaped formations on a 5×5 grid, 78/90 apart, with
  one open column per row.

## Player health models

| Model | Numbers | Games |
|---|---|---|
| Lives + invincibility | 3 → 5 → 8 lives (grew as combat grew), 1.5 s invincible | dive-depths |
| Hits to bail | 3 hits; ♥ gives one back; landing mid-grab = hit | finger-skater |
| HP drain / regen | 100 HP; grind 18 HP/s (ramps 12 → 24 over 3 s), contested 6 HP/s, vermin −12 + 0.6 s stumble; regen +4 HP/s after 2.5 s clear | prof-whip-dash |
| HP bar | player HP with a segmented bar; persistent boss phases | space-lion |
| Damage-as-slowdown | damage lowers top speed up to 35%; wrench −35% | gig-ambulance |
| Time as health | shift clock 90 s; deliveries add +12/+8/+5 s by speed; death costs time and respawns at the checkpoint | gig, labyrinth-larry |
| One-hit + checkpoints | falls > 4.6 kill; respawn at the last rune | labyrinth-larry |

**Hitbox smaller than the sprite** (dive-depths): the damage hitbox is
`HIT_R = 4` at the bottom-centre of a 20-unit hull, drawn at its exact size.
The body radius still governs steering bounds, spawn point and pickup range.
Pickup radius should be generous; damage radius should be tight.

## Weapons & actions

- **Manual fire with a cooldown** (dive 0.35 s). Tap spam is fine. Auto-fire was
  rejected as a design decision.
- **Timing-window melee** (whip-dash whip): reach 1.5–6 m, own lane only,
  **perfect band 3.0–3.8 m** → combo +1, +8% speed for 2 s. A late crack is a
  graze with no punishment. "The decision is *when*, never *where*."
- **Spread power-up:** 5 missiles with `vx = t·240`, t ∈ [−1, 1], for 9 s.
- **Sustained ultimate:** a 5 s beam (it was 0.4 s, then 15 s, then 5 s), half
  the board wide. It **tracks the player every frame**, damages the boss per
  second (`LASER_BOSS_DPS 3`), and extends if picked up mid-beam instead of
  banking a second charge (banking left gaps).
- **Power-up stacking rule:** a pickup only touches its own state. A shotgun
  pickup never shortens the laser, and vice versa. Only a same-type pickup
  extends.
- **Health vs extra life:** health refills up to `LIVES_MAX`; extra life is
  **uncapped**. Visual rings cap out at full, and the numeric HUD stays accurate.
- Power-up weights shipped: shotgun 42–50%, health 30–40%, laser 18–25%, extra
  life rare (common during the final boss).
- gig power-up set: turbo (boost refill), repair (−35% damage), alarm clock
  (+8 s fare / +5 s shift), tip magnet (9 m, 8 s), heart (clears the crash
  penalty, +4 s), star (×2 next pay), shield (6 s crash immunity), coin (+$2).
- finger-skater: coin +25, ♥ one hit back, ★ bumps the streak one step.

## Enemy behaviours (all cheap, all readable)

| Behaviour | Implementation |
|---|---|
| Wander | `x = baseX + sin(t·1.6 + phase)·wander` while scrolling |
| Vertical bob holding a column | a separate `baseY` anchor scrolls; `y = baseY + sin(t·1.3 + phase)·vwander` |
| Fire back | per-enemy `fireIn` timer 1.6–3.2 s, only while on screen; projectile toward the player's side of the board |
| Aimed shots | `aimed(kind, x, y, speed, spread)` at the player (sub-sinkers) |
| Proximity fuse | within 230 units of the player's row → detonate into 8 shrapnel in a ring (`angle = i/8·2π`); shooting first = clean kill |
| Moored mines | no fuse; swaying on a chain from a wall; terrain you can leave alone |
| One-sided terrain | a tentacle reaching 32–48% of board width from one wall (was 55–72%, "ate the playfield"); not destroyable except by the ultimate; a band collision test on one side |
| Lane hogs with lifetimes | boulders hold a lane ≤ 5 s, then roll away (1.6 s, quadratic), swerving 2.4 m around the player; the lane cools down 2 s (**cooldown ≥ roll-away time** or a lane is re-claimed mid-flight); guard against all lanes cooling at once |
| Varied lane AI | a limestone block that never moves; "the overgrown" drifting a lane every 3–5 s after an amber-pip wobble; Kukulkán holding back then lunging a full lane in 0.5 s |
| Turrets | aim at the player, the pupil glows and the head shakes, then fire |
| Chasers | soul orbs rolling after you with ball-ball collisions (`collideBodies`) |

## Bosses

The cadence and structure that shipped (dive-depths) and the persistent variant
(space-lion):

- **Every N distance** (dive: 2,000 → 1,000 → 2,500 leagues after tuning). N must
  divide the final-boss milestone evenly (2,500 divides 20,000).
- **On spawn:** clear all threats, fire and power-ups. Suppress normal spawns.
  **Freeze the distance counter** for the fight, then resume just past the
  milestone (`+1`) so it doesn't instantly re-trigger.
- **Phases:** `entering` (rises from the spawn edge) → `fighting` → `exploding`
  (1.4 s, big chain) → gone.
- **HP:** random 15–20 hits; the final boss has 40. The hit circle (50 units) is
  much smaller than the implied body. Teeth and tentacles are cosmetic.
- **Attacks:** spit a squad from the *normal* spawn edge, so it gets the same
  warning distance as ordinary threats even though it narratively comes from the
  mouth. A mouth-open telegraph lasts 0.5 s. Formation shapes are left
  diagonal, right diagonal, cross or X on a 5×5 grid, with one open column
  guaranteed per row.
- **Place it where it's visible.** `BOSS_Y = BOARD_H − 40` was off-screen on some
  aspects even though collision worked. Later fractions were 0.58 → 0.76 → 0.81 of H.
- **Final boss = win condition**: its own phase `'won'`, a victory card, and an
  achievement. Keep a `TEST_AS_FIRST_BOSS` toggle for playtesting and **turn it off**.
- The final boss drip-feeds pickups (every 2.5–4 s, skewed to health and extra
  lives) because a boss fight otherwise suppresses power-ups.
- **Persistent-phase boss** (space-lion Sentinel): `BossHealth(180, 2)`. Each
  encounter can only chip one phase. Then it warps out and returns later at
  the remaining HP. Destroying it unlocks the final boss.
  `kits/sim/boss-health.js`.

## Scoring formulas

| Game | Score |
|---|---|
| splashy-fish | +1 per band passed |
| prof-whip-dash | `coins·10 + metres`; coin value × lane multiplier (1/2/3); idol 25× |
| dive-depths | depth passed + kill points (per-type `points`; boss 300, Kracken 1000) |
| finger-skater | metres × streak mult (to ×5) + hops 100 / car hop 400 / near miss 50 / ramps `250 + 250/s air` / grabs `100 + 400/s` / grinds `150 + 350/s`, all × mult |
| gig-ambulance | fare `8 + 0.22·dist` + tip `1.2·secondsLeft` (−20%/crash) + combo `min(10, combo)` + smash $1 + coins $2; ×2 with star |
| word-drop | 3/4/5/6 letters = 50/100/200/400 (+200 per extra letter) × level; level = words/5 + 1; drop interval `max(120, 800 − (level−1)·60)` ms |
| labyrinth-larry | leftover time carries into the next circle and pays a bonus |

Credit score **the instant it's earned**. word-drop originally waited for a 380 ms
clear animation, and "visually only once another piece dropped".

## Timers & deliveries (gig-ambulance)

- Fare timer `10 + 1.3·distance/11` s. Each patient is assigned one of three
  hospitals, not always the nearest.
- Stop zone: 6.5 m radius, speed < 6 m/s for 0.25 s. Roll-through zones for the
  side gig: < 12 m/s, no stop needed.
- Shift bonus by time left: > 50% SPEEDY +12 s, NICE +8, PHEW +5.
- Side gig in parallel: carry up to 3; a hard crash (> 9 m/s) knocks the top one
  off; a hot timer `18 + 1.3·d/10`; cold ones pay base only.

## Skate tricks (finger-skater `skater.js`)

- Ollie: hold to charge (0.8 s full); a tap is a small hop; a full charge clears
  a car.
- Ramps: kicker / ramp / MEGA with a weight 0.4/0.4/0.2 and a launch
  `lift[0] + speed·lift[1]`.
- Grab in the air: named tricks (Indy, Melon, Nose, Stalefish, Method, Tail).
  Bank on release before touchdown.
- Rails: land within 0.6 m of the rail line to lock on. The balance needle
  drifts away from centre faster over time. Steer against it. Hitting either end
  is a slip and a hit.

## Puzzle mechanics (word-drop)

- **Index-rigid rotations:** `SHAPES[type][rot][i]` is the same physical block
  for every rotation. Per-block colour and letter are assigned once at spawn and
  carried by index. The O piece still cycles its indices through the 2×2, so
  rotating is visibly *something*. All four identical arrays made rotate a no-op
  for O.
- 7-bag randomiser (`shuffledBag`), with the S piece removed in this variant.
- Word scan: per row and column, contiguous runs, **greedy longest word from
  each start**, non-overlapping. The dictionary is about 700 curated 3–6 letter
  words.
- Decay: each placed cell carries `age` turns (red 5, blue 10) and bursts at 0.
  After any removal, `settleColumns` drops everything with no floating cells.
- Pause and a modal: auto-pause on open, resume on close only if the modal did
  the pausing.

## Ring courses & collectibles (space-lion)

- A sequential ring set: only the *next* ring is live (`waiting / next / cleared`
  states recolour it). Clearing all of them gives a bonus. The course replays
  after a cooldown.
- The nav target (compass) is the next ring's world position.

## Achievements (dive-depths)

Define them as data `{id, title, description}`, with constants for thresholds
that the copy references. Track counters on the World (`pacifist`,
`laserActiveTotal`, `shotgunActiveTotal`) and check them in the engine loop.
`unlock()` returns true only the first time, which drives the toast. Persist the
ids and **filter stored ids against the known list** on load.

**Verify achievability**: two achievements needed gameplay changes to be
possible (the laser extend rule, power-up spawn frequency). They were tested with
temporary overrides that were reverted before commit.

## Endless world generation

- **Scrolling scroller:** entities spawn ahead and are culled behind; the
  player's row is fixed (splashy, dive, starter).
- **Recycled track modules** with seeded dressing (whip-dash, 8 × 12 m).
- **Tile segments** (finger-skater): 16 m segments of `lawn | lot | road | lot | lawn`
  along −Z, built from GLB tiles, **baked** per segment, with crossroads every
  few segments. Traffic lanes at x = ±1.5, ±4.5 (right-hand traffic).
- **Grid town** (gig): 15 × 15 tiles of 16 m; road pieces auto-rotated by
  neighbours; buildings face roads; a heightfield park; a traffic graph with
  roundabouts running anti-clockwise.
- **Handmade ASCII courses** (larry): see 12.
