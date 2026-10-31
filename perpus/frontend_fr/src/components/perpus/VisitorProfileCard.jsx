'use client';

import React from 'react';
import { Barcode } from '@/lib/common/barcodeGenerator';
import AppIcon from '@/components/AppIcon';

export default function VisitorProfileCard({
  selectedPurpose,
  activeBarcodeMode = 'PINJAM',
  detectedStudent,
  setDetectedStudent,
  barcodeScanError,
  setBarcodeScanError,
  handleCompleteAttendanceOnly,
  setCurrentScreen,
  handleResetBarcodeScan,
}) {
  const isGuestOrClass = selectedPurpose === 'PEMBELAJARAN' || selectedPurpose === 'TAMU';
  const activeLoans = detectedStudent?.activeLoans || [];

  return (
    <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-[#0A1931]">Profil Siswa / Anggota</h3>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
              detectedStudent
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            {detectedStudent ? 'TERVERIFIKASI' : 'MENUNGGU SCAN'}
          </span>
        </div>
        <hr className="my-4 border-slate-100" />

        {/* Avatar, Info & Active Loans */}
        <div className="flex flex-col items-center text-center my-2">
          {detectedStudent ? (
            <div className="w-full flex flex-col items-center space-y-3">
              {/* Photo or Initials */}
              <div className="w-20 h-20 rounded-full border-4 border-emerald-200 bg-slate-100 flex items-center justify-center overflow-hidden shadow-inner">
                {detectedStudent.photo ? (
                  <img
                    src={detectedStudent.photo}
                    alt={detectedStudent.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#0066CC] to-[#0084FF] text-white flex items-center justify-center text-xl font-black">
                    {detectedStudent.name ? detectedStudent.name.slice(0, 2).toUpperCase() : 'SP'}
                  </div>
                )}
              </div>

              {/* Name & Class Badges */}
              <div className="space-y-1 text-center w-full">
                <h4 className="text-lg font-black text-[#0A1931]">{detectedStudent.name}</h4>
                <div className="flex items-center justify-center gap-2 flex-wrap text-xs pt-0.5">
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-[#0066CC] font-mono font-bold">
                    NISN / NIP: {detectedStudent.identityNumber || detectedStudent.id}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                    {detectedStudent.className || 'Civitas Sekolah'}
                  </span>
                </div>
              </div>

              {/* Active Loans Section (Daftar Buku Yang Sedang Dipinjam) */}
              <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200/90 text-left shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <AppIcon name="course" color="blue" size={14} />
                    <span>Buku yang Sedang Dipinjam ({activeLoans.length})</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    Maks: {detectedStudent.maxBorrowLimit || 3} Buku
                  </span>
                </div>

                {activeLoans.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {activeLoans.map((loan, idx) => (
                      <div key={loan.id || idx} className="p-2 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                        <p className="font-bold text-slate-800 line-clamp-1">{loan.book_title || 'Buku Perpustakaan'}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                          <span className="font-mono text-slate-600">{loan.barcode}</span>
                          <span className={loan.status === 'OVERDUE' ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            Jatuh tempo: {loan.due_date ? new Date(loan.due_date).toLocaleDateString('id-ID') : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-2 text-center text-slate-500 text-xs">
                    <p className="font-semibold text-slate-700">Tidak ada pinjaman buku aktif</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {activeBarcodeMode === 'KEMBALI'
                        ? 'Siswa ini tidak memiliki tanggungan buku yang perlu dikembalikan.'
                        : `Siswa dapat meminjam hingga ${detectedStudent.maxBorrowLimit || 3} buku.`}
                    </p>
                  </div>
                )}
              </div>

              {detectedStudent.hasActiveSessionToday && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-[11px] font-bold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Sesi Hari Ini Aktif • Hadir {detectedStudent.activeSessionTime ? `pukul ${detectedStudent.activeSessionTime}` : 'hari ini'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center py-4 space-y-3">
              <div className="w-24 h-24 rounded-full border-4 border-blue-100 bg-slate-50 flex items-center justify-center text-slate-300">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="w-full space-y-2 text-center">
                <p className="text-xs font-bold text-slate-600">Belum Ada Akun yang Dipindai</p>
                <p className="text-[11px] text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                  Arahkan QR Code kartu pelajar/guru ke kamera pemindai, atau ketikkan NISN / NIP di sebelah kiri.
                </p>
              </div>
            </div>
          )}

          {barcodeScanError && (
            <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left flex items-start gap-2 max-w-sm">
              <svg className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-bold text-rose-800">QR Code Tidak Ditemukan</p>
                <p className="text-[11px] text-rose-600 mt-0.5 leading-relaxed">{barcodeScanError}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buttons: Dynamic based on selectedPurpose & activeBarcodeMode */}
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
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>
            {isGuestOrClass
              ? detectedStudent?.hasActiveSessionToday
                ? 'Konfirmasi Bukti Presensi (Sesi Aktif)'
                : 'Selesaikan Presensi Kehadiran'
              : activeBarcodeMode === 'KEMBALI'
              ? 'Lanjut Ke Pengembalian Buku'
              : 'Lanjutkan Ke Pindai Buku'}
          </span>
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>

        {detectedStudent && (
          <button
            type="button"
            onClick={handleResetBarcodeScan}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Pindai Kartu Siswa Lain</span>
          </button>
        )}

        {selectedPurpose === 'TAMU' && !detectedStudent && (
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
              if (setBarcodeScanError) setBarcodeScanError(null);
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            <AppIcon name="human" color="blue" size={14} />
            <span>Masuk Sebagai Tamu Umum (Tanpa Kartu)</span>
          </button>
        )}
      </div>
    </div>
  );
}
