import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { colors } from "../../theme";

interface DeleteZineModalProps {
  open: boolean;
  zineTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteZineModal({
  open,
  zineTitle,
  onClose,
  onConfirm,
}: DeleteZineModalProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Zine?</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: colors.textMuted }}>
            Are you sure you want to delete <strong>{zineTitle}</strong>? This action cannot be
            undone.
          </Typography>
          <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button onClick={onConfirm} variant="contained" color="error">
              DELETE
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
