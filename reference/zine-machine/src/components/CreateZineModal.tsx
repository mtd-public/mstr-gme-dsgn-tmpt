import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";

interface CreateZineModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}

export default function CreateZineModal({ open, onClose, onCreate }: CreateZineModalProps) {
  const [title, setTitle] = useState("");

  const trimmedTitle = title.trim();
  const isValid = trimmedTitle.length > 0;

  const handleClose = () => {
    setTitle("");
    onClose();
  };

  const handleCreate = () => {
    if (!isValid) return;
    onCreate(trimmedTitle);
    setTitle("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>New Zine</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            required
            label="Zine title"
            placeholder="e.g. Moonlit Marginalia"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid) handleCreate();
            }}
            fullWidth
          />
          <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              variant="contained"
              size="large"
              disabled={!isValid}
              sx={{ px: 4, fontWeight: 700 }}
            >
              CREATE
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
