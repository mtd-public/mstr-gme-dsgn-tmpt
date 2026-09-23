export type GamePhase = 'ready' | 'playing' | 'paused' | 'over'

/**
 * What React renders. Everything here is a *snapshot* of the World, pushed
 * from the rAF loop at HUD_HZ — never read per-frame values (positions, eased
 * lanes) from React state; renderers read the world ref directly.
 */
export interface GameState {
  phase: GamePhase
  score: number
  best: number
  coins: number
  /** Metres travelled. */
  dist: number
  hp: number
  level: number
  /** 0–1 progress through the current level (drives the level meter). */
  levelProgress: number
  /** Metres left before the next level. */
  toNextLevel: number
}

export type ToastTone = 'gold' | 'hazard' | 'good'

export interface Toast {
  key: number
  text: string
  tone: ToastTone
}
