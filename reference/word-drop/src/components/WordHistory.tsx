import { motion } from 'framer-motion'
import type { FoundWord } from '../game/types'

export function WordHistory({ words }: { words: FoundWord[] }) {
  return (
    <div className="history">
      <span className="stat__label">Words found</span>
      {words.length === 0 ? (
        <p className="history__empty">No words yet — spell one out on the board.</p>
      ) : (
        <table className="history__table">
          <tbody>
            {words.map((entry, i) => (
              <motion.tr
                key={`${entry.word}-${words.length - i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                <td className="history__word">{entry.word}</td>
                <td className="history__points">+{entry.points}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
