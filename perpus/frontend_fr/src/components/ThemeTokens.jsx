import React from 'react';
import AppIcon from './AppIcon';

// Design System Color Palette Tokens
export const THEME_PALETTE = {
  darkNavy: '#0A1931',
  oceanBlue: '#1A3D63',
  slateBlue: '#4A7FA7',
  powderBlue: '#B3CFE5',
  snowBg: '#F6FAFD',
};

// Reusable Theme Badge Component without text emojis
export function RoleThemeBadge({ role, compact = false }) {
  const roleUpper = (role || 'GURU').toUpperCase();

  if (roleUpper === 'ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-extrabold rounded-lg bg-[#1A3D63] text-white border border-[#4A7FA7] shadow-xs">
        <AppIcon name="admin" color="white" size={12} />
        <span>ADMIN</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-extrabold rounded-lg bg-[#E6F0FA] text-[#1A3D63] border border-[#B3CFE5] shadow-xs">
      <AppIcon name="profile" color="blue" size={12} />
      <span>{compact ? 'GURU' : 'GURU'}</span>
    </span>
  );
}

// Visual Color Tokens Indicator Component
export default function ThemeTokensVisualizer() {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
      <span className="font-bold text-slate-400">Palette:</span>
      <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" title="Indigo Primary"></span>
      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" title="Emerald Success"></span>
      <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" title="Amber Warning"></span>
      <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" title="Rose Danger"></span>
    </div>
  );
}
