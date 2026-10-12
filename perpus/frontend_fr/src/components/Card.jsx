'use client';

import React from 'react';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

const StyledCard = styled(MuiCard)(() => ({
  backgroundColor: '#FFFFFF',
  border: '1px solid #B3CFE5',
  borderRadius: '20px',
  boxShadow: '0 4px 20px -2px rgba(26, 61, 99, 0.08)',
  transition: 'all 0.2s ease-in-out',
  overflow: 'hidden',
  '&:hover': {
    boxShadow: '0 8px 30px -4px rgba(26, 61, 99, 0.12)',
  },
}));

export default function Card({ title, subtitle, icon, action, children, className = '', contentSx = {} }) {
  return (
    <StyledCard className={className}>
      {(title || icon || action) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 3,
            pb: children ? 1 : 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {icon && (
              <Box
                sx={{
                  p: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#F6FAFD',
                  color: '#1A3D63',
                  border: '1px solid #B3CFE5',
                  borderRadius: '14px',
                  fontSize: '1.25rem',
                }}
              >
                {icon}
              </Box>
            )}
            <Box>
              {title && (
                <Typography
                  component="h3"
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    color: '#0A1931',
                    lineHeight: 1.25,
                  }}
                >
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.8rem',
                    color: '#4A7FA7',
                    fontWeight: 600,
                    mt: 0.25,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {action && <Box>{action}</Box>}
        </Box>
      )}
      <CardContent
        sx={{
          p: (title || icon || action) ? 3 : 3,
          pt: (title || icon || action) ? 1 : 3,
          '&:last-child': { pb: 3 },
          ...contentSx,
        }}
      >
        {children}
      </CardContent>
    </StyledCard>
  );
}
