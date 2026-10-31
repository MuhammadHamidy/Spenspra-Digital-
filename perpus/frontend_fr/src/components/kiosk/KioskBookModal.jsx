'use client';

import React from 'react';
import AppIcon from '@/components/AppIcon';

export default function PerpusBookModal({
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
            <AppIcon name="close-cancel" color="grey" size={14} />
          </button>
        </div>

        {/* Borrower Profile Pill (Matches verified student card) */}
        {detectedStudent && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0084FF] text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                {detectedStudent.name?.slice(0, 2).toUpperCase() || 'S'}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identitas Peminjam (Barcode Terverifikasi)</p>
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

            <div className="pt-1.5 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Tanggal Transaksi</span>
                <span className="font-bold text-slate-700">{pendingBookModal.borrowDate}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Tenggat Pengembalian</span>
                <span className="font-bold text-[#0084FF]">{pendingBookModal.dueDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Choice Buttons: PINJAM atau KEMBALI */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isSubmittingAction}
            onClick={() => handleExecuteSingleAction(pendingBookModal, 'PINJAM')}
            className="py-3 px-4 rounded-2xl bg-[#0084FF] hover:bg-[#0070DE] text-white font-black text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSubmittingAction ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <AppIcon name="download" color="white" size={16} />
                <span>PINJAM BUKU INI</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isSubmittingAction}
            onClick={() => handleExecuteSingleAction(pendingBookModal, 'KEMBALI')}
            className="py-3 px-4 rounded-2xl bg-[#D97706] hover:bg-[#B45309] text-white font-black text-sm shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSubmittingAction ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <AppIcon name="upload" color="white" size={16} />
                <span>KEMBALIKAN BUKU</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          disabled={isSubmittingAction}
          onClick={() => setPendingBookModal(null)}
          className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer text-center"
        >
          Batalkan &amp; Scan Barcode Lain
        </button>
      </div>
    </div>
  );
}
