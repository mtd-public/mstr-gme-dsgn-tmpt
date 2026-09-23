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
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { HEADING_FONT_SIZE, type HeadingLevel, type ZineHeadingBlock } from "../../data/sections";
import { useBlockTransform, type GeometryTransform } from "../../hooks/useBlockTransform";
import { colors } from "../../theme";

interface HeadingBlockViewProps {
  block: ZineHeadingBlock;
  scale: number;
  onConfirmText: (text: string) => void;
  onTransform: (transform: GeometryTransform) => void;
  onUpdateStyle: (patch: Partial<Pick<ZineHeadingBlock, "level" | "color">>) => void;
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

export default function HeadingBlockView({
  block,
  scale,
  onConfirmText,
  onTransform,
  onUpdateStyle,
  onDelete,
}: HeadingBlockViewProps) {
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
  const fontSize = HEADING_FONT_SIZE[block.level] * scale;

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
              "& textarea": {
                height: "100% !important",
                overflow: "auto !important",
                fontFamily: "'Fredoka', sans-serif",
                fontWeight: 700,
                fontSize,
                color: block.color,
              },
            }}
          />

          <Tooltip title="Drag to move">
            <IconButton
              onPointerDown={handleMovePointerDown}
              aria-label="Move heading block"
              sx={{ ...handleButtonSx, position: "absolute", top: 2, left: 2, cursor: "move" }}
            >
              <OpenWithIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Drag to tilt">
            <IconButton
              onPointerDown={handleRotatePointerDown}
              aria-label="Rotate heading block"
              sx={{ ...handleButtonSx, position: "absolute", top: 2, right: 2, cursor: "grab" }}
            >
              <RotateRightIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
          <Box
            onPointerDown={handleResizePointerDown}
            aria-label="Resize heading block"
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
            alignItems: "center",
          }}
        >
          <IconButton onClick={confirmText} aria-label="Confirm edit" sx={tagButtonSx}>
            <CheckIcon sx={{ color: colors.slime, fontSize: 10 }} />
          </IconButton>
          <IconButton onClick={cancelText} aria-label="Cancel edit" sx={tagButtonSx}>
            <CloseIcon sx={{ color: colors.textMuted, fontSize: 10 }} />
          </IconButton>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={block.level}
            onChange={(_, value: HeadingLevel | null) => {
              if (value) onUpdateStyle({ level: value });
            }}
            sx={{
              height: 16,
              bgcolor: "#FFFFFF",
              "& .MuiToggleButton-root": {
                p: 0,
                width: 16,
                height: 16,
                fontSize: 9,
                fontWeight: 800,
                lineHeight: 1,
                border: `1.5px solid ${colors.grape}`,
                color: colors.grape,
                "&.Mui-selected": { bgcolor: colors.grape, color: "#FFFFFF" },
              },
            }}
          >
            <ToggleButton value="heading" aria-label="Large heading">
              H
            </ToggleButton>
            <ToggleButton value="subheading" aria-label="Subheading">
              h
            </ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Heading color">
            <Box
              component="input"
              type="color"
              value={block.color}
              onChange={(e) => onUpdateStyle({ color: (e.target as HTMLInputElement).value })}
              aria-label="Heading text color"
              sx={{
                width: 16,
                height: 16,
                p: 0,
                border: `1.5px solid ${colors.grape}`,
                borderRadius: "50%",
                cursor: "pointer",
                overflow: "hidden",
                appearance: "none",
                "&::-webkit-color-swatch-wrapper": { p: 0 },
                "&::-webkit-color-swatch": { border: "none", borderRadius: "50%" },
              }}
            />
          </Tooltip>
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
      <Typography
        sx={{
          fontFamily: "'Fredoka', sans-serif",
          fontWeight: 700,
          fontSize,
          lineHeight: 1.15,
          color: block.color,
          whiteSpace: "pre-wrap",
        }}
      >
        {block.text}
        <Tooltip title="Edit heading" placement="right">
          <IconButton
            onClick={startEdit}
            aria-label="Edit heading"
            sx={{ ...tagButtonSx, display: "inline-flex", verticalAlign: "middle", ml: 0.75 }}
          >
            <EditIcon sx={{ color: colors.grape, fontSize: 10 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete heading block" placement="right">
          <IconButton
            onClick={onDelete}
            aria-label="Delete heading block"
            sx={{ ...tagButtonSx, display: "inline-flex", verticalAlign: "middle", ml: 0.5 }}
          >
            <DeleteIcon sx={{ color: "error.main", fontSize: 10 }} />
          </IconButton>
        </Tooltip>
      </Typography>
    </Box>
  );
}
