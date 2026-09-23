import { AnimatePresence, motion } from 'framer-motion'
import type { WordMatch } from '../game/types'

export function WordToast({ matches }: { matches: WordMatch[] }) {
  return (
    <div className="word-toast">
      <AnimatePresence>
        {matches.map((match, i) => (
          <motion.span
            key={`${match.word}-${i}`}
            className="word-toast__pill"
            initial={{ opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          >
            {match.word}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
