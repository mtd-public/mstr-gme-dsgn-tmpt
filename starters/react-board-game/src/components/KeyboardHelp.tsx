import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['←', 'A'], label: 'Lane left' },
  { keys: ['→', 'D'], label: 'Lane right' },
  { keys: ['Space', '↑'], label: 'Blast / start' },
  { keys: ['P', 'Esc'], label: 'Pause / resume' },
]

/** "?" popover listing keys; closes on outside pointerdown or Escape (generic-game-template). */
export function KeyboardHelp() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="help" ref={rootRef}>
      <button type="button" className="help__trigger" aria-label="Keyboard controls" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        ?
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="help__panel"
            role="dialog"
            aria-label="Keyboard controls"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <span className="help__title">Keyboard controls</span>
            <ul className="help__list">
              {SHORTCUTS.map((s) => (
                <li key={s.label} className="help__row">
                  <span className="help__keys">
                    {s.keys.map((k) => (
                      <kbd key={k} className="help__key">
                        {k}
                      </kbd>
                    ))}
                  </span>
                  <span className="help__label">{s.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
