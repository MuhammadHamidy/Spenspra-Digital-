'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook useProctoring untuk sistem e-Ujian CBT Spenspra
 * Mendeteksi perpindahan tab, kehilangan fokus jendela, keluar fullscreen,
 * dan mencegah aksi copy-paste serta inspect element.
 */
export function useProctoring({
  maxViolations = 3,
  enabled = true,
  onViolation = () => {},
  onLock = () => {},
}) {
  const [violationCount, setViolationCount] = useState(0);
  const [violationList, setViolationList] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [lastWarningMsg, setLastWarningMsg] = useState('');

  const blurStartRef = useRef(null);
  const isEnabledRef = useRef(enabled);
  isEnabledRef.current = enabled;

  const triggerViolation = useCallback(
    (type, message) => {
      if (!isEnabledRef.current || isLocked) return;

      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID');

      setViolationCount((prev) => {
        const newCount = prev + 1;
        const entry = {
          type,
          message,
          time: timeStr,
          timestamp: now.toISOString(),
          count: newCount,
        };

        setViolationList((vList) => [...vList, entry]);
        setLastWarningMsg(message);
        setShowWarningModal(true);

        onViolation(entry);

        if (newCount >= maxViolations) {
          setIsLocked(true);
          onLock({ count: newCount, reason: message, lastEntry: entry });
        }

        return newCount;
      });
    },
    [maxViolations, isLocked, onViolation, onLock]
  );

  // 1. Deteksi Tab Hidden / Ganti Tab
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('TAB_SWITCH', 'Terdeteksi berpindah tab atau meminimize browser ujian.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, triggerViolation]);

  // 2. Deteksi Window Blur (Klik di luar browser / Buka aplikasi lain)
  useEffect(() => {
    if (!enabled) return;

    const handleBlur = () => {
      blurStartRef.current = Date.now();
      triggerViolation('WINDOW_BLUR', 'Fokus layar ujian hilang (membuka aplikasi lain atau klik di luar layar).');
    };

    const handleFocus = () => {
      blurStartRef.current = null;
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, triggerViolation]);

  // 3. Deteksi Fullscreen Change
  useEffect(() => {
    if (!enabled) return;

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active && isEnabledRef.current && !isLocked) {
        triggerViolation('FULLSCREEN_EXIT', 'Terdeteksi keluar dari mode Layar Penuh (Fullscreen).');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [enabled, isLocked, triggerViolation]);

  // 4. Blokir Inspect Element, Copy, Paste, Print
  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleCopyPaste = (e) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      // Blok F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        triggerViolation('INSPECT_ATTEMPT', 'Mencoba membuka inspect element (F12).');
        return false;
      }

      // Blok Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools)
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
        e.preventDefault();
        triggerViolation('INSPECT_ATTEMPT', 'Mencoba membuka inspect element.');
        return false;
      }

      // Blok Ctrl+U (View Source)
      if (e.ctrlKey && e.key.toUpperCase() === 'U') {
        e.preventDefault();
        triggerViolation('INSPECT_ATTEMPT', 'Mencoba melihat sumber kode (View Source).');
        return false;
      }

      // Blok Ctrl+P (Print)
      if (e.ctrlKey && e.key.toUpperCase() === 'P') {
        e.preventDefault();
        return false;
      }

      // Blok Ctrl+C / Ctrl+V
      if (e.ctrlKey && ['C', 'V'].includes(e.key.toUpperCase())) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, triggerViolation]);

  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Gagal mengaktifkan mode fullscreen:', err);
    }
  }, []);

  const dismissWarning = useCallback(() => {
    setShowWarningModal(false);
    // Kembalikan ke fullscreen jika keluar
    if (!document.fullscreenElement && enabled && !isLocked) {
      requestFullscreen();
    }
  }, [enabled, isLocked, requestFullscreen]);

  return {
    violationCount,
    violationList,
    isLocked,
    isFullscreen,
    showWarningModal,
    lastWarningMsg,
    requestFullscreen,
    dismissWarning,
    resetViolations: () => {
      setViolationCount(0);
      setIsLocked(false);
      setShowWarningModal(false);
    },
  };
}
