'use client';

import React from 'react';
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
    isSwitchingCamera,
    lastScannedCode,
    justScanned,
    startCamera,
    switchCamera,
    scanImageFile,
  } = useBarcodeScanner({ onScan, isScanning, disabled });

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center">
      {cameraActive ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform duration-300 ${
            facingMode === 'user' ? 'transform -scale-x-100' : ''
          }`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
          {error ? (
            <div className="space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
                ⚠️
              </div>
              <p className="text-xs text-rose-300 font-semibold leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={() => startCamera()}
                className="px-4 py-2 rounded-xl bg-[#0084FF] hover:bg-[#0070DE] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Coba Akses Kamera Barcode
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-9 h-9 border-3 border-[#0084FF] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-bold tracking-wide">Mengaktifkan Kamera Barcode...</p>
              <p className="text-[11px] text-slate-500">Arahkan kamera ke stiker barcode pada buku</p>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Barcode Targeting Reticle */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className={`relative w-72 sm:w-80 h-44 sm:h-48 border-2 rounded-2xl transition-all duration-300 flex items-center justify-center ${
            justScanned
              ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)] bg-emerald-500/10'
              : 'border-blue-400/80 shadow-[0_0_20px_rgba(0,132,255,0.2)] bg-black/15'
          }`}
        >
          {/* Corner Brackets */}
          <div className={`absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 rounded-tl-sm transition-colors ${justScanned ? 'border-emerald-400' : 'border-[#0084FF]'}`} />
          <div className={`absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 rounded-tr-sm transition-colors ${justScanned ? 'border-emerald-400' : 'border-[#0084FF]'}`} />
          <div className={`absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 rounded-bl-sm transition-colors ${justScanned ? 'border-emerald-400' : 'border-[#0084FF]'}`} />
          <div className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 rounded-br-sm transition-colors ${justScanned ? 'border-emerald-400' : 'border-[#0084FF]'}`} />

          {/* Animated Laser Beam */}
          {cameraActive && !disabled && (
            <div
              className={`absolute inset-x-2 h-0.5 shadow-lg transition-colors animate-pulse ${
                justScanned ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-red-500 shadow-[0_0_14px_#ef4444]'
              }`}
              style={{ animation: 'kioskLaserMove 2.4s ease-in-out infinite alternate' }}
            />
          )}

          <div className="absolute bottom-2.5 inset-x-0 flex justify-center">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md transition-all ${
                justScanned
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
                  : 'bg-black/70 text-slate-200 border border-white/10'
              }`}
            >
              {justScanned ? `✅ Barcode Terbaca: ${lastScannedCode}` : 'Arahkan Barcode Buku ke Sini'}
            </span>
          </div>
        </div>
      </div>

      {/* Top Camera Controls */}
      <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Scanner Kamera Aktif</span>
        </div>

        <div className="flex items-center gap-2">
          {/* File Upload Barcode Snapshot */}
          <label className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-bold backdrop-blur-md border border-white/20 shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95">
            <span>📁</span>
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

          <button
            type="button"
            onClick={switchCamera}
            disabled={isSwitchingCamera}
            className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-bold backdrop-blur-md border border-white/20 shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span className={isSwitchingCamera ? 'animate-spin' : ''}>🔄</span>
            <span>{facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes kioskLaserMove {
          0% { top: 15%; }
          100% { top: 85%; }
        }
      `}</style>
    </div>
  );
}
