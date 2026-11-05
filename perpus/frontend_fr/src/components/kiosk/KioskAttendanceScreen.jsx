'use client';

import React, { useState, useEffect, useRef } from 'react';
import CameraBarcodeScanner from './CameraBarcodeScanner';
import VisitorProfileCard from './VisitorProfileCard';
import AttendanceStepsGuide from './AttendanceStepsGuide';
import AppIcon from '@/components/AppIcon';

export default function PerpusAttendanceScreen({
  selectedPurpose,
  activeBarcodeMode = 'PINJAM',
  setCurrentScreen,
  detectedStudent,
  setDetectedStudent,
  isProcessingBarcode,
  barcodeScanError,
  setBarcodeScanError,
  handleCompleteAttendanceOnly,
  handleResetBarcodeScan,
  handleBarcodeScanned,
  registeredMembers = [],
}) {
  const [scanMode, setScanMode] = useState('camera'); // 'camera' | 'manual'
  const [manualCode, setManualCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestJabatan, setGuestJabatan] = useState('');
  const [guestFormError, setGuestFormError] = useState('');
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);
  const manualInputRef = useRef(null);

  const isGuest = selectedPurpose === 'TAMU';

  // Purpose badge styling
  const purposeName =
    selectedPurpose === 'PEMBELAJARAN'
      ? 'Belajar di Kelas'
      : selectedPurpose === 'TAMU'
      ? 'Tamu / Pengunjung'
      : activeBarcodeMode === 'KEMBALI'
      ? 'Pengembalian Buku'
      : 'Peminjaman Buku';

  const purposeColor =
    selectedPurpose === 'PEMBELAJARAN'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : selectedPurpose === 'TAMU'
      ? 'bg-sky-50 border-sky-200 text-sky-700'
      : activeBarcodeMode === 'KEMBALI'
      ? 'bg-amber-50 border-amber-200 text-amber-700'
      : 'bg-blue-50 border-blue-200 text-[#0066CC]';

  const isGuestOrClass = selectedPurpose === 'PEMBELAJARAN' || selectedPurpose === 'TAMU';
  const screenTitle = isGuest
    ? 'Buku Tamu Kunjungan Perpustakaan'
    : 'Pindai QR Code Kartu Pelajar / Guru';
  const screenSubtitle = isGuest
    ? 'Silakan isi nama dan jabatan Anda untuk mencatat kehadiran (tanpa scan barcode)'
    : isGuestOrClass
    ? 'Presensi QR code mandiri untuk pencatatan kunjungan perpus'
    : activeBarcodeMode === 'KEMBALI'
    ? 'Identifikasi siswa/guru untuk mengenali akun & mengecek buku yang dipinjam'
    : 'Identifikasi siswa/guru via QR code sebelum meminjam buku';

  // Quick preset samples
  const defaultPresets = [
    { code: 'MBR-2026-0001', name: 'Ahmad Rizky' },
    { code: 'MBR-2026-0002', name: 'Siti Nurhaliza' },
    { code: 'MBR-2026-0003', name: 'Dimas Pratama' },
    { code: 'MBR-2026-0004', name: 'Nabila Putri' },
    { code: 'MBR-2026-0006', name: 'Budi Santoso, S.Pd' },
  ];

  const presetsToUse = registeredMembers.length > 0
    ? registeredMembers.slice(0, 5).map((m) => ({
        code: m.barcode_token,
        name: m.full_name || m.name,
      }))
    : [];

  // Handle manual code submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    handleBarcodeScanned(clean);
    setManualCode('');
  };

  // Handle guest attendance submit (only Nama & Jabatan, no barcode scan)
  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    const cleanName = guestName.trim();
    const cleanJabatan = guestJabatan.trim();

    if (!cleanName || !cleanJabatan) {
      setGuestFormError('Nama lengkap dan jabatan wajib diisi.');
      return;
    }

    setGuestFormError('');
    setIsSubmittingGuest(true);
    try {
      await handleCompleteAttendanceOnly({
        name: cleanName,
        jabatan: cleanJabatan,
      });
    } finally {
      setIsSubmittingGuest(false);
    }
  };

  const quickJabatanOptions = ['Tamu Dinas', 'Wali Murid', 'Alumni', 'Pengunjung Umum'];

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Bar: Back button + Purpose Badge */}
      <div className="w-full max-w-5xl flex items-center gap-2.5 mb-5">
        <button
          type="button"
          onClick={() => setCurrentScreen('purpose')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all shadow-xs cursor-pointer flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Ganti Keperluan</span>
        </button>

        <div className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${purposeColor}`}>
          <AppIcon
            name={
              selectedPurpose === 'PEMBELAJARAN' ? 'graduation'
              : selectedPurpose === 'TAMU' ? 'human'
              : activeBarcodeMode === 'KEMBALI' ? 'sync'
              : 'course'
            }
            color="blue"
            size={16}
          />
          <span>{purposeName}</span>
        </div>

        {/* Right-side title (desktop) */}
        <div className="ml-auto hidden sm:flex flex-col items-end">
          <span className="text-sm font-extrabold text-[#0A1931] leading-tight">{screenTitle}</span>
          <span className="text-[11px] text-slate-400 font-medium">
            {screenSubtitle}
          </span>
        </div>
      </div>

      {/* Mobile-only title */}
      <div className="w-full max-w-5xl text-left mb-4 sm:hidden">
        <h2 className="text-xl font-extrabold text-[#0A1931] tracking-tight">{screenTitle}</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {screenSubtitle}
        </p>
      </div>

      {/* Guest Form (No Barcode Scan) OR Barcode Scanner & Profile Grid */}
      {isGuest ? (
        <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center shrink-0">
              <AppIcon name="human" color="blue" size={24} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#0A1931]">
                Form Kehadiran Tamu Perpustakaan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cukup masukkan nama dan jabatan Anda (tidak memerlukan scan barcode)
              </p>
            </div>
          </div>

          {guestFormError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{guestFormError}</span>
            </div>
          )}

          <form onSubmit={handleGuestSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  if (guestFormError) setGuestFormError('');
                }}
                placeholder="Masukkan nama lengkap Anda..."
                className="w-full px-4 py-3.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Jabatan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={guestJabatan}
                onChange={(e) => {
                  setGuestJabatan(e.target.value);
                  if (guestFormError) setGuestFormError('');
                }}
                placeholder="Contoh: Tamu Dinas / Wali Murid / Alumni / Umum..."
                className="w-full px-4 py-3.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent transition-all"
              />
              <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Pilihan cepat:</span>
                {quickJabatanOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setGuestJabatan(opt);
                      if (guestFormError) setGuestFormError('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      guestJabatan === opt
                        ? 'bg-blue-50 border-blue-300 text-[#0066CC]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmittingGuest || !guestName.trim() || !guestJabatan.trim()}
                className="w-full py-3.5 px-5 rounded-xl bg-[#0084FF] hover:bg-[#0070DE] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs sm:text-sm shadow-sm shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:cursor-not-allowed"
              >
                <span>{isSubmittingGuest ? 'Menyimpan Presensi...' : 'Selesaikan Presensi Kehadiran'}</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch max-w-5xl">
            {/* Left Card: Barcode Scanner Viewfinder */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
              <div>
                {/* Mode Switcher Tabs */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setScanMode('camera')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        scanMode === 'camera'
                          ? 'bg-white text-[#0084FF] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Kamera Scanner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScanMode('manual');
                        setTimeout(() => manualInputRef.current?.focus(), 100);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        scanMode === 'manual'
                          ? 'bg-white text-[#0084FF] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Input Manual / USB</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Scanner Barcode Siap</span>
                  </div>
                </div>

                {/* Scanner Area */}
                {scanMode === 'camera' ? (
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
                    <CameraBarcodeScanner
                      onScan={(code) => handleBarcodeScanned(code)}
                      disabled={Boolean(detectedStudent) || isProcessingBarcode}
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0084FF] flex items-center justify-center shadow-xs">
                      <AppIcon name="computer" color="blue" size={28} />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <h4 className="text-base font-black text-slate-800">Input Kode QR / NISN / NIP</h4>
                      <p className="text-xs text-slate-500">
                        Gunakan scanner USB atau ketikkan NISN / NIP / Token QR kartu pelajar.
                      </p>
                    </div>
                    <form onSubmit={handleManualSubmit} className="w-full max-w-md flex items-center gap-2">
                      <input
                        ref={manualInputRef}
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Contoh: PRAMBON-E454... atau NISN / NIP"
                        className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!manualCode.trim() || isProcessingBarcode}
                        className="px-5 py-3 bg-[#0084FF] hover:bg-[#0070DE] text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        Kirim
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Right Card: Visitor / Student Profile */}
            <VisitorProfileCard
              selectedPurpose={selectedPurpose}
              activeBarcodeMode={activeBarcodeMode}
              detectedStudent={detectedStudent}
              setDetectedStudent={setDetectedStudent}
              barcodeScanError={barcodeScanError}
              setBarcodeScanError={setBarcodeScanError}
              handleCompleteAttendanceOnly={handleCompleteAttendanceOnly}
              setCurrentScreen={setCurrentScreen}
              handleResetBarcodeScan={handleResetBarcodeScan}
            />
          </div>

          {/* Guide Steps */}
          <AttendanceStepsGuide selectedPurpose={selectedPurpose} />
        </>
      )}
    </div>
  );
}