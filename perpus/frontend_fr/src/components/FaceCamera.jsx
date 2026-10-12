'use client';

import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { extractFaceEmbeddingFromPhoto } from '@/lib/features/faces/infrastructure/faceApiAdapter';
import { detectFacePresence } from '@/lib/features/faces/facePresenceHelper';

const FaceCamera = forwardRef(function FaceCamera(
  {
    onCapture,
    onFacePresenceChange,
    disabled = false,
    autoStart = true,
  },
  ref
) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsScanning(false);
    onFacePresenceChange?.(false);
  }, [stream, onFacePresenceChange]);

  // Start camera helper
  const startCamera = useCallback(
    async (targetMode = facingMode) => {
      setError(null);
      try {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: { ideal: targetMode },
            },
            audio: false,
          });
        } catch {
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: targetMode },
              audio: false,
            });
          } catch {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }

        setStream(mediaStream);
        setCameraActive(true);
        setFacingMode(targetMode);
      } catch (err) {
        console.warn('Failed to access camera:', err);
        setError('Kamera belum aktif atau izin diblokir browser: ' + (err.message || 'Periksa izin webcam.'));
        setCameraActive(false);
      } finally {
        setIsSwitchingCamera(false);
      }
    },
    [facingMode, stream]
  );

  const switchCamera = useCallback(async () => {
    if (isSwitchingCamera) return;
    setIsSwitchingCamera(true);
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    await startCamera(newMode);
  }, [facingMode, isSwitchingCamera, startCamera]);

  useImperativeHandle(ref, () => ({
    switchCamera,
    startCamera,
    stopCamera,
    isCameraActive: cameraActive,
  }));

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.log('Video play error:', e));
    }
  }, [stream, cameraActive]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Perform automatic single frame scan
  const performAutoScan = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || disabled || isScanning) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    setIsScanning(true);

    try {
      const canvas = canvasRef.current;
      const rawWidth = video.videoWidth || 640;
      const rawHeight = video.videoHeight || 480;

      let width = rawWidth;
      let height = rawHeight;
      if (width > 480) {
        const ratio = 480 / width;
        width = 480;
        height = Math.round(rawHeight * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (facingMode === 'user') {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();
      } else {
        ctx.drawImage(video, 0, 0, width, height);
      }

      const hasFace = await detectFacePresence(video, canvas);
      onFacePresenceChange?.(hasFace);

      if (!hasFace) {
        setTimeout(() => setIsScanning(false), 500);
        return;
      }

      const base64Photo = canvas.toDataURL('image/jpeg', 0.75);

      let faceVector = null;
      try {
        const embResult = await extractFaceEmbeddingFromPhoto(base64Photo);
        if (embResult?.success && Array.isArray(embResult.embedding) && embResult.embedding.length === 128) {
          faceVector = embResult.embedding;
        }
      } catch {
        // silent fallback
      }

      if (onCapture) {
        onCapture({ photoUrl: base64Photo, faceVector });
      }
    } catch (err) {
      console.warn('[FaceCamera] Auto scan error:', err);
    } finally {
      setTimeout(() => setIsScanning(false), 1200);
    }
  }, [disabled, isScanning, onCapture, facingMode, onFacePresenceChange]);

  // Scanner interval loop
  useEffect(() => {
    if (!cameraActive || disabled) return;

    const interval = setInterval(() => {
      performAutoScan();
    }, 950);

    return () => clearInterval(interval);
  }, [cameraActive, disabled, performAutoScan]);

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
      {cameraActive ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform duration-300 ${
            facingMode === 'user' ? 'transform -scale-x-100' : 'transform scale-x-100'
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
                className="px-4 py-2 rounded-xl bg-[#0084FF] hover:bg-[#0070DE] text-white text-xs font-bold transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Coba Akses Kamera Lagi</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-bold tracking-wide">Mengaktifkan Kamera...</p>
              <p className="text-[11px] text-slate-500">Mohon izinkan akses webcam pada peramban Anda</p>
            </div>
          )}
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
});

export default FaceCamera;
