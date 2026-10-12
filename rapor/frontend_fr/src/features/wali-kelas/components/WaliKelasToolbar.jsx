'use client';

import React from 'react';
import Link from 'next/link';

export default function WaliKelasToolbar({
  onOpenAttendance,
  onPrint,
  onExportExcel,
  onBulkPrint,
  isAdminOrKepalaSekolah = false,
  onOpenSignature = null,
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs print:hidden">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onBulkPrint}
          className="px-4 py-2 rounded-lg bg-[#193D9B] hover:bg-[#1E4DBD] text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
          title="Cetak seluruh lembar rapor siswa dalam 1 dokumen PDF"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Cetak Massal Rapor (1 Rombel)</span>
        </button>

        {isAdminOrKepalaSekolah && onOpenSignature && (
          <button
            type="button"
            onClick={onOpenSignature}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
            title="Pengesahan tanda tangan & stempel resmi Kepala Sekolah"
          >
            <span>✍️</span>
            <span>Pengesahan TTD & Stempel</span>
          </button>
        )}
        <button
          type="button"
          onClick={onExportExcel}
          className="px-4 py-2 rounded-lg bg-[#15803D] hover:bg-[#16A34A] text-white text-xs font-semibold transition shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Ekspor Buku Nilai (.xls)</span>
        </button>
        <button
          type="button"
          onClick={onOpenAttendance}
          className="px-4 py-2 rounded-lg bg-[#CA8A04] hover:bg-[#EAB308] text-white text-xs font-semibold transition shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Input Kehadiran Siswa</span>
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Cetak Rekap Kelas</span>
        </button>
      </div>
      <div>
        <Link
          href="/penilaian/pts"
          className="px-4 py-2 rounded-lg bg-[#193D9B] hover:bg-[#153280] text-white text-xs font-semibold transition flex items-center gap-2 shadow-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Input Nilai Mapel</span>
        </Link>
      </div>
    </section>
  );
}
