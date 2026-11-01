'use client';

import React from 'react';
import AppIcon from '@/components/AppIcon';
import { playScannerBeep } from './soundUtils';
import { useBarcodeScanner } from './useBarcodeScanner';

export { playScannerBeep };

export default function CameraBarcodeScanner({
  onScan,
  isScanning = true,
  disabled = false,
}) {
  const {
    videoRef,
    canvasRef,
    cameraActive,
    error,
    facingMode,
    cameras,
    activeCameraLabel,
    hasMultipleCameras,
    isSwitchingCamera,
    lastScannedCode,
    justScanned,
    startCamera,
    switchCamera,
    scanImageFile,
  } = useBarcodeScanner({ onScan, isScanning, disabled });

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center font-sans">
      {/* Video element selalu di-render agar videoRef.current siap menerima mediaStream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={(e) => {
          e.currentTarget.play().catch(() => {});
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          cameraActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        }`}
      />

      {/* Fallback & Error State */}
      {!cameraActive && (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
          {error ? (
            <div className="space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
                <AppIcon name="caution" color="red" size={24} />
              </div>
              <p className="text-xs text-rose-300 font-semibold leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={() => startCamera()}
                className="px-4 py-2 rounded-xl bg-[#4B3B78] hover:bg-[#3D2E66] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Coba Akses Kamera Barcode
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-9 h-9 border-3 border-[#4B3B78] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-bold tracking-wide">Mengaktifkan Kamera Pemindai...</p>
              <p className="text-[11px] text-slate-500">Mendukung QR Code Kartu Pelajar dan Barcode Buku</p>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Barcode & QR Targeting Reticle (Versatile Square-Rounded for QR & Barcode) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className={`relative w-60 sm:w-72 h-60 sm:h-72 border-2 rounded-3xl transition-all duration-300 flex items-center justify-center ${
            justScanned
              ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)] bg-emerald-500/10'
              : 'border-[#4F8FBB] shadow-[0_0_20px_rgba(79,143,187,0.25)] bg-black/10'
          }`}
        >
          {/* Corner Brackets */}
          <div className={`absolute -top-1.5 -left-1.5 w-7 h-7 border-t-4 border-l-4 rounded-tl-xl transition-colors ${justScanned ? 'border-emerald-400' : 'border-[#4F8FBB]'}`} />
          <div className={`absolute -top-1.5 -right-1.5 w-7 h-7 border-t-4 border-r-4 rounded-tr-xl transition-colors ${justScanned ? 'border-emerald-400' : 'border-[#4F8FBB]'}`} />
          <div className={`absolute -bottom-1.5 -left-1.5 w-7 h-7 border-b-4 border-l-4 rounded-bl-xl transition-colors ${justScanned ? 'border-emerald-400' : 'border-[#4F8FBB]'}`} />
          <div className={`absolute -bottom-1.5 -right-1.5 w-7 h-7 border-b-4 border-r-4 rounded-br-xl transition-colors ${justScanned ? 'border-emerald-400' : 'border-[#4F8FBB]'}`} />

          {/* Animated Laser Beam */}
          {cameraActive && !disabled && (
            <div
              className={`absolute inset-x-2 h-0.5 shadow-lg transition-colors animate-pulse ${
                justScanned ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-red-500 shadow-[0_0_14px_#ef4444]'
              }`}
              style={{ animation: 'laserMove 2.4s ease-in-out infinite alternate' }}
            />
          )}

          <div className="absolute bottom-3 inset-x-2 flex flex-col items-center text-center">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md transition-all inline-flex items-center gap-1.5 ${
                justScanned
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
                  : 'bg-black/75 text-slate-200 border border-white/10'
              }`}
            >
              {justScanned ? (
                <>
                  <AppIcon name="tick" color="green" size={12} />
                  <span>Terdeteksi: {lastScannedCode}</span>
                </>
              ) : (
                'Arahkan QR Code Kartu / Barcode Buku ke Sini'
              )}
            </span>

            {/* Quick troubleshooting button if camera preview is black */}
            {cameraActive && (
              <button
                type="button"
                onClick={switchCamera}
                className="mt-1.5 text-[10px] text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer pointer-events-auto bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs"
              >
                Kamera gelap? Klik untuk ganti kamera
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Camera Controls */}
      <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold max-w-[200px] truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate">{activeCameraLabel ? activeCameraLabel.slice(0, 22) : 'Scanner Kamera Aktif'}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* File Upload Barcode Snapshot */}
          <label className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-bold backdrop-blur-md border border-white/20 shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95">
            <AppIcon name="upload" color="white" size={14} />
            <span>Unggah Foto</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && typeof scanImageFile === 'function') {
                  scanImageFile(file);
                }
              }}
            />
          </label>

          {/* Tombol ganti kamera selalu tersedia agar user dapat beralih dari kamera hitam/salah */}
          <button
            type="button"
            onClick={switchCamera}
            disabled={isSwitchingCamera}
            className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-bold backdrop-blur-md border border-white/20 shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Ganti atau putar perangkat kamera yang aktif"
          >
            <AppIcon name="sync" color="white" size={14} className={isSwitchingCamera ? 'animate-spin' : ''} />
            <span>{cameras.length > 1 ? `Ganti (${cameras.length})` : 'Putar Kamera'}</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes laserMove {
          0% { top: 15%; }
          100% { top: 85%; }
        }
      `}</style>
    </div>
  );
}
