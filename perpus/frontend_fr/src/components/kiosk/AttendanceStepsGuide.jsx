'use client';

import React from 'react';

export default function AttendanceStepsGuide({ selectedPurpose }) {
  const isGuestOrClass = selectedPurpose === 'PEMBELAJARAN' || selectedPurpose === 'TAMU';

  return (
    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-slate-100 text-[#0A1931] font-black text-sm flex items-center justify-center flex-shrink-0">
          1
        </span>
        <p className="text-xs font-semibold text-slate-700 leading-snug">
          Posisikan wajah tegak di depan kamera
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-slate-100 text-[#0A1931] font-black text-sm flex items-center justify-center flex-shrink-0">
          2
        </span>
        <p className="text-xs font-semibold text-slate-700 leading-snug">
          Pastikan pencahayaan cukup dan wajah terlihat jelas
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-slate-100 text-[#0A1931] font-black text-sm flex items-center justify-center flex-shrink-0">
          3
        </span>
        <p className="text-xs font-semibold text-slate-700 leading-snug">
          {isGuestOrClass
            ? 'Konfirmasi kehadiran selesai tanpa pindai buku'
            : 'Lanjutkan ke pemindaian barcode buku'}
        </p>
      </div>
    </div>
  );
}
