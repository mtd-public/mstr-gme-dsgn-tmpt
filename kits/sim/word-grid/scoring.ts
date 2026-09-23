const WORD_BASE_POINTS: Record<number, number> = { 3: 50, 4: 100, 5: 200, 6: 400 }

export function pointsForWord(word: string, level: number): number {
  const base = WORD_BASE_POINTS[word.length] ?? 400 + (word.length - 6) * 200
  return base * level
}

export function levelForWords(totalWords: number): number {
  return Math.floor(totalWords / 5) + 1
}

export function dropIntervalForLevel(level: number): number {
  return Math.max(120, 800 - (level - 1) * 60)
}
