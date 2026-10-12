'use client';

import React from 'react';

export default function KioskAttendanceSuccessScreen({
  attendanceRecord,
  attendanceCountdown,
  handleFullResetToHome,
}) {
  if (!attendanceRecord) return null;

  return (
    <div className="w-full max-w-xl flex flex-col items-center py-6 sm:py-10 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full bg-white rounded-3xl p-7 sm:p-9 border border-slate-200/90 shadow-xl space-y-6 text-center">
        {/* Success Badge & Icon */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border-4 border-emerald-100 flex items-center justify-center text-4xl shadow-inner animate-bounce">
            ✓
          </div>
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black tracking-wider uppercase">
            KEHADIRAN BERHASIL DICATAT
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0A1931]">
            Selamat Datang!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
            {attendanceRecord.purpose === 'PEMBELAJARAN'
              ? 'Presensi kegiatan pembelajaran & literasi kelas telah berhasil terekam ke sistem perpustakaan.'
              : 'Presensi buku tamu perpustakaan sekolah telah berhasil dicatat.'}
          </p>
        </div>

        {/* Profile Card Box */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-left space-y-3.5">
          <div className="flex items-center gap-3.5 pb-3 border-b border-slate-200/70">
            <div className="w-12 h-12 rounded-full bg-[#0084FF] text-white font-black text-base flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {attendanceRecord.photo ? (
                <img src={attendanceRecord.photo} alt="Visitor" className="w-full h-full object-cover" />
              ) : (
                <span>{(attendanceRecord.name || 'P')[0]}</span>
              )}
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 leading-tight">
                {attendanceRecord.name}
              </h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                NISN: {attendanceRecord.studentId} • Kelas: {attendanceRecord.className}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tujuan Kunjungan</span>
              <span className="font-extrabold text-[#0084FF] mt-0.5 inline-block">
                {attendanceRecord.purposeLabel}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Waktu Presensi</span>
              <span className="font-bold text-slate-700 mt-0.5 inline-block">
                {attendanceRecord.time} WIB
              </span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 text-center">
            <span className="text-[11px] font-mono text-slate-500">
              KODE PRESENSI: <strong>{attendanceRecord.id}</strong> • {attendanceRecord.date}
            </span>
          </div>
        </div>

        {/* Status Sesi Harian: Batas 1 Hari, Restart Saat Berganti Hari */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
          <span>📅</span>
          <span>
            {attendanceRecord.isReusedDailySession
              ? 'Sesi Hari Ini Masih Aktif • Anda sudah tercatat hadir. Sesi berlaku 1 hari dan otomatis me-restart pada pergantian hari.'
              : 'Sesi Presensi Perpustakaan Aktif (Batas 1 Hari) • Otomatis me-restart pada pergantian hari agar dapat digunakan kembali.'}
          </span>
        </div>

        {/* Status Note: No book scan required */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-[#0066CC] font-semibold flex items-center justify-center gap-2">
          <span>✨</span>
          <span>Anda tidak perlu memindai buku. Silakan langsung menikmati fasilitas perpustakaan.</span>
        </div>

        {/* Action: Selesai & Kembali ke Beranda */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleFullResetToHome}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#0084FF] hover:bg-[#0070DE] text-white font-black text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>SELESAI &amp; KEMBALI KE AWAL</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            SISTEM AKAN KEMBALI KE BERANDA OTOMATIS DALAM {attendanceCountdown} DETIK.
          </p>
        </div>
      </div>
    </div>
  );
}
