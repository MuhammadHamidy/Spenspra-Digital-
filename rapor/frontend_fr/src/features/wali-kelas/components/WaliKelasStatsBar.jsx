'use client';

import React from 'react';

export default function WaliKelasStatsBar({
  selectedClass,
  setSelectedClass,
  isAdminOrKepalaSekolah,
  availableClasses = ['7A', '7B', '8A', '8B', '9A', '9B'],
  totalStudents = 0,
  classAverage = 0,
  passedStudents = 0,
  remedialStudents = 0,
}) {
  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <p className="text-xs font-semibold text-slate-500">Kelas Binaan</p>
        <div className="mt-1 flex items-center justify-between">
          {isAdminOrKepalaSekolah ? (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-base font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-[#193D9B]/15 outline-none cursor-pointer"
            >
              {availableClasses.map((c) => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
            </select>
          ) : (
            <div className="text-xl font-bold text-slate-900">
              Kelas {selectedClass}
            </div>
          )}
          <span className="text-xs text-slate-400">Total {totalStudents} Siswa</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <p className="text-xs font-semibold text-slate-500">Rata-rata Kelas</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">{classAverage}</span>
          <span className="text-xs text-emerald-600 font-bold">KKM 75</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <p className="text-xs font-semibold text-slate-500">Siswa Tuntas</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-600">{passedStudents}</span>
          <span className="text-xs text-slate-400">/ {totalStudents} Siswa</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <p className="text-xs font-semibold text-slate-500">Perlu Bimbingan / Remedial</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-black text-amber-600">{remedialStudents}</span>
          <span className="text-xs text-amber-600 font-semibold">{remedialStudents > 0 ? 'Perlu tindakan' : 'Semua tuntas'}</span>
        </div>
      </div>
    </section>
  );
}
