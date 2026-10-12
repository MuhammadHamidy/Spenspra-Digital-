'use client';

import React from 'react';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { styled } from '@mui/material/styles';

export const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    transition: 'all 0.15s ease',
    '& fieldset': {
      borderColor: '#B3CFE5',
    },
    '&:hover fieldset': {
      borderColor: '#4A7FA7',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#1A3D63',
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#4A7FA7',
    fontWeight: 600,
    fontSize: '0.875rem',
    '&.Mui-focused': {
      color: '#1A3D63',
      fontWeight: 700,
    },
  },
  '& .MuiInputBase-input': {
    color: '#0A1931',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
}));

export function MuiSearchInput({
  value,
  onChange,
  placeholder = 'Cari...',
  className = '',
  size = 'small',
  ...props
}) {
  return (
    <StyledTextField
      variant="outlined"
      size={size}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#4A7FA7', fontSize: 20 }} />
            </InputAdornment>
          ),
        },
      }}
      {...props}
    />
  );
}

export function MuiSelectField({
  label,
  value,
  onChange,
  children,
  size = 'small',
  fullWidth = true,
  className = '',
  ...props
}) {
  return (
    <FormControl fullWidth={fullWidth} size={size} className={className}>
      {label && (
        <InputLabel
          sx={{
            color: '#4A7FA7',
            fontWeight: 600,
            fontSize: '0.875rem',
            '&.Mui-focused': { color: '#1A3D63', fontWeight: 700 },
          }}
        >
          {label}
        </InputLabel>
      )}
      <Select
        value={value}
        label={label}
        onChange={onChange}
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          fontWeight: 600,
          color: '#0A1931',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#B3CFE5',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#4A7FA7',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1A3D63',
            borderWidth: '2px',
          },
        }}
        {...props}
      >
        {children}
      </Select>
    </FormControl>
  );
}
