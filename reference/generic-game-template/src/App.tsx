import { GameOverlay } from './components/GameOverlay'
import { KeyboardHelp } from './components/KeyboardHelp'
import { StatsSidebar } from './components/StatsSidebar'
import { useGameEngine } from './game/useGameEngine'
import { useSwipeControls } from './hooks/useSwipeControls'

export default function App() {
  const { state, moveLeft, moveRight, rotate, hardDrop, start, togglePause, newGame } = useGameEngine()
  const playable = state.phase === 'playing'
  const swipeHandlers = useSwipeControls({ onSwipeLeft: moveLeft, onSwipeRight: moveRight, onSwipeDown: hardDrop })

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="wordmark">Game Template</h1>
        <div className="topbar__stats">
          <span className="topbar__stat">
            <span className="stat__label">Score</span> {state.score.toLocaleString()}
          </span>
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
        <div className="board-shell" {...swipeHandlers}>
          <div className="board-shell__placeholder">Game content goes here</div>
          <GameOverlay
            phase={state.phase}
            score={state.score}
            onStart={start}
            onResume={togglePause}
            onNewGame={newGame}
          />
        </div>

        <StatsSidebar state={state} />
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
          aria-label="Rotate"
        >
          ↻ Rotate
        </button>
        <button type="button" className="btn btn--footer-side" onClick={moveRight} disabled={!playable} aria-label="Move right">
          ▶
        </button>
      </div>
    </div>
  )
}
