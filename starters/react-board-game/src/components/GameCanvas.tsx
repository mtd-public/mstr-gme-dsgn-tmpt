import { useEffect, useRef } from 'react'
import type { World } from '../game/physics'
import { Render2D } from '../game/render2d'
import type { Renderer } from '../game/renderer'
import { Scene3D } from '../game/scene3d'
import type { GamePhase } from '../game/types'

interface GameCanvasProps {
  world: { current: World }
  phase: GamePhase
}

/** ?renderer=3d swaps in the three.js scene — same World, same interface. */
function makeRenderer(canvas: HTMLCanvasElement): Renderer {
  const wanted = new URLSearchParams(window.location.search).get('renderer')
  if (wanted === '3d') {
    try {
      return new Scene3D(canvas)
    } catch {
      /* no WebGL (old device, blocked context) — fall back to 2D */
    }
  }
  return new Render2D(canvas)
}

/**
 * Owns the render loop and nothing else: canvas + ResizeObserver on the
 * PARENT (the board shell decides the size; the canvas just fills it) + its
 * own requestAnimationFrame. It reads the world ref; it never writes to it.
 * Engine-agnostic — copied verbatim between splashy-fish, prof-whip-dash
 * and dive-depths.
 */
export function GameCanvas({ world, phase }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return

    const renderer = makeRenderer(canvas)
    const resize = () => renderer.resize(parent.clientWidth, parent.clientHeight)
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(parent)

    let raf = 0
    let last = performance.now()
    const frame = (ts: number) => {
      const dt = Math.max(0, Math.min((ts - last) / 1000, 1 / 30))
      last = ts
      renderer.update(world.current, phaseRef.current, dt, ts / 1000)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      renderer.dispose()
    }
  }, [world])

  return <canvas ref={canvasRef} className="game-canvas" />
}
