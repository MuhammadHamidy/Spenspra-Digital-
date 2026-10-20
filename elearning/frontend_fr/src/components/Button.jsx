'use client';

import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  startIcon,
  endIcon,
  type = 'button',
  onClick,
  ...props
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }[size] || 'px-4 py-2 text-sm';

  const variantClasses = {
    primary:
      'bg-[var(--color-primary-500,#4B3B78)] text-white hover:bg-[var(--color-primary-700,#3D2E66)] active:bg-[var(--color-primary-800,#30264F)] focus:ring-2 focus:ring-[var(--color-primary-300,#B9B0D2)] shadow-[var(--shadow-sm)] border border-transparent',
    secondary:
      'bg-[var(--color-secondary-500,#4F8FBB)] text-white hover:bg-[var(--color-secondary-700,#397394)] active:bg-[var(--color-secondary-800,#2E607C)] focus:ring-2 focus:ring-[var(--color-secondary-300,#A8CBDD)] shadow-[var(--shadow-sm)] border border-transparent',
    outline:
      'bg-white text-[var(--color-neutral-1000,#172033)] border border-[var(--color-neutral-300,#E5E7EB)] hover:bg-[var(--color-neutral-100,#F8F9FC)] active:bg-[var(--color-neutral-300,#E5E7EB)] focus:ring-2 focus:ring-[var(--color-primary-100,#EDEAF5)] shadow-[var(--shadow-sm)]',
    accent:
      'bg-[var(--color-accent-500,#F2C94C)] text-[var(--color-accent-1000,#5C4305)] hover:bg-[var(--color-accent-700,#D8A91F)] active:bg-[var(--color-accent-800,#A97E0D)] focus:ring-2 focus:ring-[var(--color-accent-300,#F9DD82)] shadow-[var(--shadow-sm)] border border-transparent',
    gold:
      'bg-[var(--color-accent-500,#F2C94C)] text-[var(--color-accent-1000,#5C4305)] hover:bg-[var(--color-accent-700,#D8A91F)] active:bg-[var(--color-accent-800,#A97E0D)] focus:ring-2 focus:ring-[var(--color-accent-300,#F9DD82)] shadow-[var(--shadow-sm)] border border-transparent',
    success:
      'bg-[var(--color-success-500,#2E7D5B)] text-white hover:bg-[var(--color-success-800,#1C5038)] focus:ring-2 focus:ring-[var(--color-success-300,#A9D8BC)] shadow-[var(--shadow-sm)] border border-transparent',
    danger:
      'bg-[var(--color-danger-500,#C0392B)] text-white hover:bg-[var(--color-danger-800,#7D261E)] active:bg-[var(--color-danger-800,#7D261E)] focus:ring-2 focus:ring-[var(--color-danger-300,#F1B4AC)] shadow-[var(--shadow-sm)] border border-transparent',
    ghost:
      'bg-transparent text-[var(--color-neutral-800,#344054)] hover:bg-[var(--color-neutral-100,#F8F9FC)] border border-transparent',
  }[variant] || 'bg-[var(--color-primary-500,#4B3B78)] text-white hover:bg-[var(--color-primary-700,#3D2E66)]';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-[8px] font-semibold transition-all duration-150 select-none cursor-pointer focus:outline-none disabled:bg-[var(--color-neutral-300,#E5E7EB)] disabled:text-[var(--color-neutral-500,#98A2B3)] disabled:border-transparent disabled:shadow-none disabled:cursor-not-allowed ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {loading && (
        <CircularProgress size={14} color="inherit" />
      )}
      {!loading && startIcon && <span className="shrink-0">{startIcon}</span>}
      <span>{children}</span>
      {!loading && endIcon && <span className="shrink-0">{endIcon}</span>}
    </button>
  );
}
