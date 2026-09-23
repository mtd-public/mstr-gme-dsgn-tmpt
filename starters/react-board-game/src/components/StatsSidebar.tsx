import { motion } from 'framer-motion'
import type { GameState } from '../game/types'

/** A number that pops (scale + accent colour) whenever it changes — key={value} re-mounts it. */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
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

/** Wide layouts only (landscape / desktop). Portrait hides it: the topbar and in-board HUD cover it. */
export function StatsSidebar({ state }: { state: GameState }) {
  return (
    <aside className="stats-sidebar">
      <Stat label="Best" value={state.best} />
      <Stat label="Score" value={state.score} />
      <Stat label="Coins" value={state.coins} />
      <Stat label="Level" value={state.level} />
    </aside>
  )
}
