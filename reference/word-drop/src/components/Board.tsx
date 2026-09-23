import { useMemo } from 'react'
import { coloredCellsFor } from '../game/pieces'
import { BOARD_COLS, BOARD_ROWS } from '../game/types'
import type { GameState, PieceColor, WordMatch } from '../game/types'
import { Cell, type MatchSide } from './Cell'

interface DisplayCell {
  color: PieceColor | null
  active: boolean
  age?: number
  letter?: string
}

function buildDisplayGrid(state: GameState): DisplayCell[][] {
  const grid: DisplayCell[][] = state.grid.map((row) =>
    row.map((cell) => ({
      color: cell?.color ?? null,
      active: false,
      age: cell?.age,
      letter: cell?.letter,
    })),
  )

  if (state.phase === 'playing' || state.phase === 'paused') {
    coloredCellsFor(state.active.type, state.active.rotation).forEach(({ offset: [dr, dc], color }, i) => {
      const row = state.active.row + dr
      const col = state.active.col + dc
      if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
        grid[row][col] = { color, active: true, letter: state.active.letters[i] }
      }
    })
  }

  return grid
}

/**
 * A word match is always a straight run (one row or one column). To draw a
 * single shared gold border around the whole word rather than boxing each
 * letter separately, every cell gets the border sides that face *outward*
 * from the run — the two long sides always, plus an end cap only on the
 * first/last cell.
 */
function buildMatchBorders(matches: WordMatch[]): Map<string, Set<MatchSide>> {
  const borders = new Map<string, Set<MatchSide>>()
  const add = (r: number, c: number, side: MatchSide) => {
    const key = `${r}-${c}`
    if (!borders.has(key)) borders.set(key, new Set())
    borders.get(key)!.add(side)
  }

  for (const match of matches) {
    const horizontal = match.cells.every(([r]) => r === match.cells[0][0])
    if (horizontal) {
      const cols = match.cells.map(([, c]) => c)
      const minCol = Math.min(...cols)
      const maxCol = Math.max(...cols)
      for (const [r, c] of match.cells) {
        add(r, c, 'top')
        add(r, c, 'bottom')
        if (c === minCol) add(r, c, 'left')
        if (c === maxCol) add(r, c, 'right')
      }
    } else {
      const rows = match.cells.map(([r]) => r)
      const minRow = Math.min(...rows)
      const maxRow = Math.max(...rows)
      for (const [r, c] of match.cells) {
        add(r, c, 'left')
        add(r, c, 'right')
        if (r === minRow) add(r, c, 'top')
        if (r === maxRow) add(r, c, 'bottom')
      }
    }
  }

  return borders
}

export function Board({ state }: { state: GameState }) {
  const displayGrid = useMemo(() => buildDisplayGrid(state), [state])
  const matchedSet = useMemo(
    () => new Set(state.wordMatches.flatMap((m) => m.cells).map(([r, c]) => `${r}-${c}`)),
    [state.wordMatches],
  )
  const matchBorders = useMemo(() => buildMatchBorders(state.wordMatches), [state.wordMatches])
  const destructingSet = useMemo(
    () => new Set(state.destructingCells.map(([r, c]) => `${r}-${c}`)),
    [state.destructingCells],
  )

  return (
    <div className="board" role="img" aria-label="Tetris board">
      {displayGrid.map((row, r) =>
        row.map((cell, c) => (
          <Cell
            key={`${r}-${c}`}
            color={cell.color}
            active={cell.active}
            clearing={matchedSet.has(`${r}-${c}`)}
            matchSides={matchBorders.get(`${r}-${c}`)}
            bursting={destructingSet.has(`${r}-${c}`)}
            age={cell.age}
            letter={cell.letter}
          />
        )),
      )}
    </div>
  )
}
