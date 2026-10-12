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
}) {
  const isEndorsed = Boolean(endorsement && (endorsement.status === 'APPROVED' || endorsement.signature_data));

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
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span>Disahkan Kepala Sekolah</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Menunggu Pengesahan</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Arsip dan rekapitulasi capaian rapor siswa. Pilih tahun ajaran & semester untuk mengakses riwayat rapor semester sebelumnya.
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

        {/* Kolom Kanan: Selector Tahun Ajaran & Semester */}
        {setAcademicYear && setSemester && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 shrink-0 print:hidden">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Tahun Ajaran
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-md outline-none cursor-pointer border border-slate-300 hover:border-[#193D9B] focus:ring-2 focus:ring-[#193D9B]/15 transition"
              >
                <option value="2024/2025">2024/2025 (Arsip)</option>
                <option value="2025/2026">2025/2026 (Aktif)</option>
                <option value="2026/2027">2026/2027</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-md outline-none cursor-pointer border border-slate-300 hover:border-[#193D9B] focus:ring-2 focus:ring-[#193D9B]/15 transition"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
