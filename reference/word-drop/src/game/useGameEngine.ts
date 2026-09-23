import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  ageCells,
  createEmptyGrid,
  findExpiredCells,
  isValidPosition,
  mergePiece,
  resolveRemovals,
  settleColumns,
} from './board'
import { cellsFor, randomLettersFor, shuffledBag } from './pieces'
import { dropIntervalForLevel, levelForWords, pointsForWord } from './scoring'
import { findWordMatches } from './words'
import type { ActivePiece, GameState, QueueEntry } from './types'

const SPAWN_COL = 3
const SPAWN_ROW = -1
const CLEAR_ANIMATION_MS = 380
const WALL_KICKS = [0, -1, 1, -2, 2]

function spawnPiece(entry: QueueEntry): ActivePiece {
  return { type: entry.type, rotation: 0, row: SPAWN_ROW, col: SPAWN_COL, letters: entry.letters }
}

function makeQueue(existing: QueueEntry[]): QueueEntry[] {
  const queue = [...existing]
  while (queue.length < 8) {
    queue.push(...shuffledBag().map((type) => ({ type, letters: randomLettersFor(type) })))
  }
  return queue
}

function initialState(): GameState {
  const queue = makeQueue([])
  const [first, ...rest] = queue
  return {
    grid: createEmptyGrid(),
    active: spawnPiece(first),
    nextQueue: rest,
    score: 0,
    level: 1,
    words: 0,
    phase: 'ready',
    wordMatches: [],
    wordHistory: [],
    destructingCells: [],
    dropIntervalMs: dropIntervalForLevel(1),
  }
}

type Action =
  | { type: 'START' }
  | { type: 'PAUSE_TOGGLE' }
  | { type: 'MOVE'; dir: -1 | 1 }
  | { type: 'ROTATE' }
  | { type: 'SOFT_DROP' }
  | { type: 'HARD_DROP' }
  | { type: 'TICK' }
  | { type: 'RESOLVE_CLEAR' }
  | { type: 'NEW_GAME' }

function trySpawnNext(state: GameState): GameState {
  const queue = makeQueue(state.nextQueue)
  const [nextEntry, ...rest] = queue
  const piece = spawnPiece(nextEntry)
  const grid = state.grid
  if (!isValidPosition(grid, piece)) {
    return { ...state, active: piece, nextQueue: rest, phase: 'over' }
  }
  return { ...state, active: piece, nextQueue: rest, phase: 'playing' }
}

function lockActivePiece(state: GameState): GameState {
  const merged = mergePiece(state.grid, state.active)

  // The cells this piece just placed are exempt from aging this turn.
  const justPlaced = new Set(
    cellsFor(state.active.type, state.active.rotation).map(
      ([dr, dc]) => `${state.active.row + dr}-${state.active.col + dc}`,
    ),
  )
  const aged = ageCells(merged, justPlaced)
  const expiredCells = findExpiredCells(aged)
  const wordMatches = findWordMatches(aged)

  if (expiredCells.length > 0 || wordMatches.length > 0) {
    // Score counts the instant a match locks in — the flash/burst that follows
    // is purely visual, not a gate on when points land.
    const words = state.words + wordMatches.length
    const level = levelForWords(words)
    const found = wordMatches.map((m) => ({ word: m.word, points: pointsForWord(m.word, state.level) }))
    const scoreGain = found.reduce((sum, f) => sum + f.points, 0)
    return {
      ...state,
      grid: aged,
      wordMatches,
      wordHistory: [...found.reverse(), ...state.wordHistory],
      destructingCells: expiredCells,
      phase: 'clearing',
      words,
      level,
      score: state.score + scoreGain,
      dropIntervalMs: dropIntervalForLevel(level),
    }
  }

  // Nothing to clear or destruct — but pieces can still overhang gaps, so settle now.
  return trySpawnNext({ ...state, grid: settleColumns(aged) })
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START':
      return state.phase === 'ready' ? { ...state, phase: 'playing' } : state

    case 'PAUSE_TOGGLE':
      if (state.phase === 'playing') return { ...state, phase: 'paused' }
      if (state.phase === 'paused') return { ...state, phase: 'playing' }
      return state

    case 'MOVE': {
      if (state.phase !== 'playing') return state
      const moved: ActivePiece = { ...state.active, col: state.active.col + action.dir }
      return isValidPosition(state.grid, moved) ? { ...state, active: moved } : state
    }

    case 'ROTATE': {
      if (state.phase !== 'playing') return state
      const rotation = (state.active.rotation + 1) % 4
      for (const kick of WALL_KICKS) {
        const candidate: ActivePiece = { ...state.active, rotation, col: state.active.col + kick }
        if (isValidPosition(state.grid, candidate)) {
          return { ...state, active: candidate }
        }
      }
      return state
    }

    case 'SOFT_DROP':
    case 'TICK': {
      if (state.phase !== 'playing') return state
      const moved: ActivePiece = { ...state.active, row: state.active.row + 1 }
      if (isValidPosition(state.grid, moved)) {
        return { ...state, active: moved }
      }
      return lockActivePiece(state)
    }

    case 'HARD_DROP': {
      if (state.phase !== 'playing') return state
      let piece = state.active
      while (isValidPosition(state.grid, { ...piece, row: piece.row + 1 })) {
        piece = { ...piece, row: piece.row + 1 }
      }
      return lockActivePiece({ ...state, active: piece })
    }

    case 'RESOLVE_CLEAR': {
      if (state.phase !== 'clearing') return state
      const matchedCells = state.wordMatches.flatMap((m) => m.cells)
      const grid = resolveRemovals(state.grid, [...matchedCells, ...state.destructingCells])
      return trySpawnNext({
        ...state,
        grid,
        wordMatches: [],
        destructingCells: [],
      })
    }

    case 'NEW_GAME':
      return { ...initialState(), phase: 'playing' }

    default:
      return state
  }
}

export function useGameEngine() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  // Gravity tick, paced by the current level's drop interval.
  useEffect(() => {
    if (state.phase !== 'playing') return
    const id = window.setInterval(() => dispatch({ type: 'TICK' }), state.dropIntervalMs)
    return () => window.clearInterval(id)
  }, [state.phase, state.dropIntervalMs])

  // Match flash/burst plays first, then the matched cells actually collapse.
  useEffect(() => {
    if (state.phase !== 'clearing') return
    const id = window.setTimeout(() => dispatch({ type: 'RESOLVE_CLEAR' }), CLEAR_ANIMATION_MS)
    return () => window.clearTimeout(id)
  }, [state.phase, state.wordMatches])

  const moveLeft = useCallback(() => dispatch({ type: 'MOVE', dir: -1 }), [])
  const moveRight = useCallback(() => dispatch({ type: 'MOVE', dir: 1 }), [])
  const rotate = useCallback(() => dispatch({ type: 'ROTATE' }), [])
  const softDrop = useCallback(() => dispatch({ type: 'SOFT_DROP' }), [])
  const hardDrop = useCallback(() => dispatch({ type: 'HARD_DROP' }), [])
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
          event.preventDefault()
          softDrop()
          break
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
  }, [moveLeft, moveRight, rotate, softDrop, hardDrop, togglePause])

  return { state, moveLeft, moveRight, rotate, softDrop, hardDrop, start, togglePause, newGame }
}
