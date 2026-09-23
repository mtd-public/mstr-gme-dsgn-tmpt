import { AnimatePresence, motion } from 'framer-motion'
import type { GameState } from '../game/types'

interface GameOverlayProps {
  state: GameState
  onStart: () => void
  onResume: () => void
}

/** Phase-driven start / pause / game-over card over the (still rendering) board. */
export function GameOverlay({ state, onStart, onResume }: GameOverlayProps) {
  const visible = state.phase !== 'playing'
  const record = state.phase === 'over' && state.score > 0 && state.score >= state.best

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`overlay${state.phase === 'ready' ? ' overlay--attract' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="overlay__card"
            data-touch-allow
            initial={{ y: 16, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {state.phase === 'ready' && (
              <>
                <h2>
                  Starter <span className="accent">Dash</span>
                </h2>
                <p>Swipe or tap a side to change lane. Blast what's ahead. Grab the gold.</p>
                <button type="button" className="btn btn--primary" onClick={onStart}>
                  Start
                </button>
              </>
            )}
            {state.phase === 'paused' && (
              <>
                <h2>Paused</h2>
                <button type="button" className="btn btn--primary" onClick={onResume}>
                  Resume
                </button>
              </>
            )}
            {state.phase === 'over' && (
              <>
                <h2>Crashed!</h2>
                <div className="scoreline">
                  <div>
                    <span>Score</span>
                    <b>{state.score.toLocaleString()}</b>
                  </div>
                  <div>
                    <span>Coins</span>
                    <b>{state.coins}</b>
                  </div>
                  <div>
                    <span>Level</span>
                    <b>{state.level}</b>
                  </div>
                </div>
                <p>{record ? 'New best!' : `Best ${state.best.toLocaleString()}`}</p>
                <button type="button" className="btn btn--primary" onClick={onStart}>
                  Play again
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
