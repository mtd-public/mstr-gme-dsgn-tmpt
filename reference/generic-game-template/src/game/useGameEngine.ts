import { useCallback, useEffect, useReducer } from 'react'
import type { GameState } from './types'

const SCORE_PER_ACTION = 10

function initialState(): GameState {
  return { phase: 'ready', score: 0, level: 1, bonus: 0 }
}

type Action = { type: 'START' } | { type: 'PAUSE_TOGGLE' } | { type: 'ACTION' } | { type: 'NEW_GAME' }

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START':
      return state.phase === 'ready' ? { ...state, phase: 'playing' } : state

    case 'PAUSE_TOGGLE':
      if (state.phase === 'playing') return { ...state, phase: 'paused' }
      if (state.phase === 'paused') return { ...state, phase: 'playing' }
      return state

    case 'ACTION': {
      if (state.phase !== 'playing') return state
      const score = state.score + SCORE_PER_ACTION
      return { ...state, score, level: Math.floor(score / 100) + 1, bonus: state.bonus + 1 }
    }

    case 'NEW_GAME':
      return { ...initialState(), phase: 'playing' }

    default:
      return state
  }
}

/**
 * Stub game loop wiring up the shell's controls (move/rotate/drop, pause,
 * start, new game) to a placeholder score/level/bonus counter — swap this
 * reducer out for real game logic while keeping the same return shape so
 * the shell components need no changes.
 */
export function useGameEngine() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  const moveLeft = useCallback(() => dispatch({ type: 'ACTION' }), [])
  const moveRight = useCallback(() => dispatch({ type: 'ACTION' }), [])
  const rotate = useCallback(() => dispatch({ type: 'ACTION' }), [])
  const hardDrop = useCallback(() => dispatch({ type: 'ACTION' }), [])
  const start = useCallback(() => dispatch({ type: 'START' }), [])
  const togglePause = useCallback(() => dispatch({ type: 'PAUSE_TOGGLE' }), [])
  const newGame = useCallback(() => dispatch({ type: 'NEW_GAME' }), [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          moveLeft()
          break
        case 'ArrowRight':
          event.preventDefault()
          moveRight()
          break
        case 'ArrowUp':
        case 'x':
        case 'X':
          event.preventDefault()
          rotate()
          break
        case 'ArrowDown':
        case ' ':
          event.preventDefault()
          hardDrop()
          break
        case 'p':
        case 'P':
          togglePause()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [moveLeft, moveRight, rotate, hardDrop, togglePause])

  return { state, moveLeft, moveRight, rotate, hardDrop, start, togglePause, newGame }
}
