/**
 * GameSpec — the one JSON document the level creator edits and the runtime
 * plays. Everything a designer can change lives here as plain data: no code,
 * no functions, no class instances, so it round-trips through JSON, localStorage
 * and git diffs unchanged.
 *
 * v1 (this file): a grid-based, top-down game model generic enough to express
 * mazes, arenas, collect-a-thons, dodgers and simple shooters:
 *   meta · theme · entity palette · levels (one painted grid each) · rules
 *   (win/lose/player) · achievements · screens (title/intro/pause/over/win) ·
 *   flavor text for every string the runtime shows.
 *
 * v2 (see docs/17-level-creator.md): `game.template` selects a per-game adapter
 * (lane-runner, vertical-scroller, marble-grid, word-grid, arcade-car…) with its
 * own `template`-specific fields, so the same editor can author custom levels
 * for every existing game. Keep additions backwards compatible: bump
 * SPEC_VERSION and add a migration in `migrate()`.
 */

export const SPEC_SCHEMA = 'mtd-game-spec'
export const SPEC_VERSION = 1

// ------------------------------------------------------------------ entities

/** What an entity *is* decides how the runtime treats it. */
export type EntityKind =
  | 'floor' // walkable terrain (the empty cell is also floor)
  | 'wall' // blocks movement
  | 'player' // exactly one per level; where the player starts
  | 'enemy' // moves by its behaviour; hurts on contact; can be defeated
  | 'pickup' // collected on touch: points / heal / time / key
  | 'hazard' // terrain that hurts while stood on (lava, spikes)
  | 'goal' // exit; reaching it can win the level
  | 'door' // wall that opens when the player holds enough keys
  | 'spawner' // emits another entity type on a timer
  | 'decor' // purely visual, walkable

export type Shape = 'square' | 'circle' | 'diamond' | 'triangle' | 'star' | 'heart'

export type BehaviorType = 'static' | 'patrol' | 'wander' | 'chase' | 'flee'

export interface Behavior {
  type: BehaviorType
  /** Patrol axis. */
  axis?: 'x' | 'y'
  /** Chase/flee only act within this many cells of the player (0 = unlimited). */
  sight?: number
}

export interface EntityStats {
  /** Hits to defeat (enemies). */
  hp?: number
  /** Damage dealt on contact (enemies, hazards: per second while standing). */
  damage?: number
  /** Points on collect / defeat. */
  points?: number
  /** Cells per second (enemies). */
  speed?: number
  /** HP restored on collect (pickups). */
  heal?: number
  /** Seconds added to the level clock on collect (pickups). */
  time?: number
  /** Keys granted on collect (pickups) / keys needed to open (doors). */
  keys?: number
}

export interface SpawnerConfig {
  /** Entity type id to emit. */
  spawns: string
  /** Seconds between spawns. */
  every: number
  /** Max live spawned entities from this spawner. */
  max: number
}

/** Custom text attached to an entity. Tokens: {name} {points} {heal} {time}. */
export interface EntityFlavor {
  description?: string
  /** Toast when the player touches / collects it. */
  onTouch?: string
  /** Toast when it is defeated. */
  onDefeat?: string
}

export interface EntityType {
  id: string
  name: string
  kind: EntityKind
  /** One character used in ASCII import/export and drawn on the tile. */
  glyph: string
  color: string
  shape: Shape
  behavior?: Behavior
  stats: EntityStats
  spawner?: SpawnerConfig
  flavor: EntityFlavor
}

// ------------------------------------------------------------------ rules

export type WinCondition =
  | { type: 'reachGoal' }
  | { type: 'collectAll'; entity?: string } // every pickup (or every pickup of one type)
  | { type: 'defeatAll'; entity?: string } // every enemy (or every enemy of one type)
  | { type: 'surviveTime'; seconds: number }
  | { type: 'score'; value: number }

export interface Rules {
  /** Level is won when ANY (mode 'any') or ALL (mode 'all') conditions hold. */
  win: WinCondition[]
  winMode: 'any' | 'all'
  player: {
    hp: number
    lives: number
    /** Cells per second while a direction is held. */
    speed: number
    /** Seconds of invincibility after a hit. */
    invincible: number
    attack: { enabled: boolean; range: number; cooldown: number; damage: number }
  }
  /** Level clock in seconds; 0 = untimed. Running out loses a life. */
  timeLimit: number
  /** On losing a life: 'restart' the level, or 'respawn' at the start cell keeping progress. */
  onDeath: 'restart' | 'respawn'
}

// ------------------------------------------------------------------ achievements

/** Stats the runtime counts. `collected:<id>` / `defeated:<id>` count one type. */
export type StatKey =
  | 'score'
  | 'collected'
  | 'defeated'
  | 'damageTaken'
  | 'hits'
  | 'attacks'
  | 'time'
  | 'levelsCleared'
  | 'deaths'
  | `collected:${string}`
  | `defeated:${string}`

export interface Achievement {
  id: string
  title: string
  description: string
  condition: { stat: StatKey; op: '>=' | '<=' | '=='; value: number; scope: 'level' | 'run' }
  /** Only checked when the level/run ends (e.g. "finish without taking damage"). */
  onlyOnClear?: boolean
}

// ------------------------------------------------------------------ screens & text

export interface ScreenText {
  heading: string
  body: string
  button: string
}

/**
 * Every string the runtime shows. Tokens in braces are filled at runtime:
 * {score} {best} {level} {levelName} {time} {lives} {hp} {collected} {total}
 * {defeated} {name} {points} {heal} {achievement}.
 */
export interface TextTable {
  hudScore: string
  hudHp: string
  hudTime: string
  hudLives: string
  hudKeys: string
  hit: string
  lifeLost: string
  levelClear: string
  achievementUnlocked: string
  timeUp: string
  doorLocked: string
  doorOpened: string
}

export interface Screens {
  title: ScreenText
  levelIntro: ScreenText
  pause: ScreenText
  levelClear: ScreenText
  gameOver: ScreenText
  win: ScreenText
}

// ------------------------------------------------------------------ levels

export interface Level {
  id: string
  name: string
  /** Shown on the level intro card ({levelName} and {level} also available). */
  intro: string
  width: number
  height: number
  /**
   * Row-major grid of entity type ids, '' = empty floor. Exactly one layer in
   * v1: actors (player/enemy/pickup/spawner) are painted onto cells too and
   * lifted off the grid when the level starts.
   */
  cells: string[]
  /** Per-level rule overrides (merged over GameSpec.rules). */
  rules?: Partial<Pick<Rules, 'timeLimit' | 'win' | 'winMode'>>
}

// ------------------------------------------------------------------ spec

export interface Theme {
  background: string
  floor: string
  grid: string
  ink: string
  panel: string
  accent: string
}

export interface GameSpec {
  schema: typeof SPEC_SCHEMA
  version: number
  /** v2 hook: which runtime adapter plays this spec. v1 only has 'grid'. */
  template: 'grid'
  meta: { title: string; subtitle: string; author: string; description: string }
  theme: Theme
  entities: EntityType[]
  levels: Level[]
  rules: Rules
  achievements: Achievement[]
  screens: Screens
  text: TextTable
}

// ------------------------------------------------------------------ defaults

export const DEFAULT_THEME: Theme = {
  background: '#b9a3e8',
  floor: '#dccbf7',
  grid: '#c9b6ef',
  ink: '#3b2e5a',
  panel: '#fffdf8',
  accent: '#e8792a',
}

export const DEFAULT_RULES: Rules = {
  win: [{ type: 'reachGoal' }],
  winMode: 'any',
  player: { hp: 3, lives: 3, speed: 6, invincible: 1, attack: { enabled: false, range: 3, cooldown: 0.4, damage: 1 } },
  timeLimit: 0,
  onDeath: 'respawn',
}

export const DEFAULT_SCREENS: Screens = {
  title: { heading: '{title}', body: '{subtitle}', button: 'Play' },
  levelIntro: { heading: 'Level {level}', body: '{levelName}', button: 'Go' },
  pause: { heading: 'Paused', body: '', button: 'Resume' },
  levelClear: { heading: 'Cleared!', body: 'Score {score} · {time}s', button: 'Next level' },
  gameOver: { heading: 'Game over', body: 'Score {score} · Best {best}', button: 'Try again' },
  win: { heading: 'You win!', body: 'Final score {score}', button: 'Play again' },
}

export const DEFAULT_TEXT: TextTable = {
  hudScore: 'Score',
  hudHp: 'HP',
  hudTime: 'Time',
  hudLives: 'Lives',
  hudKeys: 'Keys',
  hit: 'Ouch!',
  lifeLost: 'Life lost',
  levelClear: 'Level clear!',
  achievementUnlocked: 'Achievement: {achievement}',
  timeUp: "Time's up!",
  doorLocked: 'Locked — need {keys} key(s)',
  doorOpened: 'Door opened',
}

/** The starter palette every new spec gets; designers add/rename freely. */
export function defaultEntities(): EntityType[] {
  return [
    { id: 'wall', name: 'Wall', kind: 'wall', glyph: '#', color: '#6e5ac8', shape: 'square', stats: {}, flavor: {} },
    { id: 'player', name: 'Hero', kind: 'player', glyph: '@', color: '#fffdf8', shape: 'circle', stats: {}, flavor: { description: 'That is you.' } },
    { id: 'goal', name: 'Exit', kind: 'goal', glyph: 'P', color: '#3ddc84', shape: 'star', stats: {}, flavor: { onTouch: 'Made it!' } },
    { id: 'coin', name: 'Coin', kind: 'pickup', glyph: 'c', color: '#ffc53a', shape: 'circle', stats: { points: 10 }, flavor: { onTouch: '+{points}' } },
    { id: 'heart', name: 'Heart', kind: 'pickup', glyph: 'h', color: '#ff9fbd', shape: 'heart', stats: { heal: 1 }, flavor: { onTouch: '+{heal} HP' } },
    { id: 'clock', name: 'Clock', kind: 'pickup', glyph: 't', color: '#8fc8ff', shape: 'diamond', stats: { time: 5 }, flavor: { onTouch: '+{time}s' } },
    { id: 'key', name: 'Key', kind: 'pickup', glyph: 'k', color: '#ffd45e', shape: 'triangle', stats: { keys: 1 }, flavor: { onTouch: 'Got a key' } },
    { id: 'door', name: 'Door', kind: 'door', glyph: 'D', color: '#b07a5e', shape: 'square', stats: { keys: 1 }, flavor: {} },
    { id: 'spikes', name: 'Spikes', kind: 'hazard', glyph: 'S', color: '#ee4b5e', shape: 'triangle', stats: { damage: 1 }, flavor: { onTouch: 'Spikes!' } },
    { id: 'guard', name: 'Guard', kind: 'enemy', glyph: 'g', color: '#3a4572', shape: 'circle', behavior: { type: 'patrol', axis: 'x' }, stats: { hp: 1, damage: 1, points: 50, speed: 2 }, flavor: { onDefeat: 'Guard down! +{points}' } },
    { id: 'hunter', name: 'Hunter', kind: 'enemy', glyph: 'H', color: '#ee4b5e', shape: 'diamond', behavior: { type: 'chase', sight: 6 }, stats: { hp: 2, damage: 1, points: 100, speed: 2.5 }, flavor: { onDefeat: 'Hunter defeated! +{points}' } },
    { id: 'nest', name: 'Nest', kind: 'spawner', glyph: 'N', color: '#a58cf2', shape: 'star', stats: {}, spawner: { spawns: 'guard', every: 6, max: 2 }, flavor: {} },
  ]
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export function emptyLevel(name = 'Level 1', width = 16, height = 12): Level {
  return { id: uid('lvl'), name, intro: '', width, height, cells: new Array(width * height).fill('') }
}

export function blankSpec(): GameSpec {
  const level = emptyLevel()
  // A bordered room with a player and an exit so "Play" works immediately.
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (x === 0 || y === 0 || x === level.width - 1 || y === level.height - 1) level.cells[y * level.width + x] = 'wall'
    }
  }
  level.cells[2 * level.width + 2] = 'player'
  level.cells[(level.height - 3) * level.width + level.width - 3] = 'goal'
  return {
    schema: SPEC_SCHEMA,
    version: SPEC_VERSION,
    template: 'grid',
    meta: { title: 'Untitled Game', subtitle: 'Reach the exit.', author: '', description: '' },
    theme: { ...DEFAULT_THEME },
    entities: defaultEntities(),
    levels: [level],
    rules: structuredClone(DEFAULT_RULES),
    achievements: [],
    screens: structuredClone(DEFAULT_SCREENS),
    text: { ...DEFAULT_TEXT },
  }
}

// ------------------------------------------------------------------ load / migrate

/**
 * Accept anything JSON-shaped and return a complete, current-version spec.
 * Missing sections fall back to defaults so older or hand-written files load.
 * Throws only when the input is clearly not a GameSpec.
 */
export function migrate(input: unknown): GameSpec {
  if (!input || typeof input !== 'object') throw new Error('Not a game spec: expected an object')
  const raw = input as Partial<GameSpec> & Record<string, unknown>
  if (raw.schema !== undefined && raw.schema !== SPEC_SCHEMA) throw new Error(`Unknown schema "${String(raw.schema)}"`)
  if (typeof raw.version === 'number' && raw.version > SPEC_VERSION) {
    throw new Error(`Spec version ${raw.version} is newer than this editor (${SPEC_VERSION})`)
  }
  const base = blankSpec()
  const levels = Array.isArray(raw.levels) && raw.levels.length ? raw.levels.map(normalizeLevel) : base.levels
  return {
    schema: SPEC_SCHEMA,
    version: SPEC_VERSION,
    template: 'grid',
    meta: { ...base.meta, ...(raw.meta ?? {}) },
    theme: { ...base.theme, ...(raw.theme ?? {}) },
    entities: Array.isArray(raw.entities) && raw.entities.length ? raw.entities.map(normalizeEntity) : base.entities,
    levels,
    rules: {
      ...base.rules,
      ...(raw.rules ?? {}),
      player: {
        ...base.rules.player,
        ...(raw.rules?.player ?? {}),
        attack: { ...base.rules.player.attack, ...(raw.rules?.player?.attack ?? {}) },
      },
    },
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    screens: Object.fromEntries(
      (Object.keys(base.screens) as (keyof Screens)[]).map((k) => [k, { ...base.screens[k], ...(raw.screens?.[k] ?? {}) }]),
    ) as unknown as Screens,
    text: { ...base.text, ...(raw.text ?? {}) },
  }
}

function normalizeEntity(e: Partial<EntityType>): EntityType {
  return {
    id: String(e.id ?? uid('ent')),
    name: String(e.name ?? e.id ?? 'Entity'),
    kind: (e.kind ?? 'decor') as EntityKind,
    glyph: String(e.glyph ?? '?').slice(0, 1) || '?',
    color: String(e.color ?? '#888888'),
    shape: (e.shape ?? 'square') as Shape,
    behavior: e.behavior,
    stats: { ...(e.stats ?? {}) },
    spawner: e.spawner,
    flavor: { ...(e.flavor ?? {}) },
  }
}

function normalizeLevel(l: Partial<Level>): Level {
  const width = Math.max(4, Math.min(64, Number(l.width) || 16))
  const height = Math.max(4, Math.min(64, Number(l.height) || 12))
  const cells = new Array(width * height).fill('')
  if (Array.isArray(l.cells)) l.cells.slice(0, width * height).forEach((c, i) => (cells[i] = String(c ?? '')))
  return { id: String(l.id ?? uid('lvl')), name: String(l.name ?? 'Level'), intro: String(l.intro ?? ''), width, height, cells, rules: l.rules }
}

/** Fill {tokens} from a bag of values; unknown tokens are left as-is. */
export function fillText(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] === undefined ? m : String(vars[k])))
}
