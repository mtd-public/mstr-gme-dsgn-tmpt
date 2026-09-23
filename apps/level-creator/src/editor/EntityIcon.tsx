import { useEffect, useRef } from 'react'
import { drawEntity } from '../engine/draw.ts'
import type { EntityType } from '../spec/schema.ts'

/** A palette swatch drawn with the same `drawEntity` as the grid and the game. */
export function EntityIcon({ entity, ink, floor, size = 28 }: { entity: EntityType; ink: string; floor: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = size * dpr
    c.height = size * dpr
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = floor
    ctx.fillRect(0, 0, size, size)
    drawEntity(ctx, entity, ink, size / 2, size / 2, size, { glyph: true, face: entity.kind === 'player' || entity.kind === 'enemy' })
  }, [entity, ink, floor, size])
  return <canvas ref={ref} className="entity-icon" style={{ width: size, height: size }} aria-hidden="true" />
}
