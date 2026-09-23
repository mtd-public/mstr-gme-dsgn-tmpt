import type { PieceColor, PieceType } from './types'

// Each rotation is a list of [row, col] offsets within the piece's bounding box.
// Within a piece, index i always refers to the SAME physical block across all
// four rotation states (each array is a genuine 90°-rotation of the others,
// index-for-index) — that identity is what lets colors stay rigidly attached
// to a block instead of being reassigned by raw position on every turn.
export const SHAPES: Record<PieceType, Array<Array<[number, number]>>> = {
  I: [
    [[1, 0], [1, 1], [1, 2], [1, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[2, 3], [2, 2], [2, 1], [2, 0]],
    [[3, 1], [2, 1], [1, 1], [0, 1]],
  ],
  // O keeps the same 2x2 footprint at every rotation (as it must), but the 4
  // block indices still cycle through it — so the letters/colors carried by
  // each block visibly rotate through all 4 corners instead of rotate being
  // a total no-op.
  O: [
    [[0, 1], [0, 2], [1, 1], [1, 2]],
    [[0, 2], [1, 2], [0, 1], [1, 1]],
    [[1, 2], [1, 1], [0, 2], [0, 1]],
    [[1, 1], [0, 1], [1, 2], [0, 2]],
  ],
  T: [
    [[0, 1], [1, 0], [1, 1], [1, 2]],
    [[1, 2], [0, 1], [1, 1], [2, 1]],
    [[2, 1], [1, 2], [1, 1], [1, 0]],
    [[1, 0], [2, 1], [1, 1], [0, 1]],
  ],
  Z: [
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 2], [1, 2], [1, 1], [2, 1]],
    [[2, 2], [2, 1], [1, 1], [1, 0]],
    [[2, 0], [1, 0], [1, 1], [0, 1]],
  ],
  J: [
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[0, 2], [0, 1], [1, 1], [2, 1]],
    [[2, 2], [1, 2], [1, 1], [1, 0]],
    [[2, 0], [2, 1], [1, 1], [0, 1]],
  ],
  L: [
    [[0, 2], [1, 0], [1, 1], [1, 2]],
    [[2, 2], [0, 1], [1, 1], [2, 1]],
    [[2, 0], [1, 2], [1, 1], [1, 0]],
    [[0, 0], [2, 1], [1, 1], [0, 1]],
  ],
}

export const PIECE_COLOR_HEX: Record<PieceColor, string> = {
  red: '#dd4b3e',
  blue: '#3e6fd8',
}

export const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'Z', 'J', 'L']

const VOWELS = ['A', 'E', 'I', 'O', 'U']
const CONSONANTS = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z']

/** Red blocks carry a vowel, blue blocks a consonant. */
export function randomLetterFor(color: PieceColor): string {
  const pool = color === 'red' ? VOWELS : CONSONANTS
  return pool[Math.floor(Math.random() * pool.length)]
}

/** One random letter per block (matching each block's rigid color), for a fresh piece. */
export function randomLettersFor(type: PieceType): string[] {
  return pieceColorSequence(type).map(randomLetterFor)
}

/** Fisher-Yates shuffle of a fresh bag, so every piece appears once per cycle. */
export function shuffledBag(): PieceType[] {
  const bag = [...PIECE_TYPES]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

export function cellsFor(type: PieceType, rotation: number): Array<[number, number]> {
  return SHAPES[type][rotation % 4]
}

/**
 * Each piece's 4 blocks are colored once, from its spawn (rotation 0) shape —
 * sorted left-to-right, first two red, last two blue — and that color then
 * stays fixed to each block by index for the piece's whole lifetime. Because
 * SHAPES preserves block identity by index across rotations, the same two
 * physical blocks stay red (and the other two blue) no matter how the piece
 * turns; the split never gets recomputed from raw geometry mid-rotation.
 */
export function pieceColorSequence(type: PieceType): PieceColor[] {
  const spawnCells = SHAPES[type][0]
  const ranked = spawnCells
    .map((cell, index) => ({ cell, index }))
    .sort((a, b) => a.cell[1] - b.cell[1] || a.cell[0] - b.cell[0])

  const colors: PieceColor[] = new Array(spawnCells.length)
  ranked.forEach(({ index }, rank) => {
    colors[index] = rank < 2 ? 'red' : 'blue'
  })
  return colors
}

export interface ColoredCell {
  offset: [number, number]
  color: PieceColor
}

/** The piece's cells at the given rotation, each paired with its rigid color. */
export function coloredCellsFor(type: PieceType, rotation: number): ColoredCell[] {
  const colors = pieceColorSequence(type)
  return cellsFor(type, rotation).map((offset, i) => ({ offset, color: colors[i] }))
}
