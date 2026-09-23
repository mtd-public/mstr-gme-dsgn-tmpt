import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

const SWIPE_THRESHOLD_PX = 28

interface SwipeHandlers {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  onSwipeDown: () => void
}

/**
 * Single-flick gesture detection: on touch only (never hijacks mouse/trackpad
 * drags), the net movement between pointerdown and pointerup decides one
 * discrete action along whichever axis moved furthest — left/right to shift
 * the piece a column, or down to hard-drop it.
 */
export function useSwipeControls({ onSwipeLeft, onSwipeRight, onSwipeDown }: SwipeHandlers) {
  const start = useRef<{ x: number; y: number } | null>(null)

  function onPointerDown(event: ReactPointerEvent) {
    if (event.pointerType !== 'touch') return
    start.current = { x: event.clientX, y: event.clientY }
  }

  function onPointerUp(event: ReactPointerEvent) {
    if (event.pointerType !== 'touch' || !start.current) return
    const dx = event.clientX - start.current.x
    const dy = event.clientY - start.current.y
    start.current = null

    if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) return

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onSwipeLeft()
      else onSwipeRight()
    } else if (dy > 0) {
      onSwipeDown()
    }
  }

  function onPointerCancel() {
    start.current = null
  }

  return { onPointerDown, onPointerUp, onPointerCancel }
}
