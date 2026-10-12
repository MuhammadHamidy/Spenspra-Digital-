'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * FaceCameraCapture
 * Komponen kamera interaktif untuk mengambil foto wajah siswa langsung dari webcam/kamera HP.
 * Dilengkapi dengan panduan bingkai wajah, hitung mundur (countdown), switch kamera, dan pratinjau snapshot.
 *
 * Props:
 * - onCapture: (base64DataUrl: string) => void (dipanggil saat foto diambil/dikonfirmasi)
 * - onCancel?: () => void (opsional, jika ingin menutup tampilan kamera)
 * - autoStart?: boolean (default: true)
 * - showConfirmStep?: boolean (default: true, menampilkan layar pratinjau sebelum confirm)
 */
export default function FaceCameraCapture({
  onCapture,
  onCancel,
  autoStart = true,
  showConfirmStep = true,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' atau 'environment'
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [useCountdown, setUseCountdown] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [deviceList, setDeviceList] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // Hentikan stream kamera dengan aman
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Track stop error:', e);
        }
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, [stream]);

  // Dapatkan daftar perangkat video
  const enumerateDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setDeviceList(videoDevices);
    } catch (e) {
      console.warn('enumerateDevices error:', e);
    }
  }, []);

  // Mulai stream kamera
  const startCamera = useCallback(
    async (mode = facingMode, deviceId = selectedDeviceId) => {
      setError(null);
      stopCamera();

      try {
        const constraints = {
          audio: false,
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : {
                facingMode: { ideal: mode },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
        };

        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err1) {
          // Fallback ke resolusi standar jika gagal
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { facingMode: mode },
            });
          } catch (err2) {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
          }
        }

        setStream(mediaStream);
        setCameraActive(true);
        setFacingMode(mode);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((e) => console.log('Video play error:', e));
        }

        enumerateDevices();
      } catch (err) {
        console.error('Camera access error:', err);
        setError(
          'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di peramban Anda.'
        );
        setCameraActive(false);
      }
    },
    [facingMode, selectedDeviceId, stopCamera, enumerateDevices]
  );

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Pasang stream ke elemen video saat stream atau videoRef siap
  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.log('Video play error:', e));
    }
  }, [stream, cameraActive]);

  // Ganti kamera depan / belakang
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setSelectedDeviceId('');
    startCamera(nextMode, '');
  };

  // Switch device dropdown
  const handleDeviceChange = (e) => {
    const devId = e.target.value;
    setSelectedDeviceId(devId);
    startCamera(facingMode, devId);
  };

  // Efek suara shutter sintetis via Web Audio API (ringan & tanpa asset eksternal)
  const playShutterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {
      // Abaikan jika browser memblokir audio autoplay
    }
  };

  // Eksekusi pengambilan foto dari video canvas
  const captureFrame = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const rawWidth = video.videoWidth || 640;
    const rawHeight = video.videoHeight || 480;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
    }

    // Resolusi optimal untuk face embedding (maks 960px lebar)
    let targetW = rawWidth;
    let targetH = rawHeight;
    if (targetW > 960) {
      const ratio = 960 / targetW;
      targetW = 960;
      targetH = Math.round(rawHeight * ratio);
    }

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');

    // Jika kamera depan (user), mirror horizontal agar sesuai dengan yang dilihat pengguna di layar
    if (facingMode === 'user') {
      ctx.save();
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, targetW, targetH);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, targetW, targetH);
    }

    const base64Photo = canvas.toDataURL('image/jpeg', 0.92);

    // Flash animation & shutter sound
    setIsFlashing(true);
    playShutterSound();
    setTimeout(() => setIsFlashing(false), 200);

    if (showConfirmStep) {
      setCapturedPhoto(base64Photo);
    } else {
      stopCamera();
      onCapture?.(base64Photo);
    }
  }, [facingMode, showConfirmStep, stopCamera, onCapture]);

  // Tombol ambil foto (dengan opsi hitung mundur)
  const handleSnapClick = () => {
    if (useCountdown) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimeout(() => {
              captureFrame();
              setCountdown(null);
            }, 100);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      captureFrame();
    }
  };

  // Ulangi pengambilan foto
  const handleRetake = () => {
    setCapturedPhoto(null);
    if (!cameraActive) {
      startCamera();
    }
  };

  // Konfirmasi foto yang telah diambil
  const handleConfirmPhoto = () => {
    if (!capturedPhoto) return;
    stopCamera();
    onCapture?.(capturedPhoto);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* AREA KAMERA / PREVIEW */}
      <div className="relative w-full aspect-[4/3] max-h-[380px] sm:max-h-[420px] rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-xl flex items-center justify-center">
        {/* FLASH EFFECT */}
        {isFlashing && (
          <div className="absolute inset-0 z-40 bg-white opacity-80 animate-ping pointer-events-none transition-opacity duration-150" />
        )}

        {/* TAMPILAN PREVIEW HASIL JEPRETAN */}
        {capturedPhoto ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img
              src={capturedPhoto}
              alt="Hasil Jepretan Siswa"
              className="w-full h-full object-contain"
            />
            {/* Tag Badge */}
            <div className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-md flex items-center gap-1.5">
              <span>✓</span>
              <span>Foto Berhasil Diambil</span>
            </div>
          </div>
        ) : (
          /* TAMPILAN LIVE VIDEO */
          <>
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    facingMode === 'user' ? 'transform -scale-x-100' : 'transform scale-x-100'
                  }`}
                />

                {/* OVERLAY FRAME BIOMETRIK WAJAH */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* Lingkaran Oval Wajah */}
                  <div className="relative w-[180px] h-[230px] sm:w-[210px] sm:h-[270px] border-2 border-dashed border-sky-400/90 rounded-[50%] shadow-[0_0_30px_rgba(56,189,248,0.35)] flex items-center justify-center transition-all duration-300">
                    {/* Sudut panduan pojok */}
                    <div className="absolute top-2 w-6 h-0.5 bg-sky-300 rounded-full" />
                    <div className="absolute bottom-2 w-6 h-0.5 bg-sky-300 rounded-full" />
                    <div className="absolute left-2 h-6 w-0.5 bg-sky-300 rounded-full" />
                    <div className="absolute right-2 h-6 w-0.5 bg-sky-300 rounded-full" />

                    {/* Garis horizontal mata */}
                    <div className="w-16 h-[1px] bg-sky-300/30 mb-8" />
                  </div>

                  {/* Panduan teks bawah */}
                  <div className="mt-3 px-3 py-1 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-700/60 shadow-lg">
                    <p className="text-[11px] text-sky-200 font-medium tracking-wide">
                      Posisikan wajah siswa di dalam bingkai oval
                    </p>
                  </div>
                </div>

                {/* COUNTDOWN OVERLAY */}
                {countdown !== null && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                    <div className="w-24 h-24 rounded-full bg-blue-600/90 text-white flex items-center justify-center text-5xl font-extrabold shadow-2xl animate-bounce">
                      {countdown}
                    </div>
                  </div>
                )}

                {/* BADGE KAMERA AKTIF */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-slate-200 font-mono font-semibold">
                    Kamera Aktif {facingMode === 'user' ? '(Depan)' : '(Belakang)'}
                  </span>
                </div>

                {/* TOMBOL FLIP KAMERA DEPAN/BELAKANG */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/60 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
                  title="Ganti kamera depan/belakang"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </>
            ) : (
              /* LOADING / ERROR STATE */
              <div className="p-6 text-center space-y-3 max-w-sm">
                {error ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto text-2xl font-bold">
                      ⚠️
                    </div>
                    <p className="text-xs text-rose-300 font-medium leading-relaxed">{error}</p>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Coba Akses Kamera Lagi
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-300 font-bold">Mengaktifkan Kamera...</p>
                    <p className="text-[11px] text-slate-500">
                      Mohon izinkan akses webcam pada peramban Anda.
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* DEVICE SELECTOR (Jika ada lebih dari 1 kamera) */}
      {!capturedPhoto && deviceList.length > 1 && (
        <div className="w-full mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
          <label className="font-medium">Pilih Kamera:</label>
          <select
            value={selectedDeviceId}
            onChange={handleDeviceChange}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[220px] truncate"
          >
            <option value="">Default ({facingMode === 'user' ? 'Depan' : 'Belakang'})</option>
            {deviceList.map((dev, idx) => (
              <option key={dev.deviceId || idx} value={dev.deviceId}>
                {dev.label || `Kamera ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* CONTROLS BAR BAWAH */}
      <div className="w-full mt-3 flex flex-wrap items-center justify-between gap-2.5">
        {capturedPhoto ? (
          /* AKSI SETELAH FOTO DIAMBIL */
          <div className="w-full flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Foto Ulang</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmPhoto}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg active:scale-98"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Gunakan Foto Ini</span>
            </button>
          </div>
        ) : (
          /* AKSI SAAT KAMERA LIVE */
          <>
            {/* OPSI HITUNG MUNDUR (COUNTDOWN) */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useCountdown}
                onChange={(e) => setUseCountdown(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs text-slate-600 font-medium">Hitung mundur 3s</span>
            </label>

            {/* TOMBOL AMBIL FOTO UTAMA */}
            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onCancel();
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
              )}

              <button
                type="button"
                disabled={!cameraActive || countdown !== null}
                onClick={handleSnapClick}
                className="px-5 py-2.5 rounded-xl bg-[#0084FF] hover:bg-[#0070DE] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                <span>Ambil Foto</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
