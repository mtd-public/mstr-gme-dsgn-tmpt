import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

const SWIPE_PX = 28

interface Handlers {
  onLeft: () => void
  onRight: () => void
  /** Optional: when given, a plain tap calls this instead of picking a side
   *  (dive-depths "swipe steers, tap fires" scheme). */
  onTap?: () => void
}

/**
 * Board gestures (prof-whip-dash / dive-depths useBoardControls).
 *
 * - A swipe fires the moment it passes SWIPE_PX, not on release — at speed,
 *   waiting for pointerup is a hit. The origin resets after each one, so one
 *   long drag can cross two lanes.
 * - A press that never swiped is a tap. Without onTap, the side of the BOARD
 *   (not the window — pillarboxed layouts) it landed on picks the direction.
 * - Works for mouse drags too: pointer events cover touch, pen and mouse.
 *
 * Spread the handlers onto the board element, which must have
 * `touch-action: none` or the browser eats the swipe as a scroll.
 */
export function useBoardControls({ onLeft, onRight, onTap }: Handlers) {
  const origin = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  function onPointerDown(event: ReactPointerEvent) {
    origin.current = { x: event.clientX, y: event.clientY }
    swiped.current = false
  }

  function onPointerMove(event: ReactPointerEvent) {
    if (!origin.current) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) onLeft()
    else onRight()
    swiped.current = true
    origin.current = { x: event.clientX, y: event.clientY }
  }

  function onPointerUp(event: ReactPointerEvent) {
    if (origin.current && !swiped.current) {
      if (onTap) onTap()
      else {
        const board = event.currentTarget.getBoundingClientRect()
        if (event.clientX < board.left + board.width / 2) onLeft()
        else onRight()
      }
    }
    origin.current = null
  }

  function onPointerCancel() {
    origin.current = null
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
