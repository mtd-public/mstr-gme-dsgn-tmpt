import { useCallback, useRef } from "react";

interface PointerDragStart {
  x: number;
  y: number;
}

/**
 * Tracks a pointer drag gesture and reports the cumulative delta (in screen
 * px) from where the gesture started, on every move, until pointerup.
 */
export function usePointerDrag(onMove: (dx: number, dy: number) => void, onEnd?: () => void) {
  const startRef = useRef<PointerDragStart | null>(null);

  return useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      startRef.current = { x: e.clientX, y: e.clientY };

      const handleMove = (moveEvent: PointerEvent) => {
        const start = startRef.current;
        if (!start) return;
        onMove(moveEvent.clientX - start.x, moveEvent.clientY - start.y);
      };

      const handleUp = () => {
        startRef.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        onEnd?.();
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [onMove, onEnd],
  );
}
