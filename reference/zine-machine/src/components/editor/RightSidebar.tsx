import { useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import CommentsPanel from "./CommentsPanel";
import SectionsPanel from "./SectionsPanel";
import type { ZinePageData } from "../../data/sections";
import { colors } from "../../theme";

interface RightSidebarProps {
  zineId: string;
  pages: ZinePageData[];
  selectedIndex: number;
  onSelectPage: (index: number) => void;
}

export default function RightSidebar({
  zineId,
  pages,
  selectedIndex,
  onSelectPage,
}: RightSidebarProps) {
  const [tab, setTab] = useState<"sections" | "comments">("sections");

  return (
    <Box
      sx={{
        width: 220,
        flexShrink: 0,
        bgcolor: "#FFFFFF",
        borderLeft: `3px solid ${colors.eggplant}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="fullWidth"
        sx={{
          borderBottom: `2px solid ${colors.background}`,
          minHeight: 40,
          "& .MuiTab-root": {
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 600,
            minHeight: 40,
            fontSize: "0.8rem",
            px: 1,
            minWidth: 0,
          },
        }}
      >
        <Tab label="Sections" value="sections" />
        <Tab label="Comments" value="comments" />
      </Tabs>
      <Box sx={{ p: 1.5, overflow: "hidden", flexGrow: 1 }}>
        {tab === "sections" ? (
          <SectionsPanel pages={pages} selectedIndex={selectedIndex} onSelect={onSelectPage} />
        ) : (
          <CommentsPanel zineId={zineId} />
        )}
      </Box>
    </Box>
  );
}
