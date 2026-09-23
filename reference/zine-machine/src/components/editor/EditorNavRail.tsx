import HomeIcon from "@mui/icons-material/Home";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useNavigate } from "react-router-dom";
import { colors } from "../../theme";

export default function EditorNavRail() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        width: 72,
        flexShrink: 0,
        bgcolor: colors.eggplant,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 2,
      }}
    >
      <Tooltip title="Back to Zines" placement="right">
        <IconButton onClick={() => navigate("/")} sx={{ color: colors.bubblegum }}>
          <HomeIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
