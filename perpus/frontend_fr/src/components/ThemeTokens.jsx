import React from 'react';

// Design System Color Palette Tokens - Sesuai DESIGN fix.md
export const THEME_PALETTE = {
  bgApp: '#F8F9FC',
  bgSurface: '#FFFFFF',
  borderSubtle: '#E5E7EB',
  borderStrong: '#98A2B3',
  textPrimary: '#172033',
  textSecondary: '#667085',
  primary: '#4B3B78',
  secondary: '#4F8FBB',
  accent: '#F2C94C',
  success: '#2E7D5B',
  danger: '#C0392B',
};

// Reusable Theme Badge Component (Flat, sentence case, no glow)
export function RoleThemeBadge({ role }) {
  const roleUpper = (role || 'GURU').toUpperCase();

  if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[var(--color-primary-100,#EDEAF5)] text-[var(--color-primary-800,#30264F)] border border-[var(--color-primary-300,#B9B0D2)]">
        Admin
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[var(--color-neutral-100,#F8F9FC)] text-[var(--color-neutral-800,#344054)] border border-[var(--color-neutral-300,#E5E7EB)]">
      Guru
    </span>
  );
}
