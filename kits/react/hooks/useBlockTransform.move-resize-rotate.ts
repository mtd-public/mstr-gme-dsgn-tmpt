import { useCallback, useRef, useState } from "react";
import { MIN_BLOCK_HEIGHT, MIN_BLOCK_WIDTH, VIRTUAL_PAGE_HEIGHT, VIRTUAL_PAGE_WIDTH } from "../data/sections";
import { usePointerDrag } from "./usePointerDrag";

export interface BlockGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export type GeometryTransform = Partial<Pick<BlockGeometry, "x" | "y" | "width" | "height" | "rotation">>;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// Shared move/resize/rotate pointer-drag math for any content block that has
// x/y/width/height/rotation geometry. Coordinates are in virtual page units;
// `scale` converts real screen-pixel drag deltas back into those units.
export function useBlockTransform(
  block: BlockGeometry,
  scale: number,
  onTransform: (transform: GeometryTransform) => void,
) {
  const [live, setLive] = useState<GeometryTransform>({});
  const boxRef = useRef<HTMLDivElement>(null);

  const current = { ...block, ...live };

  const commitLive = useCallback(() => {
    setLive((pending) => {
      if (Object.keys(pending).length > 0) onTransform(pending);
      return {};
    });
  }, [onTransform]);

  const handleMovePointerDown = usePointerDrag(
    (dx, dy) => {
      const vdx = scale > 0 ? dx / scale : 0;
      const vdy = scale > 0 ? dy / scale : 0;
      setLive({
        x: clamp(block.x + vdx, 0, VIRTUAL_PAGE_WIDTH - block.width),
        y: clamp(block.y + vdy, 0, VIRTUAL_PAGE_HEIGHT - block.height),
      });
    },
    commitLive,
  );

  const handleResizePointerDown = usePointerDrag(
    (dx, dy) => {
      const rad = (block.rotation * Math.PI) / 180;
      const localDx = dx * Math.cos(rad) + dy * Math.sin(rad);
      const localDy = -dx * Math.sin(rad) + dy * Math.cos(rad);
      const vdx = scale > 0 ? localDx / scale : 0;
      const vdy = scale > 0 ? localDy / scale : 0;
      setLive({
        width: clamp(block.width + vdx, MIN_BLOCK_WIDTH, VIRTUAL_PAGE_WIDTH - block.x),
        height: clamp(block.height + vdy, MIN_BLOCK_HEIGHT, VIRTUAL_PAGE_HEIGHT - block.y),
      });
    },
    commitLive,
  );

  const rotateStateRef = useRef<{ centerX: number; centerY: number; startAngle: number } | null>(
    null,
  );

  const handleRotatePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const rect = boxRef.current?.getBoundingClientRect();
      if (!rect) return;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const startAngle = (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI;
      rotateStateRef.current = { centerX, centerY, startAngle };

      const handleMove = (moveEvent: PointerEvent) => {
        const s = rotateStateRef.current;
        if (!s) return;
        const angle = (Math.atan2(moveEvent.clientY - s.centerY, moveEvent.clientX - s.centerX) * 180) / Math.PI;
        setLive({ rotation: Math.round(block.rotation + (angle - s.startAngle)) });
      };
      const handleUp = () => {
        rotateStateRef.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        commitLive();
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [block.rotation, commitLive],
  );

  return { current, boxRef, handleMovePointerDown, handleResizePointerDown, handleRotatePointerDown };
}
