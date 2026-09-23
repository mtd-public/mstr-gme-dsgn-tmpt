/**
 * Canvas-2D renderer in the "toy ink" house style (gig-ambulance palette:
 * pastel fills, one ink colour for outlines and hard drop shadows).
 *
 * Framing follows splashy-fish's frameCamera: the full board WIDTH is always
 * on screen, the player sits at a fixed fraction of the view height, and
 * taller windows simply see further ahead. Nothing ever depends on the
 * window's aspect ratio matching the board's.
 */
import { BOARD_W, LANE_X, PLAYER_R, PLAYER_Y, TUNING, type Thing, type World } from './physics'
import type { Renderer } from './renderer'
import type { GamePhase } from './types'

export const INK = '#3b2e5a'
const C = {
  road: '#4b4959',
  roadDark: '#433f52',
  stripe: '#ffd45e',
  curbA: '#e8685a',
  curbB: '#f6f3ec',
  cream: '#fffdf8',
  lav: '#dccbf7',
  purple: '#6e5ac8',
  yellow: '#ffd45e',
  gold: '#ffc53a',
  red: '#ee4b5e',
  green: '#3ddc84',
  pink: '#ff9fbd',
  navy: '#3a4572',
}
/** Where the player sits down the view (0 = top). */
const PLAYER_VIEW_Y = 0.78

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  r: number
}

export class Render2D implements Renderer {
  private ctx: CanvasRenderingContext2D
  private w = 1
  private h = 1
  private dpr = 1
  private scroll = 0
  private particles: Particle[] = []
  private seenGone = new Set<number>()
  private lastHp = 100

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
  }

  resize(width: number, height: number) {
    if (!width || !height) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2) // cap DPR at 2 — 3× phones cost 2.25× the fill for no visible gain
    this.w = width
    this.h = height
    this.canvas.width = Math.round(width * this.dpr)
    this.canvas.height = Math.round(height * this.dpr)
  }

  dispose() {
    this.particles = []
  }

  update(world: World, phase: GamePhase, dt: number, t: number) {
    const { ctx, w, h } = this
    const s = w / BOARD_W
    const oy = h * PLAYER_VIEW_Y - PLAYER_Y * s
    const Y = (y: number) => y * s + oy
    const X = (x: number) => x * s

    if (phase !== 'paused') this.scroll += world.speed * dt

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.save()
    if (world.shake > 0 && phase === 'playing') {
      ctx.translate((Math.random() - 0.5) * world.shake * 14, (Math.random() - 0.5) * world.shake * 14)
    }

    // --- road --------------------------------------------------------------
    ctx.fillStyle = C.road
    ctx.fillRect(-20, -20, w + 40, h + 40)
    const band = 120 * s
    const off = ((this.scroll * s) % (band * 2)) - band * 2
    ctx.fillStyle = C.roadDark
    for (let y = off; y < h + band; y += band * 2) ctx.fillRect(0, y, w, band) // speed read: alternating bands (whip-dash sacbé)
    ctx.fillStyle = C.stripe
    const dash = 46 * s
    const dOff = ((this.scroll * s) % (dash * 2)) - dash * 2
    for (const lx of [BOARD_W * 0.35, BOARD_W * 0.65]) {
      for (let y = dOff; y < h + dash; y += dash * 2) ctx.fillRect(X(lx) - 3 * s, y, 6 * s, dash)
    }
    const curb = 30 * s
    const cOff = ((this.scroll * s) % (curb * 2)) - curb * 2
    for (let y = cOff, i = 0; y < h + curb; y += curb, i++) {
      ctx.fillStyle = i % 2 ? C.curbA : C.curbB
      ctx.fillRect(0, y, 12 * s, curb)
      ctx.fillRect(w - 12 * s, y, 12 * s, curb)
    }

    // --- things ------------------------------------------------------------
    for (const thing of world.things) {
      const x = X(LANE_X[thing.lane])
      const y = Y(thing.y)
      if (y < -80 || y > h + 80) continue
      if (thing.gone && !this.seenGone.has(thing.id)) {
        this.seenGone.add(thing.id)
        this.burst(x, y, thing.kind === 'hazard' ? [C.red, C.yellow, C.cream] : thing.kind === 'coin' ? [C.gold, C.cream] : [C.pink, C.cream], thing.kind === 'hazard' ? 16 : 8, s)
      }
      const k = thing.gone ? Math.min(1, thing.gone / 0.3) : 0
      const pop = thing.gone ? 1 + k * 0.6 : 1
      ctx.globalAlpha = 1 - k
      if (thing.kind === 'hazard') this.drawMine(x, y, TUNING.hazardR * s * pop, t, thing)
      else if (thing.kind === 'coin') this.drawCoin(x, y - k * 30 * s, TUNING.coinR * s * pop, t + thing.id)
      else this.drawHeart(x, y - k * 30 * s, 16 * s * pop, t)
      ctx.globalAlpha = 1
    }
    if (this.seenGone.size > 400) this.seenGone.clear()

    // --- blast ring ----------------------------------------------------------
    if (world.blastK >= 0 && phase === 'playing') {
      const k = world.blastK
      const cy = Y(PLAYER_Y - (TUNING.blastNear + (TUNING.blastFar - TUNING.blastNear) * k))
      ctx.strokeStyle = C.yellow
      ctx.globalAlpha = 1 - k
      ctx.lineWidth = 6 * s
      ctx.beginPath()
      ctx.ellipse(X(world.x), cy, (20 + 40 * k) * s, (10 + 20 * k) * s, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // --- player ------------------------------------------------------------
    if (phase === 'playing' && world.hp < this.lastHp) this.burst(X(world.x), Y(PLAYER_Y), [C.red, C.cream], 10, s)
    this.lastHp = world.hp
    const blink = world.invincible > 0 && Math.floor(t * 12) % 2 === 0 // invincibility flicker
    if (!blink) this.drawPlayer(X(world.x), Y(PLAYER_Y), PLAYER_R * s, (LANE_X[world.lane] - world.x) / 120, t)

    // --- particles -----------------------------------------------------------
    this.particles = this.particles.filter((p) => (p.life += dt) < p.max)
    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 600 * dt
      const k = 1 - p.life / p.max
      ctx.fillStyle = p.color
      ctx.strokeStyle = INK
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * k + 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }

  private burst(x: number, y: number, colors: string[], n: number, s: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const v = (120 + Math.random() * 260) * s
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200 * s, life: 0, max: 0.4 + Math.random() * 0.3, color: colors[i % colors.length], r: (4 + Math.random() * 5) * s })
    }
  }

  /** Ink body: hard drop shadow, fill, thick outline (the toy-card recipe). */
  private blob(x: number, y: number, r: number, fill: string, drop = 0.18) {
    const { ctx } = this
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.arc(x, y + r * drop, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = Math.max(2, r * 0.12)
    ctx.strokeStyle = INK
    ctx.stroke()
  }

  private drawPlayer(x: number, y: number, r: number, lean: number, t: number) {
    const { ctx } = this
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(lean * 0.5)
    this.blob(0, 0, r, C.cream)
    ctx.fillStyle = C.purple
    ctx.beginPath()
    ctx.arc(0, -r * 0.05, r * 0.72, Math.PI, 0) // cap
    ctx.fill()
    const bob = Math.sin(t * 10) * r * 0.04
    for (const sx of [-1, 1]) {
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.ellipse(sx * r * 0.32, r * 0.18 + bob, r * 0.11, r * 0.16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(sx * r * 0.32 + r * 0.04, r * 0.11 + bob, r * 0.05, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ff93a8' // blush
      ctx.beginPath()
      ctx.ellipse(sx * r * 0.58, r * 0.42, r * 0.12, r * 0.07, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private drawMine(x: number, y: number, r: number, t: number, thing: Thing) {
    const { ctx } = this
    ctx.lineWidth = Math.max(2, r * 0.12)
    ctx.strokeStyle = INK
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      ctx.fillStyle = '#666c7a'
      ctx.beginPath()
      ctx.arc(x + Math.cos(a) * r * 1.12, y + Math.sin(a) * r * 1.12, r * 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    this.blob(x, y, r, C.navy)
    // Lamp pulses like a siren — saturated red is reserved for danger.
    const pulse = 0.6 + 0.4 * Math.sin(t * 8 + thing.id)
    ctx.fillStyle = C.red
    ctx.globalAlpha *= pulse
    ctx.beginPath()
    ctx.arc(x, y - r * 0.45, r * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = thing.gone ? 1 - Math.min(1, thing.gone / 0.3) : 1
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(x + sx * r * 0.34, y + r * 0.1, r * 0.18, r * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.arc(x + sx * r * 0.3, y + r * 0.14, r * 0.08, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawCoin(x: number, y: number, r: number, t: number) {
    const { ctx } = this
    const squash = Math.abs(Math.cos(t * 3)) * 0.7 + 0.3 // spin read
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(squash, 1)
    this.blob(0, 0, r, C.gold, 0.12)
    ctx.fillStyle = '#fff3c4'
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 === 0 ? r * 0.55 : r * 0.24
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  private drawHeart(x: number, y: number, r: number, t: number) {
    const { ctx } = this
    const k = 1 + Math.sin(t * 6) * 0.08
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(k, k)
    const path = new Path2D()
    path.moveTo(0, r * 0.9)
    path.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.4)
    path.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9)
    ctx.translate(0, r * 0.2)
    ctx.fillStyle = INK
    ctx.fill(path)
    ctx.translate(0, -r * 0.2)
    ctx.fillStyle = C.pink
    ctx.fill(path)
    ctx.lineWidth = Math.max(2, r * 0.14)
    ctx.strokeStyle = INK
    ctx.stroke(path)
    ctx.restore()
  }
}
