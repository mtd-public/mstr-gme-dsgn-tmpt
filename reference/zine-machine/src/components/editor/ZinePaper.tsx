import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import HeadingBlockView from "./HeadingBlockView";
import TextContentBlockView from "./TextContentBlockView";
import { VIRTUAL_PAGE_WIDTH, type ZineHeadingBlock, type ZinePageData } from "../../data/sections";
import { useElementSize } from "../../hooks/useElementSize";
import type { GeometryTransform } from "../../hooks/useBlockTransform";
import { colors } from "../../theme";

export interface ZinePaperHandle {
  scrollToPage: (index: number) => void;
}

interface ZinePaperProps {
  title: string;
  zoom: number;
  selectedIndex: number;
  pages: ZinePageData[];
  onSelectIndex: (index: number) => void;
  onUpdateBlockText: (pageIndex: number, blockId: string, text: string) => void;
  onTransformBlock: (pageIndex: number, blockId: string, transform: GeometryTransform) => void;
  onUpdateHeadingStyle: (
    pageIndex: number,
    blockId: string,
    patch: Partial<Pick<ZineHeadingBlock, "level" | "color">>,
  ) => void;
  onDeleteBlock: (pageIndex: number, blockId: string) => void;
}

const PAGE_RATIO = 8.5 / 11;
const MAX_PAGE_HEIGHT = 900;
const PAGE_GAP = 40;

const ZinePaper = forwardRef<ZinePaperHandle, ZinePaperProps>(function ZinePaper(
  {
    title,
    zoom,
    selectedIndex,
    pages,
    onSelectIndex,
    onUpdateBlockText,
    onTransformBlock,
    onUpdateHeadingStyle,
    onDeleteBlock,
  },
  ref,
) {
  const [containerRef, { width, height }] = useElementSize<HTMLDivElement>();
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const ratiosRef = useRef<Map<number, number>>(new Map());

  // Base page size comes from the container alone, independent of which
  // page is selected or how many neighbors are visible, so every page in
  // the stack renders at the same width and height.
  let baseHeight = Math.min(height, MAX_PAGE_HEIGHT);
  let baseWidth = baseHeight * PAGE_RATIO;
  if (baseWidth > width) {
    baseWidth = width;
    baseHeight = baseWidth / PAGE_RATIO;
  }
  const pageWidth = baseWidth * (zoom / 100);
  const pageHeight = baseHeight * (zoom / 100);
  const scale = pageWidth > 0 ? pageWidth / VIRTUAL_PAGE_WIDTH : 0;

  useImperativeHandle(ref, () => ({
    scrollToPage(index: number) {
      pageRefs.current.get(index)?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const indexAttr = (entry.target as HTMLElement).dataset.pageIndex;
          if (indexAttr === undefined) continue;
          ratiosRef.current.set(Number(indexAttr), entry.intersectionRatio);
        }
        let bestIndex = -1;
        let bestRatio = 0;
        ratiosRef.current.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = index;
          }
        });
        if (bestIndex >= 0) onSelectIndex(bestIndex);
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length, width, height, onSelectIndex]);

  return (
    <Box
      ref={containerRef}
      sx={{
        flexGrow: 1,
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: 4,
        gap: `${PAGE_GAP}px`,
        bgcolor: colors.background,
      }}
    >
      {pages.map((page, index) => {
        const isSelected = index === selectedIndex;
        const isTitlePage = index === 0;
        return (
          <Box
            key={page.id}
            ref={(el: HTMLDivElement | null) => {
              if (el) pageRefs.current.set(index, el);
              else pageRefs.current.delete(index);
            }}
            data-page-index={index}
            sx={{
              flexShrink: 0,
              width: pageWidth,
              height: pageHeight,
              bgcolor: "#FFFFFF",
              border: isSelected
                ? `4px solid ${colors.bubblegum}`
                : "1px solid rgba(42, 9, 68, 0.12)",
              boxShadow: isSelected
                ? "8px 8px 0 rgba(42, 9, 68, 0.15)"
                : "0 2px 10px rgba(42, 9, 68, 0.08)",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 20,
                  minWidth: 28,
                  height: 28,
                  px: 1,
                  borderRadius: "999px",
                  bgcolor: isSelected ? colors.eggplant : colors.textMuted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: colors.banana, fontWeight: 800, lineHeight: 1 }}
                >
                  {index + 1}
                </Typography>
              </Box>

              {isTitlePage && (
                <Typography
                  variant="h4"
                  sx={{ color: colors.eggplant, textAlign: "center", wordBreak: "break-word" }}
                >
                  {title}
                </Typography>
              )}

              {page.blocks.map((block) =>
                block.kind === "heading" ? (
                  <HeadingBlockView
                    key={block.id}
                    block={block}
                    scale={scale}
                    onConfirmText={(text) => onUpdateBlockText(index, block.id, text)}
                    onTransform={(transform) => onTransformBlock(index, block.id, transform)}
                    onUpdateStyle={(patch) => onUpdateHeadingStyle(index, block.id, patch)}
                    onDelete={() => onDeleteBlock(index, block.id)}
                  />
                ) : (
                  <TextContentBlockView
                    key={block.id}
                    block={block}
                    scale={scale}
                    onConfirmText={(text) => onUpdateBlockText(index, block.id, text)}
                    onTransform={(transform) => onTransformBlock(index, block.id, transform)}
                    onDelete={() => onDeleteBlock(index, block.id)}
                  />
                ),
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
});

export default ZinePaper;
