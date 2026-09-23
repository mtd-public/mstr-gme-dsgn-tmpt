/**
 * Renderer for the Play tab. Implements the house Renderer shape
 * (resize / update / dispose) and owns no game state: it reads the World each
 * frame. Floating texts are purely visual state fed by `float()`.
 */
import { drawEntity, drawFloor, fitGrid, type Frame } from './draw.ts'
import { pos, type World } from './runtime.ts'

interface Floater {
  text: string
  x: number
  y: number
  t: number
  color: string
}

const TONE: Record<string, string> = { good: '#3ddc84', bad: '#ee4b5e', gold: '#ffd45e', info: '#ffffff' }

export class PlayRenderer {
  private ctx: CanvasRenderingContext2D
  private w = 1
  private h = 1
  private dpr = 1
  private floaters: Floater[] = []
  frame: Frame = { size: 16, ox: 0, oy: 0 }

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
  }

  resize(width: number, height: number) {
    if (!width || !height) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.w = width
    this.h = height
    this.canvas.width = Math.round(width * this.dpr)
    this.canvas.height = Math.round(height * this.dpr)
  }

  float(text: string, cellX: number, cellY: number, tone: string) {
    this.floaters.push({ text, x: cellX, y: cellY, t: 0, color: TONE[tone] ?? '#ffffff' })
  }

  update(w: World, dt: number, t: number) {
    const { ctx } = this
    const L = w.level
    const f = (this.frame = fitGrid(this.w, this.h, L.width, L.height))
    const ink = w.spec.theme.ink
    const cx = (x: number) => f.ox + (x + 0.5) * f.size
    const cy = (y: number) => f.oy + (y + 0.5) * f.size

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.fillStyle = w.spec.theme.background
    ctx.fillRect(0, 0, this.w, this.h)
    drawFloor(ctx, w.spec.theme, f, L.width, L.height, false)

    // terrain
    w.terrain.forEach((id, i) => {
      const e = w.ents.get(id)
      if (!e) return
      const x = i % L.width
      const y = Math.floor(i / L.width)
      const pulse = e.kind === 'goal' ? 1 + Math.sin(t * 4) * 0.08 : 1
      drawEntity(ctx, e, ink, cx(x), cy(y), f.size, { scale: pulse })
    })
    // pickups bob
    for (const k of w.pickups) {
      if (k.taken) continue
      const x = k.cell % L.width
      const y = Math.floor(k.cell / L.width)
      drawEntity(ctx, k.type, ink, cx(x), cy(y) + Math.sin(t * 3 + k.cell) * f.size * 0.06, f.size, { scale: 0.8 })
    }
    // enemies
    for (const e of w.enemies) {
      const [x, y] = pos(e)
      drawEntity(ctx, e.type, ink, cx(x), cy(y), f.size, { face: true, flash: e.flash > 0 })
    }
    // player (blinks while invincible)
    const p = w.player
    const player = w.level.cells.map((id) => w.ents.get(id)).find((e) => e?.kind === 'player')
    const blink = p.invincible > 0 && Math.floor(t * 12) % 2 === 0
    if (player && !blink && w.status !== 'gameOver') {
      const [x, y] = pos(p)
      drawEntity(ctx, player, ink, cx(x), cy(y), f.size, { face: true })
    }
    // attack slash along the facing line
    if (p.attackFlash > 0) {
      const [x, y] = pos(p)
      const range = w.rules.player.attack.range
      ctx.save()
      ctx.globalAlpha = p.attackFlash / 0.18
      ctx.strokeStyle = '#ffd45e'
      ctx.lineWidth = f.size * 0.22
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cx(x + p.faceX * 0.5), cy(y + p.faceY * 0.5))
      ctx.lineTo(cx(x + p.faceX * range * 0.9), cy(y + p.faceY * range * 0.9))
      ctx.stroke()
      ctx.restore()
    }
    // floating texts: rise and fade, ink stroke under colour for legibility
    this.floaters = this.floaters.filter((fl) => (fl.t += dt) < 1.1)
    ctx.textAlign = 'center'
    ctx.font = `900 ${Math.max(12, Math.round(f.size * 0.5))}px "Trebuchet MS", system-ui, sans-serif`
    ctx.lineJoin = 'round'
    for (const fl of this.floaters) {
      const y = cy(fl.y) - fl.t * f.size * 1.2
      ctx.globalAlpha = Math.min(1, (1.1 - fl.t) * 3)
      ctx.lineWidth = 5
      ctx.strokeStyle = '#3b2e5a'
      ctx.strokeText(fl.text, cx(fl.x), y)
      ctx.fillStyle = fl.color
      ctx.fillText(fl.text, cx(fl.x), y)
    }
    ctx.globalAlpha = 1
  }

  dispose() {
    this.floaters = []
  }
}
