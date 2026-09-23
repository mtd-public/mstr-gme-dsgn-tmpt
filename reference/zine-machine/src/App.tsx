import CssBaseline from "@mui/material/CssBaseline";
import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import ZineEditor from "./pages/ZineEditor";
import { ZinesProvider } from "./state/ZinesContext";

export default function App() {
  return (
    <ZinesProvider>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/zine/:zineId" element={<ZineEditor />} />
      </Routes>
    </ZinesProvider>
  );
}
