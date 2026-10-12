'use client';

import React from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { styled } from '@mui/material/styles';

const StyledMuiButton = styled(MuiButton, {
  shouldForwardProp: (prop) => !['customVariant', 'customSize'].includes(prop),
})(({ customVariant = 'primary', customSize = 'md' }) => {
  const sizeStyles = {
    sm: {
      padding: '6px 14px',
      fontSize: '0.75rem',
      borderRadius: '10px',
    },
    md: {
      padding: '9px 18px',
      fontSize: '0.875rem',
      borderRadius: '12px',
    },
    lg: {
      padding: '12px 24px',
      fontSize: '1rem',
      borderRadius: '14px',
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: '#1A3D63',
      color: '#ffffff',
      boxShadow: '0 4px 14px rgba(26, 61, 99, 0.25)',
      '&:hover': {
        backgroundColor: '#0A1931',
        boxShadow: '0 6px 18px rgba(10, 25, 49, 0.35)',
      },
    },
    secondary: {
      backgroundColor: '#B3CFE5',
      color: '#0A1931',
      boxShadow: 'none',
      '&:hover': {
        backgroundColor: '#4A7FA7',
        color: '#ffffff',
      },
    },
    emerald: {
      backgroundColor: '#059669',
      color: '#ffffff',
      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
      '&:hover': {
        backgroundColor: '#047857',
        boxShadow: '0 6px 18px rgba(5, 150, 105, 0.35)',
      },
    },
    danger: {
      backgroundColor: '#E11D48',
      color: '#ffffff',
      boxShadow: '0 4px 14px rgba(225, 29, 72, 0.25)',
      '&:hover': {
        backgroundColor: '#BE123C',
        boxShadow: '0 6px 18px rgba(225, 29, 72, 0.35)',
      },
    },
    outline: {
      backgroundColor: '#F6FAFD',
      color: '#1A3D63',
      border: '1.5px solid #4A7FA7',
      boxShadow: 'none',
      '&:hover': {
        backgroundColor: '#1A3D63',
        color: '#ffffff',
        borderColor: '#1A3D63',
      },
    },
  };

  return {
    fontWeight: 700,
    textTransform: 'none',
    transition: 'all 0.15s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    '&:active': {
      transform: 'scale(0.98)',
    },
    '&.Mui-disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    ...(sizeStyles[customSize] || sizeStyles.md),
    ...(variantStyles[customVariant] || variantStyles.primary),
  };
});

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  startIcon,
  endIcon,
  ...props
}) {
  return (
    <StyledMuiButton
      customVariant={variant}
      customSize={size}
      disabled={disabled || loading}
      className={className}
      startIcon={!loading ? startIcon : null}
      endIcon={!loading ? endIcon : null}
      {...props}
    >
      {loading && (
        <CircularProgress
          size={16}
          color="inherit"
          sx={{ mr: children ? 1 : 0 }}
        />
      )}
      {children}
    </StyledMuiButton>
  );
}
