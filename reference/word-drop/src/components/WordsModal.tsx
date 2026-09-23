import { AnimatePresence, motion } from 'framer-motion'
import type { FoundWord } from '../game/types'
import { WordHistory } from './WordHistory'

interface WordsModalProps {
  open: boolean
  onClose: () => void
  words: FoundWord[]
}

export function WordsModal({ open, onClose, words }: WordsModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="words-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="words-modal-sheet"
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="words-modal-sheet__head">
              <span className="words-modal-sheet__paused">Paused</span>
              <button type="button" className="words-modal-sheet__close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
            <WordHistory words={words} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
