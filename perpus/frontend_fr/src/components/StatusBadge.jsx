'use client';

import React from 'react';
import Chip from '@mui/material/Chip';
import { styled } from '@mui/material/styles';

const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'statusType',
})(({ statusType }) => {
  const styles = {
    HADIR: {
      backgroundColor: '#ECFDF5',
      color: '#047857',
      borderColor: '#A7F3D0',
      fontWeight: 800,
    },
    TERLAMBAT: {
      backgroundColor: '#FFF7ED',
      color: '#C2410C',
      borderColor: '#FDBA74',
      fontWeight: 800,
    },
    IZIN: {
      backgroundColor: '#FFFBEB',
      color: '#B45309',
      borderColor: '#FDE68A',
      fontWeight: 800,
    },
    SAKIT: {
      backgroundColor: '#EFF6FF',
      color: '#1D4ED8',
      borderColor: '#BFDBFE',
      fontWeight: 800,
    },
    ALPA: {
      backgroundColor: '#FFF1F2',
      color: '#BE123C',
      borderColor: '#FECDD3',
      fontWeight: 800,
    },
    OPEN: {
      backgroundColor: '#059669',
      color: '#FFFFFF',
      borderColor: '#059669',
      fontWeight: 800,
      boxShadow: '0 2px 8px rgba(5, 150, 105, 0.35)',
    },
    CLOSED: {
      backgroundColor: '#F6FAFD',
      color: '#4A7FA7',
      borderColor: '#B3CFE5',
      fontWeight: 700,
    },
    UPCOMING: {
      backgroundColor: '#E0F2FE',
      color: '#0369A1',
      borderColor: '#BAE6FD',
      fontWeight: 800,
    },
  };

  const current = styles[statusType] || {
    backgroundColor: '#F6FAFD',
    color: '#0A1931',
    borderColor: '#B3CFE5',
    fontWeight: 600,
  };

  return {
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '0.75rem',
    height: '24px',
    padding: '0 4px',
    ...current,
  };
});

export default function StatusBadge({ status, className = '', size = 'small' }) {
  const normStatus = (status || '').toUpperCase();
  return (
    <StyledChip
      statusType={normStatus}
      label={status}
      size={size}
      className={className}
    />
  );
}
