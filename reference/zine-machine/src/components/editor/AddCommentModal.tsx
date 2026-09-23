import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

interface AddCommentModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (text: string) => void;
}

export default function AddCommentModal({ open, onClose, onAdd }: AddCommentModalProps) {
  const [text, setText] = useState("");

  const trimmed = text.trim();
  const isValid = trimmed.length > 0;

  const handleClose = () => {
    setText("");
    onClose();
  };

  const handleAdd = () => {
    if (!isValid) return;
    onAdd(trimmed);
    setText("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Add Comment</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            required
            label="Comment"
            placeholder="Leave a note about this zine..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleAdd} variant="contained" disabled={!isValid}>
              ADD
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
