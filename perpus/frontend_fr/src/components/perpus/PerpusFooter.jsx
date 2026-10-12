'use client';

import React from 'react';

export default function PerpusFooter({ currentTimeStr }) {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-xs py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-500 font-medium">
        {/* Left: Layanan Mandiri Perpustakaan */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span>Layanan Mandiri Perpustakaan SMPN 1 Prambon</span>
        </div>

        {/* Right: Realtime Indonesian Clock */}
        <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{currentTimeStr || 'Memuat waktu...'}</span>
        </div>
      </div>
    </footer>
  );
}
