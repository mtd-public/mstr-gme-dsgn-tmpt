/**
 * Headless regression check for the level creator (no browser):
 *   npm run check        (node ≥ 22.6, --experimental-strip-types)
 *
 * For every preset:
 *   1. JSON round-trip through migrate() is lossless
 *   2. validateSpec() reports no errors
 *   3. ASCII export → import reproduces every level's cells
 *   4. an autopilot drives the REAL runtime (enemies harmless) through every
 *      level to the win screen — labyrinth-larry's "prove it's finishable"
 *   5. a 30 s chaos run with enemies live never throws
 */
import { asciiToCells, levelToAscii } from '../src/spec/ascii.ts'
import { PRESETS } from '../src/spec/presets.ts'
import { migrate, type GameSpec } from '../src/spec/schema.ts'
import { validateSpec } from '../src/spec/validate.ts'
import { continueAfterDeath, createRun, nextLevel, step, type Dir, type World } from '../src/engine/runtime.ts'

let failures = 0
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)
  if (!ok) failures++
}

const DT = 1 / 60
const DIRS: [Dir, number, number][] = [['right', 1, 0], ['left', -1, 0], ['down', 0, 1], ['up', 0, -1]]

/** Next direction along a BFS path from the player to the nearest target cell. */
function autopilotDir(w: World): Dir | null {
  const W = w.level.width
  const H = w.level.height
  const targets = new Set<number>()
  for (const k of w.pickups) if (!k.taken) targets.add(k.cell)
  const doors = w.terrain.map((id, i) => [id, i] as const).filter(([id]) => w.ents.get(id)?.kind === 'door')
  if (w.player.keys > 0) doors.forEach(([, i]) => targets.add(i))
  const goalWanted = w.rules.win.some((c) => c.type === 'reachGoal')
  const allTaken = w.pickups.every((k) => k.taken)
  if (goalWanted && (allTaken || w.rules.win.every((c) => c.type === 'reachGoal'))) {
    w.terrain.forEach((id, i) => {
      if (w.ents.get(id)?.kind === 'goal') targets.add(i)
    })
  }
  const start = w.player.cy * W + w.player.cx
  const prev = new Map<number, number>([[start, -1]])
  const q = [start]
  let found = -1
  while (q.length) {
    const i = q.shift()!
    if (i !== start && targets.has(i)) {
      found = i
      break
    }
    const x = i % W
    const y = Math.floor(i / W)
    for (const [, dx, dy] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
      const n = ny * W + nx
      if (prev.has(n)) continue
      const e = w.ents.get(w.terrain[n])
      if (e?.kind === 'wall') continue
      if (e?.kind === 'door' && w.player.keys < (e.stats.keys ?? 1)) continue
      prev.set(n, i)
      q.push(n)
    }
  }
  if (found < 0) return null
  let cur = found
  while (prev.get(cur) !== start) cur = prev.get(cur)!
  const dx = (cur % W) - w.player.cx
  const dy = Math.floor(cur / W) - w.player.cy
  return DIRS.find(([, x, y]) => x === dx && y === dy)?.[0] ?? null
}

function playThrough(spec: GameSpec): { ok: boolean; why: string; t: number } {
  const w = createRun(spec)
  let t = 0
  while (t < 600) {
    w.player.invincible = 99 // prove geometry, not reflexes
    const dir = w.player.t >= 1 ? autopilotDir(w) : null
    step(w, DT, { held: dir, queued: [], attack: false })
    t += DT
    if (w.status === 'won') return { ok: true, why: '', t }
    if (w.status === 'cleared') nextLevel(w)
    if (w.status === 'lifeLost') continueAfterDeath(w)
    if (w.status === 'gameOver') return { ok: false, why: `game over on level ${w.levelIndex + 1}`, t }
  }
  return { ok: false, why: `timeout on level ${w.levelIndex + 1}`, t }
}

for (const preset of PRESETS) {
  const spec = preset.make()
  const copy = migrate(JSON.parse(JSON.stringify(spec)))
  check(JSON.stringify(copy) === JSON.stringify(spec), `${preset.id}: JSON round-trip is lossless`)

  const errors = validateSpec(spec).filter((i) => i.level === 'error')
  check(errors.length === 0, `${preset.id}: validates (${errors.map((e) => e.message).join('; ') || 'no errors'})`)

  const asciiOk = spec.levels.every((l) => {
    const back = asciiToCells(spec, levelToAscii(spec, l))
    return back.width === l.width && back.height === l.height && back.cells.join() === l.cells.join()
  })
  check(asciiOk, `${preset.id}: ASCII round-trip`)

  const run = playThrough(spec)
  check(run.ok, `${preset.id}: autopilot finishes all ${spec.levels.length} level(s)${run.ok ? ` in ${run.t.toFixed(1)}s` : ` — ${run.why}`}`)

  let threw = ''
  try {
    const w = createRun(spec)
    const dirs: Dir[] = ['up', 'down', 'left', 'right']
    for (let i = 0; i < 30 * 60; i++) {
      step(w, DT, { held: dirs[Math.floor(i / 20) % 4], queued: [], attack: i % 15 === 0 })
      if (w.status === 'lifeLost') continueAfterDeath(w)
      if (w.status === 'cleared') nextLevel(w)
      if (w.status === 'gameOver' || w.status === 'won') break
    }
  } catch (e) {
    threw = String(e)
  }
  check(!threw, `${preset.id}: 30 s chaos run with live enemies ${threw || 'ok'}`)
}

// The validator must catch the classic authoring mistakes.
const broken = PRESETS[0].make()
broken.levels[0].cells = broken.levels[0].cells.map((c) => (c === 'player' ? '' : c))
check(validateSpec(broken).some((i) => i.level === 'error' && /no player/.test(i.message)), 'validator: missing player is an error')
const walled = PRESETS[0].make()
const L = walled.levels[0]
const g = L.cells.indexOf('goal')
for (const d of [1, -1, L.width, -L.width]) L.cells[g + d] = 'wall'
check(validateSpec(walled).some((i) => /no goal is reachable/.test(i.message)), 'validator: walled-in goal is unreachable')

process.exit(failures ? 1 : 0)
