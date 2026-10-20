'use client';

import React from 'react';

export default function AttendanceModal({
  isOpen,
  onClose,
  selectedClass,
  studentsSummary = [],
  tempAttendance = {},
  updateTempAttendanceItem,
  onSaveAttendance,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Input Rekap Kehadiran Murid — Kelas {selectedClass}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Isikan jumlah hadir, sakit, izin, dan tanpa keterangan (alfa). Data ini otomatis tercetak pada lembar Rapor Sisipan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2 text-center w-10">No</th>
                <th className="p-2 text-left">Nama Siswa</th>
                <th className="p-2 text-center w-24">Hadir (Hari)</th>
                <th className="p-2 text-center w-24">Sakit (Hari)</th>
                <th className="p-2 text-center w-24">Izin (Hari)</th>
                <th className="p-2 text-center w-24">Alfa (Hari)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentsSummary.map((s, idx) => {
                const item = tempAttendance[s.id] || {
                  hadir: s.attendance?.hadir ?? s.hadir ?? 0,
                  sakit: s.attendance?.sakit ?? s.sakit ?? 0,
                  izin: s.attendance?.izin ?? s.izin ?? 0,
                  alfa: s.attendance?.alfa ?? s.alfa ?? 0,
                };
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-2 text-center font-semibold text-slate-500">{idx + 1}</td>
                    <td className="p-2 font-semibold text-slate-900">
                      {s.name} <span className="block text-[10px] text-slate-400 font-mono">{s.nisn}</span>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.hadir}
                        onChange={(e) => updateTempAttendanceItem(s.id, 'hadir', e.target.value)}
                        className="w-16 text-center border border-slate-300 rounded p-1 font-semibold focus:ring-1 focus:ring-[#1E4DBD] outline-none"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.sakit}
                        onChange={(e) => updateTempAttendanceItem(s.id, 'sakit', e.target.value)}
                        className="w-16 text-center border border-slate-300 rounded p-1 font-semibold focus:ring-1 focus:ring-[#1E4DBD] outline-none"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.izin}
                        onChange={(e) => updateTempAttendanceItem(s.id, 'izin', e.target.value)}
                        className="w-16 text-center border border-slate-300 rounded p-1 font-semibold focus:ring-1 focus:ring-[#1E4DBD] outline-none"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.alfa}
                        onChange={(e) => updateTempAttendanceItem(s.id, 'alfa', e.target.value)}
                        className="w-16 text-center border border-slate-300 rounded p-1 font-semibold text-rose-600 focus:ring-1 focus:ring-rose-500 outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <p className="text-[11px] text-slate-500">
            Data kehadiran akan disimpan dan langsung masuk ke tabel kehadiran rapor masing-masing siswa.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onSaveAttendance}
              className="px-5 py-2 rounded-xl bg-[#193D9B] hover:bg-[#1E4DBD] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Simpan Kehadiran
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
