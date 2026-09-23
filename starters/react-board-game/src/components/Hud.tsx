import { AnimatePresence, motion } from 'framer-motion'
import type { GameState, Toast } from '../game/types'

interface HudProps {
  state: GameState
  toast: Toast | null
}

/**
 * In-board HUD (pointer-events: none — it must never steal a swipe).
 * - Health: ONE long bar with quarter marks (countable hits without chopping
 *   it into segments), turns hazard red + pulses under 34 (prof-whip-dash).
 * - Level meter: thin bar filling across one level, "Lv n" tag, and a readout
 *   of metres to the next level — pacing the raw distance number never had.
 * - Toast: keyed so each new one re-animates; one at a time, centre-ish.
 * - Grit: a bottom-edge vignette that carries low-health / danger in the
 *   player's peripheral vision.
 */
export function Hud({ state, toast }: HudProps) {
  const low = state.hp <= 34
  return (
    <div className="hud" aria-hidden="true">
      <div className="hud__top">
        <div className={`health${low ? ' health--low' : ''}`}>
          <i style={{ width: `${Math.max(0, state.hp)}%` }} />
          {[25, 50, 75].map((q) => (
            <u key={q} style={{ left: `${q}%` }} />
          ))}
        </div>
        <div className="level">
          <div className="level__bar">
            <i style={{ width: `${Math.round(state.levelProgress * 100)}%` }} />
          </div>
          <span className="level__tag">Lv {state.level}</span>
        </div>
        <div className="readout">
          <span>
            <b>{state.coins}</b> coins
          </span>
          <span>
            <b>{Math.ceil(state.toNextLevel)}</b> m to Lv {state.level + 1}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            className={`toast toast--${toast.tone}`}
            initial={{ opacity: 0, y: 14, scale: 0.7 }}
            animate={{ opacity: 1, y: -18, scale: 1 }}
            exit={{ opacity: 0, y: -44 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grit" style={{ opacity: low ? 0.85 : 0 }} data-critical={low ? 'true' : undefined} />
    </div>
  )
}
