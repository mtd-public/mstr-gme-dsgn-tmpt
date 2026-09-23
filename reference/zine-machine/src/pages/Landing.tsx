import { useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  DataGrid,
  GridActionsCellItem,
  type GridColDef,
} from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import CreateZineModal from "../components/CreateZineModal";
import FavoriteCard from "../components/FavoriteCard";
import { useZines } from "../state/ZinesContext";
import { colors } from "../theme";
import type { Zine } from "../types";

const ACCENTS = [colors.bubblegum, colors.slime, colors.banana];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Landing() {
  const { zines, favorites, createZine, toggleFavorite, touchZine } = useZines();
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const openZine = (id: string) => {
    touchZine(id);
    navigate(`/zine/${id}`);
  };

  const columns: GridColDef<Zine>[] = useMemo(
    () => [
      {
        field: "favorited",
        headerName: "",
        width: 64,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <GridActionsCellItem
            icon={
              params.row.favorited ? (
                <StarIcon sx={{ color: colors.banana }} />
              ) : (
                <StarBorderIcon sx={{ color: "#D8C6E0" }} />
              )
            }
            label={params.row.favorited ? "Unfavorite" : "Favorite"}
            onClick={() => toggleFavorite(params.row.id)}
          />
        ),
      },
      {
        field: "title",
        headerName: "Title",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "createdAt",
        headerName: "Created",
        width: 140,
        valueFormatter: (value: string) => formatDate(value),
      },
      {
        field: "lastAccessed",
        headerName: "Last Accessed",
        width: 160,
        valueFormatter: (value: string) => formatDate(value),
      },
      {
        field: "actions",
        type: "actions",
        headerName: "",
        width: 70,
        getActions: (params) => [
          <GridActionsCellItem
            icon={<EditIcon sx={{ color: colors.eggplant }} />}
            label="Edit zine"
            onClick={() => openZine(String(params.id))}
            style={{
              backgroundColor: colors.slime,
              border: `2px solid ${colors.eggplant}`,
              borderRadius: 9,
            }}
          />,
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toggleFavorite],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box sx={{ bgcolor: colors.eggplant, px: { xs: 2, sm: 7 }, py: 3.5 }}>
        <Stack
          direction="row"
          sx={{ maxWidth: 1100, mx: "auto", justifyContent: "space-between", alignItems: "center" }}
        >
          <Typography variant="h4" component="h1" sx={{ color: colors.bubblegum }}>
            Zine Machine
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
            sx={{ border: `3px solid ${colors.banana}` }}
          >
            New Zine
          </Button>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, sm: 4 } }}>
        {favorites.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 1.5, color: colors.grape }}>
              ★ Favorites
            </Typography>
            <Stack direction="row" spacing={2.5} sx={{ flexWrap: "wrap", rowGap: 2.5 }}>
              {favorites.map((zine, i) => (
                <FavoriteCard
                  key={zine.id}
                  zine={zine}
                  accentColor={ACCENTS[i % ACCENTS.length]}
                  flagColor={ACCENTS[(i + 1) % ACCENTS.length]}
                  onUnfavorite={toggleFavorite}
                  onOpen={touchZine}
                />
              ))}
            </Stack>
          </Box>
        )}

        <Typography variant="h6" sx={{ mb: 1.5, color: colors.grape }}>
          All Projects
        </Typography>
        <Box
          sx={{
            height: 480,
            width: "100%",
            borderRadius: "16px",
            border: `3px solid ${colors.eggplant}`,
            boxShadow: `6px 6px 0 rgba(42, 9, 68, 0.15)`,
            overflow: "hidden",
          }}
        >
          <DataGrid
            rows={zines}
            columns={columns}
            disableRowSelectionOnClick
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25]}
            getRowClassName={(params) =>
              params.indexRelativeToCurrentPage % 2 === 0 ? "zine-row-even" : "zine-row-odd"
            }
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaderTitle": {
                color: colors.banana,
                fontWeight: 800,
                textTransform: "uppercase",
                fontSize: "0.75rem",
                letterSpacing: "0.5px",
              },
              "& .MuiDataGrid-row.zine-row-even": { bgcolor: colors.paper },
              "& .MuiDataGrid-row.zine-row-odd": { bgcolor: "#FDEAF6" },
              "& .MuiDataGrid-cell": { borderColor: "#F3D9F0" },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
                outline: "none",
              },
            }}
          />
        </Box>
      </Box>

      <CreateZineModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={createZine}
      />
    </Box>
  );
}
