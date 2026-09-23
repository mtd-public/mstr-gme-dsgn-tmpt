import type { EntityKind, GameSpec } from '../spec/schema.ts'
import { EntityIcon } from './EntityIcon.tsx'
import type { Tool } from './GridEditor.tsx'

const GROUPS: { label: string; kinds: EntityKind[] }[] = [
  { label: 'Terrain', kinds: ['wall', 'floor', 'door', 'hazard', 'goal', 'decor'] },
  { label: 'Actors', kinds: ['player', 'enemy', 'spawner'] },
  { label: 'Items', kinds: ['pickup'] },
]

export const TOOLS: { id: Tool; label: string; icon: string; key: string }[] = [
  { id: 'paint', label: 'Paint', icon: '✎', key: 'b' },
  { id: 'erase', label: 'Erase', icon: '⌫', key: 'e' },
  { id: 'fill', label: 'Fill', icon: '▦', key: 'f' },
  { id: 'pick', label: 'Pick', icon: '◎', key: 'i' },
]

interface PaletteProps {
  spec: GameSpec
  brush: string
  tool: Tool
  setBrush: (id: string) => void
  setTool: (t: Tool) => void
  /** Open the entity in the Entities tab (double-click a chip). */
  onEdit: (id: string) => void
}

export function Palette({ spec, brush, tool, setBrush, setTool, onEdit }: PaletteProps) {
  return (
    <div className="palette">
      <div className="tools" role="toolbar" aria-label="Tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool${tool === t.id ? ' is-active' : ''}`}
            aria-pressed={tool === t.id}
            title={`${t.label} (${t.key.toUpperCase()})`}
            onClick={() => setTool(t.id)}
          >
            <span aria-hidden="true">{t.icon}</span>
            <span className="tool__label">{t.label}</span>
          </button>
        ))}
      </div>
      {GROUPS.map((g) => {
        const list = spec.entities.filter((e) => g.kinds.includes(e.kind))
        if (!list.length) return null
        return (
          <div key={g.label} className="palette__group">
            <h4>{g.label}</h4>
            <div className="chips">
              {list.map((e) => (
                <button
                  key={e.id}
                  className={`chip${brush === e.id ? ' is-active' : ''}`}
                  aria-pressed={brush === e.id}
                  title={`${e.name} (${e.kind}) · glyph ${e.glyph} · double-click to edit`}
                  onClick={() => {
                    setBrush(e.id)
                    if (tool !== 'paint' && tool !== 'fill') setTool('paint')
                  }}
                  onDoubleClick={() => onEdit(e.id)}
                >
                  <EntityIcon entity={e} ink={spec.theme.ink} floor={spec.theme.floor} />
                  <span className="chip__name">{e.name}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
