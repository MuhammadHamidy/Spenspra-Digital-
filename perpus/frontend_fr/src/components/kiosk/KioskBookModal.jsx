'use client';

import React from 'react';

export default function KioskBookModal({
  pendingBookModal,
  setPendingBookModal,
  detectedStudent,
  isSubmittingAction,
  handleExecuteSingleAction,
}) {
  if (!pendingBookModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0084FF] flex items-center justify-center shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-lg text-[#0A1931]">Konfirmasi Sirkulasi Buku</h3>
              <p className="text-xs text-slate-500 font-medium">Buku terverifikasi di database perpustakaan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPendingBookModal(null)}
            disabled={isSubmittingAction}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Borrower Profile Pill (Matches detected face) */}
        {detectedStudent && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0084FF] text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                {detectedStudent.name?.slice(0, 2).toUpperCase() || 'S'}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identitas Peminjam</p>
                <p className="text-xs font-black text-[#0A1931] truncate">{detectedStudent.name}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  NISN: {detectedStudent.identityNumber || detectedStudent.id} • Kelas: {detectedStudent.className || 'Siswa'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
              Terverifikasi
            </span>
          </div>
        )}

        {/* Book Info Card with 3D Thumbnail & Metadata */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start gap-4">
          {/* Cover */}
          <div className="w-20 h-28 rounded-xl bg-gradient-to-tr from-[#0F172A] to-[#1E3A8A] text-white p-2 flex flex-col justify-between shadow-md flex-shrink-0 border-l-4 border-blue-400">
            <span className="text-[9px] font-mono text-blue-200 line-clamp-1">{pendingBookModal.category}</span>
            <span className="text-[10px] font-black leading-tight line-clamp-3 uppercase">{pendingBookModal.title}</span>
            <span className="text-[8px] text-slate-300 font-mono line-clamp-1">{pendingBookModal.barcode}</span>
          </div>

          {/* Descriptions & Specs */}
          <div className="flex-1 space-y-1.5 min-w-0 text-left">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-blue-100/80 text-[#0066CC] font-mono text-[10px] font-black">
                {pendingBookModal.barcode}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                ISBN: {pendingBookModal.isbn}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                pendingBookModal.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingBookModal.status}
              </span>
            </div>

            <h4 className="text-base font-black text-[#0A1931] leading-snug">
              {pendingBookModal.title}
            </h4>

            <p className="text-xs text-slate-600 font-semibold">
              Penulis: <span className="text-slate-900 font-bold">{pendingBookModal.author}</span>
              {pendingBookModal.publisher !== '-' && ` • Penerbit: ${pendingBookModal.publisher}`}
            </p>

            {pendingBookModal.callNumber && pendingBookModal.callNumber !== '-' && (
              <p className="text-[11px] text-slate-500 font-mono">
                Nomor Panggil: {pendingBookModal.callNumber}
              </p>
            )}

            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-1 border-t border-slate-200/60">
              {pendingBookModal.description}
            </p>
          </div>
        </div>

        {/* Loan Timing Schedule Boxes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0084FF] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#0066CC] uppercase tracking-wider">Tanggal Pinjam</p>
              <p className="text-xs sm:text-sm font-black text-[#0A1931] mt-0.5">{pendingBookModal.borrowDate}</p>
              <p className="text-[10px] text-slate-500">Hari ini</p>
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D97706] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider">Tenggat Kembali</p>
              <p className="text-xs sm:text-sm font-black text-[#0A1931] mt-0.5">{pendingBookModal.dueDate}</p>
              <p className="text-[10px] text-slate-500">Masa pinjam 7 hari</p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Pinjam vs Kembali */}
        <div className="pt-2 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isSubmittingAction}
              onClick={() => handleExecuteSingleAction(pendingBookModal, 'PINJAM')}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0084FF] hover:bg-[#0070DE] text-white font-extrabold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>{isSubmittingAction ? 'Memproses...' : 'Pinjam Buku Ini'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmittingAction}
              onClick={() => handleExecuteSingleAction(pendingBookModal, 'KEMBALI')}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#D97706] hover:bg-[#B45309] text-white font-extrabold text-sm shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>{isSubmittingAction ? 'Memproses...' : 'Kembalikan Buku Ini'}</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isSubmittingAction}
            onClick={() => setPendingBookModal(null)}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all cursor-pointer"
          >
            Batal / Pindai Ulang
          </button>
        </div>
      </div>
    </div>
  );
}
