import { AnimatePresence, motion } from 'framer-motion'
import type { GamePhase } from '../game/types'

interface GameOverlayProps {
  phase: GamePhase
  score: number
  onStart: () => void
  onResume: () => void
  onNewGame: () => void
}

export function GameOverlay({ phase, score, onStart, onResume, onNewGame }: GameOverlayProps) {
  const visible = phase === 'ready' || phase === 'paused' || phase === 'over'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="overlay__card"
            initial={{ y: 16, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {phase === 'ready' && (
              <>
                <h2>Word Drop</h2>
                <p>Clear lines, chase the high score.</p>
                <button type="button" className="btn btn--primary" onClick={onStart}>
                  Start game
                </button>
              </>
            )}
            {phase === 'paused' && (
              <>
                <h2>Paused</h2>
                <button type="button" className="btn btn--primary" onClick={onResume}>
                  Resume
                </button>
              </>
            )}
            {phase === 'over' && (
              <>
                <h2>Game over</h2>
                <p>Score: {score.toLocaleString()}</p>
                <button type="button" className="btn btn--primary" onClick={onNewGame}>
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
