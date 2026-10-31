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
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // Default to front/user camera for laptop webcams
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [justScanned, setJustScanned] = useState(false);
  const [zxingLoaded, setZxingLoaded] = useState(false);

  const lastScannedTimeRef = useRef(0);
  const zxingReaderRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch {
        // silent
      }
    }
    setCameraActive(false);
  }, [stream]);

  const startCamera = useCallback(
    async (targetMode) => {
      setError(null);
      try {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }

        // Deteksi apakah user menggunakan perangkat mobile (HP/Tablet) vs PC/Laptop
        const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // 1. Deteksi apakah perangkat memiliki beberapa kamera
        let videoDevices = [];
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            videoDevices = devices.filter((d) => d.kind === 'videoinput');
          }
        } catch {}

        const multi = videoDevices.length > 1;
        setHasMultipleCameras(multi);

        // Pada Laptop/PC: Selalu utamakan 'user' (webcam). Pada HP: utamakan 'environment' (kamera belakang)
        const chosenFacing = targetMode || (isMobile && multi ? 'environment' : 'user');

        let mediaStream = null;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: chosenFacing },
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
            },
            audio: false,
          });
        } catch {
          // Fallback tanpa constraint resolusi
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: chosenFacing },
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
        setFacingMode(chosenFacing);

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = mediaStream;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('autoplay', 'true');
          video.muted = true;
          video.play().catch(() => {});
        }
      } catch (err) {
        console.warn('Barcode camera access error:', err);
        setError('Kamera tidak dapat diakses: ' + (err.message || 'Periksa izin kamera browser.'));
        setCameraActive(false);
      } finally {
        setIsSwitchingCamera(false);
      }
    },
    [stream]
  );

  const switchCamera = useCallback(async () => {
    if (isSwitchingCamera) return;
    setIsSwitchingCamera(true);
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    await startCamera(newMode);
  }, [facingMode, isSwitchingCamera, startCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.log('Video play error:', e));
    }
  }, [cameraActive, stream]);

  // Load ZXing library with multiple resilient CDNs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.ZXing) {
      setZxingLoaded(true);
      return;
    }

    let cdnIndex = 0;
    const loadNextCdn = () => {
      if (cdnIndex >= ZXING_CDN_URLS.length) {
        console.warn('[BarcodeScanner] Semua CDN ZXing gagal dimuat, menggunakan BarcodeDetector murni.');
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
      script.onerror = () => {
        loadNextCdn();
      };
      document.head.appendChild(script);
    };

    loadNextCdn();
  }, []);

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

      // 1. Coba Native BarcodeDetector
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

      // 2. Coba ZXing
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
        } catch (err) {
          setError('Barcode tidak dapat terbaca dari gambar tersebut. Pastikan gambar jelas dan tidak buram.');
        }
      }
    },
    [handleDetectedBarcode]
  );

  // Scanning interval loop with dual-engine (native BarcodeDetector + ZXing dual-pass canvas)
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
    const interval = setInterval(async () => {
      if (isProcessing || disabled || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) return;

      isProcessing = true;
      let detectedText = null;

      // 1. Coba Native BarcodeDetector
      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (Array.isArray(barcodes) && barcodes.length > 0 && barcodes[0].rawValue) {
            detectedText = barcodes[0].rawValue;
          }
        } catch {
          // Native detector error -> fallback to ZXing
        }
      }

      // 2. Fallback to ZXing decoding (Direct video + Dual-pass canvas)
      if (!detectedText && window.ZXing) {
        if (!zxingReaderRef.current) {
          try {
            zxingReaderRef.current = new window.ZXing.BrowserMultiFormatReader();
          } catch {}
        }

        // Pass A: Direct from playing HTMLVideoElement
        if (zxingReaderRef.current) {
          try {
            const res = await zxingReaderRef.current.decodeFromVideoElement(video);
            if (res && res.getText()) {
              detectedText = res.getText();
            }
          } catch {
            // Frame not found or scanning next frame
          }
        }

        // Pass B: Canvas fallback (with luminance source & mirroring support)
        if (!detectedText && canvasRef.current) {
          try {
            const canvas = canvasRef.current;
            const w = video.videoWidth || 640;
            const h = video.videoHeight || 480;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              const decodeCanvasWithZXing = (cvs) => {
                try {
                  if (window.ZXing.HTMLCanvasElementLuminanceSource) {
                    const lum = new window.ZXing.HTMLCanvasElementLuminanceSource(cvs);
                    const bitmap = new window.ZXing.BinaryBitmap(new window.ZXing.HybridBinarizer(lum));
                    const reader = new window.ZXing.MultiFormatReader();
                    const r = reader.decode(bitmap);
                    return r ? r.getText() : null;
                  }
                } catch {}
                return null;
              };

              ctx.drawImage(video, 0, 0, w, h);
              detectedText = decodeCanvasWithZXing(canvas);

              // Pass C: Invert/Mirror if user facing or initial pass failed
              if (!detectedText && facingMode === 'user') {
                ctx.save();
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, w, h);
                ctx.restore();

                detectedText = decodeCanvasWithZXing(canvas);
              }
            }
          } catch {}
        }
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
    hasMultipleCameras,
    isSwitchingCamera,
    lastScannedCode,
    justScanned,
    startCamera,
    switchCamera,
    scanImageFile,
  };
}
