'use client';

import React from 'react';
import CameraBarcodeScanner from '@/components/perpus/CameraBarcodeScanner';

export default function PerpusBookScanScreen({
  currentScreen,
  detectedStudent,
  activeBarcodeMode,
  setActiveBarcodeMode,
  handleFullResetToAttendance,
  handleBarcodeDetected,
  isProcessingBarcode,
  barcodeScanSuccess,
  barcodeScanError,
  manualBarcodeInput,
  setManualBarcodeInput,
  handleAddManualBarcode,
  presetBarcodes = [],
  handleConfirmTransaction,
  scannedBooks = [],
  handleRemoveBook,
}) {
  return (
    <div className="w-full flex flex-col items-center">
      {/* Title Header */}
      <div className="w-full max-w-6xl mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0084FF]">
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0084FF] tracking-tight">
              Pindai Buku
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {detectedStudent ? (
              <span>Anggota aktif: <strong className="text-slate-800">{detectedStudent.name}</strong> ({detectedStudent.id})</span>
            ) : (
              <span>Silakan scan barcode buku satu per satu untuk memulai transaksi.</span>
            )}
          </p>
        </div>

        {/* Mode Toggle: Pinjam vs Kembali */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-2xl self-start sm:self-auto border border-slate-300/60">
          <button
            type="button"
            onClick={() => setActiveBarcodeMode('PINJAM')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeBarcodeMode === 'PINJAM'
                ? 'bg-[#0084FF] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mode Pinjam
          </button>
          <button
            type="button"
            onClick={() => setActiveBarcodeMode('KEMBALI')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeBarcodeMode === 'KEMBALI'
                ? 'bg-[#D97706] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mode Kembali
          </button>
        </div>
      </div>

      {/* Borrower Identification Banner */}
      {detectedStudent && (
        <div className="w-full max-w-6xl mb-5 p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl border-2 border-emerald-400 p-0.5 shadow-sm overflow-hidden bg-slate-100 flex-shrink-0">
              {detectedStudent.photo ? (
                <img src={detectedStudent.photo} alt={detectedStudent.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-tr from-[#0066CC] to-[#0084FF] text-white flex items-center justify-center font-black text-sm">
                  {detectedStudent.name?.slice(0, 2).toUpperCase() || 'SIS'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                  Identitas Siswa Terverifikasi (Barcode)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#0A1931] mt-0.5">
                {detectedStudent.name}
              </h3>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#0066CC] font-mono font-bold">
                  NISN: {detectedStudent.identityNumber || detectedStudent.id}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  Kelas: {detectedStudent.className || 'Siswa'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFullResetToAttendance}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Ganti Siswa</span>
          </button>
        </div>
      )}

      {/* Main Grid: Barcode Camera Scanner (Left) & Scanned Cart (Right) */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Barcode Scanner Viewfinder */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
              <CameraBarcodeScanner
                onScan={handleBarcodeDetected}
                disabled={isProcessingBarcode}
              />
            </div>

            {/* Notification messages */}
            {barcodeScanSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <span>{barcodeScanSuccess}</span>
              </div>
            )}
            {barcodeScanError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                <span>{barcodeScanError}</span>
              </div>
            )}

            {/* Manual input form */}
            <form onSubmit={handleAddManualBarcode} className="mt-4 flex gap-2">
              <input
                type="text"
                value={manualBarcodeInput}
                onChange={(e) => setManualBarcodeInput(e.target.value)}
                placeholder="Atau ketik barcode buku manual (LIB-BK-...)..."
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!manualBarcodeInput.trim() || isProcessingBarcode}
                className="px-4 py-2.5 bg-[#0084FF] hover:bg-[#0070DE] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                Cek Buku
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Scanned Book List & Confirmation */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-lg text-[#0A1931]">Daftar Buku Terpindai</h3>
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-[#0066CC] font-bold text-xs">
                {scannedBooks.length} Buku
              </span>
            </div>

            <div className="my-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {scannedBooks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center mx-auto text-2xl">
                    📚
                  </div>
                  <p className="text-xs font-bold text-slate-500">Belum Ada Buku Dipindai</p>
                  <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                    Arahkan stiker barcode buku ke kamera scanner di sebelah kiri.
                  </p>
                </div>
              ) : (
                scannedBooks.map((b, idx) => (
                  <div
                    key={`${b.barcode}-${idx}`}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-mono font-black">
                          {b.barcode}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          b.type === 'PINJAM' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {b.type}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-[#0A1931] mt-1 line-clamp-1">{b.title}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{b.author}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveBook(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus buku ini"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Confirmation Action */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              type="button"
              disabled={scannedBooks.length === 0}
              onClick={() => handleConfirmTransaction(activeBarcodeMode)}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                scannedBooks.length > 0
                  ? 'bg-[#0084FF] hover:bg-[#0070DE] text-white shadow-blue-500/25 cursor-pointer active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>SELESAIKAN SEMUA TRANSAKSI</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
