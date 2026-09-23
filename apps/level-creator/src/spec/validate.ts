/**
 * Static checks the editor shows live, and `npm run check` asserts headlessly.
 * The reachability test is labyrinth-larry's "prove every level is finishable"
 * idea: BFS from the player over walkable cells (doors count as passable only if
 * enough keys exist in the level).
 */
import type { EntityType, GameSpec, Level, WinCondition } from './schema.ts'

export interface Issue {
  level: 'error' | 'warning'
  message: string
  /** Level index the issue belongs to, if any. */
  levelIndex?: number
}

export function entityMap(spec: GameSpec): Map<string, EntityType> {
  return new Map(spec.entities.map((e) => [e.id, e]))
}

export function levelRules(spec: GameSpec, level: Level) {
  return { ...spec.rules, ...(level.rules ?? {}) }
}

const blocks = (e: EntityType | undefined) => !!e && e.kind === 'wall'

/** Cells reachable from the player start. Doors are passable when the level holds enough keys. */
export function reachable(spec: GameSpec, level: Level): { start: number; seen: Set<number> } | null {
  const ents = entityMap(spec)
  const start = level.cells.findIndex((id) => ents.get(id)?.kind === 'player')
  if (start < 0) return null
  const totalKeys = level.cells.reduce((n, id) => n + (ents.get(id)?.kind === 'pickup' ? ents.get(id)?.stats.keys ?? 0 : 0), 0)
  const seen = new Set<number>([start])
  const queue = [start]
  const { width: w, height: h } = level
  while (queue.length) {
    const i = queue.shift()!
    const x = i % w
    const y = Math.floor(i / w)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const n = ny * w + nx
      if (seen.has(n)) continue
      const e = ents.get(level.cells[n])
      if (blocks(e)) continue
      if (e?.kind === 'door' && (e.stats.keys ?? 1) > totalKeys) continue
      seen.add(n)
      queue.push(n)
    }
  }
  return { start, seen }
}

function describeWin(c: WinCondition) {
  return c.type
}

export function validateSpec(spec: GameSpec): Issue[] {
  const issues: Issue[] = []
  const ents = entityMap(spec)
  const ids = new Set<string>()
  const glyphs = new Map<string, string>()
  for (const e of spec.entities) {
    if (ids.has(e.id)) issues.push({ level: 'error', message: `Duplicate entity id "${e.id}"` })
    ids.add(e.id)
    if (glyphs.has(e.glyph)) issues.push({ level: 'warning', message: `Glyph "${e.glyph}" used by both ${glyphs.get(e.glyph)} and ${e.name} (ASCII export is ambiguous)` })
    glyphs.set(e.glyph, e.name)
    if (e.kind === 'spawner' && (!e.spawner || !ents.has(e.spawner.spawns))) {
      issues.push({ level: 'error', message: `Spawner "${e.name}" spawns an unknown entity` })
    }
  }
  if (!spec.levels.length) issues.push({ level: 'error', message: 'The game has no levels' })

  spec.levels.forEach((level, li) => {
    const tag = `${level.name}:`
    const counts = new Map<string, number>()
    level.cells.forEach((id) => {
      if (!id) return
      if (!ents.has(id)) return
      const kind = ents.get(id)!.kind
      counts.set(kind, (counts.get(kind) ?? 0) + 1)
    })
    const unknown = new Set(level.cells.filter((id) => id && !ents.has(id)))
    if (unknown.size) issues.push({ level: 'warning', levelIndex: li, message: `${tag} cells reference deleted entities (${[...unknown].join(', ')}); they play as floor` })
    const players = counts.get('player') ?? 0
    if (players === 0) issues.push({ level: 'error', levelIndex: li, message: `${tag} no player start` })
    if (players > 1) issues.push({ level: 'error', levelIndex: li, message: `${tag} ${players} player starts (need exactly one)` })

    const rules = { ...spec.rules, ...(level.rules ?? {}) }
    if (!rules.win.length) issues.push({ level: 'error', levelIndex: li, message: `${tag} no win condition` })
    const reach = reachable(spec, level)
    for (const c of rules.win) {
      if (c.type === 'reachGoal') {
        if (!counts.get('goal')) issues.push({ level: 'error', levelIndex: li, message: `${tag} win needs a goal but none is placed` })
        else if (reach && !level.cells.some((id, i) => ents.get(id)?.kind === 'goal' && reach.seen.has(i))) {
          issues.push({ level: 'error', levelIndex: li, message: `${tag} no goal is reachable from the player start` })
        }
      }
      if (c.type === 'collectAll') {
        const targets = level.cells.map((id, i) => [id, i] as const).filter(([id]) => ents.get(id)?.kind === 'pickup' && (!c.entity || id === c.entity))
        if (!targets.length) issues.push({ level: 'error', levelIndex: li, message: `${tag} collectAll but there is nothing to collect` })
        else if (reach) {
          const stuck = targets.filter(([, i]) => !reach.seen.has(i)).length
          if (stuck) issues.push({ level: 'error', levelIndex: li, message: `${tag} ${stuck} pickup(s) unreachable` })
        }
      }
      if (c.type === 'defeatAll') {
        if (!spec.rules.player.attack.enabled) issues.push({ level: 'warning', levelIndex: li, message: `${tag} defeatAll with player attack disabled` })
        const targets = level.cells.filter((id) => ents.get(id)?.kind === 'enemy' && (!c.entity || id === c.entity))
        if (!targets.length) issues.push({ level: 'error', levelIndex: li, message: `${tag} defeatAll but no enemies are placed` })
      }
      if (c.type === 'surviveTime' && rules.timeLimit > 0 && rules.timeLimit < c.seconds) {
        issues.push({ level: 'error', levelIndex: li, message: `${tag} must survive ${c.seconds}s but the clock is only ${rules.timeLimit}s` })
      }
    }
    if (rules.win.length > 1 && rules.winMode === 'all') {
      const types = rules.win.map(describeWin)
      if (new Set(types).size !== types.length) issues.push({ level: 'warning', levelIndex: li, message: `${tag} duplicate win conditions` })
    }
  })

  for (const a of spec.achievements) {
    if (!a.title.trim()) issues.push({ level: 'warning', message: `Achievement ${a.id} has no title` })
  }
  return issues
}
