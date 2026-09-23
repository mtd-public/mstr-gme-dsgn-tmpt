import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { colors } from "../../theme";

interface EditorTopBarProps {
  title: string;
}

export default function EditorTopBar({ title }: EditorTopBarProps) {
  return (
    <Box
      sx={{
        height: 64,
        flexShrink: 0,
        bgcolor: "#FFFFFF",
        borderBottom: `3px solid ${colors.eggplant}`,
        display: "flex",
        alignItems: "center",
        px: 3,
      }}
    >
      <Typography variant="h6" sx={{ color: colors.eggplant }}>
        {title}
      </Typography>
    </Box>
  );
}
