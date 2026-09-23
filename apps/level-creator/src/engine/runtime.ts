/**
 * The v1 'grid' runtime: plays any GameSpec. Pure simulation — no DOM, no
 * React, no canvas — so it runs headlessly in `npm run check` exactly as it
 * runs in the Play tab (house rule: sim / render / UI split).
 *
 * Model: entities live on cells and tween between them. The player steps one
 * cell at a time while a direction is held (or once per queued swipe/tap);
 * enemies step by behaviour. Contact, pickups, hazards, doors, goals, the
 * clock, win/lose and achievements are all resolved here and reported as
 * `events` for the UI to turn into toasts and sounds.
 */
import type { Achievement, EntityType, GameSpec, Level, Rules, WinCondition } from '../spec/schema.ts'
import { fillText } from '../spec/schema.ts'

export type Dir = 'up' | 'down' | 'left' | 'right'
const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

export interface Mover {
  cx: number
  cy: number
  /** Tween origin and progress 0..1 toward (cx, cy). */
  fromX: number
  fromY: number
  t: number
  /** Seconds per step. */
  stepTime: number
  faceX: number
  faceY: number
}

export interface Enemy extends Mover {
  uid: number
  type: EntityType
  hp: number
  dir: [number, number]
  /** Spawner cell index that produced it, if any. */
  from?: number
  flash: number
}

export interface Pickup {
  cell: number
  type: EntityType
  taken: boolean
}

export interface Spawner {
  cell: number
  type: EntityType
  timer: number
  live: number
}

export type Stats = Record<string, number>

export type GameEvent =
  | { kind: 'toast'; text: string; tone: 'good' | 'bad' | 'gold' | 'info'; x?: number; y?: number }
  | { kind: 'sfx'; name: 'coin' | 'hit' | 'defeat' | 'door' | 'clear' | 'death' | 'attack' | 'achievement' | 'bonk' }
  | { kind: 'achievement'; achievement: Achievement }

export type RunStatus = 'playing' | 'cleared' | 'lifeLost' | 'gameOver' | 'won'

export interface World {
  spec: GameSpec
  levelIndex: number
  level: Level
  rules: Rules
  ents: Map<string, EntityType>
  /** Terrain after actors are lifted off: walls, doors, goals, hazards, decor, floor ''. */
  terrain: string[]
  start: number
  player: Mover & { hp: number; invincible: number; keys: number; attackCd: number; attackFlash: number; hazardTick: number; bumpCd: number }
  enemies: Enemy[]
  pickups: Pickup[]
  spawners: Spawner[]
  elapsed: number
  timeLeft: number
  lives: number
  score: number
  /** Score at level start — restored when a level restarts. */
  levelStartScore: number
  levelStats: Stats
  runStats: Stats
  unlocked: Set<string>
  status: RunStatus
  events: GameEvent[]
  nextUid: number
}

export interface Input {
  /** Direction held right now (keyboard / d-pad), or null. */
  held: Dir | null
  /** One-shot steps queued by swipes / taps. */
  queued: Dir[]
  attack: boolean
}

// ------------------------------------------------------------------ setup

export function createRun(spec: GameSpec, unlocked: Set<string> = new Set()): World {
  const w = {
    spec,
    levelIndex: 0,
    lives: spec.rules.player.lives,
    score: 0,
    runStats: {},
    unlocked,
    nextUid: 1,
  } as unknown as World
  loadLevel(w, 0)
  return w
}

export function loadLevel(w: World, index: number) {
  const spec = w.spec
  const level = spec.levels[index]
  w.levelIndex = index
  w.level = level
  w.rules = { ...spec.rules, ...(level.rules ?? {}) }
  w.ents = new Map(spec.entities.map((e) => [e.id, e]))
  w.terrain = level.cells.slice()
  w.enemies = []
  w.pickups = []
  w.spawners = []
  w.start = 0
  level.cells.forEach((id, i) => {
    const e = w.ents.get(id)
    if (!e) {
      w.terrain[i] = ''
      return
    }
    if (e.kind === 'player') {
      w.start = i
      w.terrain[i] = ''
    } else if (e.kind === 'enemy') {
      w.terrain[i] = ''
      w.enemies.push(makeEnemy(w, e, i))
    } else if (e.kind === 'pickup') {
      w.terrain[i] = ''
      w.pickups.push({ cell: i, type: e, taken: false })
    } else if (e.kind === 'spawner') {
      w.spawners.push({ cell: i, type: e, timer: e.spawner?.every ?? 5, live: 0 })
    }
  })
  const [sx, sy] = xy(w, w.start)
  const speed = Math.max(0.5, w.rules.player.speed)
  w.player = {
    cx: sx, cy: sy, fromX: sx, fromY: sy, t: 1, stepTime: 1 / speed, faceX: 0, faceY: 1,
    hp: w.rules.player.hp, invincible: 0, keys: 0, attackCd: 0, attackFlash: 0, hazardTick: 0, bumpCd: 0,
  }
  w.elapsed = 0
  w.timeLeft = w.rules.timeLimit
  w.levelStartScore = w.score
  w.levelStats = {}
  w.status = 'playing'
  w.events = []
}

function makeEnemy(w: World, e: EntityType, cell: number, from?: number): Enemy {
  const [x, y] = xy(w, cell)
  const speed = Math.max(0.2, e.stats.speed ?? 2)
  const axis = e.behavior?.axis ?? 'x'
  return {
    uid: w.nextUid++, type: e, hp: e.stats.hp ?? 1, cx: x, cy: y, fromX: x, fromY: y, t: 1,
    stepTime: 1 / speed, faceX: 0, faceY: 1, dir: axis === 'x' ? [1, 0] : [0, 1], from, flash: 0,
  }
}

// ------------------------------------------------------------------ helpers

export function xy(w: World, i: number): [number, number] {
  return [i % w.level.width, Math.floor(i / w.level.width)]
}
function idx(w: World, x: number, y: number) {
  return y * w.level.width + x
}
function inBounds(w: World, x: number, y: number) {
  return x >= 0 && y >= 0 && x < w.level.width && y < w.level.height
}
/** Current drawn position of a mover (tweened). */
export function pos(m: Mover): [number, number] {
  const k = Math.min(1, m.t)
  return [m.fromX + (m.cx - m.fromX) * k, m.fromY + (m.cy - m.fromY) * k]
}
function terrainAt(w: World, x: number, y: number): EntityType | undefined {
  return w.ents.get(w.terrain[idx(w, x, y)])
}
function bump(stats: Stats, key: string, by = 1) {
  stats[key] = (stats[key] ?? 0) + by
}
function stat(w: World, key: string, by = 1) {
  bump(w.levelStats, key, by)
  bump(w.runStats, key, by)
}
function toast(w: World, text: string, tone: 'good' | 'bad' | 'gold' | 'info', at?: [number, number]) {
  if (!text) return
  w.events.push({ kind: 'toast', text, tone, x: at?.[0], y: at?.[1] })
}
function sfx(w: World, name: Extract<GameEvent, { kind: 'sfx' }>['name']) {
  w.events.push({ kind: 'sfx', name })
}
function entityVars(e: EntityType) {
  return { name: e.name, points: e.stats.points ?? 0, heal: e.stats.heal ?? 0, time: e.stats.time ?? 0, keys: e.stats.keys ?? 0 }
}
function addScore(w: World, n: number) {
  if (!n) return
  w.score += n
  stat(w, 'score', n)
}

function walkableForPlayer(w: World, x: number, y: number): boolean {
  if (!inBounds(w, x, y)) return false
  const t = terrainAt(w, x, y)
  if (!t) return true
  if (t.kind === 'wall') return false
  if (t.kind === 'door') {
    const need = t.stats.keys ?? 1
    if (w.player.keys >= need) {
      w.player.keys -= need
      w.terrain[idx(w, x, y)] = ''
      toast(w, w.spec.text.doorOpened, 'good', [x, y])
      sfx(w, 'door')
      return true
    }
    // Holding a direction into a locked door would toast every frame.
    if (w.player.bumpCd <= 0) {
      w.player.bumpCd = 1
      toast(w, fillText(w.spec.text.doorLocked, { keys: need }), 'info', [x, y])
      sfx(w, 'bonk')
    }
    return false
  }
  return true
}

function walkableForEnemy(w: World, x: number, y: number, self: Enemy): boolean {
  if (!inBounds(w, x, y)) return false
  const t = terrainAt(w, x, y)
  if (t && (t.kind === 'wall' || t.kind === 'door' || t.kind === 'goal')) return false
  return !w.enemies.some((o) => o !== self && o.cx === x && o.cy === y)
}

// ------------------------------------------------------------------ step

export function step(w: World, dt: number, input: Input) {
  w.events = []
  if (w.status !== 'playing') return
  w.elapsed += dt
  stat(w, 'time', dt)
  const p = w.player
  p.invincible = Math.max(0, p.invincible - dt)
  p.attackCd = Math.max(0, p.attackCd - dt)
  p.attackFlash = Math.max(0, p.attackFlash - dt)
  p.bumpCd = Math.max(0, p.bumpCd - dt)

  // --- player movement: finish the current step, then take the next one ---
  if (p.t < 1) {
    p.t += dt / p.stepTime
    if (p.t >= 1) {
      p.t = 1
      arrive(w)
    }
  }
  if (p.t >= 1 && w.status === 'playing') {
    const dir = input.queued.shift() ?? input.held
    if (dir) {
      const [dx, dy] = DELTA[dir]
      p.faceX = dx
      p.faceY = dy
      if (walkableForPlayer(w, p.cx + dx, p.cy + dy)) {
        p.fromX = p.cx
        p.fromY = p.cy
        p.cx += dx
        p.cy += dy
        p.t = 0
      }
    }
  }

  // --- attack: first enemy in the facing line, stopped by walls ---
  const atk = w.rules.player.attack
  if (input.attack && atk.enabled && p.attackCd <= 0) {
    p.attackCd = atk.cooldown
    p.attackFlash = 0.18
    stat(w, 'attacks')
    sfx(w, 'attack')
    for (let r = 1; r <= atk.range; r++) {
      const x = p.cx + p.faceX * r
      const y = p.cy + p.faceY * r
      if (!inBounds(w, x, y)) break
      const t = terrainAt(w, x, y)
      if (t && (t.kind === 'wall' || t.kind === 'door')) break
      const hit = w.enemies.find((e) => Math.round(pos(e)[0]) === x && Math.round(pos(e)[1]) === y)
      if (hit) {
        damageEnemy(w, hit, atk.damage)
        break
      }
    }
  }

  // --- hazards: damage on standing, once per second ---
  const here = terrainAt(w, p.cx, p.cy)
  if (here?.kind === 'hazard' && p.t >= 1) {
    p.hazardTick -= dt
    if (p.hazardTick <= 0) {
      p.hazardTick = 1
      hurtPlayer(w, here.stats.damage ?? 1, here.flavor.onTouch)
    }
  } else {
    p.hazardTick = 0
  }

  // --- enemies ---
  for (const e of w.enemies) {
    e.flash = Math.max(0, e.flash - dt)
    if (e.t < 1) {
      e.t = Math.min(1, e.t + dt / e.stepTime)
      continue
    }
    const next = chooseStep(w, e)
    if (next) {
      e.fromX = e.cx
      e.fromY = e.cy
      e.cx += next[0]
      e.cy += next[1]
      e.faceX = next[0]
      e.faceY = next[1]
      e.t = 0
    }
  }

  // --- contact damage ---
  if (p.invincible <= 0 && w.status === 'playing') {
    const [px, py] = pos(p)
    const touching = w.enemies.find((e) => {
      const [ex, ey] = pos(e)
      return Math.abs(ex - px) < 0.6 && Math.abs(ey - py) < 0.6
    })
    if (touching) hurtPlayer(w, touching.type.stats.damage ?? 1, w.spec.text.hit)
  }

  // --- spawners ---
  for (const s of w.spawners) {
    const cfg = s.type.spawner
    const kind = cfg && w.ents.get(cfg.spawns)
    if (!cfg || !kind || kind.kind !== 'enemy') continue
    s.live = w.enemies.filter((e) => e.from === s.cell).length
    s.timer -= dt
    if (s.timer <= 0) {
      s.timer = Math.max(0.5, cfg.every)
      const [x, y] = xy(w, s.cell)
      const blocked = w.enemies.some((e) => e.cx === x && e.cy === y) || (p.cx === x && p.cy === y)
      if (s.live < cfg.max && !blocked) w.enemies.push(makeEnemy(w, kind, s.cell, s.cell))
    }
  }

  // --- clock ---
  if (w.rules.timeLimit > 0 && w.status === 'playing') {
    w.timeLeft -= dt
    if (w.timeLeft <= 0) {
      w.timeLeft = 0
      toast(w, w.spec.text.timeUp, 'bad')
      loseLife(w)
    }
  }

  if (w.status === 'playing' && isWon(w)) clearLevel(w)
  checkAchievements(w, false)
}

/** Resolve whatever is on the cell the player just stepped onto. */
function arrive(w: World) {
  const p = w.player
  const cell = idx(w, p.cx, p.cy)
  const pickup = w.pickups.find((k) => !k.taken && k.cell === cell)
  if (pickup) {
    pickup.taken = true
    const s = pickup.type.stats
    addScore(w, s.points ?? 0)
    if (s.heal) p.hp = Math.min(w.rules.player.hp, p.hp + s.heal)
    if (s.time && w.rules.timeLimit > 0) w.timeLeft += s.time
    if (s.keys) p.keys += s.keys
    stat(w, 'collected')
    stat(w, `collected:${pickup.type.id}`)
    toast(w, fillText(pickup.type.flavor.onTouch ?? '', entityVars(pickup.type)), 'gold', [p.cx, p.cy])
    sfx(w, 'coin')
  }
  const t = terrainAt(w, p.cx, p.cy)
  if (t?.kind === 'goal' && t.flavor.onTouch && !goalCounts(w)) toast(w, t.flavor.onTouch, 'info', [p.cx, p.cy])
  if (t?.kind === 'hazard') p.hazardTick = 0
}

function goalCounts(w: World) {
  return w.rules.win.some((c) => c.type === 'reachGoal')
}

function damageEnemy(w: World, e: Enemy, dmg: number) {
  e.hp -= dmg
  e.flash = 0.2
  if (e.hp > 0) {
    sfx(w, 'hit')
    return
  }
  w.enemies = w.enemies.filter((o) => o !== e)
  addScore(w, e.type.stats.points ?? 0)
  stat(w, 'defeated')
  stat(w, `defeated:${e.type.id}`)
  toast(w, fillText(e.type.flavor.onDefeat ?? '', entityVars(e.type)), 'gold', [e.cx, e.cy])
  sfx(w, 'defeat')
}

function hurtPlayer(w: World, dmg: number, text?: string) {
  const p = w.player
  if (p.invincible > 0 || w.status !== 'playing') return
  p.hp -= dmg
  p.invincible = w.rules.player.invincible
  stat(w, 'hits')
  stat(w, 'damageTaken', dmg)
  toast(w, text ?? '', 'bad', [p.cx, p.cy])
  sfx(w, 'hit')
  if (p.hp <= 0) loseLife(w)
}

function loseLife(w: World) {
  w.lives -= 1
  stat(w, 'deaths')
  sfx(w, 'death')
  if (w.lives <= 0) {
    w.lives = 0
    w.status = 'gameOver'
    checkAchievements(w, true)
    return
  }
  toast(w, w.spec.text.lifeLost, 'bad')
  w.status = 'lifeLost'
}

/** Called by the UI after the life-lost beat. */
export function continueAfterDeath(w: World) {
  if (w.status !== 'lifeLost') return
  if (w.rules.onDeath === 'restart') {
    const runStats = w.runStats
    w.score = w.levelStartScore
    loadLevel(w, w.levelIndex)
    w.runStats = runStats
    return
  }
  const [sx, sy] = xy(w, w.start)
  Object.assign(w.player, { cx: sx, cy: sy, fromX: sx, fromY: sy, t: 1, hp: w.rules.player.hp, invincible: w.rules.player.invincible })
  if (w.rules.timeLimit > 0 && w.timeLeft <= 0) w.timeLeft = w.rules.timeLimit
  w.status = 'playing'
}

function clearLevel(w: World) {
  stat(w, 'levelsCleared')
  sfx(w, 'clear')
  toast(w, w.spec.text.levelClear, 'good')
  checkAchievements(w, true)
  w.status = w.levelIndex >= w.spec.levels.length - 1 ? 'won' : 'cleared'
}

/** Called by the UI after the level-clear card. */
export function nextLevel(w: World) {
  if (w.status === 'cleared') loadLevel(w, w.levelIndex + 1)
}

// ------------------------------------------------------------------ win rules

function condMet(w: World, c: WinCondition): boolean {
  switch (c.type) {
    case 'reachGoal':
      return w.player.t >= 1 && terrainAt(w, w.player.cx, w.player.cy)?.kind === 'goal'
    case 'collectAll': {
      const targets = w.pickups.filter((k) => !c.entity || k.type.id === c.entity)
      return targets.length > 0 && targets.every((k) => k.taken)
    }
    case 'defeatAll':
      return !w.enemies.some((e) => !c.entity || e.type.id === c.entity)
    case 'surviveTime':
      return w.elapsed >= c.seconds
    case 'score':
      return w.score >= c.value
  }
}

export function isWon(w: World): boolean {
  const conds = w.rules.win
  if (!conds.length) return false
  return w.rules.winMode === 'all' ? conds.every((c) => condMet(w, c)) : conds.some((c) => condMet(w, c))
}

/** 0..1 progress toward the first win condition, for a HUD meter. */
export function winProgress(w: World): { label: string; value: number } {
  const c = w.rules.win[0]
  if (!c) return { label: '', value: 0 }
  if (c.type === 'collectAll') {
    const t = w.pickups.filter((k) => !c.entity || k.type.id === c.entity)
    return { label: `${t.filter((k) => k.taken).length}/${t.length}`, value: t.length ? t.filter((k) => k.taken).length / t.length : 0 }
  }
  if (c.type === 'surviveTime') return { label: `${Math.floor(w.elapsed)}/${c.seconds}s`, value: Math.min(1, w.elapsed / c.seconds) }
  if (c.type === 'score') return { label: `${w.score}/${c.value}`, value: Math.min(1, w.score / c.value) }
  if (c.type === 'defeatAll') {
    return { label: `${w.enemies.filter((e) => !c.entity || e.type.id === c.entity).length} left`, value: 0 }
  }
  return { label: '', value: 0 }
}

// ------------------------------------------------------------------ AI

function chooseStep(w: World, e: Enemy): [number, number] | null {
  const b = e.type.behavior?.type ?? 'static'
  if (b === 'static') return null
  const p = w.player
  const dist = Math.abs(e.cx - p.cx) + Math.abs(e.cy - p.cy)
  const sight = e.type.behavior?.sight ?? 0
  const sees = sight <= 0 || dist <= sight
  if (b === 'patrol') {
    if (walkableForEnemy(w, e.cx + e.dir[0], e.cy + e.dir[1], e)) return e.dir
    e.dir = [-e.dir[0], -e.dir[1]] as [number, number]
    return walkableForEnemy(w, e.cx + e.dir[0], e.cy + e.dir[1], e) ? e.dir : null
  }
  if (b === 'chase' && sees) {
    const stepTo = pathStep(w, e, p.cx, p.cy)
    if (stepTo) return stepTo
  }
  if (b === 'flee' && sees) {
    const options = neighbours(w, e).sort(
      (a, c) => Math.abs(e.cx + c[0] - p.cx) + Math.abs(e.cy + c[1] - p.cy) - (Math.abs(e.cx + a[0] - p.cx) + Math.abs(e.cy + a[1] - p.cy)),
    )
    if (options.length) return options[0]
  }
  // wander (and chase/flee without sight): keep going, turn at walls or randomly
  const opts = neighbours(w, e)
  if (!opts.length) return null
  const straight = opts.find((d) => d[0] === e.dir[0] && d[1] === e.dir[1])
  if (straight && Math.random() < 0.75) return straight
  const pick = opts[Math.floor(Math.random() * opts.length)]
  e.dir = pick
  return pick
}

function neighbours(w: World, e: Enemy): [number, number][] {
  return ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]).filter(([dx, dy]) => walkableForEnemy(w, e.cx + dx, e.cy + dy, e))
}

/** First step of a BFS shortest path from the enemy to (tx, ty); cheap on ≤64×64. */
function pathStep(w: World, e: Enemy, tx: number, ty: number): [number, number] | null {
  const W = w.level.width
  const start = idx(w, e.cx, e.cy)
  const goal = idx(w, tx, ty)
  const prev = new Map<number, number>([[start, -1]])
  const q = [start]
  while (q.length) {
    const i = q.shift()!
    if (i === goal) break
    const x = i % W
    const y = Math.floor(i / W)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      const n = idx(w, nx, ny)
      if (prev.has(n) || !inBounds(w, nx, ny)) continue
      // the player's own cell is the target, so it is always enterable
      if (n !== goal && !walkableForEnemy(w, nx, ny, e)) continue
      prev.set(n, i)
      q.push(n)
    }
  }
  if (!prev.has(goal)) return null
  let cur = goal
  while (prev.get(cur) !== start && prev.get(cur) !== -1) cur = prev.get(cur)!
  if (cur === start) return null
  const [cx, cy] = xy(w, cur)
  if (!walkableForEnemy(w, cx, cy, e) && cur !== goal) return null
  return [cx - e.cx, cy - e.cy]
}

// ------------------------------------------------------------------ achievements

function statValue(w: World, a: Achievement): number {
  const bag = a.condition.scope === 'level' ? w.levelStats : w.runStats
  if (a.condition.stat === 'score') return a.condition.scope === 'level' ? w.score - w.levelStartScore : w.score
  return bag[a.condition.stat] ?? 0
}

export function checkAchievements(w: World, ending: boolean) {
  for (const a of w.spec.achievements) {
    if (w.unlocked.has(a.id)) continue
    if (a.onlyOnClear && !ending) continue
    // "on clear" achievements only count when the level was actually won
    if (a.onlyOnClear && !(w.status === 'playing' || w.status === 'cleared' || w.status === 'won')) continue
    const v = statValue(w, a)
    const { op, value } = a.condition
    const ok = op === '>=' ? v >= value : op === '<=' ? v <= value : Math.abs(v - value) < 1e-9
    // '<=' / '==' conditions on counters are trivially true at t=0: only award them on clear
    if (ok && (op === '>=' || ending)) {
      w.unlocked.add(a.id)
      w.events.push({ kind: 'achievement', achievement: a })
      toast(w, fillText(w.spec.text.achievementUnlocked, { achievement: a.title }), 'gold')
      sfx(w, 'achievement')
    }
  }
}

/** Values for {tokens} in screens and text. */
export function textVars(w: World, best: number): Record<string, string | number> {
  const collected = w.pickups.filter((k) => k.taken).length
  return {
    title: w.spec.meta.title,
    subtitle: w.spec.meta.subtitle,
    score: w.score,
    best: Math.max(best, w.score),
    level: w.levelIndex + 1,
    levelName: w.level.name,
    levels: w.spec.levels.length,
    time: Math.floor(w.elapsed),
    lives: w.lives,
    hp: w.player.hp,
    collected,
    total: w.pickups.length,
    defeated: w.levelStats.defeated ?? 0,
  }
}
