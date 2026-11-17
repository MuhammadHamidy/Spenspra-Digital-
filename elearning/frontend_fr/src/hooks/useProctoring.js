'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook useProctoring untuk sistem e-Ujian CBT Spenspra (Solusi 2: Zero Tolerance & Kiosk Mode)
 * - Zero Tolerance: 1x pelanggaran langsung mengunci layar
 * - Web Audio API Siren Alarm: Alarm darurat berbunyi keras di speaker saat klik home / minimize / tarik notifikasi
 * - Auto-Unlock AudioContext pada gesture pertama (touch / click) agar alarm bisa berbunyi di HP meski mode hening
 * - Deteksi tarikan status bar/notifikasi HP (window blur), perpindahan tab/aplikasi (visibilitychange), keluar fullscreen
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
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const wakeLockRef = useRef(null);
  const hasEnteredFullscreenRef = useRef(false);
  const lastViolationRef = useRef({ type: '', at: 0 });
  const isEnabledRef = useRef(enabled);
  isEnabledRef.current = enabled;
  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;
  const unlockPinRef = useRef(unlockPin);
  unlockPinRef.current = unlockPin;
  const altUnlockPinsRef = useRef(altUnlockPins);
  altUnlockPinsRef.current = altUnlockPins;
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  // Web Audio Context & Siren Alarm Refs
  const audioCtxRef = useRef(null);
  const alarmOscillatorRef = useRef(null);
  const alarmGainRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const vibrationIntervalRef = useRef(null);

  // Inisialisasi Audio Context
  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Hentikan Sirene & Getar
  const stopAlarmSirene = useCallback(() => {
    try {
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        try {
          navigator.vibrate(0);
        } catch (_) {}
      }
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      if (alarmOscillatorRef.current) {
        try {
          alarmOscillatorRef.current.stop();
          alarmOscillatorRef.current.disconnect();
        } catch (_) {}
        alarmOscillatorRef.current = null;
      }
      if (alarmGainRef.current) {
        try {
          alarmGainRef.current.disconnect();
        } catch (_) {}
        alarmGainRef.current = null;
      }
    } catch (_) {}
  }, []);

  // Bunyikan Sirene Peringatan Keras (Web Audio API) & Getaran Intensif Berulang
  const playAlarmSirene = useCallback(() => {
    try {
      // 1. Getar perangkat HP berulang kali (sangat efektif walau HP di Silent Mode)
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        try {
          navigator.vibrate([600, 200, 600, 200, 600, 200]);
          if (vibrationIntervalRef.current) clearInterval(vibrationIntervalRef.current);
          vibrationIntervalRef.current = setInterval(() => {
            try {
              if (navigator.vibrate) {
                navigator.vibrate([600, 200, 600, 200]);
              }
            } catch (_) {}
          }, 1200);
        } catch (_) {}
      }

      const ctx = getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      stopAlarmSirene();

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(1.0, now);
      gainNode.connect(ctx.destination);
      alarmGainRef.current = gainNode;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.connect(gainNode);
      osc.start();
      alarmOscillatorRef.current = osc;

      // Efek Modulasi Suara Sirene Darurat (Polisi / Alarm CBT)
      let freqToggle = false;
      alarmIntervalRef.current = setInterval(() => {
        try {
          if (alarmOscillatorRef.current && ctx && ctx.state === 'running') {
            freqToggle = !freqToggle;
            const targetFreq = freqToggle ? 1400 : 750;
            alarmOscillatorRef.current.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.06);
          }
        } catch (_) {}
      }, 220);
    } catch (err) {
      console.warn('[CBT Proctoring] Gagal memutar alarm suara:', err);
    }
  }, [getAudioContext, stopAlarmSirene]);

  // Test Suara & Getar Alarm (Untuk dicoba siswa sebelum ujian)
  const testAlarmAudio = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      playAlarmSirene();
      setTimeout(() => {
        stopAlarmSirene();
      }, 1500);
    } catch (_) {}
  }, [getAudioContext, playAlarmSirene, stopAlarmSirene]);

  // Listener Gesture Siswa untuk Unlock AudioContext & WakeLock
  useEffect(() => {
    const handleFirstGesture = () => {
      setHasUserInteracted(true);
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };

    window.addEventListener('click', handleFirstGesture, { passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { passive: true });
    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('pointerdown', handleFirstGesture);
      stopAlarmSirene();
    };
  }, [getAudioContext, stopAlarmSirene]);

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

  // Request Fullscreen Helper dengan dukungan mobile gesture
  const requestFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    try {
      // Pastikan audio context juga ikut aktif saat user klik tombol fullscreen
      getAudioContext();

      const root = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const opts = { navigationUI: 'hide' };
        if (root.requestFullscreen) {
          await root.requestFullscreen(opts).catch(() => root.requestFullscreen());
        } else if (root.webkitRequestFullscreen) {
          await root.webkitRequestFullscreen();
        } else if (root.mozRequestFullScreen) {
          await root.mozRequestFullScreen();
        } else if (root.msRequestFullscreen) {
          await root.msRequestFullscreen();
        }
      }
      setIsFullscreen(true);
      hasEnteredFullscreenRef.current = true;
    } catch (err) {
      console.warn('[CBT Proctoring] Request fullscreen error:', err);
      // Di perangkat tanpa API fullscreen penuh (misal iOS Safari), kita tandai tetap aktif
      setIsFullscreen(true);
      hasEnteredFullscreenRef.current = true;
    }
  }, [getAudioContext]);

  // 2. Trigger Pelanggaran & Instant Lock + Alarm Suara & Getaran
  const triggerViolation = useCallback(
    (type, message) => {
      if (!isEnabledRef.current || isLockedRef.current) return;

      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID');
      const lastViolation = lastViolationRef.current;

      // Anti-cascade debounce: Hindari 1 aksi fisik (tekan home/tarik status bar)
      // memicu 3x event berturut-turut (WINDOW_BLUR -> TAB_SWITCH -> FULLSCREEN_EXIT)
      const isExitType = ['WINDOW_BLUR', 'TAB_SWITCH', 'FULLSCREEN_EXIT'].includes(type);
      const wasExitType = ['WINDOW_BLUR', 'TAB_SWITCH', 'FULLSCREEN_EXIT'].includes(lastViolation.type);
      const timeDiff = now.getTime() - lastViolation.at;

      if (timeDiff < 3500 && (type === lastViolation.type || (isExitType && wasExitType))) {
        return;
      }
      lastViolationRef.current = { type, at: now.getTime() };

      // Bunyikan Sirene Alarm Peringatan Darurat & Getar HP
      playAlarmSirene();

      setViolationCount((prev) => {
        const newCount = prev + 1;
        const entry = {
          type,
          message,
          description: message, // Deskripsi bahasa Indonesia yang ramah & jelas
          details: JSON.stringify({
            visibilityState: typeof document !== 'undefined' ? document.visibilityState : 'unknown',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
            screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
          }),
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
    [maxViolations, zeroTolerance, onViolation, onLock, playAlarmSirene]
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

  // 5. Deteksi Window Blur (Tarik Notifikasi / Tekan Tombol Home / Geser Gesture HP)
  useEffect(() => {
    if (!enabled) return;

    const handleBlur = () => {
      // Pada HP Android/iOS, menekan tombol Home atau menarik notifikasi langsung memicu event window blur
      triggerViolation(
        'WINDOW_BLUR',
        'Fokus layar ujian hilang! Terdeteksi menekan tombol Home, menarik bilah notifikasi, atau berpindah aplikasi.'
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
      if (active) {
        hasEnteredFullscreenRef.current = true;
      } else if (hasEnteredFullscreenRef.current && isEnabledRef.current && !isLockedRef.current) {
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

      // Blok Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+A
      if (e.ctrlKey && ['C', 'V', 'X', 'A'].includes(e.key?.toUpperCase())) {
        e.preventDefault();
        return false;
      }
    };

    const handlePageHide = () => {
      if (!document.hidden) return;
      triggerViolation(
        'PAGE_HIDE',
        'Halaman ujian ditinggalkan atau aplikasi dipindahkan ke latar belakang.'
      );
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [enabled, triggerViolation]);

  const dismissWarning = useCallback(() => {
    setShowWarningModal(false);
    stopAlarmSirene();
    if (!document.fullscreenElement && enabled && !isLockedRef.current) {
      requestFullscreen();
    }
  }, [enabled, requestFullscreen, stopAlarmSirene]);

  // 8. Buka Kunci Pengawas (Supervisor PIN Unlock)
  const unlockSession = useCallback(
    (enteredPin) => {
      const cleanPin = String(enteredPin || '').trim().toUpperCase();
      if (!cleanPin) {
        return { success: false, message: 'Harap masukkan PIN Pengawas!' };
      }

      // Validasi terhadap PIN resmi: custom supervisorPin yang di-generate acak oleh sistem dan token ujian
      const currentUnlockPin = String(unlockPinRef.current || '').trim().toUpperCase();
      const currentAltPins = (altUnlockPinsRef.current || []).map((p) => String(p || '').trim().toUpperCase());

      const validPins = new Set([
        currentUnlockPin,
        ...currentAltPins,
      ].filter(Boolean));

      if (validPins.has(cleanPin)) {
        // Matikan suara sirene alarm
        stopAlarmSirene();

        setIsLocked(false);
        isLockedRef.current = false;
        setViolationCount(0);
        setShowWarningModal(false);

        // Kembalikan fullscreen dan wake lock
        requestFullscreen();
        requestWakeLock();

        if (typeof onUnlockRef.current === 'function') {
          onUnlockRef.current({
            pin: cleanPin,
            timestamp: new Date().toISOString(),
            message: 'Ujian berhasil dibuka kembali oleh pengawas/guru.',
          });
        }

        return { success: true };
      }

      return {
        success: false,
        message: 'PIN Pengawas tidak cocok! Hubungi Bapak/Ibu Pengawas di kelas.',
      };
    },
    [requestFullscreen, requestWakeLock, stopAlarmSirene]
  );

  return {
    violationCount,
    violationsCount: violationCount, // alias kompatibilitas
    violationList,
    isLocked,
    isFullscreen,
    hasUserInteracted,
    showWarningModal,
    lastWarningMsg,
    warningMessage: lastWarningMsg, // alias kompatibilitas
    wakeLockActive,
    requestFullscreen,
    requestWakeLock,
    playAlarmSirene,
    stopAlarmSirene,
    testAlarmAudio,
    dismissWarning,
    unlockSession,
    resetViolations: () => {
      stopAlarmSirene();
      setViolationCount(0);
      setIsLocked(false);
      isLockedRef.current = false;
      setShowWarningModal(false);
    },
  };
}
