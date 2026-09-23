import { motion } from 'framer-motion'
import type { GameState } from '../game/types'
import { NextPiece } from './NextPiece'

function Stat({ label, value, duplicate }: { label: string; value: number; duplicate?: boolean }) {
  return (
    <div className={`stat${duplicate ? ' stat--duplicate' : ''}`}>
      <span className="stat__label">{label}</span>
      <motion.span
        key={value}
        className="stat__value"
        initial={{ scale: 1.25, color: 'var(--accent)' }}
        animate={{ scale: 1, color: 'var(--text)' }}
        transition={{ duration: 0.3 }}
      >
        {value.toLocaleString()}
      </motion.span>
    </div>
  )
}

export function StatsSidebar({ state }: { state: GameState }) {
  const upcoming = state.nextQueue[0]

  return (
    <aside className="stats-sidebar">
      <div className="stats-sidebar__section">
        <span className="stat__label">Next</span>
        {upcoming && <NextPiece entry={upcoming} />}
      </div>
      <div className="stats-sidebar__stats">
        {/* Score and Words already show in the topbar — hidden here on the
            compact phone/tablet-portrait strip, shown alongside Level on
            the wide (desktop/tablet-landscape) card. */}
        <Stat label="Score" value={state.score} duplicate />
        <Stat label="Level" value={state.level} />
        <Stat label="Words" value={state.words} duplicate />
      </div>
    </aside>
  )
}
