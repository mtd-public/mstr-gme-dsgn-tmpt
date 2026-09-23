import type { FoundWord } from '../game/types'
import { WordHistory } from './WordHistory'

export function WordsSidebar({ words }: { words: FoundWord[] }) {
  return (
    <aside className="words-sidebar">
      <WordHistory words={words} />
    </aside>
  )
}
