import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useParams, useNavigate } from "react-router-dom";
import EditorNavRail from "../components/editor/EditorNavRail";
import EditorTopBar from "../components/editor/EditorTopBar";
import EditPanel from "../components/editor/EditPanel";
import RightSidebar from "../components/editor/RightSidebar";
import ZinePaper, { type ZinePaperHandle } from "../components/editor/ZinePaper";
import { ZINE_BLOCK_CAPACITY, getPageZineBlockCount } from "../data/sections";
import { useZines } from "../state/ZinesContext";

const ZOOM_MIN = 50;
const ZOOM_MAX = 150;
const ZOOM_STEP = 10;

export default function ZineEditor() {
  const { zineId } = useParams<{ zineId: string }>();
  const navigate = useNavigate();
  const {
    getZine,
    deleteZine,
    getPages,
    addPageAbove,
    addPageBelow,
    deletePage,
    addTextBlock,
    addHeadingBlock,
    updateBlockText,
    updateBlockTransform,
    updateHeadingStyle,
    deleteBlock,
  } = useZines();
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const zinePaperRef = useRef<ZinePaperHandle>(null);
  const pendingScrollRef = useRef<number | null>(null);

  const zine = zineId ? getZine(zineId) : undefined;

  if (!zine) {
    return (
      <Box sx={{ maxWidth: 800, mx: "auto", p: { xs: 2, sm: 4 } }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Zine not found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          This zine doesn't exist, or has been removed.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/")}>
          Back to Zines
        </Button>
      </Box>
    );
  }

  const pages = getPages(zine.id);
  const safePageIndex = Math.min(pageIndex, pages.length - 1);
  const currentPage = pages[safePageIndex];

  useEffect(() => {
    if (pendingScrollRef.current !== null) {
      const target = pendingScrollRef.current;
      pendingScrollRef.current = null;
      zinePaperRef.current?.scrollToPage(target);
    }
  }, [pages.length]);

  const selectPage = (index: number) => {
    setPageIndex(index);
    zinePaperRef.current?.scrollToPage(index);
  };

  return (
    <Box sx={{ height: "100vh", display: "flex", overflow: "hidden" }}>
      <EditorNavRail />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <EditorTopBar title={zine.title} />
        <Box sx={{ flexGrow: 1, display: "flex", minHeight: 0 }}>
          <EditPanel
            zineTitle={zine.title}
            pageIndex={safePageIndex}
            totalPages={pages.length}
            zineBlockUsed={getPageZineBlockCount(currentPage)}
            zineBlockCapacity={ZINE_BLOCK_CAPACITY}
            zoom={zoom}
            onZoomIn={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
            onZoomOut={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
            canZoomIn={zoom < ZOOM_MAX}
            canZoomOut={zoom > ZOOM_MIN}
            onPageUp={() => selectPage(Math.max(0, safePageIndex - 1))}
            onPageDown={() => selectPage(Math.min(pages.length - 1, safePageIndex + 1))}
            canPageUp={safePageIndex > 0}
            canPageDown={safePageIndex < pages.length - 1}
            onDeleteZine={() => {
              deleteZine(zine.id);
              navigate("/");
            }}
            canAddPageAbove={safePageIndex > 0}
            onAddPageAbove={() => addPageAbove(zine.id, safePageIndex)}
            onAddPageBelow={() => {
              addPageBelow(zine.id, safePageIndex);
              pendingScrollRef.current = safePageIndex + 1;
              setPageIndex(safePageIndex + 1);
            }}
            canDeletePage={safePageIndex > 0}
            onDeletePage={() => {
              deletePage(zine.id, safePageIndex);
              const nextIndex = Math.max(0, Math.min(safePageIndex, pages.length - 2));
              pendingScrollRef.current = nextIndex;
              setPageIndex(nextIndex);
            }}
            canAddTextBlock={safePageIndex !== 0}
            onAddTextBlock={() => addTextBlock(zine.id, safePageIndex)}
            onAddHeadingBlock={(level) => addHeadingBlock(zine.id, safePageIndex, level)}
          />
          <ZinePaper
            ref={zinePaperRef}
            title={zine.title}
            zoom={zoom}
            selectedIndex={safePageIndex}
            pages={pages}
            onSelectIndex={setPageIndex}
            onUpdateBlockText={(pageIdx, blockId, text) =>
              updateBlockText(zine.id, pageIdx, blockId, text)
            }
            onTransformBlock={(pageIdx, blockId, transform) =>
              updateBlockTransform(zine.id, pageIdx, blockId, transform)
            }
            onUpdateHeadingStyle={(pageIdx, blockId, patch) =>
              updateHeadingStyle(zine.id, pageIdx, blockId, patch)
            }
            onDeleteBlock={(pageIdx, blockId) => deleteBlock(zine.id, pageIdx, blockId)}
          />
          <RightSidebar
            zineId={zine.id}
            pages={pages}
            selectedIndex={safePageIndex}
            onSelectPage={selectPage}
          />
        </Box>
      </Box>
    </Box>
  );
}
