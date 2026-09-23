import { useEffect, useRef, useState } from 'react'
import { drawEntity, drawFloor, fitGrid, type Frame } from '../engine/draw.ts'
import type { GameSpec } from '../spec/schema.ts'
import type { SpecStore } from './store.ts'

export type Tool = 'paint' | 'erase' | 'fill' | 'pick'

interface GridEditorProps {
  store: SpecStore
  levelIndex: number
  brush: string
  tool: Tool
  onPick: (entityId: string) => void
  /** Cells flagged by the validator (e.g. unreachable pickups) — drawn with a ring. */
  highlight?: Set<number>
}

/** Bresenham between two cells so a fast drag never leaves gaps. */
function lineCells(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const out: [number, number][] = []
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    out.push([x0, y0])
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
  return out
}

function floodFill(spec: GameSpec, li: number, start: number, value: string) {
  const L = spec.levels[li]
  const from = L.cells[start]
  if (from === value) return
  const q = [start]
  while (q.length) {
    const i = q.pop()!
    if (L.cells[i] !== from) continue
    L.cells[i] = value
    const x = i % L.width
    const y = Math.floor(i / L.width)
    if (x > 0) q.push(i - 1)
    if (x < L.width - 1) q.push(i + 1)
    if (y > 0) q.push(i - L.width)
    if (y < L.height - 1) q.push(i + L.width)
  }
}

/**
 * The paint surface. Pointer events cover mouse, pen and touch; the canvas has
 * touch-action:none so a drag paints instead of scrolling. Right mouse erases.
 * Placing a player removes the previous one (exactly one start per level).
 */
export function GridEditor({ store, levelIndex, brush, tool, onPick, highlight }: GridEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frame = useRef<Frame>({ size: 16, ox: 0, oy: 0 })
  const stroke = useRef<{ last: [number, number] | null; erase: boolean } | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const { spec } = store
  const level = spec.levels[levelIndex]

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return
    const ro = new ResizeObserver(() => setSize({ w: parent.clientWidth, h: parent.clientHeight }))
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])

  // redraw whenever the level, size or hover changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !level || !size.w) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(size.w * dpr)
    canvas.height = Math.round(size.h * dpr)
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    const f = (frame.current = fitGrid(size.w, size.h, level.width, level.height))
    drawFloor(ctx, spec.theme, f, level.width, level.height, true)
    const ents = new Map(spec.entities.map((e) => [e.id, e]))
    level.cells.forEach((id, i) => {
      const e = ents.get(id)
      if (!e) return
      const x = i % level.width
      const y = Math.floor(i / level.width)
      drawEntity(ctx, e, spec.theme.ink, f.ox + (x + 0.5) * f.size, f.oy + (y + 0.5) * f.size, f.size, {
        glyph: true,
        face: e.kind === 'player' || e.kind === 'enemy',
      })
    })
    if (highlight) {
      ctx.strokeStyle = '#ee4b5e'
      ctx.lineWidth = 3
      highlight.forEach((i) => {
        const x = i % level.width
        const y = Math.floor(i / level.width)
        ctx.strokeRect(f.ox + x * f.size + 2, f.oy + y * f.size + 2, f.size - 4, f.size - 4)
      })
    }
    if (hover !== null && hover < level.cells.length) {
      const x = hover % level.width
      const y = Math.floor(hover / level.width)
      const b = ents.get(brush)
      if (tool === 'paint' && b) {
        drawEntity(ctx, b, spec.theme.ink, f.ox + (x + 0.5) * f.size, f.oy + (y + 0.5) * f.size, f.size, { alpha: 0.45 })
      }
      ctx.strokeStyle = tool === 'erase' ? '#ee4b5e' : spec.theme.accent
      ctx.lineWidth = 2
      ctx.strokeRect(f.ox + x * f.size + 1, f.oy + y * f.size + 1, f.size - 2, f.size - 2)
    }
  }, [spec, level, size, hover, brush, tool, highlight])

  function cellAt(ev: React.PointerEvent): [number, number] | null {
    const r = canvasRef.current!.getBoundingClientRect()
    const f = frame.current
    const x = Math.floor((ev.clientX - r.left - f.ox) / f.size)
    const y = Math.floor((ev.clientY - r.top - f.oy) / f.size)
    if (!level || x < 0 || y < 0 || x >= level.width || y >= level.height) return null
    return [x, y]
  }

  function apply(cells: [number, number][], erase: boolean) {
    const value = erase ? '' : brush
    store.update(
      (d) => {
        const L = d.levels[levelIndex]
        const isPlayer = d.entities.find((e) => e.id === value)?.kind === 'player'
        if (isPlayer) {
          const players = new Set(d.entities.filter((e) => e.kind === 'player').map((e) => e.id))
          L.cells = L.cells.map((c) => (players.has(c) ? '' : c))
        }
        for (const [x, y] of cells) L.cells[y * L.width + x] = value
      },
      { history: false },
    )
  }

  function onPointerDown(ev: React.PointerEvent) {
    const c = cellAt(ev)
    if (!c) return
    ev.preventDefault()
    const i = c[1] * level.width + c[0]
    if (tool === 'pick') {
      if (level.cells[i]) onPick(level.cells[i])
      return
    }
    store.checkpoint()
    const erase = tool === 'erase' || ev.button === 2
    if (tool === 'fill' && !erase) {
      store.update((d) => floodFill(d, levelIndex, i, brush), { history: false })
      return
    }
    canvasRef.current!.setPointerCapture(ev.pointerId)
    stroke.current = { last: c, erase }
    apply([c], erase)
  }

  function onPointerMove(ev: React.PointerEvent) {
    const c = cellAt(ev)
    setHover(c ? c[1] * level.width + c[0] : null)
    const s = stroke.current
    if (!s || !c || !s.last) return
    if (c[0] === s.last[0] && c[1] === s.last[1]) return
    apply(lineCells(s.last[0], s.last[1], c[0], c[1]), s.erase)
    s.last = c
  }

  function end() {
    stroke.current = null
  }

  return (
    <canvas
      ref={canvasRef}
      className="grid-canvas"
      data-touch-control
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onPointerLeave={() => setHover(null)}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`Level grid ${level?.width}×${level?.height}`}
    />
  )
}
