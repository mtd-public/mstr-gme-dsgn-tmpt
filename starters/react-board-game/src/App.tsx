import { GameCanvas } from './components/GameCanvas'
import { GameOverlay } from './components/GameOverlay'
import { Hud } from './components/Hud'
import { KeyboardHelp } from './components/KeyboardHelp'
import { StatsSidebar } from './components/StatsSidebar'
import { useGameEngine } from './game/useGameEngine'
import { useBoardControls } from './hooks/useBoardControls'

/**
 * The shell (generic-game-template → splashy-fish → prof-whip-dash lineage):
 *   topbar  — wordmark, score pill, help, pause (Pause lives top-right: the
 *             bottom ~12% of a phone belongs to the thumb + home indicator)
 *   board   — canvas + HUD + depth badge + overlay + portrait action bar
 *   sidebar — wide layouts only
 *   footer  — ◀ ACTION ▶ for landscape / desktop only
 * Layout switching is pure CSS (styles/index.css); no JS breakpoints.
 */
export default function App() {
  const { state, world, toast, start, togglePause, moveLeft, moveRight, action } = useGameEngine()
  const playable = state.phase === 'playing'
  const controls = useBoardControls({ onLeft: moveLeft, onRight: moveRight })

  return (
    <div className="app">
      <header className="topbar" data-touch-allow>
        <h1 className="wordmark">
          Starter <span className="accent">Dash</span>
        </h1>
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
        <div className="board-shell" {...controls}>
          <GameCanvas world={world} phase={state.phase} />
          {state.phase !== 'ready' && <Hud state={state} toast={toast} />}
          <div className="depth-badge">
            <span className="depth-badge__label">Lv</span>
            <span className="depth-badge__value">{state.level}</span>
          </div>
          <GameOverlay state={state} onStart={start} onResume={togglePause} />

          {/* Portrait's action control: a wide pill across the bottom of the
              board, reachable by either thumb. It stops its own pointer events
              so pressing it never also counts as a board tap / lane change. */}
          <button
            type="button"
            className="action-tap"
            aria-label="Blast"
            disabled={!playable}
            onPointerDown={(e) => {
              e.stopPropagation()
              action()
            }}
            onPointerUp={(e) => e.stopPropagation()}
          >
            Blast
          </button>
        </div>

        <StatsSidebar state={state} />
      </main>

      <div className="footer-bar" data-touch-allow>
        <button type="button" className="btn btn--footer-side" onClick={moveLeft} disabled={!playable} aria-label="Move left">
          ◀
        </button>
        <button type="button" className="btn btn--primary btn--action" onClick={action} disabled={!playable}>
          Blast
        </button>
        <button type="button" className="btn btn--footer-side" onClick={moveRight} disabled={!playable} aria-label="Move right">
          ▶
        </button>
      </div>
    </div>
  )
}
