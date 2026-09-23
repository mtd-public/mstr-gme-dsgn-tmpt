import { useState } from "react";
import ArticleIcon from "@mui/icons-material/Article";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import TitleIcon from "@mui/icons-material/Title";
import TuneIcon from "@mui/icons-material/Tune";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DeleteZineModal from "./DeleteZineModal";
import type { HeadingLevel } from "../../data/sections";
import { colors } from "../../theme";

interface EditPanelProps {
  zineTitle: string;
  pageIndex: number;
  totalPages: number;
  zineBlockUsed: number;
  zineBlockCapacity: number;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onPageUp: () => void;
  onPageDown: () => void;
  canPageUp: boolean;
  canPageDown: boolean;
  onDeleteZine: () => void;
  canAddPageAbove: boolean;
  onAddPageAbove: () => void;
  onAddPageBelow: () => void;
  canDeletePage: boolean;
  onDeletePage: () => void;
  canAddTextBlock: boolean;
  onAddTextBlock: () => void;
  onAddHeadingBlock: (level: HeadingLevel) => void;
}

const iconButtonSx = {
  border: `2px solid ${colors.eggplant}`,
  borderRadius: 1.5,
};

export default function EditPanel({
  zineTitle,
  pageIndex,
  totalPages,
  zineBlockUsed,
  zineBlockCapacity,
  zoom,
  onZoomIn,
  onZoomOut,
  canZoomIn,
  canZoomOut,
  onPageUp,
  onPageDown,
  canPageUp,
  canPageDown,
  onDeleteZine,
  canAddPageAbove,
  onAddPageAbove,
  onAddPageBelow,
  canDeletePage,
  onDeletePage,
  canAddTextBlock,
  onAddTextBlock,
  onAddHeadingBlock,
}: EditPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pageActionsOpen, setPageActionsOpen] = useState(false);
  const [pageContentOpen, setPageContentOpen] = useState(false);

  return (
    <Box
      sx={{
        width: collapsed ? 64 : 300,
        flexShrink: 0,
        bgcolor: "#FFFFFF",
        borderRight: `3px solid ${colors.eggplant}`,
        display: "flex",
        flexDirection: "column",
        alignItems: collapsed ? "center" : "stretch",
        p: collapsed ? 1 : 2.5,
        gap: 2,
        overflow: "visible",
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", gap: 1, justifyContent: collapsed ? "center" : "flex-start" }}
      >
        <Tooltip title={collapsed ? "Expand" : "Collapse"} placement="right">
          <IconButton
            size="small"
            onClick={() => setCollapsed((c) => !c)}
            sx={{ color: colors.grape }}
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
        {!collapsed && (
          <Typography variant="subtitle2" sx={{ color: colors.eggplant }}>
            Editing page{" "}
            <Box component="span" sx={{ color: colors.bubblegum }}>
              {pageIndex + 1}
            </Box>{" "}
            / {totalPages}
          </Typography>
        )}
      </Stack>

      <Stack
        direction={collapsed ? "column" : "row"}
        spacing={1}
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Stack direction={collapsed ? "column" : "row"} spacing={1}>
          <Tooltip title={`Zoom out (${zoom}%)`} placement={collapsed ? "right" : "top"}>
            <span>
              <IconButton
                size="small"
                onClick={onZoomOut}
                disabled={!canZoomOut}
                sx={iconButtonSx}
                aria-label="Zoom out"
              >
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={`Zoom in (${zoom}%)`} placement={collapsed ? "right" : "top"}>
            <span>
              <IconButton
                size="small"
                onClick={onZoomIn}
                disabled={!canZoomIn}
                sx={iconButtonSx}
                aria-label="Zoom in"
              >
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        <Stack direction={collapsed ? "column" : "row"} spacing={1}>
          <Tooltip title="Select page above" placement={collapsed ? "right" : "top"}>
            <span>
              <IconButton
                size="small"
                onClick={onPageUp}
                disabled={!canPageUp}
                sx={iconButtonSx}
                aria-label="Select page above"
              >
                <KeyboardArrowUpIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Select page below" placement={collapsed ? "right" : "top"}>
            <span>
              <IconButton
                size="small"
                onClick={onPageDown}
                disabled={!canPageDown}
                sx={iconButtonSx}
                aria-label="Select page below"
              >
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Box
        sx={{
          border: `2px solid ${colors.eggplant}`,
          borderRadius: 1.5,
          py: 1,
          px: collapsed ? 0.5 : 1,
          textAlign: "center",
          width: collapsed ? "100%" : "auto",
        }}
      >
        <Typography
          variant={collapsed ? "caption" : "body2"}
          sx={{ color: colors.eggplant, fontWeight: 700 }}
        >
          {collapsed
            ? `${zineBlockUsed}/${zineBlockCapacity}`
            : `${zineBlockUsed} / ${zineBlockCapacity} ZB`}
        </Typography>
      </Box>

      <Stack spacing={1} sx={{ width: "100%", alignItems: collapsed ? "center" : "stretch" }}>
        <Box sx={{ position: "relative", width: collapsed ? "auto" : "100%" }}>
          {collapsed ? (
            <Tooltip title="Page Actions" placement="right">
              <IconButton
                onClick={() => setPageActionsOpen((o) => !o)}
                sx={iconButtonSx}
                aria-label="Page Actions"
              >
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              variant="outlined"
              fullWidth
              startIcon={<TuneIcon />}
              sx={{ justifyContent: "flex-start" }}
              onClick={() => setPageActionsOpen((o) => !o)}
            >
              Page Actions
            </Button>
          )}

          {pageActionsOpen && (
            <Stack
              direction="column"
              spacing={1}
              sx={{
                position: "absolute",
                top: 0,
                left: "100%",
                ml: 1.5,
                zIndex: 10,
              }}
            >
              <Tooltip title="Add Page Above" placement="right">
                <span>
                  <Fab
                    size="small"
                    color="primary"
                    disabled={!canAddPageAbove}
                    onClick={() => {
                      onAddPageAbove();
                      setPageActionsOpen(false);
                    }}
                    aria-label="Add Page Above"
                  >
                    <VerticalAlignTopIcon fontSize="small" />
                  </Fab>
                </span>
              </Tooltip>
              <Tooltip title="Add Page Below" placement="right">
                <span>
                  <Fab
                    size="small"
                    color="primary"
                    onClick={() => {
                      onAddPageBelow();
                      setPageActionsOpen(false);
                    }}
                    aria-label="Add Page Below"
                  >
                    <VerticalAlignBottomIcon fontSize="small" />
                  </Fab>
                </span>
              </Tooltip>
              <Tooltip title="Delete Page" placement="right">
                <span>
                  <Fab
                    size="small"
                    color="error"
                    disabled={!canDeletePage}
                    onClick={() => {
                      onDeletePage();
                      setPageActionsOpen(false);
                    }}
                    aria-label="Delete Page"
                  >
                    <DeleteIcon fontSize="small" />
                  </Fab>
                </span>
              </Tooltip>
            </Stack>
          )}
        </Box>

        <Box sx={{ position: "relative", width: collapsed ? "auto" : "100%" }}>
          {collapsed ? (
            <Tooltip
              title={canAddTextBlock ? "Page Content" : "No content on the title page"}
              placement="right"
            >
              <span>
                <IconButton
                  onClick={() => setPageContentOpen((o) => !o)}
                  disabled={!canAddTextBlock}
                  sx={iconButtonSx}
                  aria-label="Page Content"
                >
                  <ArticleIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : (
            <Tooltip title={canAddTextBlock ? "" : "No content on the title page"} placement="top">
              <span>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<ArticleIcon />}
                  sx={{ justifyContent: "flex-start" }}
                  onClick={() => setPageContentOpen((o) => !o)}
                  disabled={!canAddTextBlock}
                >
                  Page Content
                </Button>
              </span>
            </Tooltip>
          )}

          {pageContentOpen && canAddTextBlock && (
            <Stack
              direction="column"
              spacing={1}
              sx={{
                position: "absolute",
                top: 0,
                left: "100%",
                ml: 1.5,
                zIndex: 10,
              }}
            >
              <Tooltip title="Add Text Content" placement="right">
                <span>
                  <Fab
                    size="small"
                    color="primary"
                    onClick={() => {
                      onAddTextBlock();
                      setPageContentOpen(false);
                    }}
                    aria-label="Add Text Content"
                  >
                    <TextFieldsIcon fontSize="small" />
                  </Fab>
                </span>
              </Tooltip>
              <Tooltip title="Add Heading" placement="right">
                <span>
                  <Fab
                    size="small"
                    color="primary"
                    onClick={() => {
                      onAddHeadingBlock("heading");
                      setPageContentOpen(false);
                    }}
                    aria-label="Add Heading"
                  >
                    <TitleIcon fontSize="medium" />
                  </Fab>
                </span>
              </Tooltip>
              <Tooltip title="Add Subheading" placement="right">
                <span>
                  <Fab
                    size="small"
                    color="primary"
                    onClick={() => {
                      onAddHeadingBlock("subheading");
                      setPageContentOpen(false);
                    }}
                    aria-label="Add Subheading"
                  >
                    <TitleIcon fontSize="small" />
                  </Fab>
                </span>
              </Tooltip>
            </Stack>
          )}
        </Box>
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      <Divider sx={{ borderColor: colors.background, width: "100%" }} />

      {collapsed ? (
        <Tooltip title="Delete Zine" placement="right">
          <IconButton
            onClick={() => setDeleteModalOpen(true)}
            sx={{ ...iconButtonSx, color: "error.main", borderColor: "error.main" }}
            aria-label="Delete Zine"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          variant="outlined"
          color="error"
          fullWidth
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteModalOpen(true)}
        >
          Delete Zine
        </Button>
      )}

      <DeleteZineModal
        open={deleteModalOpen}
        zineTitle={zineTitle}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          setDeleteModalOpen(false);
          onDeleteZine();
        }}
      />
    </Box>
  );
}
