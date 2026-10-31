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
  const manualInputRef = useRef(null);

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
  const screenTitle = 'Pindai QR Code Kartu Pelajar / Guru';
  const screenSubtitle = isGuestOrClass
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

      {/* Barcode Scanner & Profile Grid */}
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
    </div>
  );
}
