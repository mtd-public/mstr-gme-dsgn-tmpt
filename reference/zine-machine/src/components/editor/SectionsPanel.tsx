import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { getPageLabel, type ZinePageData } from "../../data/sections";
import { colors } from "../../theme";

interface SectionsPanelProps {
  pages: ZinePageData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function SectionsPanel({ pages, selectedIndex, onSelect }: SectionsPanelProps) {
  return (
    <List sx={{ py: 0 }}>
      {pages.map((page, index) => (
        <ListItemButton
          key={page.id}
          selected={index === selectedIndex}
          onClick={() => onSelect(index)}
          sx={{
            borderRadius: 1.5,
            mb: 0.5,
            "&:hover": { bgcolor: colors.background },
            "&.Mui-selected": { bgcolor: colors.background },
            "&.Mui-selected:hover": { bgcolor: colors.background },
          }}
        >
          <ListItemText
            slotProps={{
              primary: {
                sx: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600, color: colors.eggplant },
              },
            }}
          >
            {getPageLabel(index)}
          </ListItemText>
        </ListItemButton>
      ))}
    </List>
  );
}
