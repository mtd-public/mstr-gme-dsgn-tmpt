import { coloredCellsFor, PIECE_COLOR_HEX } from '../game/pieces'
import type { PieceColor, QueueEntry } from '../game/types'

const PREVIEW_COLS = 4
const PREVIEW_ROWS = 3

export function NextPiece({ entry }: { entry: QueueEntry }) {
  const cellsByKey: Record<string, { color: PieceColor; letter: string }> = {}
  coloredCellsFor(entry.type, 0).forEach(({ offset: [r, c], color }, i) => {
    cellsByKey[`${r}-${c}`] = { color, letter: entry.letters[i] }
  })

  const cells = []
  for (let r = 0; r < PREVIEW_ROWS; r++) {
    for (let c = 0; c < PREVIEW_COLS; c++) {
      const cell = cellsByKey[`${r}-${c}`]
      cells.push(
        <div
          key={`${r}-${c}`}
          className={`next-cell${cell ? ' next-cell--filled' : ''}`}
          style={cell ? { background: PIECE_COLOR_HEX[cell.color] } : undefined}
        >
          {cell && <span className="cell__letter">{cell.letter}</span>}
        </div>,
      )
    }
  }

  return <div className="next-grid">{cells}</div>
}
