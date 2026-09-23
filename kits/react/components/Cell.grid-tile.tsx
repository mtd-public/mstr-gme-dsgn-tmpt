import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { PIECE_COLOR_HEX } from '../game/pieces'
import type { PieceColor } from '../game/types'

export type MatchSide = 'top' | 'right' | 'bottom' | 'left'

const MATCH_BORDER = '2px solid #f2b705'

interface CellProps {
  color: PieceColor | null
  active?: boolean
  clearing?: boolean
  bursting?: boolean
  age?: number
  letter?: string
  /** Which edges of this cell face outward from a matched word, for a shared gold outline. */
  matchSides?: Set<MatchSide>
}

export function Cell({ color, active, clearing, bursting, age, letter, matchSides }: CellProps) {
  if (!color) return <div className="cell" />

  // Blocks stay axis-aligned at all times (no rotate keyframes) so they read as
  // rigid and upright, even mid-burst or after settling into a new position.
  const animate = bursting
    ? { opacity: [1, 1, 0], scale: [1, 1.3, 0.3], rotate: 0 }
    : clearing
      // Pulses to call out the match, then fades and shrinks away right as the
      // matched letters actually leave the board — a real exit, not a snap.
      ? { opacity: [1, 0.35, 1, 0.35, 0], scale: [1, 1.08, 1, 1.05, 0.4], rotate: 0 }
      : { opacity: 1, scale: 1, y: 0, rotate: 0 }

  const transition =
    bursting || clearing
      ? { duration: 0.38, ease: 'easeInOut' as const }
      : { type: 'spring' as const, stiffness: 500, damping: 30 }

  const style: CSSProperties = { background: PIECE_COLOR_HEX[color] }
  if (matchSides) {
    if (matchSides.has('top')) style.borderTop = MATCH_BORDER
    if (matchSides.has('right')) style.borderRight = MATCH_BORDER
    if (matchSides.has('bottom')) style.borderBottom = MATCH_BORDER
    if (matchSides.has('left')) style.borderLeft = MATCH_BORDER
  }

  return (
    <motion.div
      className={`cell cell--filled${active ? ' cell--active' : ''}`}
      style={style}
      initial={{ opacity: 0, scale: active ? 0.6 : 0.82, y: active ? 0 : -8, rotate: 0 }}
      animate={animate}
      transition={transition}
    >
      {letter && <span className="cell__letter">{letter}</span>}
      {typeof age === 'number' && age > 0 && <span className="cell__age">{age}</span>}
    </motion.div>
  )
}
