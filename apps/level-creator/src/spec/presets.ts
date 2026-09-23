/**
 * Example specs — each shows off a different slice of the schema, and each is a
 * regression fixture for `npm run check` (every preset must validate clean and
 * be finishable). Levels are written as ASCII with the default entity glyphs:
 *   # wall  @ player  P exit  c coin  h heart  t clock  k key  D door
 *   S spikes  g guard (patrol)  H hunter (chase)  N nest (spawns guards)
 */
import { asciiToCells } from './ascii.ts'
import { blankSpec, uid, type GameSpec, type Level } from './schema.ts'

function level(spec: GameSpec, name: string, intro: string, ascii: string, rules?: Level['rules']): Level {
  const { width, height, cells } = asciiToCells(spec, ascii.trim())
  return { id: uid('lvl'), name, intro, width, height, cells, rules }
}

export function dungeonDash(): GameSpec {
  const spec = blankSpec()
  spec.meta = {
    title: 'Dungeon Dash',
    subtitle: 'Keys open doors. Guards patrol. The exit glows green.',
    author: 'level-creator presets',
    description: 'Reach the exit on every floor. Space swings your sword.',
  }
  spec.rules.player.attack.enabled = true
  spec.levels = [
    level(
      spec,
      'The Cellar',
      'Grab the key, open the door.',
      `
################
#@..c..#.......#
#.####.#.####..#
#.#k...#.#..c..#
#.#.####.#.#####
#.#......#.....#
#.######.#####D#
#..c.....g...#P#
################`,
    ),
    level(
      spec,
      'Guard Hall',
      'Swing at guards before they reach you.',
      `
##################
#@....#.....c....#
#.###.#.###.####.#
#.#k#...#g....#..#
#.#.#####.###.#.##
#...g.....#c..#..#
#####.###.#.####.#
#h....#t..#...D..#
#.#####.#######..#
#..c.........g..P#
##################`,
      { timeLimit: 90 },
    ),
  ]
  spec.screens.title = { heading: 'DUNGEON DASH', body: 'Two floors down, one way out. Arrows/WASD to move, Space to swing.', button: 'Descend' }
  spec.screens.gameOver = { heading: 'Lost in the dark', body: 'You scored {score}. The dungeon keeps what it takes.', button: 'Descend again' }
  spec.screens.win = { heading: 'Daylight!', body: 'You escaped with {score} gold. Best: {best}.', button: 'Play again' }
  spec.text.hit = 'Clang!'
  spec.achievements = [
    { id: uid('ach'), title: 'Untouchable', description: 'Clear a floor without taking damage.', condition: { stat: 'damageTaken', op: '==', value: 0, scope: 'level' }, onlyOnClear: true },
    { id: uid('ach'), title: 'Guard Breaker', description: 'Defeat 3 guards in one run.', condition: { stat: 'defeated:guard', op: '>=', value: 3, scope: 'run' } },
  ]
  return spec
}

export function coinGarden(): GameSpec {
  const spec = blankSpec()
  spec.meta = {
    title: 'Coin Garden',
    subtitle: 'Collect every coin before the clock runs out.',
    author: 'level-creator presets',
    description: 'Hunters chase you when you get close. Clocks buy time.',
  }
  spec.rules.win = [{ type: 'collectAll', entity: 'coin' }]
  spec.rules.timeLimit = 40
  spec.rules.onDeath = 'restart'
  spec.levels = [
    level(
      spec,
      'Seedlings',
      'Every coin. Forty seconds.',
      `
##############
#@.c..c..c..c#
#.##.####.##.#
#c#........#c#
#.#.c.t..c.#.#
#c#........#c#
#.##.####.##.#
#c..c..H..c..#
##############`,
    ),
    level(
      spec,
      'Overgrowth',
      'Two hunters now. The nest keeps sending guards.',
      `
################
#@.c...c...c..c#
#.####.##.####.#
#c#..........#c#
#.#.c.#N.#.c.#.#
#.#...#..#...#.#
#c#.H......t.#c#
#.####.##.####.#
#c..c...H..c..c#
################`,
      { timeLimit: 60 },
    ),
  ]
  spec.screens.title = { heading: 'COIN GARDEN', body: 'The gardener is coming. Pick every coin.', button: 'Start picking' }
  spec.screens.levelClear = { heading: 'Basket full!', body: '{collected} coins in {time}s', button: 'Next plot' }
  spec.screens.gameOver = { heading: 'Weeds win', body: 'You gathered {score}. Best {best}.', button: 'Replant' }
  spec.text.timeUp = 'The sun went down!'
  spec.achievements = [
    { id: uid('ach'), title: 'Green Thumb', description: 'Collect 50 coins in one run.', condition: { stat: 'collected:coin', op: '>=', value: 50, scope: 'run' } },
    { id: uid('ach'), title: 'Speed Picker', description: 'Clear a plot in under 20 seconds.', condition: { stat: 'time', op: '<=', value: 20, scope: 'level' }, onlyOnClear: true },
  ]
  return spec
}

export function hellCircle(): GameSpec {
  const spec = blankSpec()
  spec.meta = {
    title: 'Hell Circle',
    subtitle: 'A labyrinth-larry homage: spikes, hunters, a hellmouth.',
    author: 'level-creator presets',
    description: 'Survive 30 seconds or reach the hellmouth.',
  }
  spec.theme = { background: '#120404', floor: '#2a0a06', grid: '#3a1208', ink: '#120404', panel: '#f1e3c6', accent: '#ff6a1f' }
  spec.entities = spec.entities.map((e) =>
    e.id === 'wall' ? { ...e, name: 'Bone wall', color: '#6a1c10' } : e.id === 'goal' ? { ...e, name: 'Hellmouth', color: '#ff6a1f', flavor: { onTouch: 'Down you go.' } } : e,
  )
  spec.rules.win = [{ type: 'reachGoal' }, { type: 'surviveTime', seconds: 30 }]
  spec.rules.winMode = 'any'
  spec.rules.player.hp = 4
  spec.levels = [
    level(
      spec,
      'The Threshold',
      'Mind the spikes, Larry.',
      `
################
#@..S.....S....#
#.#####.######.#
#..S..#....H.#.#
#.###.#.####.#.#
#...#...#..S.#.#
###.#####.####.#
#h..S.......S.P#
################`,
    ),
  ]
  spec.screens.title = { heading: 'HELL CIRCLE', body: 'Larry died. Hell put him in a cage. Roll him to the hellmouth.', button: 'Descend' }
  spec.screens.gameOver = { heading: 'Broken', body: 'The sands ran out on {score}.', button: 'Again, Larry' }
  spec.screens.win = { heading: 'Deeper still', body: 'Escaped with {score}.', button: 'Play again' }
  spec.text.hit = 'AAARGH!'
  spec.text.lifeLost = 'Larry breaks.'
  return spec
}

export const PRESETS: { id: string; name: string; make: () => GameSpec }[] = [
  { id: 'blank', name: 'Blank room', make: blankSpec },
  { id: 'dungeon', name: 'Dungeon Dash (keys, doors, sword)', make: dungeonDash },
  { id: 'garden', name: 'Coin Garden (collect all, timer)', make: coinGarden },
  { id: 'hell', name: 'Hell Circle (reach or survive)', make: hellCircle },
]
