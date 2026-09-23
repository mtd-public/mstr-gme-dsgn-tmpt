/**
 * three.js renderer for the same World — a drop-in alternative to Render2D
 * (open the game with ?renderer=3d). Toy-ink style: smooth toy plastic, ink
 * outlines, soft shadows on a shadow-catcher plane, pastel light rig.
 *
 * Patterns shown here (all from the older games):
 *   - frameCamera: full board width always in view (splashy-fish)
 *   - pooled meshes, positioned from the World each frame; never create/destroy
 *     per spawn (prof-whip-dash)
 *   - shared materials; no per-object lights (dive-depths' per-bullet
 *     PointLights tanked FPS: cost = lit objects × lights)
 *   - DPR capped at 2, one shadow-casting light with a tight frustum
 */
import * as THREE from 'three'
import { BOARD_H, BOARD_W, LANE_X, PLAYER_R, PLAYER_Y, TUNING, type World } from './physics'
import type { Renderer } from './renderer'
import { ball, gradientTexture, inked, makeOutlineMaterial, plain, shadowCatcher, TOY, toy } from './toyKit'
import type { GamePhase } from './types'

const U = 1 / 20 // board units → world units
const FOV = 40
const PLAYER_VIEW_Y = 0.78
const POOL = { hazard: 16, coin: 40, heart: 4 }

const bx = (x: number) => (x - BOARD_W / 2) * U
const by = (y: number) => (BOARD_H / 2 - y) * U

export class Scene3D implements Renderer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(FOV, 0.5, 1, 200)
  private sun = new THREE.DirectionalLight(0xfff1dc, 2.4)
  private outline = makeOutlineMaterial(TOY.ink, 0.06)
  private player = new THREE.Group()
  private pools: Record<'hazard' | 'coin' | 'heart', THREE.Group[]> = { hazard: [], coin: [], heart: [] }
  private stripes: THREE.Mesh[] = []
  private scroll = 0

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.scene.background = gradientTexture(['#dccbf7', '#b9a3e8'])

    this.scene.add(new THREE.HemisphereLight(0xf1eaff, 0xa58cf2, 1.9))
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(1024, 1024)
    this.sun.shadow.bias = -0.0006
    this.sun.shadow.normalBias = 0.02
    this.scene.add(this.sun, this.sun.target)

    // Road: a flat slab, lane stripes that scroll, shadow catcher just above it.
    const road = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W * U, 200), toy(TOY.road, { roughness: 0.95 }))
    road.position.z = -1
    this.scene.add(road)
    const stripeGeo = new THREE.PlaneGeometry(6 * U, 46 * U)
    const stripeMat = toy(TOY.yellow)
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(stripeGeo, stripeMat)
      m.position.set(bx(i % 2 ? BOARD_W * 0.65 : BOARD_W * 0.35), 0, -0.99)
      this.scene.add(m)
      this.stripes.push(m)
    }
    const catcher = shadowCatcher(BOARD_W * U * 2, 200)
    catcher.position.z = -0.98
    this.scene.add(catcher)

    this.buildPlayer()
    const mineMat = toy(TOY.navy)
    const lampMat = toy(TOY.red, { emissive: TOY.red, emissiveIntensity: 1.2 })
    const nubMat = toy(0x666c7a)
    const coinMat = toy(TOY.gold, { roughness: 0.3 })
    const heartMat = toy(TOY.pink)
    const r = TUNING.hazardR * U
    for (let i = 0; i < POOL.hazard; i++) {
      const g = new THREE.Group()
      g.add(inked(ball(r), mineMat, this.outline))
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2
        const nub = inked(ball(r * 0.2), nubMat, this.outline)
        nub.position.set(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05, 0)
        g.add(nub)
      }
      const lamp = plain(ball(r * 0.2), lampMat)
      lamp.position.set(0, r * 0.4, r * 0.85)
      g.add(lamp)
      this.stock('hazard', g)
    }
    const coinGeo = new THREE.CylinderGeometry(TUNING.coinR * U, TUNING.coinR * U, 0.18, 20)
    for (let i = 0; i < POOL.coin; i++) {
      const c = inked(coinGeo, coinMat, this.outline)
      c.rotation.x = Math.PI / 2
      const g = new THREE.Group()
      g.add(c)
      this.stock('coin', g)
    }
    for (let i = 0; i < POOL.heart; i++) {
      const g = new THREE.Group()
      for (const s of [-1, 1]) {
        const lobe = inked(ball(0.45), heartMat, this.outline)
        lobe.position.set(s * 0.3, 0.2, 0)
        g.add(lobe)
      }
      const tip = inked(new THREE.ConeGeometry(0.62, 0.9, 16), heartMat, this.outline)
      tip.rotation.z = Math.PI
      tip.position.y = -0.3
      g.add(tip)
      this.stock('heart', g)
    }
  }

  private stock(kind: 'hazard' | 'coin' | 'heart', g: THREE.Group) {
    g.visible = false
    this.scene.add(g)
    this.pools[kind].push(g)
  }

  private buildPlayer() {
    const r = PLAYER_R * U
    const body = inked(ball(r), toy(TOY.cream), this.outline)
    const cap = inked(new THREE.SphereGeometry(r * 1.02, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), toy(TOY.purple), this.outline)
    cap.rotation.x = 0.3 // top half of the head, tipped toward the camera
    const eyeMat = toy(TOY.eye, { roughness: 0.3 })
    const blushMat = toy(TOY.blush, { roughness: 0.8 })
    this.player.add(body, cap)
    for (const s of [-1, 1]) {
      const eye = plain(ball(r * 0.13), eyeMat)
      eye.scale.set(1, 1.4, 0.6)
      eye.position.set(s * r * 0.32, -r * 0.2, r * 0.92)
      const blush = plain(ball(r * 0.12), blushMat)
      blush.scale.set(1.2, 0.7, 0.4)
      blush.position.set(s * r * 0.58, -r * 0.42, r * 0.8)
      this.player.add(eye, blush)
    }
    this.scene.add(this.player)
  }

  /** Full board width on screen whatever the container shape (splashy-fish). */
  private frameCamera(aspect: number) {
    const visibleW = BOARD_W * U
    const visibleH = visibleW / aspect
    const centerY = by(PLAYER_Y) + visibleH * (PLAYER_VIEW_Y - 0.5)
    const dist = visibleH / 2 / Math.tan((FOV / 2) * (Math.PI / 180))
    this.camera.aspect = aspect
    this.camera.position.set(0, centerY, dist)
    this.camera.lookAt(0, centerY, 0)
    this.camera.updateProjectionMatrix()
    this.sun.target.position.set(0, centerY, 0)
    this.sun.position.set(-8, centerY + 10, 30)
    const cam = this.sun.shadow.camera
    cam.left = -visibleW
    cam.right = visibleW
    cam.top = visibleH
    cam.bottom = -visibleH
    cam.near = 1
    cam.far = 80
    cam.updateProjectionMatrix()
  }

  resize(width: number, height: number) {
    if (!width || !height) return
    this.renderer.setSize(width, height, false)
    this.frameCamera(width / height)
  }

  update(world: World, phase: GamePhase, dt: number, t: number) {
    if (phase !== 'paused') this.scroll += world.speed * dt * U
    const span = 92 * U * 20
    this.stripes.forEach((m, i) => {
      const base = Math.floor(i / 2) * 92 * U
      m.position.y = ((((base - this.scroll) % span) + span) % span) - span / 2 + by(PLAYER_Y)
    })

    const blink = world.invincible > 0 && Math.floor(t * 12) % 2 === 0
    this.player.visible = !blink
    this.player.position.set(bx(world.x), by(PLAYER_Y) + Math.sin(t * 10) * 0.05, PLAYER_R * U)
    this.player.rotation.z = -(LANE_X[world.lane] - world.x) / 200

    const used = { hazard: 0, coin: 0, heart: 0 }
    for (const thing of world.things) {
      const g = this.pools[thing.kind][used[thing.kind]++]
      if (!g) continue
      g.visible = true
      const k = thing.gone ? Math.min(1, thing.gone / 0.3) : 0
      g.position.set(bx(LANE_X[thing.lane]), by(thing.y), (thing.kind === 'hazard' ? TUNING.hazardR : 18) * U + k * 1.5)
      g.scale.setScalar(thing.gone ? Math.max(0.01, 1 + k * 0.6 - k * k * 1.5) : 1)
      if (thing.kind === 'coin') g.rotation.y = t * 3 + thing.id
      else if (thing.kind === 'heart') g.rotation.y = Math.sin(t * 2) * 0.6
      else g.rotation.z = Math.sin(t * 1.6 + thing.id) * 0.15
    }
    for (const kind of ['hazard', 'coin', 'heart'] as const) {
      for (let i = used[kind]; i < this.pools[kind].length; i++) this.pools[kind][i].visible = false
    }

    const shake = phase === 'playing' ? world.shake * 0.3 : 0
    this.camera.position.x = (Math.random() - 0.5) * shake
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) m.geometry.dispose()
    })
    this.renderer.dispose()
  }
}
