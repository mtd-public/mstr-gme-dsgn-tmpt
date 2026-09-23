import StarIcon from "@mui/icons-material/Star";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useNavigate } from "react-router-dom";
import { colors } from "../theme";
import type { Zine } from "../types";

interface FavoriteCardProps {
  zine: Zine;
  accentColor: string;
  flagColor: string;
  onUnfavorite: (id: string) => void;
  onOpen: (id: string) => void;
}

function formatLastAccessed(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FavoriteCard({
  zine,
  accentColor,
  flagColor,
  onUnfavorite,
  onOpen,
}: FavoriteCardProps) {
  const navigate = useNavigate();

  const handleOpen = () => {
    onOpen(zine.id);
    navigate(`/zine/${zine.id}`);
  };

  return (
    <Paper
      onClick={handleOpen}
      sx={{
        width: 200,
        height: 118,
        p: "14px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        borderRadius: "12px",
        border: `3px solid ${colors.eggplant}`,
        boxShadow: `6px 6px 0 ${accentColor}`,
        transition: "transform 0.15s",
        "&:hover": {
          transform: "translate(-2px, -2px)",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: -3,
          left: -3,
          width: 0,
          height: 0,
          borderTop: `26px solid ${flagColor}`,
          borderRight: "26px solid transparent",
        }}
      />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            pl: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            pr: 0.5,
          }}
        >
          {zine.title}
        </Typography>
        <Tooltip title="Unfavorite">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onUnfavorite(zine.id);
            }}
            sx={{ p: 0.25, mt: -0.5, mr: -0.5 }}
          >
            <StarIcon fontSize="small" sx={{ color: colors.banana }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="caption" sx={{ color: colors.textMuted, fontWeight: 700 }}>
        Last accessed {formatLastAccessed(zine.lastAccessed)}
      </Typography>
    </Paper>
  );
}
