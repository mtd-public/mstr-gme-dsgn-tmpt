/**
 * Headless balance/regression check — runs the real physics with no browser.
 *   npm run sim        (node ≥ 22.6: uses --experimental-strip-types)
 *
 * The older games verified tuning this way ("verified headlessly: level-ups
 * land exactly on 500m multiples", labyrinth-larry's autopilot proving every
 * course is finishable). Add an assertion here whenever you tune TUNING.
 */
import { autopilot, createWorld, PLAYER_Y, score, SPAWN_AHEAD, step, TUNING } from '../src/game/physics.ts'

const DT = 1 / 60
let failures = 0
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)
  if (!ok) failures++
}

// 1. An idle player dies — the game has teeth — but not instantly.
let w = createWorld()
let t = 0
while (!w.over && t < 600) {
  step(w, DT)
  t += DT
}
check(w.over && t > 15, `idle player dies after ${t.toFixed(1)}s (level ${w.level}, score ${score(w)})`)

// 2. Level-ups land on levelDistance multiples, none skipped.
w = createWorld()
let levelUps = 0
for (let i = 0; i < 60 * 120 && !w.over; i++) {
  autopilot(w)
  step(w, DT)
  if (w.fx.levelUp) {
    levelUps++
    const expected = Math.floor(w.dist / TUNING.levelDistance) + 1
    if (expected !== w.level) failures++
  }
}
check(levelUps === w.level - 1, `level-ups counted ${levelUps}, level ${w.level}`)

// 3. Every spawned hazard row leaves at least one lane open.
w = createWorld()
let fullyBlocked = 0
for (let i = 0; i < 60 * 300; i++) {
  autopilot(w)
  step(w, DT)
  const spawnY = PLAYER_Y - SPAWN_AHEAD
  const lanes = new Set(w.things.filter((x) => x.kind === 'hazard' && Math.abs(x.y - spawnY) < 30).map((x) => x.lane))
  if (lanes.size === 3) fullyBlocked++
}
check(fullyBlocked === 0, `rows with all 3 lanes blocked: ${fullyBlocked}`)

process.exit(failures ? 1 : 0)
