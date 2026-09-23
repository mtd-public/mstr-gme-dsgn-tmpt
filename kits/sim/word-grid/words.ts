import { isWord, MIN_WORD_LENGTH } from './dictionary'
import { BOARD_COLS, BOARD_ROWS } from './types'
import type { Grid, WordMatch } from './types'

interface LineCell {
  row: number
  col: number
  letter: string
}

/**
 * Scans one row or column (as an ordered list of cells, with gaps as null)
 * for dictionary words. Within each contiguous run of letters, it greedily
 * takes the longest valid word starting at each position, then continues
 * scanning right after it — so matches never overlap within a single line.
 */
function scanLine(line: Array<LineCell | null>): WordMatch[] {
  const matches: WordMatch[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === null) {
      i++
      continue
    }
    let runEnd = i
    while (runEnd < line.length && line[runEnd] !== null) runEnd++

    let pos = i
    while (pos < runEnd) {
      let matchedLength = 0
      for (let len = runEnd - pos; len >= MIN_WORD_LENGTH; len--) {
        const slice = line.slice(pos, pos + len) as LineCell[]
        const word = slice.map((c) => c.letter).join('')
        if (isWord(word)) {
          matches.push({ word, cells: slice.map((c) => [c.row, c.col]) })
          matchedLength = len
          break
        }
      }
      pos += matchedLength > 0 ? matchedLength : 1
    }

    i = runEnd
  }
  return matches
}

/** Finds every horizontal and vertical dictionary word currently on the board. */
export function findWordMatches(grid: Grid): WordMatch[] {
  const matches: WordMatch[] = []

  for (let r = 0; r < BOARD_ROWS; r++) {
    const line: Array<LineCell | null> = []
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = grid[r][c]
      line.push(cell ? { row: r, col: c, letter: cell.letter } : null)
    }
    matches.push(...scanLine(line))
  }

  for (let c = 0; c < BOARD_COLS; c++) {
    const line: Array<LineCell | null> = []
    for (let r = 0; r < BOARD_ROWS; r++) {
      const cell = grid[r][c]
      line.push(cell ? { row: r, col: c, letter: cell.letter } : null)
    }
    matches.push(...scanLine(line))
  }

  return matches
}
