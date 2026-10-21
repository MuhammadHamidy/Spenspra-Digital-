'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook useProctoring untuk sistem e-Ujian CBT Spenspra (Solusi 2: Zero Tolerance & Kiosk Mode)
 * - Zero Tolerance: 1x pelanggaran langsung mengunci layar
 * - Mendeteksi tarikan status bar/notifikasi HP (window blur), perpindahan tab/aplikasi (visibilitychange), keluar fullscreen
 * - Screen Wake Lock API: Mencegah layar HP siswa mati/redup saat ujian
 * - Blokir inspect element, klik kanan, copy, paste, potong teks
 * - Verifikasi PIN Guru/Pengawas untuk membuka kembali lembar ujian yang terkunci
 */
export function useProctoring({
  maxViolations = 1,
  zeroTolerance = true,
  enabled = true,
  unlockPin = 'SPENSPRA',
  altUnlockPins = [],
  onViolation = () => {},
  onLock = () => {},
  onUnlock = () => {},
}) {
  const [violationCount, setViolationCount] = useState(0);
  const [violationList, setViolationList] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [lastWarningMsg, setLastWarningMsg] = useState('');
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const wakeLockRef = useRef(null);
  const isEnabledRef = useRef(enabled);
  isEnabledRef.current = enabled;
  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;

  // 1. Request Screen Wake Lock (Mencegah Layar HP Mati / Sleep)
  const requestWakeLock = useCallback(async () => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (!wakeLockRef.current || wakeLockRef.current.released) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      }
    } catch (err) {
      console.warn('[CBT Proctoring] WakeLock request error:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
      }
    } catch (err) {
      console.warn('[CBT Proctoring] WakeLock release error:', err);
    }
  }, []);

  // Request Fullscreen Helper
  const requestFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        const root = document.documentElement;
        if (root.requestFullscreen) {
          await root.requestFullscreen();
        } else if (root.webkitRequestFullscreen) {
          await root.webkitRequestFullscreen();
        } else if (root.mozRequestFullScreen) {
          await root.mozRequestFullScreen();
        } else if (root.msRequestFullscreen) {
          await root.msRequestFullscreen();
        }
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('[CBT Proctoring] Gagal mengaktifkan mode fullscreen:', err);
    }
  }, []);

  // 2. Trigger Pelanggaran & Instant Lock
  const triggerViolation = useCallback(
    (type, message) => {
      if (!isEnabledRef.current || isLockedRef.current) return;

      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID');

      // Getar perangkat HP jika didukung (haptic warning)
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        try {
          navigator.vibrate([300, 100, 300]);
        } catch (_) {}
      }

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

        onViolation(entry);

        // Solusi 2 Zero-Tolerance: 1x langsung lock!
        const effectiveLimit = zeroTolerance ? 1 : maxViolations;
        if (newCount >= effectiveLimit) {
          setIsLocked(true);
          isLockedRef.current = true;
          setShowWarningModal(false);
          onLock({ count: newCount, reason: message, lastEntry: entry });
        } else {
          setShowWarningModal(true);
        }

        return newCount;
      });
    },
    [maxViolations, zeroTolerance, onViolation, onLock]
  );

  // 3. Efek Lifecycle WakeLock saat enabled
  useEffect(() => {
    if (!enabled) {
      releaseWakeLock();
      return;
    }

    requestWakeLock();

    const handleVisibilityForWakeLock = () => {
      if (document.visibilityState === 'visible' && enabled && !isLockedRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityForWakeLock);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityForWakeLock);
      releaseWakeLock();
    };
  }, [enabled, requestWakeLock, releaseWakeLock]);

  // 4. Deteksi Tab Hidden / Ganti Tab / Minimize
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation(
          'TAB_SWITCH',
          'Terdeteksi beralih aplikasi, membuka tab baru, atau meminimalkan layar ujian.'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, triggerViolation]);

  // 5. Deteksi Window Blur (Tarik Notifikasi / Tekan Tombol Home / Klik di Luar Jendela)
  useEffect(() => {
    if (!enabled) return;

    const handleBlur = () => {
      // Pada HP Android/iOS, menarik bilah notifikasi atau geser gesture home langsung memicu event blur
      triggerViolation(
        'WINDOW_BLUR',
        'Fokus layar hilang! Terdeteksi menarik panel notifikasi, menekan tombol Home, atau membuka menu sistem.'
      );
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, triggerViolation]);

  // 6. Deteksi Fullscreen Change
  useEffect(() => {
    if (!enabled) return;

    const handleFullscreenChange = () => {
      const active = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(active);
      if (!active && isEnabledRef.current && !isLockedRef.current) {
        triggerViolation(
          'FULLSCREEN_EXIT',
          'Terdeteksi keluar dari mode Layar Penuh (Fullscreen).'
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [enabled, triggerViolation]);

  // 7. Blokir Inspect Element, Copy, Cut, Paste, Print, Shortcut
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

      // Blok Ctrl+Shift+I / J / C
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key?.toUpperCase())) {
        e.preventDefault();
        triggerViolation('INSPECT_ATTEMPT', 'Mencoba membuka alat pengembang (DevTools).');
        return false;
      }

      // Blok Ctrl+U (View Source)
      if (e.ctrlKey && e.key?.toUpperCase() === 'U') {
        e.preventDefault();
        triggerViolation('INSPECT_ATTEMPT', 'Mencoba melihat sumber kode halaman (View Source).');
        return false;
      }

      // Blok Ctrl+P (Print)
      if (e.ctrlKey && e.key?.toUpperCase() === 'P') {
        e.preventDefault();
        return false;
      }

      // Blok Ctrl+C / Ctrl+V / Ctrl+X
      if (e.ctrlKey && ['C', 'V', 'X', 'A'].includes(e.key?.toUpperCase())) {
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

  const dismissWarning = useCallback(() => {
    setShowWarningModal(false);
    if (!document.fullscreenElement && enabled && !isLockedRef.current) {
      requestFullscreen();
    }
  }, [enabled, requestFullscreen]);

  // 8. Buka Kunci Pengawas (Supervisor PIN Unlock)
  const unlockSession = useCallback(
    (enteredPin) => {
      const cleanPin = String(enteredPin || '').trim().toUpperCase();
      if (!cleanPin) {
        return { success: false, message: 'Harap masukkan PIN Pengawas!' };
      }

      // Validasi terhadap PIN resmi: custom unlockPin, altUnlockPins (misal token ujian), dan master PIN
      const validPins = [
        String(unlockPin || '').trim().toUpperCase(),
        ...altUnlockPins.map((p) => String(p || '').trim().toUpperCase()),
        'SPENSPRA',
        'GURU123',
        'ADMINCBT',
        'SPENSPRA2026',
      ].filter(Boolean);

      if (validPins.includes(cleanPin)) {
        setIsLocked(false);
        isLockedRef.current = false;
        setViolationCount(0);
        setShowWarningModal(false);

        // Kembalikan fullscreen dan wake lock
        requestFullscreen();
        requestWakeLock();

        onUnlock({
          pin: cleanPin,
          timestamp: new Date().toISOString(),
          message: 'Ujian berhasil dibuka kembali oleh pengawas/guru.',
        });

        return { success: true };
      }

      return {
        success: false,
        message: 'PIN Pengawas tidak cocok! Hubungi Bapak/Ibu Pengawas di kelas.',
      };
    },
    [unlockPin, altUnlockPins, requestFullscreen, requestWakeLock, onUnlock]
  );

  return {
    violationCount,
    violationsCount: violationCount, // alias kompatibilitas
    violationList,
    isLocked,
    isFullscreen,
    showWarningModal,
    lastWarningMsg,
    warningMessage: lastWarningMsg, // alias kompatibilitas
    wakeLockActive,
    requestFullscreen,
    requestWakeLock,
    dismissWarning,
    unlockSession,
    resetViolations: () => {
      setViolationCount(0);
      setIsLocked(false);
      isLockedRef.current = false;
      setShowWarningModal(false);
    },
  };
}
