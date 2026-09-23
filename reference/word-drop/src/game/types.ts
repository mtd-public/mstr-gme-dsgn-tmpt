export type PieceType = 'I' | 'O' | 'T' | 'Z' | 'J' | 'L'

export type PieceColor = 'red' | 'blue'

export const BOARD_COLS = 10
export const BOARD_ROWS = 20

/** A placed cell self-destructs this many turns (piece locks) after landing. */
export const LIFESPAN_BY_COLOR: Record<PieceColor, number> = {
  red: 5,
  blue: 10,
}

export interface FilledCell {
  color: PieceColor
  /** Turns remaining before self-destruct. */
  age: number
  /** A vowel for red cells, a consonant for blue cells. */
  letter: string
}

export type Cell = FilledCell | null
export type Grid = Cell[][]

export interface QueueEntry {
  type: PieceType
  /** One random letter per block, indexed to match the piece's rigid color sequence. */
  letters: string[]
}

export interface ActivePiece {
  type: PieceType
  rotation: number
  row: number
  col: number
  letters: string[]
}

export type GamePhase = 'ready' | 'playing' | 'paused' | 'clearing' | 'over'

export interface WordMatch {
  word: string
  cells: Array<[number, number]>
}

export interface FoundWord {
  word: string
  points: number
}

export interface GameState {
  grid: Grid
  active: ActivePiece
  nextQueue: QueueEntry[]
  score: number
  level: number
  words: number
  phase: GamePhase
  wordMatches: WordMatch[]
  wordHistory: FoundWord[]
  destructingCells: Array<[number, number]>
  dropIntervalMs: number
}
