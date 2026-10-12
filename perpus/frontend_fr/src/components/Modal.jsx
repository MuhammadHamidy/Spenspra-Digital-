'use client';

import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { styled } from '@mui/material/styles';

const StyledDialog = styled(Dialog)(() => ({
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(10, 25, 49, 0.65)',
    backdropFilter: 'blur(4px)',
  },
  '& .MuiDialog-paper': {
    borderRadius: '24px',
    border: '1px solid #B3CFE5',
    boxShadow: '0 25px 50px -12px rgba(10, 25, 49, 0.35)',
    padding: '8px',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
}));

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'sm',
  fullWidth = true,
}) {
  return (
    <StyledDialog
      open={Boolean(isOpen)}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.5,
          borderBottom: '1px solid #B3CFE5',
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#0A1931',
          }}
        >
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Tutup"
          sx={{
            color: '#4A7FA7',
            borderRadius: '12px',
            '&:hover': {
              backgroundColor: '#F6FAFD',
              color: '#0A1931',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 2.5, pt: 3, '&:first-of-type': { pt: 2.5 } }}>
        {children}
      </DialogContent>
    </StyledDialog>
  );
}
