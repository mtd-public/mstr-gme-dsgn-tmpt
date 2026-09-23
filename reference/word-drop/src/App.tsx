import { useRef, useState } from 'react'
import { Board } from './components/Board'
import { GameOverlay } from './components/GameOverlay'
import { KeyboardHelp } from './components/KeyboardHelp'
import { StatsSidebar } from './components/StatsSidebar'
import { WordsModal } from './components/WordsModal'
import { WordToast } from './components/WordToast'
import { WordsSidebar } from './components/WordsSidebar'
import { useGameEngine } from './game/useGameEngine'
import { useSwipeControls } from './hooks/useSwipeControls'

export default function App() {
  const { state, moveLeft, moveRight, rotate, hardDrop, start, togglePause, newGame } = useGameEngine()
  const playable = state.phase === 'playing'
  const swipeHandlers = useSwipeControls({ onSwipeLeft: moveLeft, onSwipeRight: moveRight, onSwipeDown: hardDrop })

  const [wordsOpen, setWordsOpen] = useState(false)
  const autoPausedRef = useRef(false)

  function openWords() {
    if (state.phase === 'playing') {
      togglePause()
      autoPausedRef.current = true
    }
    setWordsOpen(true)
  }

  function closeWords() {
    setWordsOpen(false)
    if (autoPausedRef.current) {
      togglePause()
      autoPausedRef.current = false
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="wordmark">Word Drop</h1>
        <div className="topbar__stats">
          <span className="topbar__stat">
            <span className="stat__label">Score</span> {state.score.toLocaleString()}
          </span>
          <button type="button" className="topbar__words-btn" onClick={openWords}>
            <span className="stat__label">Words</span> {state.words}
          </button>
        </div>
        <div className="topbar__actions">
          <KeyboardHelp />
          <button
            type="button"
            className="btn btn--ghost"
            onClick={togglePause}
            disabled={state.phase !== 'playing' && state.phase !== 'paused'}
          >
            {state.phase === 'paused' ? 'Resume' : 'Pause'}
          </button>
        </div>
      </header>

      <main className="layout">
        <div className="side-panels">
          <StatsSidebar state={state} />
          <WordsSidebar words={state.wordHistory} />
        </div>

        <div className="board-shell" {...swipeHandlers}>
          <Board state={state} />
          <WordToast matches={state.phase === 'clearing' ? state.wordMatches : []} />
          <GameOverlay
            phase={state.phase}
            score={state.score}
            onStart={start}
            onResume={togglePause}
            onNewGame={newGame}
          />
        </div>
      </main>

      <div className="footer-bar">
        <button type="button" className="btn btn--footer-side" onClick={moveLeft} disabled={!playable} aria-label="Move left">
          ◀
        </button>
        <button
          type="button"
          className="btn btn--rotate btn--footer-rotate"
          onClick={rotate}
          disabled={!playable}
          aria-label="Rotate piece"
        >
          ↻ Rotate
        </button>
        <button type="button" className="btn btn--footer-side" onClick={moveRight} disabled={!playable} aria-label="Move right">
          ▶
        </button>
      </div>

      <WordsModal open={wordsOpen} onClose={closeWords} words={state.wordHistory} />
    </div>
  )
}
