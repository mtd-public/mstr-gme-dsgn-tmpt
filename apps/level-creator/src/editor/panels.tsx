import { useRef, useState } from 'react'
import { asciiToCells, legend, levelToAscii } from '../spec/ascii.ts'
import { PRESETS } from '../spec/presets.ts'
import {
  emptyLevel,
  migrate,
  uid,
  type Achievement,
  type BehaviorType,
  type EntityKind,
  type EntityType,
  type Screens,
  type Shape,
  type StatKey,
  type TextTable,
  type WinCondition,
} from '../spec/schema.ts'
import type { Issue } from '../spec/validate.ts'
import { Check, Color, Num, Section, Select, Text } from './fields.tsx'
import { downloadJson, type SpecStore } from './store.ts'

const KINDS: EntityKind[] = ['wall', 'floor', 'player', 'enemy', 'pickup', 'hazard', 'goal', 'door', 'spawner', 'decor']
const SHAPES: Shape[] = ['square', 'circle', 'diamond', 'triangle', 'star', 'heart']
const BEHAVIORS: BehaviorType[] = ['static', 'patrol', 'wander', 'chase', 'flee']

// ================================================================== levels

/** Width/height draft; keyed by level id + size so undo or a new level resets it. */
function ResizeForm({ store, levelIndex }: { store: SpecStore; levelIndex: number }) {
  const level = store.spec.levels[levelIndex]
  const [size, setSize] = useState({ w: level.width, h: level.height })
  const resize = () => {
    const w = Math.max(4, Math.min(64, size.w))
    const h = Math.max(4, Math.min(64, size.h))
    store.update((d) => {
      const L = d.levels[levelIndex]
      const cells = new Array(w * h).fill('')
      for (let y = 0; y < Math.min(h, L.height); y++) for (let x = 0; x < Math.min(w, L.width); x++) cells[y * w + x] = L.cells[y * L.width + x]
      Object.assign(L, { width: w, height: h, cells })
    })
  }
  return (
    <>
      <div className="grid2">
        <Num label="Width" value={size.w} min={4} max={64} onChange={(w) => setSize((s) => ({ ...s, w }))} />
        <Num label="Height" value={size.h} min={4} max={64} onChange={(h) => setSize((s) => ({ ...s, h }))} />
      </div>
      <button className="btn btn--sm" disabled={size.w === level.width && size.h === level.height} onClick={resize}>
        Apply size (keeps top-left)
      </button>
    </>
  )
}

/** Live ASCII view of the level; editing it makes a draft until Apply/Revert. */
function AsciiBox({ store, levelIndex }: { store: SpecStore; levelIndex: number }) {
  const { spec, update } = store
  const level = spec.levels[levelIndex]
  const [draft, setDraft] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const text = draft ?? levelToAscii(spec, level)
  const apply = () => {
    const r = asciiToCells(spec, text)
    if (r.width > 64 || r.height > 64) return setNote('Too big: max 64×64.')
    if (r.width < 4 || r.height < 4) return setNote('Too small: min 4×4.')
    update((d) => {
      Object.assign(d.levels[levelIndex], { width: r.width, height: r.height, cells: r.cells })
    })
    setDraft(null)
    setNote(r.unknown.length ? `Applied. Unknown glyphs became floor: ${r.unknown.join(' ')}` : 'Applied.')
  }
  return (
    <>
      <textarea
        className="ascii"
        spellCheck={false}
        value={text}
        rows={Math.min(18, level.height + 1)}
        onChange={(e) => {
          setDraft(e.target.value)
          setNote('')
        }}
        aria-label="Level as ASCII"
      />
      <div className="row wrap">
        <button className="btn btn--sm btn--primary" disabled={draft === null} onClick={apply}>
          Apply ASCII
        </button>
        <button className="btn btn--sm" disabled={draft === null} onClick={() => setDraft(null)}>
          Revert
        </button>
        <button className="btn btn--sm" onClick={() => navigator.clipboard?.writeText(text).then(() => setNote('Copied.'), () => setNote('Clipboard blocked.'))}>
          Copy
        </button>
      </div>
      {note && <p className="note">{note}</p>}
      <pre className="legend">{legend(spec)}</pre>
    </>
  )
}

export function LevelsPanel({ store, levelIndex, setLevelIndex, issues }: { store: SpecStore; levelIndex: number; setLevelIndex: (i: number) => void; issues: Issue[] }) {
  const { spec, update } = store
  const level = spec.levels[levelIndex]
  const [showAscii, setShowAscii] = useState(false)

  const move = (dir: -1 | 1) => {
    const j = levelIndex + dir
    if (j < 0 || j >= spec.levels.length) return
    update((d) => {
      const [l] = d.levels.splice(levelIndex, 1)
      d.levels.splice(j, 0, l)
    })
    setLevelIndex(j)
  }

  const levelIssues = issues.filter((i) => i.levelIndex === levelIndex || i.levelIndex === undefined)
  const timeOverride = level.rules?.timeLimit

  return (
    <div className="panel-scroll">
      <Section
        title="Levels"
        actions={
          <span className="row">
            <button className="btn btn--sm" onClick={() => { update((d) => { d.levels.push(emptyLevel(`Level ${d.levels.length + 1}`)) }); setLevelIndex(spec.levels.length) }}>+ New</button>
            <button className="btn btn--sm" onClick={() => { update((d) => { const c = structuredClone(d.levels[levelIndex]); c.id = uid('lvl'); c.name += ' copy'; d.levels.splice(levelIndex + 1, 0, c) }); setLevelIndex(levelIndex + 1) }}>Duplicate</button>
          </span>
        }
      >
        <ol className="level-list">
          {spec.levels.map((l, i) => (
            <li key={l.id}>
              <button className={`level-item${i === levelIndex ? ' is-active' : ''}`} onClick={() => setLevelIndex(i)}>
                <b>{i + 1}</b> {l.name} <small>{l.width}×{l.height}</small>
              </button>
            </li>
          ))}
        </ol>
        <div className="row">
          <button className="btn btn--sm" disabled={levelIndex === 0} onClick={() => move(-1)} aria-label="Move level up">↑</button>
          <button className="btn btn--sm" disabled={levelIndex === spec.levels.length - 1} onClick={() => move(1)} aria-label="Move level down">↓</button>
          <button
            className="btn btn--sm btn--danger"
            disabled={spec.levels.length <= 1}
            onClick={() => {
              if (!confirm(`Delete "${level.name}"?`)) return
              update((d) => { d.levels.splice(levelIndex, 1) })
              setLevelIndex(Math.max(0, levelIndex - 1))
            }}
          >
            Delete
          </button>
        </div>
      </Section>

      <Section title="This level">
        <Text label="Name" value={level.name} onChange={(v) => update((d) => { d.levels[levelIndex].name = v })} />
        <Text label="Intro text" hint="Shown on the level intro card as {levelName}'s subtitle" multiline value={level.intro} onChange={(v) => update((d) => { d.levels[levelIndex].intro = v })} />
        <ResizeForm key={`${level.id}:${level.width}x${level.height}`} store={store} levelIndex={levelIndex} />
        <Check
          label="Override time limit for this level"
          value={timeOverride !== undefined}
          onChange={(on) => update((d) => {
            const L = d.levels[levelIndex]
            L.rules = { ...(L.rules ?? {}) }
            if (on) L.rules.timeLimit = d.rules.timeLimit || 60
            else delete L.rules.timeLimit
          })}
        />
        {timeOverride !== undefined && (
          <Num label="Level time limit (s, 0 = untimed)" value={timeOverride} min={0} onChange={(v) => update((d) => { d.levels[levelIndex].rules = { ...(d.levels[levelIndex].rules ?? {}), timeLimit: v } })} />
        )}
      </Section>

      <Section
        title="ASCII map"
        actions={
          <button className="btn btn--sm" aria-expanded={showAscii} onClick={() => setShowAscii((v) => !v)}>
            {showAscii ? 'Hide' : 'Show'}
          </button>
        }
      >
        {showAscii ? <AsciiBox key={level.id} store={store} levelIndex={levelIndex} /> : <p className="note">Type or paste levels as text, one glyph per cell.</p>}
      </Section>

      <Section title={`Checks (${levelIssues.length})`}>
        {levelIssues.length === 0 ? (
          <p className="note ok">No problems. The exit and pickups are reachable.</p>
        ) : (
          <ul className="issues">
            {levelIssues.map((i, k) => (
              <li key={k} className={`issue issue--${i.level}`}>{i.message}</li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

// ================================================================== entities

const TEMPLATES: Record<EntityKind, Partial<EntityType>> = {
  wall: { shape: 'square', color: '#6e5ac8' },
  floor: { shape: 'square', color: '#e7def8' },
  player: { shape: 'circle', color: '#fffdf8' },
  enemy: { shape: 'circle', color: '#3a4572', behavior: { type: 'wander' }, stats: { hp: 1, damage: 1, points: 25, speed: 2 } },
  pickup: { shape: 'circle', color: '#ffc53a', stats: { points: 10 }, flavor: { onTouch: '+{points}' } },
  hazard: { shape: 'triangle', color: '#ee4b5e', stats: { damage: 1 } },
  goal: { shape: 'star', color: '#3ddc84' },
  door: { shape: 'square', color: '#b07a5e', stats: { keys: 1 } },
  spawner: { shape: 'star', color: '#a58cf2' },
  decor: { shape: 'diamond', color: '#cbc5f2' },
}

export function EntitiesPanel({ store, selected, setSelected }: { store: SpecStore; selected: string; setSelected: (id: string) => void }) {
  const { spec, update } = store
  const idx = Math.max(0, spec.entities.findIndex((e) => e.id === selected))
  const e = spec.entities[idx]
  const [newKind, setNewKind] = useState<EntityKind>('enemy')
  const set = (fn: (x: EntityType) => void) => update((d) => fn(d.entities[idx]))
  const usedGlyphs = new Set(spec.entities.map((x) => x.glyph))
  const freeGlyph = () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOQRTUVWXYZ0123456789!$%&*+=?'.split('').find((g) => !usedGlyphs.has(g)) ?? '?'

  const add = () => {
    const id = uid(newKind)
    const t = TEMPLATES[newKind]
    update((d) => {
      d.entities.push({
        id,
        name: `New ${newKind}`,
        kind: newKind,
        glyph: freeGlyph(),
        color: t.color ?? '#888888',
        shape: t.shape ?? 'square',
        behavior: t.behavior ? { ...t.behavior } : undefined,
        stats: { ...(t.stats ?? {}) },
        spawner: newKind === 'spawner' ? { spawns: d.entities.find((x) => x.kind === 'enemy')?.id ?? '', every: 5, max: 2 } : undefined,
        flavor: { ...(t.flavor ?? {}) },
      })
    })
    setSelected(id)
  }

  if (!e) return <div className="panel-scroll"><button className="btn" onClick={add}>Add an entity</button></div>
  const inUse = spec.levels.reduce((n, l) => n + l.cells.filter((c) => c === e.id).length, 0)

  return (
    <div className="panel-scroll">
      <Section
        title="Entity types"
        actions={
          <span className="row">
            <select value={newKind} onChange={(ev) => setNewKind(ev.target.value as EntityKind)} aria-label="New entity kind">
              {KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
            <button className="btn btn--sm" onClick={add}>+ Add</button>
          </span>
        }
      >
        <ul className="entity-list">
          {spec.entities.map((x) => (
            <li key={x.id}>
              <button className={`entity-item${x.id === e.id ? ' is-active' : ''}`} onClick={() => setSelected(x.id)}>
                <span className="swatch" style={{ background: x.color }}>{x.glyph}</span>
                {x.name} <small>{x.kind}</small>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title={e.name}
        actions={
          <span className="row">
            <button className="btn btn--sm" onClick={() => { const id = uid(e.kind); update((d) => { d.entities.push({ ...structuredClone(e), id, name: `${e.name} copy`, glyph: freeGlyph() }) }); setSelected(id) }}>Duplicate</button>
            <button
              className="btn btn--sm btn--danger"
              onClick={() => {
                if (!confirm(inUse ? `Delete "${e.name}"? It is placed ${inUse} time(s); those cells become floor.` : `Delete "${e.name}"?`)) return
                update((d) => {
                  d.entities.splice(idx, 1)
                  d.levels.forEach((l) => { l.cells = l.cells.map((c) => (c === e.id ? '' : c)) })
                })
                setSelected(spec.entities[idx === 0 ? 1 : 0]?.id ?? '')
              }}
            >
              Delete
            </button>
          </span>
        }
      >
        <p className="note">id <code>{e.id}</code> · placed {inUse}×</p>
        <div className="grid2">
          <Text label="Name" value={e.name} onChange={(v) => set((x) => { x.name = v })} />
          <Text label="Glyph (ASCII)" value={e.glyph} onChange={(v) => { const g = [...v].pop(); if (g && g !== '.' && g !== ' ') set((x) => { x.glyph = g }) }} />
          <Select label="Kind" value={e.kind} options={KINDS} onChange={(v) => set((x) => { x.kind = v; if (v === 'enemy' && !x.behavior) x.behavior = { type: 'wander' } })} />
          <Select label="Shape" value={e.shape} options={SHAPES} onChange={(v) => set((x) => { x.shape = v })} />
        </div>
        <Color label="Colour" value={e.color} onChange={(v) => set((x) => { x.color = v })} />
      </Section>

      {e.kind === 'enemy' && (
        <Section title="Behaviour">
          <div className="grid2">
            <Select label="Movement" value={e.behavior?.type ?? 'static'} options={BEHAVIORS} onChange={(v) => set((x) => { x.behavior = { ...(x.behavior ?? {}), type: v } })} />
            {e.behavior?.type === 'patrol' && <Select label="Axis" value={e.behavior.axis ?? 'x'} options={['x', 'y'] as const} onChange={(v) => set((x) => { x.behavior = { ...x.behavior!, axis: v } })} />}
            {(e.behavior?.type === 'chase' || e.behavior?.type === 'flee') && <Num label="Sight (cells, 0 = always)" value={e.behavior.sight ?? 0} min={0} onChange={(v) => set((x) => { x.behavior = { ...x.behavior!, sight: v } })} />}
          </div>
          <div className="grid2">
            <Num label="Speed (cells/s)" value={e.stats.speed ?? 2} min={0.2} max={20} step={0.1} onChange={(v) => set((x) => { x.stats.speed = v })} />
            <Num label="HP (hits to defeat)" value={e.stats.hp ?? 1} min={1} onChange={(v) => set((x) => { x.stats.hp = v })} />
            <Num label="Contact damage" value={e.stats.damage ?? 1} min={0} onChange={(v) => set((x) => { x.stats.damage = v })} />
            <Num label="Points on defeat" value={e.stats.points ?? 0} min={0} onChange={(v) => set((x) => { x.stats.points = v })} />
          </div>
        </Section>
      )}
      {e.kind === 'pickup' && (
        <Section title="On collect">
          <div className="grid2">
            <Num label="Points" value={e.stats.points ?? 0} min={0} onChange={(v) => set((x) => { x.stats.points = v })} />
            <Num label="Heal HP" value={e.stats.heal ?? 0} min={0} onChange={(v) => set((x) => { x.stats.heal = v })} />
            <Num label="Add seconds" value={e.stats.time ?? 0} min={0} onChange={(v) => set((x) => { x.stats.time = v })} />
            <Num label="Keys" value={e.stats.keys ?? 0} min={0} onChange={(v) => set((x) => { x.stats.keys = v })} />
          </div>
        </Section>
      )}
      {e.kind === 'hazard' && (
        <Section title="Hazard">
          <Num label="Damage per second standing on it" value={e.stats.damage ?? 1} min={0} onChange={(v) => set((x) => { x.stats.damage = v })} />
        </Section>
      )}
      {e.kind === 'door' && (
        <Section title="Door">
          <Num label="Keys needed (consumed)" value={e.stats.keys ?? 1} min={1} onChange={(v) => set((x) => { x.stats.keys = v })} />
        </Section>
      )}
      {e.kind === 'spawner' && (
        <Section title="Spawner">
          <Select
            label="Spawns"
            value={e.spawner?.spawns ?? ''}
            options={[{ value: '', label: '— pick an enemy —' }, ...spec.entities.filter((x) => x.kind === 'enemy').map((x) => ({ value: x.id, label: x.name }))]}
            onChange={(v) => set((x) => { x.spawner = { every: 5, max: 2, ...(x.spawner ?? {}), spawns: v } })}
          />
          <div className="grid2">
            <Num label="Every (s)" value={e.spawner?.every ?? 5} min={0.5} step={0.5} onChange={(v) => set((x) => { x.spawner = { spawns: '', max: 2, ...(x.spawner ?? {}), every: v } })} />
            <Num label="Max alive" value={e.spawner?.max ?? 2} min={1} onChange={(v) => set((x) => { x.spawner = { spawns: '', every: 5, ...(x.spawner ?? {}), max: v } })} />
          </div>
        </Section>
      )}

      <Section title="Flavor text">
        <Text label="Description" multiline value={e.flavor.description ?? ''} onChange={(v) => set((x) => { x.flavor.description = v })} placeholder="Shown in the editor; v2 bestiary" />
        {(e.kind === 'pickup' || e.kind === 'hazard' || e.kind === 'goal') && (
          <Text label="On touch toast" hint="Tokens: {name} {points} {heal} {time} {keys}" value={e.flavor.onTouch ?? ''} onChange={(v) => set((x) => { x.flavor.onTouch = v })} />
        )}
        {e.kind === 'enemy' && <Text label="On defeat toast" hint="Tokens: {name} {points}" value={e.flavor.onDefeat ?? ''} onChange={(v) => set((x) => { x.flavor.onDefeat = v })} />}
      </Section>
    </div>
  )
}

// ================================================================== rules

function winLabel(c: WinCondition) {
  return { reachGoal: 'Reach a goal', collectAll: 'Collect all pickups', defeatAll: 'Defeat all enemies', surviveTime: 'Survive for time', score: 'Reach a score' }[c.type]
}

export function RulesPanel({ store }: { store: SpecStore }) {
  const { spec, update } = store
  const r = spec.rules
  const pickups = spec.entities.filter((e) => e.kind === 'pickup')
  const enemies = spec.entities.filter((e) => e.kind === 'enemy')
  const setWin = (i: number, c: WinCondition) => update((d) => { d.rules.win[i] = c })
  return (
    <div className="panel-scroll">
      <Section
        title="Win conditions"
        actions={<button className="btn btn--sm" onClick={() => update((d) => { d.rules.win.push({ type: 'score', value: 500 }) })}>+ Add</button>}
      >
        {r.win.length > 1 && (
          <Select label="Level is won when" value={r.winMode} options={[{ value: 'any', label: 'ANY condition holds' }, { value: 'all', label: 'ALL conditions hold' }]} onChange={(v) => update((d) => { d.rules.winMode = v })} />
        )}
        {r.win.map((c, i) => (
          <div className="card" key={i}>
            <div className="grid2">
              <Select
                label={`Condition ${i + 1}`}
                value={c.type}
                options={(['reachGoal', 'collectAll', 'defeatAll', 'surviveTime', 'score'] as const).map((t) => ({ value: t, label: winLabel({ type: t } as WinCondition) }))}
                onChange={(t) =>
                  setWin(i, t === 'surviveTime' ? { type: t, seconds: 30 } : t === 'score' ? { type: t, value: 500 } : ({ type: t } as WinCondition))
                }
              />
              {c.type === 'collectAll' && (
                <Select label="Which pickups" value={c.entity ?? ''} options={[{ value: '', label: 'Every pickup' }, ...pickups.map((p) => ({ value: p.id, label: p.name }))]} onChange={(v) => setWin(i, { type: 'collectAll', entity: v || undefined })} />
              )}
              {c.type === 'defeatAll' && (
                <Select label="Which enemies" value={c.entity ?? ''} options={[{ value: '', label: 'Every enemy' }, ...enemies.map((p) => ({ value: p.id, label: p.name }))]} onChange={(v) => setWin(i, { type: 'defeatAll', entity: v || undefined })} />
              )}
              {c.type === 'surviveTime' && <Num label="Seconds" value={c.seconds} min={1} onChange={(v) => setWin(i, { type: 'surviveTime', seconds: v })} />}
              {c.type === 'score' && <Num label="Score" value={c.value} min={1} onChange={(v) => setWin(i, { type: 'score', value: v })} />}
            </div>
            <button className="btn btn--sm btn--danger" disabled={r.win.length <= 1} onClick={() => update((d) => { d.rules.win.splice(i, 1) })}>Remove</button>
          </div>
        ))}
      </Section>

      <Section title="Lose & clock">
        <div className="grid2">
          <Num label="Time limit (s, 0 = untimed)" value={r.timeLimit} min={0} onChange={(v) => update((d) => { d.rules.timeLimit = v })} />
          <Select label="On losing a life" value={r.onDeath} options={[{ value: 'respawn', label: 'Respawn at start, keep progress' }, { value: 'restart', label: 'Restart the level' }]} onChange={(v) => update((d) => { d.rules.onDeath = v })} />
        </div>
      </Section>

      <Section title="Player">
        <div className="grid2">
          <Num label="HP" value={r.player.hp} min={1} onChange={(v) => update((d) => { d.rules.player.hp = v })} />
          <Num label="Lives" value={r.player.lives} min={1} onChange={(v) => update((d) => { d.rules.player.lives = v })} />
          <Num label="Speed (cells/s)" value={r.player.speed} min={0.5} max={20} step={0.5} onChange={(v) => update((d) => { d.rules.player.speed = v })} />
          <Num label="Invincible after hit (s)" value={r.player.invincible} min={0} step={0.1} onChange={(v) => update((d) => { d.rules.player.invincible = v })} />
        </div>
        <Check label="Player can attack (Space / tap)" value={r.player.attack.enabled} onChange={(v) => update((d) => { d.rules.player.attack.enabled = v })} />
        {r.player.attack.enabled && (
          <div className="grid2">
            <Num label="Range (cells)" value={r.player.attack.range} min={1} max={20} onChange={(v) => update((d) => { d.rules.player.attack.range = v })} />
            <Num label="Damage" value={r.player.attack.damage} min={1} onChange={(v) => update((d) => { d.rules.player.attack.damage = v })} />
            <Num label="Cooldown (s)" value={r.player.attack.cooldown} min={0.05} step={0.05} onChange={(v) => update((d) => { d.rules.player.attack.cooldown = v })} />
          </div>
        )}
      </Section>
    </div>
  )
}

// ================================================================== screens & text

const SCREEN_NAMES: Record<keyof Screens, string> = {
  title: 'Title screen',
  levelIntro: 'Level intro',
  pause: 'Pause',
  levelClear: 'Level clear',
  gameOver: 'Game over',
  win: 'Win / ending',
}

const TEXT_NAMES: Record<keyof TextTable, string> = {
  hudScore: 'HUD: score label',
  hudHp: 'HUD: health label',
  hudTime: 'HUD: time label',
  hudLives: 'HUD: lives label',
  hudKeys: 'HUD: keys label',
  hit: 'Toast: player hit',
  lifeLost: 'Toast: life lost',
  levelClear: 'Toast: level clear',
  achievementUnlocked: 'Toast: achievement ({achievement})',
  timeUp: 'Toast: time up',
  doorLocked: 'Toast: door locked ({keys})',
  doorOpened: 'Toast: door opened',
}

export function ScreensPanel({ store }: { store: SpecStore }) {
  const { spec, update } = store
  return (
    <div className="panel-scroll">
      <p className="note">
        Tokens: <code>{'{title} {subtitle} {score} {best} {level} {levelName} {levels} {time} {lives} {hp} {collected} {total} {defeated}'}</code>
      </p>
      {(Object.keys(SCREEN_NAMES) as (keyof Screens)[]).map((k) => (
        <Section key={k} title={SCREEN_NAMES[k]}>
          <div className="grid3">
            <Text label="Heading" value={spec.screens[k].heading} onChange={(v) => update((d) => { d.screens[k].heading = v })} />
            <Text label="Body" multiline value={spec.screens[k].body} onChange={(v) => update((d) => { d.screens[k].body = v })} />
            <Text label="Button" value={spec.screens[k].button} onChange={(v) => update((d) => { d.screens[k].button = v })} />
          </div>
        </Section>
      ))}
      <Section title="In-game text">
        <div className="grid2">
          {(Object.keys(TEXT_NAMES) as (keyof TextTable)[]).map((k) => (
            <Text key={k} label={TEXT_NAMES[k]} value={spec.text[k]} onChange={(v) => update((d) => { d.text[k] = v })} />
          ))}
        </div>
      </Section>
    </div>
  )
}

// ================================================================== achievements

const STATS: { value: string; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'collected', label: 'Pickups collected (any)' },
  { value: 'defeated', label: 'Enemies defeated (any)' },
  { value: 'damageTaken', label: 'Damage taken' },
  { value: 'hits', label: 'Times hit' },
  { value: 'attacks', label: 'Attacks made' },
  { value: 'time', label: 'Seconds elapsed' },
  { value: 'levelsCleared', label: 'Levels cleared' },
  { value: 'deaths', label: 'Lives lost' },
]

export function AchievementsPanel({ store }: { store: SpecStore }) {
  const { spec, update } = store
  const stats = [
    ...STATS,
    ...spec.entities.filter((e) => e.kind === 'pickup').map((e) => ({ value: `collected:${e.id}`, label: `Collected: ${e.name}` })),
    ...spec.entities.filter((e) => e.kind === 'enemy').map((e) => ({ value: `defeated:${e.id}`, label: `Defeated: ${e.name}` })),
  ]
  const set = (i: number, fn: (a: Achievement) => void) => update((d) => fn(d.achievements[i]))
  return (
    <div className="panel-scroll">
      <Section
        title={`Achievements (${spec.achievements.length})`}
        actions={
          <button
            className="btn btn--sm"
            onClick={() => update((d) => { d.achievements.push({ id: uid('ach'), title: 'New achievement', description: '', condition: { stat: 'score', op: '>=', value: 1000, scope: 'run' } }) })}
          >
            + Add
          </button>
        }
      >
        {!spec.achievements.length && <p className="note">None yet. Achievements unlock mid-run (e.g. "defeat 10 guards") or on clear (e.g. "take no damage").</p>}
        {spec.achievements.map((a, i) => (
          <div className="card" key={a.id}>
            <div className="grid2">
              <Text label="Title" value={a.title} onChange={(v) => set(i, (x) => { x.title = v })} />
              <Text label="Description" value={a.description} onChange={(v) => set(i, (x) => { x.description = v })} />
            </div>
            <div className="grid4">
              <Select label="Stat" value={a.condition.stat} options={stats.some((s) => s.value === a.condition.stat) ? stats : [...stats, { value: a.condition.stat, label: a.condition.stat }]} onChange={(v) => set(i, (x) => { x.condition.stat = v as StatKey })} />
              <Select label="Is" value={a.condition.op} options={['>=', '<=', '=='] as const} onChange={(v) => set(i, (x) => { x.condition.op = v })} />
              <Num label="Value" value={a.condition.value} onChange={(v) => set(i, (x) => { x.condition.value = v })} />
              <Select label="Counted per" value={a.condition.scope} options={[{ value: 'level', label: 'Level' }, { value: 'run', label: 'Whole run' }]} onChange={(v) => set(i, (x) => { x.condition.scope = v })} />
            </div>
            <div className="row">
              <Check label="Only check when the level is cleared" value={!!a.onlyOnClear} onChange={(v) => set(i, (x) => { x.onlyOnClear = v })} />
              <button className="btn btn--sm btn--danger" onClick={() => update((d) => { d.achievements.splice(i, 1) })}>Remove</button>
            </div>
          </div>
        ))}
      </Section>
    </div>
  )
}

// ================================================================== game / theme / files

export function GamePanel({ store, onLoaded }: { store: SpecStore; onLoaded: () => void }) {
  const { spec, update, replace } = store
  const [paste, setPaste] = useState('')
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const load = (text: string) => {
    try {
      replace(migrate(JSON.parse(text)))
      setMsg('Loaded.')
      onLoaded()
    } catch (err) {
      setMsg(`Could not load: ${(err as Error).message}`)
    }
  }
  return (
    <div className="panel-scroll">
      <Section title="Game">
        <div className="grid2">
          <Text label="Title" value={spec.meta.title} onChange={(v) => update((d) => { d.meta.title = v })} />
          <Text label="Subtitle" value={spec.meta.subtitle} onChange={(v) => update((d) => { d.meta.subtitle = v })} />
          <Text label="Author" value={spec.meta.author} onChange={(v) => update((d) => { d.meta.author = v })} />
        </div>
        <Text label="Description" multiline value={spec.meta.description} onChange={(v) => update((d) => { d.meta.description = v })} />
      </Section>
      <Section title="Theme">
        <div className="grid3">
          {(Object.keys(spec.theme) as (keyof typeof spec.theme)[]).map((k) => (
            <Color key={k} label={k} value={spec.theme[k]} onChange={(v) => update((d) => { d.theme[k] = v })} />
          ))}
        </div>
      </Section>
      <Section title="Start from a preset">
        <div className="row wrap">
          {PRESETS.map((p) => (
            <button key={p.id} className="btn btn--sm" onClick={() => { if (confirm(`Replace the current game with "${p.name}"? (Undo can bring it back.)`)) { replace(p.make()); onLoaded() } }}>
              {p.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Save & load">
        <p className="note">Work autosaves in this browser. Export JSON to keep it, share it, or commit it next to a game.</p>
        <div className="row wrap">
          <button className="btn btn--primary" onClick={() => downloadJson(spec)}>Export .gamespec.json</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import file…</button>
          <button className="btn" onClick={() => navigator.clipboard?.writeText(JSON.stringify(spec, null, 2)).then(() => setMsg('Copied JSON.'))}>Copy JSON</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(load); e.target.value = '' }} />
        </div>
        <textarea className="ascii" rows={5} placeholder="…or paste a GameSpec JSON here" value={paste} onChange={(e) => setPaste(e.target.value)} />
        <button className="btn btn--sm" disabled={!paste.trim()} onClick={() => load(paste)}>Load pasted JSON</button>
        {msg && <p className="note">{msg}</p>}
      </Section>
    </div>
  )
}
