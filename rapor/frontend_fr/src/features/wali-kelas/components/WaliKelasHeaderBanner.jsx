'use client';

import React from 'react';

export default function WaliKelasHeaderBanner({
  selectedClass,
  teacherName,
  teacherNip,
  academicYear = '2025/2026',
  semester = 'Genap',
  setAcademicYear,
  setSemester,
  endorsement = null,
  isAdminOrKepalaSekolah = false,
  onOpenSignature = null,
}) {
  const isEndorsed = Boolean(endorsement && (endorsement.status === 'APPROVED' || endorsement.signature_data));
  const isAdminEndorsed = isEndorsed && (endorsement?.approver_role === 'ADMIN' || (endorsement?.notes && endorsement.notes.toLowerCase().includes('admin')));
  const yearOptions = Array.from(new Set(['2024/2025', '2025/2026', '2026/2027', academicYear].filter(Boolean))).sort();

  return (
    <section className="bg-white border border-slate-200 border-l-4 border-l-[#193D9B] rounded-xl p-5 shadow-xs print:p-2 print:border-none print:shadow-none">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Kolom Kiri: Informasi Rombel & Status Pengesahan */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight print:text-base">
              Rekapitulasi Nilai & Rapor Kelas {selectedClass}
            </h1>
            {isEndorsed ? (
              isAdminEndorsed ? (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 shadow-2xs">
                  <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Disahkan Administrator</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Disahkan Kepala Sekolah</span>
                </span>
              )
            ) : (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Format Standar (Siap Cetak)</span>
              </span>
            )}

            {isAdminOrKepalaSekolah && onOpenSignature && (
              <button
                type="button"
                onClick={onOpenSignature}
                className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#193D9B] hover:bg-[#1E4DBD] text-white flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                title="Buka form pembubuhan pengesahan resmi oleh Kepala Sekolah atau Administrator"
              >
                <span>✍️</span>
                <span>{isEndorsed ? 'Ubah Pengesahan' : 'Pengesahan Kepsek / Admin'}</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Arsip dan rekapitulasi capaian rapor siswa. Rapor siap langsung dicetak kapan saja dengan opsi format standar 2 kolom atau pengesahan 3 kolom (Kepsek / Admin).
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7z" />
              </svg>
              <span>
                Wali Kelas: <strong className="text-slate-900 font-semibold">{teacherName || 'Belum Ditentukan'}</strong>
                {teacherNip ? <span className="font-mono text-slate-500"> (NIP. {teacherNip})</span> : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Periode Akademik Terkunci */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 shrink-0 print:hidden shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Tahun Ajaran: <strong className="text-slate-900">{academicYear}</strong></span>
          <span className="text-slate-300">•</span>
          <span>Semester: <strong className="text-slate-900">{semester}</strong></span>
        </div>
      </div>
    </section>
  );
}
