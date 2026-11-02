'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { playScannerBeep } from './soundUtils';

const ZXING_CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/zxing-library/0.21.3/index.min.js',
  'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js',
];

export function useBarcodeScanner({ onScan, isScanning = true, disabled = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [cameras, setCameras] = useState([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [activeCameraLabel, setActiveCameraLabel] = useState('');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [justScanned, setJustScanned] = useState(false);
  const [zxingLoaded, setZxingLoaded] = useState(false);

  const lastScannedTimeRef = useRef(0);
  const zxingReaderRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
    setCameraActive(false);
  }, []);

  // Update list of camera devices
  const refreshCameraDevices = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setCameras(videoInputs);
        return videoInputs;
      }
    } catch {}
    return [];
  }, []);

  const startCamera = useCallback(
    async (targetCameraIndexOrMode) => {
      setError(null);
      setIsSwitchingCamera(true);

      // Stop existing stream first
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
        streamRef.current = null;
      }

      try {
        let constraints = { audio: false };
        let chosenMode = facingMode;

        // Determine deviceId or facingMode
        if (typeof targetCameraIndexOrMode === 'number') {
          const targetDev = cameras[targetCameraIndexOrMode];
          if (targetDev?.deviceId) {
            constraints.video = {
              deviceId: { exact: targetDev.deviceId },
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
            };
            setActiveCameraIndex(targetCameraIndexOrMode);
            setActiveCameraLabel(targetDev.label || `Kamera ${targetCameraIndexOrMode + 1}`);
          }
        } else if (typeof targetCameraIndexOrMode === 'string') {
          chosenMode = targetCameraIndexOrMode;
          setFacingMode(chosenMode);
          constraints.video = {
            facingMode: { ideal: chosenMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          };
        } else {
          // Default start
          const isMobile =
            typeof navigator !== 'undefined' &&
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          chosenMode = isMobile ? 'environment' : 'user';
          setFacingMode(chosenMode);
          constraints.video = {
            facingMode: { ideal: chosenMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          };
        }

        let mediaStream = null;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr) {
          console.warn('Initial camera constraints failed, attempting fallback:', initialErr);
          try {
            // Fallback without resolution constraints
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: constraints.video?.deviceId ? { deviceId: constraints.video.deviceId } : true,
              audio: false,
            });
          } catch (fallbackErr) {
            // Generic video true
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        }

        streamRef.current = mediaStream;

        // Connect stream to video element
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = mediaStream;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.setAttribute('autoplay', 'true');
          video.muted = true;

          try {
            await video.play();
          } catch (playErr) {
            console.warn('Video play error:', playErr);
          }
        }

        setCameraActive(true);

        // Track label
        const videoTrack = mediaStream.getVideoTracks()?.[0];
        if (videoTrack?.label) {
          setActiveCameraLabel(videoTrack.label);
        }

        // Enumerate devices now that permission is granted
        const updatedDevices = await refreshCameraDevices();
        if (videoTrack && updatedDevices.length > 0) {
          const foundIdx = updatedDevices.findIndex(
            (d) => d.deviceId === videoTrack.getSettings()?.deviceId || d.label === videoTrack.label
          );
          if (foundIdx >= 0) {
            setActiveCameraIndex(foundIdx);
            setActiveCameraLabel(updatedDevices[foundIdx].label || `Kamera ${foundIdx + 1}`);
          }
        }
      } catch (err) {
        console.error('Barcode camera access error:', err);
        setError(
          err.name === 'NotAllowedError'
            ? 'Izin akses kamera ditolak. Silakan izinkan kamera di browser Anda.'
            : err.name === 'NotFoundError'
            ? 'Tidak ada perangkat kamera yang terdeteksi di perangkat Anda.'
            : `Kamera tidak dapat diakses (${err.message || 'Error'}). Silakan periksa izin atau gunakan input manual.`
        );
        setCameraActive(false);
      } finally {
        setIsSwitchingCamera(false);
      }
    },
    [cameras, facingMode, refreshCameraDevices]
  );

  // Switch to next available camera (or toggle front/back)
  const switchCamera = useCallback(async () => {
    if (isSwitchingCamera) return;

    if (cameras.length > 1) {
      const nextIndex = (activeCameraIndex + 1) % cameras.length;
      await startCamera(nextIndex);
    } else {
      const newMode = facingMode === 'environment' ? 'user' : 'environment';
      await startCamera(newMode);
    }
  }, [activeCameraIndex, cameras, facingMode, isSwitchingCamera, startCamera]);

  // Load ZXing library from CDN as robust fallback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.ZXing) {
      setZxingLoaded(true);
      return;
    }

    let cdnIndex = 0;
    const loadNextCdn = () => {
      if (cdnIndex >= ZXING_CDN_URLS.length) {
        console.warn('[BarcodeScanner] ZXing CDN offline, using BarcodeDetector.');
        return;
      }
      const url = ZXING_CDN_URLS[cdnIndex];
      cdnIndex++;

      const existing = document.getElementById('zxing-script');
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = 'zxing-script';
      script.src = url;
      script.async = true;
      script.onload = () => {
        if (window.ZXing) {
          setZxingLoaded(true);
        } else {
          loadNextCdn();
        }
      };
      script.onerror = () => loadNextCdn();
      document.head.appendChild(script);
    };

    loadNextCdn();
  }, []);

  // Initialize camera once mounted
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-attach stream if videoRef remounts
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
        video.play().catch(() => {});
      }
    }
  }, [cameraActive]);

  // Handle successful detection
  const handleDetectedBarcode = useCallback(
    (barcodeRaw) => {
      if (!barcodeRaw) return;
      const cleanCode = String(barcodeRaw).trim();
      if (!cleanCode) return;

      const now = Date.now();
      if (cleanCode === lastScannedCode && now - lastScannedTimeRef.current < 2000) {
        return;
      }

      lastScannedTimeRef.current = now;
      setLastScannedCode(cleanCode);
      setJustScanned(true);
      playScannerBeep();

      setTimeout(() => setJustScanned(false), 900);

      if (onScan) {
        onScan(cleanCode);
      }
    },
    [lastScannedCode, onScan]
  );

  // Scan from uploaded image file
  const scanImageFile = useCallback(
    async (file) => {
      if (!file) return;
      setError(null);

      // 1. Native BarcodeDetector
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({
            formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'code_39', 'upc_a', 'upc_e'],
          });
          const imgBitmap = await createImageBitmap(file);
          const barcodes = await detector.detect(imgBitmap);
          if (Array.isArray(barcodes) && barcodes.length > 0 && barcodes[0].rawValue) {
            handleDetectedBarcode(barcodes[0].rawValue);
            return barcodes[0].rawValue;
          }
        } catch {}
      }

      // 2. ZXing
      if (window.ZXing) {
        try {
          if (!zxingReaderRef.current) {
            zxingReaderRef.current = new window.ZXing.BrowserMultiFormatReader();
          }
          const imgUrl = URL.createObjectURL(file);
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imgUrl;
          });

          const result = await zxingReaderRef.current.decodeFromImageElement(img);
          URL.revokeObjectURL(imgUrl);
          if (result && result.getText()) {
            handleDetectedBarcode(result.getText());
            return result.getText();
          }
        } catch {
          setError('Barcode tidak dapat terbaca dari foto tersebut. Pastikan foto terang dan fokus pada barcode/QR.');
        }
      }
    },
    [handleDetectedBarcode]
  );

  // Scanning loop: Read frames non-destructively without pausing video
  useEffect(() => {
    if (!cameraActive || disabled || !isScanning) return;

    let detector = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'code_39', 'upc_a', 'upc_e'],
        });
      } catch {
        detector = null;
      }
    }

    let isProcessing = false;
    const decodeCanvas = (canvas) => {
      if (!window.ZXing || !canvas) return null;
      try {
        if (window.ZXing.BrowserMultiFormatReader) {
          const reader = new window.ZXing.BrowserMultiFormatReader();
          const result = reader.decodeFromCanvas(canvas);
          if (result?.getText()) return result.getText();
        }
      } catch {}
      if (!window.ZXing.HTMLCanvasElementLuminanceSource) return null;
      try {
        const lum = new window.ZXing.HTMLCanvasElementLuminanceSource(canvas);
        const bitmap = new window.ZXing.BinaryBitmap(new window.ZXing.HybridBinarizer(lum));
        const reader = new window.ZXing.MultiFormatReader();
        const result = reader.decode(bitmap);
        return result?.getText() || null;
      } catch {
        return null;
      }
    };

    const interval = setInterval(async () => {
      if (isProcessing || disabled || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2 || video.paused) return;

      isProcessing = true;
      let detectedText = null;

      // 1. Native BarcodeDetector directly on video frame
      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (Array.isArray(barcodes) && barcodes.length > 0 && barcodes[0].rawValue) {
            detectedText = barcodes[0].rawValue;
          }
        } catch {}
      }

      // 2. ZXing decoding via hidden canvas (NEVER calls decodeFromVideoElement which interrupts playback)
      if (!detectedText && window.ZXing && canvasRef.current) {
        try {
          const canvas = canvasRef.current;
          const w = video.videoWidth || 640;
          const h = video.videoHeight || 480;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            detectedText = decodeCanvas(canvas);

            if (!detectedText) {
              const cropSize = Math.floor(Math.min(w, h) * 0.72);
              const cropX = Math.floor((w - cropSize) / 2);
              const cropY = Math.floor((h - cropSize) / 2);
              const cropCanvas = document.createElement('canvas');
              cropCanvas.width = cropSize * 2;
              cropCanvas.height = cropSize * 2;
              const cropContext = cropCanvas.getContext('2d', { willReadFrequently: true });
              cropContext?.drawImage(
                video,
                cropX,
                cropY,
                cropSize,
                cropSize,
                0,
                0,
                cropCanvas.width,
                cropCanvas.height
              );
              detectedText = decodeCanvas(cropCanvas);
            }
          }
        } catch {}
      }

      if (detectedText) {
        handleDetectedBarcode(detectedText);
      }

      isProcessing = false;
    }, 180);

    return () => clearInterval(interval);
  }, [cameraActive, disabled, isScanning, facingMode, handleDetectedBarcode, zxingLoaded]);

  return {
    videoRef,
    canvasRef,
    cameraActive,
    error,
    facingMode,
    cameras,
    hasMultipleCameras: cameras.length > 1,
    activeCameraLabel,
    isSwitchingCamera,
    lastScannedCode,
    justScanned,
    startCamera,
    switchCamera,
    scanImageFile,
  };
}
