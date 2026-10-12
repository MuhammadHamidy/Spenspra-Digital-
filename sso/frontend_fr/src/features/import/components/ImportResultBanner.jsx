'use client';

import React from 'react';

export default function ImportResultBanner({ activeTab, result }) {
  if (!result) return null;

  return (
    <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-sm font-bold text-emerald-900">
            Impor Berkas Berhasil Diproses
          </h4>
        </div>
        <p className="text-xs text-emerald-700">
          {activeTab === 'students' ? (
            <>
              Sebanyak <strong className="font-bold">{result.inserted} data siswa</strong> berhasil diproses dan disimpan ke sistem presensi dari {result.total_rows} baris data.
            </>
          ) : (
            <>
              Sebanyak <strong className="font-bold">{result.inserted} data guru</strong> berhasil diproses dan disimpan ke sistem dengan status Guru Aktif dari {result.total_rows} baris data.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
