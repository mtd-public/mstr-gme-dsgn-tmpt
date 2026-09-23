import { useState } from "react";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import OpenWithIcon from "@mui/icons-material/OpenWith";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ZineTextBlock } from "../../data/sections";
import { useBlockTransform, type GeometryTransform } from "../../hooks/useBlockTransform";
import { colors } from "../../theme";

interface TextContentBlockViewProps {
  block: ZineTextBlock;
  scale: number;
  onConfirmText: (text: string) => void;
  onTransform: (transform: GeometryTransform) => void;
  onDelete: () => void;
}

const tagButtonSx = {
  width: 16,
  height: 16,
  minHeight: 0,
  p: 0,
  bgcolor: "#FFFFFF",
  border: `1.5px solid ${colors.grape}`,
  "&:hover": { bgcolor: colors.background },
};

const handleButtonSx = {
  width: 20,
  height: 20,
  minHeight: 0,
  p: 0,
  bgcolor: colors.eggplant,
  color: "#FFFFFF",
  "&:hover": { bgcolor: colors.grape },
};

export default function TextContentBlockView({
  block,
  scale,
  onConfirmText,
  onTransform,
  onDelete,
}: TextContentBlockViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(block.text);

  const { current, boxRef, handleMovePointerDown, handleResizePointerDown, handleRotatePointerDown } =
    useBlockTransform(block, scale, onTransform);

  const startEdit = () => {
    setDraft(block.text);
    setIsEditing(true);
  };

  const confirmText = () => {
    onConfirmText(draft);
    setIsEditing(false);
  };

  const cancelText = () => {
    setDraft(block.text);
    setIsEditing(false);
  };

  const left = current.x * scale;
  const top = current.y * scale;
  const w = current.width * scale;
  const h = current.height * scale;
  const rotationStyle = current.rotation ? { transform: `rotate(${current.rotation}deg)` } : {};

  if (isEditing) {
    return (
      <>
        <Box
          ref={boxRef}
          sx={{
            position: "absolute",
            top,
            left,
            width: w,
            height: h,
            borderRadius: 1.5,
            overflow: "hidden",
            border: `2px solid ${colors.bubblegum}`,
            bgcolor: "#FFFFFF",
            ...rotationStyle,
          }}
        >
          <TextField
            autoFocus
            multiline
            fullWidth
            variant="standard"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            slotProps={{ input: { disableUnderline: true } }}
            sx={{
              height: "100%",
              px: 1,
              "& .MuiInputBase-root": { height: "100%", alignItems: "flex-start" },
              "& textarea": { height: "100% !important", overflow: "auto !important" },
            }}
          />

          <Tooltip title="Drag to move">
            <IconButton
              onPointerDown={handleMovePointerDown}
              aria-label="Move text block"
              sx={{ ...handleButtonSx, position: "absolute", top: 2, left: 2, cursor: "move" }}
            >
              <OpenWithIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Drag to tilt">
            <IconButton
              onPointerDown={handleRotatePointerDown}
              aria-label="Rotate text block"
              sx={{ ...handleButtonSx, position: "absolute", top: 2, right: 2, cursor: "grab" }}
            >
              <RotateRightIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
          <Box
            onPointerDown={handleResizePointerDown}
            aria-label="Resize text block"
            role="button"
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 14,
              height: 14,
              cursor: "nwse-resize",
              bgcolor: colors.eggplant,
              clipPath: "polygon(100% 0, 0 100%, 100% 100%)",
            }}
          />
        </Box>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            position: "absolute",
            top: top - 22,
            left,
          }}
        >
          <IconButton onClick={confirmText} aria-label="Confirm edit" sx={tagButtonSx}>
            <CheckIcon sx={{ color: colors.slime, fontSize: 10 }} />
          </IconButton>
          <IconButton onClick={cancelText} aria-label="Cancel edit" sx={tagButtonSx}>
            <CloseIcon sx={{ color: colors.textMuted, fontSize: 10 }} />
          </IconButton>
        </Stack>
      </>
    );
  }

  return (
    <Box
      sx={{
        position: "absolute",
        top,
        left,
        width: w,
        height: h,
        overflow: "hidden",
        ...rotationStyle,
      }}
    >
      <Typography variant="body2" sx={{ color: colors.eggplant, whiteSpace: "pre-wrap" }}>
        {block.text}
        <Tooltip title="Edit text" placement="right">
          <IconButton
            onClick={startEdit}
            aria-label="Edit text"
            sx={{ ...tagButtonSx, display: "inline-flex", verticalAlign: "middle", ml: 0.75 }}
          >
            <EditIcon sx={{ color: colors.grape, fontSize: 10 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete text block" placement="right">
          <IconButton
            onClick={onDelete}
            aria-label="Delete text block"
            sx={{ ...tagButtonSx, display: "inline-flex", verticalAlign: "middle", ml: 0.5 }}
          >
            <DeleteIcon sx={{ color: "error.main", fontSize: 10 }} />
          </IconButton>
        </Tooltip>
      </Typography>
    </Box>
  );
}
