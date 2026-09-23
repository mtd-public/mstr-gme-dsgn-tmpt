import { useState } from "react";
import AddCommentIcon from "@mui/icons-material/AddComment";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddCommentModal from "./AddCommentModal";
import { useZines } from "../../state/ZinesContext";
import { colors } from "../../theme";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface CommentsPanelProps {
  zineId: string;
}

export default function CommentsPanel({ zineId }: CommentsPanelProps) {
  const { getComments, addComment } = useZines();
  const [modalOpen, setModalOpen] = useState(false);
  const comments = getComments(zineId);

  if (comments.length === 0) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pt: 4, px: 1 }}>
        <Typography variant="body2" sx={{ color: colors.textMuted, textAlign: "center" }}>
          No comments yet.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddCommentIcon />}
          onClick={() => setModalOpen(true)}
        >
          Add Comment
        </Button>
        <AddCommentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onAdd={(text) => addComment(zineId, text)}
        />
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {comments.map((comment) => (
        <Box
          key={comment.id}
          sx={{
            bgcolor: colors.background,
            borderRadius: 1.5,
            border: `2px solid ${colors.eggplant}`,
            p: 1.5,
          }}
        >
          <Typography variant="body2" sx={{ color: colors.eggplant, mb: 0.5 }}>
            {comment.text}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.textMuted, fontWeight: 700 }}>
            {formatDate(comment.createdAt)}
          </Typography>
        </Box>
      ))}
      <Button
        variant="outlined"
        startIcon={<AddCommentIcon />}
        onClick={() => setModalOpen(true)}
      >
        Add Comment
      </Button>
      <AddCommentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(text) => addComment(zineId, text)}
      />
    </Stack>
  );
}
