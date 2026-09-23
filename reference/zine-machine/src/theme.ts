import { createTheme } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";

export const colors = {
  eggplant: "#2A0944",
  grape: "#5B1A8C",
  bubblegum: "#FF2FA0",
  banana: "#FFE347",
  slime: "#39FF88",
  paper: "#FFF6E9",
  background: "#FDF3E7",
  textMuted: "#7A5F8C",
};

const theme = createTheme({
  palette: {
    primary: { main: colors.bubblegum, contrastText: colors.paper },
    secondary: { main: colors.slime, contrastText: colors.eggplant },
    warning: { main: colors.banana, contrastText: colors.eggplant },
    background: { default: colors.background, paper: "#FFFFFF" },
    text: { primary: colors.eggplant, secondary: colors.textMuted },
    DataGrid: { headerBg: colors.eggplant },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Nunito', sans-serif",
    h4: { fontFamily: "'Fredoka', sans-serif", fontWeight: 700 },
    h6: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600 },
    subtitle1: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600 },
    subtitle2: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600 },
    button: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 999, paddingLeft: 22, paddingRight: 22 },
        contained: {
          border: `3px solid ${colors.eggplant}`,
          boxShadow: "4px 4px 0 rgba(42, 9, 68, 0.25)",
          "&:hover": { boxShadow: "4px 4px 0 rgba(42, 9, 68, 0.25)" },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20, border: `3px solid ${colors.eggplant}` },
      },
    },
  },
});

export default theme;
