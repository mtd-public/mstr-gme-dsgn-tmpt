// Types for the drop-in guard (kits/touch-zoom-guard). It is a plain IIFE that
// sets window.TouchZoomGuard; import it once for its side effect.
export {}

declare global {
  interface Window {
    TouchZoomGuard?: {
      init(options?: {
        allowSelector?: string
        doubleTapMs?: number
        doubleTapSlop?: number
        resetZoom?: boolean
        blockKeyboardZoom?: boolean
        onZoomChange?: (zoomed: boolean) => void
      }): unknown
      enterFullscreen(orientation?: 'landscape' | 'portrait'): void
      isTouchDevice(): boolean
      zoomed: boolean
    }
  }
}
