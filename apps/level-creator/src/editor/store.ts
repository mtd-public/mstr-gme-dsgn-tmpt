/**
 * Editor state: the GameSpec plus undo/redo history and autosave.
 *
 * Every edit goes through `update(draft => { ... })`, which clones the spec,
 * lets the caller mutate the clone, and pushes the previous version onto the
 * undo stack. Paint strokes pass `{ history: false }` for every cell after the
 * first so a drag is one undo step (call `checkpoint()` when the stroke starts).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { blankSpec, migrate, type GameSpec } from '../spec/schema.ts'

const STORAGE_KEY = 'level-creator.spec'
const HISTORY_MAX = 100

function loadSaved(): GameSpec {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch {
    /* corrupt or unavailable storage — start fresh */
  }
  return blankSpec()
}

export function useSpecStore() {
  // The ref is the source of truth; state only triggers renders. Keeping
  // history pushes OUT of setState updaters matters: StrictMode runs updaters
  // twice in dev, which would double every undo entry.
  const current = useRef<GameSpec>(null as unknown as GameSpec)
  const [spec, setSpec] = useState<GameSpec>(() => (current.current = loadSaved()))
  const past = useRef<GameSpec[]>([])
  const future = useRef<GameSpec[]>([])

  const commit = useCallback((next: GameSpec, history: boolean) => {
    if (history) {
      past.current.push(current.current)
      if (past.current.length > HISTORY_MAX) past.current.shift()
      future.current = []
    }
    current.current = next
    setSpec(next)
  }, [])

  /** Push the current version onto the undo stack (start of a paint stroke). */
  const checkpoint = useCallback(() => {
    past.current.push(current.current)
    if (past.current.length > HISTORY_MAX) past.current.shift()
    future.current = []
  }, [])

  const update = useCallback(
    (fn: (draft: GameSpec) => void, opts: { history?: boolean } = {}) => {
      const next = structuredClone(current.current)
      fn(next)
      commit(next, opts.history !== false)
    },
    [commit],
  )

  const replace = useCallback((next: GameSpec) => commit(next, true), [commit])

  const undo = useCallback(() => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(current.current)
    current.current = prev
    setSpec(prev)
  }, [])

  const redo = useCallback(() => {
    const next = future.current.pop()
    if (!next) return
    past.current.push(current.current)
    current.current = next
    setSpec(next)
  }, [])

  // Autosave (debounced). Storage is a convenience: export JSON to keep work.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(spec))
      } catch {
        /* quota / private mode */
      }
    }, 300)
    return () => clearTimeout(id)
  }, [spec])

  return {
    spec,
    update,
    replace,
    checkpoint,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  }
}

export type SpecStore = ReturnType<typeof useSpecStore>

export function downloadJson(spec: GameSpec) {
  const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${spec.meta.title.replace(/[^\w-]+/g, '-').toLowerCase() || 'game'}.gamespec.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
