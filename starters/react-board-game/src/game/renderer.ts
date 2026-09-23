import type { World } from './physics'
import type { GamePhase } from './types'

/**
 * Every renderer implements this and nothing else talks to it. GameCanvas
 * picks one; physics and React never know which. (dive-depths shipped
 * three.js → pixel Render2D → two-tone RenderTwoTone behind this exact
 * interface without changing a line of gameplay.)
 *
 * Renderers own NO game state. They read `world` every frame and may keep
 * purely visual state (particles, eased positions, pools) of their own.
 */
export interface Renderer {
  resize(width: number, height: number): void
  update(world: World, phase: GamePhase, dt: number, time: number): void
  dispose(): void
}
