'use client';

import React from 'react';
import FaceCamera from '@/components/FaceCamera';
import VisitorProfileCard from './VisitorProfileCard';
import AttendanceStepsGuide from './AttendanceStepsGuide';

export default function KioskAttendanceScreen({
  selectedPurpose,
  setCurrentScreen,
  faceCameraRef,
  handleFaceCaptured,
  setFaceInFrame,
  faceInFrame,
  detectedStudent,
  setDetectedStudent,
  isRecognizing,
  faceScanError,
  setFaceScanError,
  handleCompleteAttendanceOnly,
  handleResetFaceScan,
}) {
  const purposeName =
    selectedPurpose === 'PEMBELAJARAN'
      ? 'Belajar di Kelas'
      : selectedPurpose === 'TAMU'
      ? 'Tamu / Pengunjung'
      : 'Membaca / Meminjam';

  const purposeColor =
    selectedPurpose === 'PEMBELAJARAN'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : selectedPurpose === 'TAMU'
      ? 'bg-sky-50 border-sky-200 text-sky-700'
      : 'bg-blue-50 border-blue-200 text-[#0066CC]';

  return (
    <div className="w-full flex flex-col items-center">
      {/* Compact top-left bar: back button + purpose badge — full width, left-aligned */}
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
          <span>
            {selectedPurpose === 'PEMBELAJARAN' ? '🎓'
              : selectedPurpose === 'TAMU' ? '🤝'
              : '📚'}
          </span>
          <span>{purposeName}</span>
        </div>

        {/* Right-side title (desktop) */}
        <div className="ml-auto hidden sm:flex flex-col items-end">
          <span className="text-sm font-extrabold text-[#0A1931] leading-tight">Pencatatan Kehadiran</span>
          <span className="text-[11px] text-slate-400 font-medium">
            {selectedPurpose === 'PEMBELAJARAN' || selectedPurpose === 'TAMU'
              ? 'Presensi langsung, tanpa pindai buku'
              : 'Verifikasi wajah sebelum peminjaman buku'}
          </span>
        </div>
      </div>

      {/* Mobile-only title */}
      <div className="w-full max-w-5xl text-left mb-4 sm:hidden">
        <h2 className="text-xl font-extrabold text-[#0A1931] tracking-tight">Pencatatan Kehadiran</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {selectedPurpose === 'PEMBELAJARAN' || selectedPurpose === 'TAMU'
            ? 'Presensi langsung, tanpa pindai buku'
            : 'Verifikasi wajah sebelum peminjaman buku'}
        </p>
      </div>

      {/* Camera & Profile Grid */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch max-w-5xl">
        {/* Left Card: Camera Viewfinder */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/90 shadow-sm flex flex-col">
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
            {/* Live Camera Stream */}
            <FaceCamera
              ref={faceCameraRef}
              onCapture={handleFaceCaptured}
              onFacePresenceChange={setFaceInFrame}
              disabled={Boolean(detectedStudent) || isRecognizing}
              autoStart={true}
            />

            {/* Natural Face Guide Viewfinder Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div
                className={`relative w-48 h-64 sm:w-56 sm:h-72 rounded-[44%] border-2 transition-all duration-300 flex items-center justify-center ${
                  detectedStudent
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : faceInFrame
                    ? 'border-blue-400 bg-blue-500/5'
                    : 'border-white/50'
                }`}
              >
                {/* Corner alignment marks */}
                <div className={`absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 rounded-tl-md transition-colors ${detectedStudent ? 'border-emerald-400' : 'border-white/80'}`} />
                <div className={`absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 rounded-tr-md transition-colors ${detectedStudent ? 'border-emerald-400' : 'border-white/80'}`} />
                <div className={`absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 rounded-bl-md transition-colors ${detectedStudent ? 'border-emerald-400' : 'border-white/80'}`} />
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 rounded-br-md transition-colors ${detectedStudent ? 'border-emerald-400' : 'border-white/80'}`} />

                {/* Portrait silhouette guide when idle */}
                {!detectedStudent && !faceInFrame && (
                  <div className="text-white/35 flex flex-col items-center gap-1.5">
                    <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}

                {/* Checkmark badge when verified */}
                {detectedStudent && (
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Status Pill */}
            <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none px-4">
              <div
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 backdrop-blur-md shadow-md transition-all ${
                  detectedStudent
                    ? 'bg-emerald-950/85 text-emerald-100 border border-emerald-400/40'
                    : isRecognizing
                    ? 'bg-slate-900/85 text-sky-200 border border-sky-400/40'
                    : faceInFrame
                    ? 'bg-slate-900/85 text-white border border-white/20'
                    : 'bg-slate-900/75 text-slate-300 border border-white/10'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    detectedStudent
                      ? 'bg-emerald-400'
                      : isRecognizing
                      ? 'bg-sky-400 animate-spin'
                      : faceInFrame
                      ? 'bg-amber-400'
                      : 'bg-slate-400'
                  }`}
                />
                <span>
                  {detectedStudent
                    ? 'Identitas Terverifikasi'
                    : isRecognizing
                    ? 'Memverifikasi identitas...'
                    : faceInFrame
                    ? 'Wajah terdeteksi, mohon tahan sebentar...'
                    : 'Arahkan wajah ke dalam bingkai kamera'}
                </span>
              </div>
            </div>

            {/* Top-Right: Camera flip button only */}
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => faceCameraRef.current?.switchCamera?.()}
                className="p-2 rounded-xl bg-slate-900/55 hover:bg-slate-900/80 text-white backdrop-blur-md transition-all shadow-sm cursor-pointer"
                title="Ganti Kamera Depan / Belakang"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right Card: Profil Pengunjung */}
        <VisitorProfileCard
          selectedPurpose={selectedPurpose}
          detectedStudent={detectedStudent}
          setDetectedStudent={setDetectedStudent}
          faceScanError={faceScanError}
          setFaceScanError={setFaceScanError}
          handleCompleteAttendanceOnly={handleCompleteAttendanceOnly}
          setCurrentScreen={setCurrentScreen}
          handleResetFaceScan={handleResetFaceScan}
        />
      </div>

      {/* Bottom 3 Steps Guide */}
      <AttendanceStepsGuide selectedPurpose={selectedPurpose} />
    </div>
  );
}
