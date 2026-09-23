/**
 * Canvas-2D drawing shared by the editor grid and the Play renderer, in the
 * house "toy ink" style: fill + thick ink outline + hard drop shadow. One
 * `drawEntity` per shape keeps editor and game looking identical.
 */
import type { EntityType, Shape, Theme } from '../spec/schema.ts'

export interface Frame {
  /** Tile size in CSS px and grid origin. */
  size: number
  ox: number
  oy: number
}

/** Largest square tile that fits a w×h grid into the canvas, centred. */
export function fitGrid(cssW: number, cssH: number, cols: number, rows: number, pad = 8): Frame {
  const size = Math.max(4, Math.floor(Math.min((cssW - pad * 2) / cols, (cssH - pad * 2) / rows)))
  return { size, ox: Math.floor((cssW - size * cols) / 2), oy: Math.floor((cssH - size * rows) / 2) }
}

export function drawFloor(ctx: CanvasRenderingContext2D, theme: Theme, f: Frame, cols: number, rows: number, gridLines: boolean) {
  ctx.fillStyle = theme.floor
  ctx.fillRect(f.ox, f.oy, f.size * cols, f.size * rows)
  if (!gridLines) return
  ctx.strokeStyle = theme.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= cols; x++) {
    ctx.moveTo(f.ox + x * f.size + 0.5, f.oy)
    ctx.lineTo(f.ox + x * f.size + 0.5, f.oy + rows * f.size)
  }
  for (let y = 0; y <= rows; y++) {
    ctx.moveTo(f.ox, f.oy + y * f.size + 0.5)
    ctx.lineTo(f.ox + cols * f.size, f.oy + y * f.size + 0.5)
  }
  ctx.stroke()
}

function shapePath(ctx: CanvasRenderingContext2D, shape: Shape, cx: number, cy: number, r: number) {
  ctx.beginPath()
  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      break
    case 'diamond':
      ctx.moveTo(cx, cy - r)
      ctx.lineTo(cx + r, cy)
      ctx.lineTo(cx, cy + r)
      ctx.lineTo(cx - r, cy)
      ctx.closePath()
      break
    case 'triangle':
      ctx.moveTo(cx, cy - r)
      ctx.lineTo(cx + r, cy + r * 0.8)
      ctx.lineTo(cx - r, cy + r * 0.8)
      ctx.closePath()
      break
    case 'star':
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : r * 0.45
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
        else ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
      }
      ctx.closePath()
      break
    case 'heart':
      ctx.moveTo(cx, cy + r * 0.85)
      ctx.bezierCurveTo(cx - r * 1.3, cy - r * 0.1, cx - r * 0.65, cy - r * 1.15, cx, cy - r * 0.4)
      ctx.bezierCurveTo(cx + r * 0.65, cy - r * 1.15, cx + r * 1.3, cy - r * 0.1, cx, cy + r * 0.85)
      break
    default: {
      const s = r * 1.8
      const rad = r * 0.3
      ctx.roundRect(cx - s / 2, cy - s / 2, s, s, rad)
    }
  }
}

export interface DrawOpts {
  /** Extra scale (pop / squash). */
  scale?: number
  alpha?: number
  /** White flash when hit. */
  flash?: boolean
  /** Draw the glyph on the shape (editor legibility). */
  glyph?: boolean
  /** Eyes for characters. */
  face?: boolean
}

export function drawEntity(ctx: CanvasRenderingContext2D, e: EntityType, ink: string, cx: number, cy: number, size: number, o: DrawOpts = {}) {
  const solidTile = e.kind === 'wall' || e.kind === 'door' || e.kind === 'hazard' || e.kind === 'goal' || e.kind === 'floor' || e.kind === 'decor'
  ctx.save()
  ctx.globalAlpha = o.alpha ?? 1
  if (e.kind === 'wall' || e.kind === 'floor') {
    // Terrain fills its whole cell so walls read as walls, not tokens.
    const inset = e.kind === 'wall' ? 1 : 0
    ctx.fillStyle = e.color
    ctx.fillRect(cx - size / 2 + inset, cy - size / 2 + inset, size - inset * 2, size - inset * 2)
    if (e.kind === 'wall') {
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillRect(cx - size / 2 + inset, cy - size / 2 + inset, size - inset * 2, Math.max(2, size * 0.16))
      ctx.strokeStyle = ink
      ctx.lineWidth = Math.max(1, size * 0.06)
      ctx.strokeRect(cx - size / 2 + inset, cy - size / 2 + inset, size - inset * 2, size - inset * 2)
    }
  } else {
    const r = size * (solidTile ? 0.42 : 0.36) * (o.scale ?? 1)
    const lw = Math.max(1.5, size * 0.08)
    // hard ink drop shadow
    shapePath(ctx, e.shape, cx, cy + r * 0.2, r)
    ctx.fillStyle = ink
    ctx.fill()
    shapePath(ctx, e.shape, cx, cy, r)
    ctx.fillStyle = o.flash ? '#ffffff' : e.color
    ctx.fill()
    ctx.lineWidth = lw
    ctx.strokeStyle = ink
    ctx.lineJoin = 'round'
    ctx.stroke()
    if (o.face && (e.kind === 'player' || e.kind === 'enemy')) {
      ctx.fillStyle = ink
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(cx + s * r * 0.32, cy + r * 0.05, r * 0.11, r * 0.17, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  if (o.glyph && size >= 14) {
    ctx.fillStyle = e.kind === 'wall' ? 'rgba(255,255,255,0.7)' : ink
    ctx.font = `900 ${Math.round(size * 0.42)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (e.kind !== 'wall' && !o.face) ctx.fillText(e.glyph, cx, cy + size * 0.02)
  }
  ctx.restore()
}
