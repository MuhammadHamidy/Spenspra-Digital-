'use client';

import React from 'react';
import Image from 'next/image';

export default function PerpusNavbar() {
  return (
    <header className="relative w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 relative z-10">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-xs border border-slate-100 flex-shrink-0 p-0.5">
            <Image
              src="/image/logo_prambon.png"
              alt="Logo SMPN 1 Prambon"
              width={34}
              height={34}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <p className="font-bold text-[#0A1931] text-sm leading-tight">
              Perpustakaan SMPN 1 Prambon
            </p>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              Layanan Mandiri Perpustakaan
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
