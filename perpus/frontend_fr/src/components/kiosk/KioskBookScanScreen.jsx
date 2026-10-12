'use client';

import React from 'react';
import CameraBarcodeScanner from '@/components/kiosk/CameraBarcodeScanner';

export default function KioskBookScanScreen({
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
                  Identitas Peminjam Terverifikasi
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

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleFullResetToAttendance}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Ganti siswa yang meminjam"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Ganti Siswa / Scan Ulang</span>
            </button>
          </div>
        </div>
      )}

      {/* Two Columns Grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Barcode Scanner Viewport + Petunjuk + Action Buttons */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/90 shadow-sm relative space-y-3">
            {/* Real Web Camera Scanner */}
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
              <CameraBarcodeScanner
                onScan={handleBarcodeDetected}
                isScanning={currentScreen === 'scan'}
                disabled={isProcessingBarcode}
              />
            </div>

            {/* Feedback Status Banners */}
            {isProcessingBarcode && (
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-[#0066CC] text-xs font-semibold flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span>Memverifikasi barcode dengan database perpustakaan...</span>
              </div>
            )}

            {barcodeScanSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span>{barcodeScanSuccess}</span>
              </div>
            )}

            {barcodeScanError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-200">
                <svg className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="flex-1">{barcodeScanError}</span>
              </div>
            )}

            {/* Manual Barcode Input Bar */}
            <form onSubmit={handleAddManualBarcode} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ketik/Scan barcode buku (misal: LIB-BK-2026-0001-C01)..."
                value={manualBarcodeInput}
                onChange={(e) => setManualBarcodeInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#0084FF] bg-slate-50/50"
              />
              <button
                type="submit"
                disabled={isProcessingBarcode || !manualBarcodeInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#0084FF] hover:bg-[#0070DE] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                Cek &amp; Tambah
              </button>
            </form>

            {/* Quick Preset Barcode Chips */}
            {presetBarcodes.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Uji Cepat Barcode Buku Database:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {presetBarcodes.map((item) => (
                    <button
                      key={item.barcode}
                      type="button"
                      onClick={() => handleBarcodeDetected(item.barcode)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all border cursor-pointer ${
                        item.barcode.startsWith('UNREGISTERED')
                          ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                          : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      }`}
                      title={`Uji barcode: ${item.title}`}
                    >
                      {item.barcode}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Petunjuk Penggunaan */}
          <div className="bg-[#FFF8EE] border border-[#FDE68A] rounded-2xl p-4 flex items-start gap-3.5">
            <div className="w-6 h-6 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
              i
            </div>
            <div>
              <h4 className="text-xs font-black text-[#92400E] tracking-wider uppercase">
                PETUNJUK PENGGUNAAN
              </h4>
              <p className="text-xs text-[#78350F] mt-1 leading-relaxed">
                Arahkan barcode buku ke kamera atau gunakan pemindai laser. Pastikan cahaya ruangan cukup dan barcode tidak terpotong.
              </p>
            </div>
          </div>

          {/* Action Buttons: Konfirmasi Pinjam & Konfirmasi Kembali */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <button
              type="button"
              onClick={() => handleConfirmTransaction('PINJAM')}
              className="w-full py-4 px-5 rounded-2xl bg-[#0084FF] hover:bg-[#0070DE] text-white font-extrabold text-sm sm:text-base shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Konfirmasi Pinjam</span>
            </button>

            <button
              type="button"
              onClick={() => handleConfirmTransaction('KEMBALI')}
              className="w-full py-4 px-5 rounded-2xl bg-[#D97706] hover:bg-[#B45309] text-white font-extrabold text-sm sm:text-base shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>Konfirmasi Kembali</span>
            </button>
          </div>

          {/* Back to Home / Batal Link */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleFullResetToAttendance}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>BATAL &amp; KEMBALI KE BERANDA</span>
            </button>
          </div>
        </div>

        {/* Right Column: Daftar Scan */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#0084FF]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="font-black text-sm text-[#0A1931]">Daftar Scan</h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold">
                {scannedBooks.length} Buku
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2 min-h-[220px]">
              {scannedBooks.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <svg className="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="text-xs font-semibold">Belum ada buku yang discan.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Gunakan pemindai atau masukkan barcode secara manual.</p>
                </div>
              ) : (
                scannedBooks.map((book, idx) => (
                  <div key={`${book.barcode}-${idx}`} className="py-3.5 flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-14 rounded-md shadow-md flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold tracking-tighter text-center p-1 border-l-2 border-white/40"
                        style={{ backgroundColor: book.coverColor || '#1A365D' }}
                      >
                        <span className="line-clamp-2 leading-tight uppercase">{book.title.slice(0, 10)}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              book.type === 'PINJAM'
                                ? 'bg-[#0084FF] text-white'
                                : 'bg-[#D97706] text-white'
                            }`}
                          >
                            {book.type || 'PINJAM'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {book.barcode}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-[#0A1931] uppercase truncate mt-0.5">
                          {book.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {book.author}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBook(idx)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors flex-shrink-0 cursor-pointer"
                      title="Hapus dari daftar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Status Sistem: Siap Card */}
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-black text-[#15803D] uppercase tracking-wider">
                STATUS SISTEM: SIAP
              </h4>
              <p className="text-xs text-[#166534] mt-0.5">
                Pemindai aktif &amp; terhubung ke database perpustakaan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
