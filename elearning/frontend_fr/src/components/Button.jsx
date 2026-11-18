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
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
  }[size] || 'px-4 py-2 text-sm rounded-xl gap-2';

  const variantClasses = {
    primary:
      'bg-[#4B3B78] text-white hover:bg-[#3D2E66] active:bg-[#30264F] border border-[#3D2E66]/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:ring-2 focus:ring-[#4B3B78]/30 font-bold',
    secondary:
      'bg-[#4F8FBB] text-white hover:bg-[#397394] active:bg-[#2E607C] border border-[#397394]/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:ring-2 focus:ring-[#4F8FBB]/30 font-bold',
    outline:
      'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100 shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:ring-2 focus:ring-slate-300 font-bold',
    accent:
      'bg-[#F2C94C] text-[#5C4305] hover:bg-[#D8A91F] active:bg-[#A97E0D] border border-[#D8A91F] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:ring-2 focus:ring-[#F2C94C]/40 font-bold',
    gold:
      'bg-[#F2C94C] text-[#5C4305] hover:bg-[#D8A91F] active:bg-[#A97E0D] border border-[#D8A91F] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:ring-2 focus:ring-[#F2C94C]/40 font-bold',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 border border-emerald-700/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:ring-2 focus:ring-emerald-500/30 font-bold',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 border border-rose-700/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:ring-2 focus:ring-rose-500/30 font-bold',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 border border-transparent font-semibold active:scale-[0.98]',
  }[variant] || 'bg-[#4B3B78] text-white hover:bg-[#3D2E66] border border-[#3D2E66]/50 shadow-sm font-bold';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-bold transition-all duration-150 select-none cursor-pointer focus:outline-none disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none ${variantClasses} ${sizeClasses} ${className}`}
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
