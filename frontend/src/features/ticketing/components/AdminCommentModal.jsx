import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress } from '@mui/material';

const AdminCommentModal = ({ open, onClose, onSubmit, loading }) => {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setComment('');
      setError('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!comment.trim()) {
      setError('Please provide a comment.');
      return;
    }
    onSubmit(comment.trim());
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>How was this ticket resolved?</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Resolution Comment"
          type="text"
          fullWidth
          multiline
          minRows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          error={!!error}
          helperText={error}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !comment.trim()}>
          {loading ? <CircularProgress size={20} /> : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminCommentModal; 