'use client';

import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Slide from '@mui/material/Slide';

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function MuiAlertSnackbar({
  open,
  onClose,
  message,
  severity = 'success', // 'success' | 'info' | 'warning' | 'error'
  autoHideDuration = 4000,
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
}) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      slots={{ transition: SlideTransition }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{
          width: '100%',
          borderRadius: '14px',
          fontWeight: 600,
          boxShadow: '0 10px 25px -5px rgba(10, 25, 49, 0.25)',
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
