'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { playScannerBeep } from './soundUtils';

export function useBarcodeScanner({ onScan, isScanning = true, disabled = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [justScanned, setJustScanned] = useState(false);

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
    async (targetMode = facingMode) => {
      setError(null);
      try {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }

        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        setStream(mediaStream);
        setCameraActive(true);
        setFacingMode(targetMode);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('Barcode camera access error:', err);
        setError('Kamera tidak dapat diakses: ' + (err.message || 'Periksa izin kamera browser.'));
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

  // Load ZXing dynamically fallback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('BarcodeDetector' in window) && !window.ZXing && !document.getElementById('zxing-script')) {
      const script = document.createElement('script');
      script.id = 'zxing-script';
      script.src = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Handle successful detection
  const handleDetectedBarcode = useCallback(
    (barcodeRaw) => {
      if (!barcodeRaw) return;
      const cleanCode = String(barcodeRaw).trim();
      if (!cleanCode) return;

      const now = Date.now();
      if (cleanCode === lastScannedCode && now - lastScannedTimeRef.current < 2200) {
        return;
      }

      lastScannedTimeRef.current = now;
      setLastScannedCode(cleanCode);
      setJustScanned(true);
      playScannerBeep();

      setTimeout(() => setJustScanned(false), 800);

      if (onScan) {
        onScan(cleanCode);
      }
    },
    [lastScannedCode, onScan]
  );

  // Scanning interval loop
  useEffect(() => {
    if (!cameraActive || disabled || !isScanning) return;

    let detector = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new window.BarcodeDetector({
          formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'code_39', 'upc_a', 'upc_e'],
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

      if (detector) {
        isProcessing = true;
        try {
          const barcodes = await detector.detect(video);
          if (Array.isArray(barcodes) && barcodes.length > 0) {
            handleDetectedBarcode(barcodes[0].rawValue);
          }
        } catch {
          // silent fallback
        } finally {
          isProcessing = false;
        }
      } else if (window.ZXing && canvasRef.current) {
        isProcessing = true;
        try {
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          if (!zxingReaderRef.current) {
            zxingReaderRef.current = new window.ZXing.BrowserMultiFormatReader();
          }
          const result = await zxingReaderRef.current.decodeFromCanvas(canvas);
          if (result && result.getText()) {
            handleDetectedBarcode(result.getText());
          }
        } catch {
          // Expected when frame has no barcode
        } finally {
          isProcessing = false;
        }
      }
    }, 220);

    return () => clearInterval(interval);
  }, [cameraActive, disabled, isScanning, handleDetectedBarcode]);

  return {
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
  };
}
