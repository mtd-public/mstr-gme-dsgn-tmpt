/**
 * The whole simulation in plain logical coordinates — no React, no DOM, no
 * three.js. Renderers read a World every frame; React reads snapshots of it.
 * Keep it that way: it is what let dive-depths swap three.js for a pixel
 * renderer (and then a two-tone one) without touching gameplay.
 *
 * Demo game ("Starter Dash"): three lanes, the world scrolls down toward the
 * player; dodge hazards, grab coins, BLAST the nearest hazard in your lane.
 * Replace it with your game — keep the shape: createWorld / step / actions /
 * score / fx counters.
 *
 * Coordinates: BOARD_W × BOARD_H board units, y grows downward (screen
 * convention). The player sits at a fixed row; everything else moves.
 */

export const BOARD_W = 400
export const BOARD_H = 800
export const LANES = 3
export const LANE_X = [BOARD_W * 0.2, BOARD_W * 0.5, BOARD_W * 0.8]
export const PLAYER_Y = BOARD_H * 0.78
export const PLAYER_R = 26
/** How far above the player things spawn — well past the top of any view,
 *  so a tall phone never sees a hazard pop into existence (splashy-fish). */
export const SPAWN_AHEAD = 1150
const CULL_BEHIND = 260

/** Every tunable in one table (prof-whip-dash TUNING). Tune here, not inline. */
export const TUNING = {
  baseSpeed: 300, // board units / s
  speedPerLevel: 30,
  maxSpeed: 560,
  unitsPerMetre: 10,
  laneSwitch: 0.12, // seconds to ease across one lane
  levelDistance: 400, // metres per level (~13 s at base speed; whip-dash used ~40 s)
  gentleLevels: 1, // level 1 is the on-ramp: never two lanes blocked
  rowGap: [340, 520] as const, // board units between hazard rows (re-rolled per row)
  coinEvery: [1.4, 2.6] as const, // seconds
  heartEvery: [12, 20] as const,
  hazardR: 28,
  coinR: 14,
  hit: 25, // HP lost per hazard
  heal: 25,
  invincible: 1.1, // seconds of blink after a hit
  blastCooldown: 0.45,
  blastNear: 60, // blast reach, units ahead of the player
  blastFar: 300,
  perfectNear: 130, // a blast inside this window is a PERFECT (+bonus)
  perfectFar: 190,
} as const

export interface Thing {
  id: number
  kind: 'hazard' | 'coin' | 'heart'
  lane: number
  y: number
  /** > 0 once destroyed/collected: counts up through its exit animation. */
  gone: number
}

/** Events this step — the renderer and HUD react to these; physics never
 *  calls audio/UI. Reset at the top of every step (prof-whip-dash). */
export interface Fx {
  coin: number
  hit: number
  blast: number
  perfect: number
  whiff: number
  heart: number
  levelUp: number
  laneChange: number
}

export interface World {
  lane: number
  /** Eased x — what renderers draw. */
  x: number
  speed: number
  /** Metres travelled. */
  dist: number
  level: number
  hp: number
  coins: number
  bonus: number
  combo: number
  things: Thing[]
  rowIn: number
  coinsIn: number
  heartIn: number
  blastCooldown: number
  /** 0→1 through the blast animation, -1 idle. */
  blastK: number
  invincible: number
  shake: number
  over: boolean
  elapsed: number
  fx: Fx
  nextId: number
}

function emptyFx(): Fx {
  return { coin: 0, hit: 0, blast: 0, perfect: 0, whiff: 0, heart: 0, levelUp: 0, laneChange: 0 }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

export function createWorld(): World {
  return {
    lane: 1,
    x: LANE_X[1],
    speed: TUNING.baseSpeed,
    dist: 0,
    level: 1,
    hp: 100,
    coins: 0,
    bonus: 0,
    combo: 0,
    things: [],
    rowIn: 500,
    coinsIn: 1,
    heartIn: TUNING.heartEvery[0],
    blastCooldown: 0,
    blastK: -1,
    invincible: 0,
    shake: 0,
    over: false,
    elapsed: 0,
    fx: emptyFx(),
    nextId: 1,
  }
}

// ---------------------------------------------------------------- actions
// Discrete actions, called once per keydown / tap / swipe — never "held".

export function moveLane(w: World, dir: -1 | 1) {
  const next = Math.max(0, Math.min(LANES - 1, w.lane + dir))
  if (next === w.lane) return
  w.lane = next
  w.fx.laneChange++
}

export function blast(w: World) {
  if (w.blastCooldown > 0 || w.over) return
  w.blastCooldown = TUNING.blastCooldown
  w.blastK = 0
  let target: Thing | null = null
  for (const t of w.things) {
    if (t.kind !== 'hazard' || t.gone || t.lane !== w.lane) continue
    const ahead = PLAYER_Y - t.y
    if (ahead >= TUNING.blastNear && ahead <= TUNING.blastFar && (!target || t.y > target.y)) target = t
  }
  if (!target) {
    w.fx.whiff++
    w.combo = 0
    return
  }
  const ahead = PLAYER_Y - target.y
  target.gone = 0.001
  w.fx.blast++
  w.combo++
  w.shake = Math.max(w.shake, 0.25)
  if (ahead >= TUNING.perfectNear && ahead <= TUNING.perfectFar) {
    w.fx.perfect++
    w.bonus += 5 * w.combo
  }
}

// ---------------------------------------------------------------- spawning

function spawnRow(w: World) {
  // At least one lane is always open — the game is finding it (prof-whip-dash).
  const twoChance = w.level <= TUNING.gentleLevels ? 0 : Math.min(0.7, 0.2 + (w.level - 2) * 0.15)
  const blocked = Math.random() < twoChance ? 2 : 1
  const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, blocked)
  for (const lane of lanes) {
    w.things.push({ id: w.nextId++, kind: 'hazard', lane, y: PLAYER_Y - SPAWN_AHEAD, gone: 0 })
  }
}

function openLane(w: World): number {
  // A lane with no hazard in the spawn band — where rewards may go.
  const busy = new Set(w.things.filter((t) => t.kind === 'hazard' && t.y < PLAYER_Y - SPAWN_AHEAD + 140).map((t) => t.lane))
  const free = [0, 1, 2].filter((l) => !busy.has(l))
  return free.length ? free[Math.floor(Math.random() * free.length)] : Math.floor(Math.random() * LANES)
}

function spawnCoins(w: World) {
  const lane = openLane(w)
  const n = 3 + Math.floor(Math.random() * 4)
  for (let i = 0; i < n; i++) {
    w.things.push({ id: w.nextId++, kind: 'coin', lane, y: PLAYER_Y - SPAWN_AHEAD - 60 - i * 56, gone: 0 })
  }
}

// ---------------------------------------------------------------- step

export function step(w: World, dt: number) {
  w.fx = emptyFx()
  if (w.over) return
  w.elapsed += dt

  w.speed = Math.min(TUNING.maxSpeed, TUNING.baseSpeed + (w.level - 1) * TUNING.speedPerLevel)
  const dy = w.speed * dt
  w.dist += dy / TUNING.unitsPerMetre
  const level = Math.floor(w.dist / TUNING.levelDistance) + 1
  if (level > w.level) {
    w.level = level
    w.fx.levelUp++
  }

  // Eased lane position: x += (target - x) * min(1, dt / switchTime) — the
  // one steering model every lane/step game here uses (whip-dash, dive-depths).
  w.x += (LANE_X[w.lane] - w.x) * Math.min(1, dt / TUNING.laneSwitch)

  w.blastCooldown = Math.max(0, w.blastCooldown - dt)
  w.blastK = w.blastCooldown > 0 ? 1 - w.blastCooldown / TUNING.blastCooldown : -1
  w.invincible = Math.max(0, w.invincible - dt)
  w.shake = Math.max(0, w.shake - dt * 2)

  // Spawns are distance-driven (units scrolled), not time-driven, so faster
  // levels keep the same spatial density. Gaps are re-rolled each time —
  // a fixed spacing reads as a metronome (dive-depths).
  w.rowIn -= dy
  if (w.rowIn <= 0) {
    w.rowIn = rand(TUNING.rowGap[0], TUNING.rowGap[1]) * Math.max(0.7, 1 - (w.level - 1) * 0.05)
    spawnRow(w)
  }
  w.coinsIn -= dt
  if (w.coinsIn <= 0) {
    w.coinsIn = rand(TUNING.coinEvery[0], TUNING.coinEvery[1])
    spawnCoins(w)
  }
  w.heartIn -= dt
  if (w.heartIn <= 0) {
    w.heartIn = rand(TUNING.heartEvery[0], TUNING.heartEvery[1])
    w.things.push({ id: w.nextId++, kind: 'heart', lane: openLane(w), y: PLAYER_Y - SPAWN_AHEAD - 30, gone: 0 })
  }

  for (const t of w.things) {
    if (t.gone) {
      t.gone += dt
      t.y += dy * 0.5
      continue
    }
    t.y += dy
    if (t.lane !== w.lane) continue
    const r = t.kind === 'hazard' ? TUNING.hazardR : TUNING.coinR
    // Collide against the eased x, not the lane index, so a half-finished
    // lane change is honest about where the player actually is.
    if (Math.abs(t.y - PLAYER_Y) > r + PLAYER_R * 0.7 || Math.abs(LANE_X[t.lane] - w.x) > 60) continue
    if (t.kind === 'hazard') {
      if (w.invincible > 0) continue
      t.gone = 0.001
      w.hp -= TUNING.hit
      w.combo = 0
      w.invincible = TUNING.invincible
      w.shake = Math.max(w.shake, 0.6)
      w.fx.hit++
    } else if (t.kind === 'coin') {
      t.gone = 0.001
      w.coins++
      w.fx.coin++
    } else {
      t.gone = 0.001
      w.hp = Math.min(100, w.hp + TUNING.heal)
      w.fx.heart++
    }
  }
  w.things = w.things.filter((t) => t.gone < 0.35 && t.y < PLAYER_Y + CULL_BEHIND)

  if (w.hp <= 0) {
    w.hp = 0
    w.over = true
  }
}

export function score(w: World): number {
  return w.coins * 10 + w.bonus * 10 + Math.floor(w.dist)
}

export function levelProgress(w: World): number {
  return (w.dist % TUNING.levelDistance) / TUNING.levelDistance
}

/** Title-screen autopilot (dive-depths attract mode): the demo plays itself
 *  behind the start card so the first frame the player sees is the game. */
export function autopilot(w: World) {
  const threat = (lane: number) =>
    w.things.some((t) => t.kind === 'hazard' && !t.gone && t.lane === lane && t.y > PLAYER_Y - 420 && t.y < PLAYER_Y + 40)
  if (threat(w.lane)) {
    const options = [w.lane - 1, w.lane + 1].filter((l) => l >= 0 && l < LANES && !threat(l))
    if (options.length) moveLane(w, options[0] < w.lane ? -1 : 1)
    else blast(w)
  }
  if (Math.random() < 0.02) blast(w)
}
