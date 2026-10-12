'use client';

import React from 'react';

export default function VisitorProfileCard({
  selectedPurpose,
  detectedStudent,
  setDetectedStudent,
  faceScanError,
  setFaceScanError,
  handleCompleteAttendanceOnly,
  setCurrentScreen,
  handleResetFaceScan,
}) {
  const isGuestOrClass = selectedPurpose === 'PEMBELAJARAN' || selectedPurpose === 'TAMU';

  return (
    <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-xl font-black text-[#0A1931]">Profil Pengunjung</h3>
        <p
          className={`text-[11px] font-bold tracking-wider uppercase mt-0.5 ${
            detectedStudent ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          {detectedStudent ? 'IDENTITAS TERDETEKSI' : 'MENUNGGU PEMINDAIAN'}
        </p>
        <hr className="my-4 border-slate-100" />

        {/* Avatar & Info */}
        <div className="flex flex-col items-center text-center my-4">
          <div
            className={`w-28 h-28 rounded-full border-4 flex items-center justify-center overflow-hidden shadow-inner mb-3 transition-colors ${
              detectedStudent ? 'border-emerald-200 bg-slate-100' : 'border-blue-100 bg-slate-50'
            }`}
          >
            {detectedStudent?.photo ? (
              <img src={detectedStudent.photo} alt={detectedStudent.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-300">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>

          {detectedStudent ? (
            <div className="space-y-1.5 text-center w-full">
              <h4 className="text-xl font-black text-[#0A1931]">{detectedStudent.name}</h4>
              <div className="flex items-center justify-center gap-2 flex-wrap text-xs pt-0.5">
                <span className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#0066CC] font-mono font-bold">
                  NISN: {detectedStudent.identityNumber || detectedStudent.id}
                </span>
                <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  Kelas: {detectedStudent.className || 'Siswa'}
                </span>
              </div>
              {detectedStudent.hasActiveSessionToday && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-[11px] font-bold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sesi Hari Ini Aktif (Batas 1 Hari • Hadir {detectedStudent.activeSessionTime ? `pukul ${detectedStudent.activeSessionTime}` : 'hari ini'})</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full space-y-2 my-2">
              <div className="w-36 h-3 bg-slate-100 rounded-full mx-auto animate-pulse" />
              <div className="w-24 h-2.5 bg-slate-100 rounded-full mx-auto animate-pulse" />
            </div>
          )}

          {faceScanError ? (
            <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left flex items-start gap-2 max-w-sm">
              <svg className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-bold text-rose-800">Verifikasi Ditolak</p>
                <p className="text-[11px] text-rose-600 mt-0.5 leading-relaxed">{faceScanError}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-4 max-w-[280px] leading-relaxed">
              {detectedStudent
                ? detectedStudent.hasActiveSessionToday
                  ? 'Sesi perpustakaan Anda untuk hari ini masih aktif dan dapat digunakan.'
                  : 'Identitas biometrik terverifikasi di database perpustakaan!'
                : 'Mohon tunggu sebentar saat sistem memproses biometrik Anda...'}
            </p>
          )}
        </div>
      </div>

      {/* Buttons: Dynamic based on selectedPurpose */}
      <div className="space-y-2.5 mt-4">
        <button
          type="button"
          onClick={() => {
            if (!detectedStudent) return;
            if (isGuestOrClass) {
              handleCompleteAttendanceOnly();
            } else {
              setCurrentScreen('scan');
            }
          }}
          disabled={!detectedStudent}
          className={`w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 group ${
            detectedStudent
              ? 'bg-[#0084FF] hover:bg-[#0070DE] text-white shadow-blue-500/25 active:scale-[0.99] cursor-pointer'
              : 'bg-sky-400/80 text-white cursor-not-allowed'
          }`}
        >
          <span>
            {isGuestOrClass
              ? detectedStudent?.hasActiveSessionToday
                ? 'Konfirmasi Bukti Presensi (Sesi Aktif)'
                : 'Selesaikan Presensi Kehadiran'
              : detectedStudent?.hasActiveSessionToday
              ? 'Lanjutkan Ke Pindai Buku (Sesi Aktif)'
              : 'Lanjutkan Ke Pindai Buku'}
          </span>
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleResetFaceScan}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Ulangi Scan</span>
        </button>

        {selectedPurpose === 'TAMU' && (
          <button
            type="button"
            onClick={() => {
              setDetectedStudent({
                name: 'Tamu Perpustakaan',
                id: `GUEST-${Date.now().toString().slice(-4)}`,
                memberCode: `GUEST-${Date.now().toString().slice(-4)}`,
                identityNumber: 'Pengunjung Umum',
                className: 'Kunjungan Tamu / Kedinasan',
                photo: null,
                status: 'ready',
              });
              setFaceScanError(null);
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            title="Presensi sebagai Tamu Umum tanpa pemindaian wajah"
          >
            <span>🤝 Catat Sebagai Tamu Umum</span>
          </button>
        )}
      </div>
    </div>
  );
}
