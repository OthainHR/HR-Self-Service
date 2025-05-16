import React from 'react';
import { Modal, Paper, Typography, Button, Box } from '@mui/material';
// import { motion } from 'framer-motion'; // Temporarily remove motion

const DisclaimerOverlay = ({ open, onClose }) => {
  if (!open) {
    return null;
  }

  const handleModalClose = (event, reason) => {
    if (reason && reason === 'backdropClick') {
      return; // Prevent closing on backdrop click
    }
    onClose(); // Call the original onClose for other cases (e.g., Escape key, or if we add other close methods)
  };

  return (
    <Modal
      open={open}
      onClose={handleModalClose} // Use the new handler
      aria-labelledby="disclaimer-title"
      aria-describedby="disclaimer-description"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* <motion.div  // Temporarily remove motion wrapper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      > */} 
        <Paper 
          elevation={3} // Keeping elevation for now, standard for Paper
          sx={{ 
            padding: 4, 
            maxWidth: '600px', 
            width: '90vw',    
            outline: 'none',  
            border: 'none', // Explicitly no border on Paper itself
            borderRadius: '20px', // User's preferred border radius
            maxHeight: '80vh',
            overflowY: 'auto'
            // backgroundColor and boxShadow are generally handled by theme + elevation
          }}
        >
          <Typography variant="h5" component="h2" id="disclaimer-title" gutterBottom sx={{ fontWeight: 'bold' }}>
            Disclaimer
          </Typography>
          <Typography variant="body1" id="disclaimer-description" sx={{ marginBottom: 3, whiteSpace: 'pre-wrap' }}>
            {`Othain Employee Self Service provides information and guidance for general reference purposes only. Although we make every effort to ensure responses are helpful and current, they may occasionally be incomplete, outdated, or incorrect. Othain Group does not guarantee the accuracy or suitability of AI-generated responses.

If you have further questions, notice inaccuracies, or require official confirmation, please contact hr@othainsoft.com.`}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={onClose}>
              Acknowledge
            </Button>
          </Box>
        </Paper>
      {/* </motion.div> */}
    </Modal>
  );
};

export default DisclaimerOverlay; 