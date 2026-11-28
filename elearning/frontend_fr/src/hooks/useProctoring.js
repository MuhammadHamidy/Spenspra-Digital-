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
  const unlockGraceUntilRef = useRef(0);
  // Tracking aktivitas zoom (pinch-zoom HP maupun Ctrl+ / Ctrl- / Ctrl+Scroll desktop)
  // agar zoom tidak dianggap sebagai pelanggaran WINDOW_BLUR / FULLSCREEN_EXIT / SPLIT_SCREEN
  const lastZoomAtRef = useRef(0);
  const lastDprRef = useRef(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);
  const lastViewportScaleRef = useRef(
    typeof window !== 'undefined' && window.visualViewport ? (window.visualViewport.scale || 1) : 1
  );
  const blurCheckTimerRef = useRef(null);
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
      if (Date.now() < unlockGraceUntilRef.current) return;

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
          'Terdeteksi membuka tab baru di browser atau berpindah ke jendela lain.'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, triggerViolation]);

  // 4b. Tracking Aktivitas Zoom (Pinch-Zoom HP & Ctrl+/Ctrl-/Ctrl+Scroll Desktop)
  // Mencegah false-positive pelanggaran saat siswa memperbesar soal/gambar
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const markZoomActivity = () => {
      lastZoomAtRef.current = Date.now();
    };

    const handleTouchZoom = (e) => {
      if (e.touches && e.touches.length >= 2) {
        markZoomActivity();
      }
    };

    const handleWheelZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        markZoomActivity();
      }
    };

    const handleKeyZoom = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['+', '=', '-', '_', '0'].includes(e.key)) {
        markZoomActivity();
      }
    };

    const handleVisualViewportResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const currentScale = vv.scale || 1;
      if (Math.abs(currentScale - lastViewportScaleRef.current) > 0.02 || currentScale > 1.05) {
        markZoomActivity();
      }
      lastViewportScaleRef.current = currentScale;
    };

    const handleDprResize = () => {
      const currentDpr = window.devicePixelRatio || 1;
      if (Math.abs(currentDpr - lastDprRef.current) > 0.02) {
        markZoomActivity();
        lastDprRef.current = currentDpr;
      }
    };

    window.addEventListener('touchstart', handleTouchZoom, { passive: true });
    window.addEventListener('touchmove', handleTouchZoom, { passive: true });
    window.addEventListener('wheel', handleWheelZoom, { passive: true });
    window.addEventListener('keydown', handleKeyZoom, { passive: true });
    window.addEventListener('resize', handleDprResize, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize, { passive: true });
    }

    return () => {
      window.removeEventListener('touchstart', handleTouchZoom);
      window.removeEventListener('touchmove', handleTouchZoom);
      window.removeEventListener('wheel', handleWheelZoom);
      window.removeEventListener('keydown', handleKeyZoom);
      window.removeEventListener('resize', handleDprResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
    };
  }, [enabled]);

  // 5. Deteksi Window Blur (Tarik Notifikasi / Tekan Tombol Home / Geser Gesture HP)
  useEffect(() => {
    if (!enabled) return;

    const handleBlur = () => {
      if (blurCheckTimerRef.current) {
        clearTimeout(blurCheckTimerRef.current);
      }
      // Tunggu 220ms agar tidak salah tangkap blur sesaat akibat zoom browser / pinch-zoom
      blurCheckTimerRef.current = setTimeout(() => {
        if (!isEnabledRef.current || isLockedRef.current) return;
        const isRecentZoom = Date.now() - lastZoomAtRef.current < 1600;
        const isPinchZoomed = Boolean(
          typeof window !== 'undefined' &&
          window.visualViewport &&
          window.visualViewport.scale > 1.05
        );
        // Jika tab masih terlihat dan baru saja melakukan zoom, abaikan blur sesaat
        if (!document.hidden && (isRecentZoom || isPinchZoomed)) {
          return;
        }
        triggerViolation(
          'WINDOW_BLUR',
          'Layar ujian tertutup sementara karena muncul notifikasi lain, menarik menu atas HP, menekan tombol Home, atau berpindah aplikasi.'
        );
      }, 220);
    };

    const handleFocus = () => {
      // Jika fokus langsung kembali dalam <220ms (misal popup zoom browser), batalkan pelanggaran blur
      if (blurCheckTimerRef.current && Date.now() - lastZoomAtRef.current < 1600) {
        clearTimeout(blurCheckTimerRef.current);
        blurCheckTimerRef.current = null;
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      if (blurCheckTimerRef.current) {
        clearTimeout(blurCheckTimerRef.current);
        blurCheckTimerRef.current = null;
      }
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, triggerViolation]);

  // 6. Deteksi Fullscreen Change (Aman terhadap Zoom)
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
        // Jika keluar fullscreen sesaat murni karena gestur pinch-zoom / zoom browser sementara siswa tetap di halaman ujian
        const isRecentZoom = Date.now() - lastZoomAtRef.current < 1600;
        const isPinchZoomed = Boolean(
          typeof window !== 'undefined' &&
          window.visualViewport &&
          window.visualViewport.scale > 1.05
        );
        if (!document.hidden && document.hasFocus() && (isRecentZoom || isPinchZoomed)) {
          return;
        }
        triggerViolation(
          'FULLSCREEN_EXIT',
          'Keluar dari mode layar penuh (fullscreen) aplikasi ujian.'
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

  // 6b. Deteksi Layar Belah (Split-Screen / Multi-Window / Floating Pop-Up View)
  // Bekerja di Android, iPad, dan Desktop; aman terhadap Zoom & Keyboard HP
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const isEditableFocused = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = (el.tagName || '').toUpperCase();
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable === true;
    };

    const detectSplitScreen = () => {
      if (!isEnabledRef.current || isLockedRef.current) return;
      if (Date.now() < unlockGraceUntilRef.current) return;
      if (document.hidden) return;

      // Jangan salah deteksi saat pengguna sedang pinch-zoom atau baru saja mengubah zoom browser
      const vvScale = window.visualViewport ? (window.visualViewport.scale || 1) : 1;
      if (vvScale > 1.05 || Date.now() - lastZoomAtRef.current < 1600) {
        return;
      }

      const scrW = window.screen?.width || 0;
      const scrH = window.screen?.height || 0;
      const availW = window.screen?.availWidth || scrW;
      const availH = window.screen?.availHeight || scrH;
      if (!scrW || !scrH) return;

      const isTouchDevice =
        (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
        (navigator.maxTouchPoints || 0) > 0;
      const screenMax = Math.max(scrW, scrH);
      const screenMin = Math.min(scrW, scrH);
      const isMobileOrTablet = isTouchDevice && screenMin <= 1024;

      if (isMobileOrTablet) {
        // Di HP / Tablet (Android & iPad):
        // innerWidth & innerHeight akurat mencerminkan ukuran jendela Split-Screen / Pop-Up View
        const winW = window.innerWidth || 0;
        const winH = window.innerHeight || 0;
        if (!winW || !winH) return;

        const winMax = Math.max(winW, winH);
        const winMin = Math.min(winW, winH);

        if (isEditableFocused()) {
          // Keyboard HP sedang terbuka (mengurangi tinggi layar), cek lebar horizontal saja
          const isPortrait = scrH >= scrW;
          const expectedWidth = isPortrait ? screenMin : screenMax;
          if (winW < expectedWidth * 0.78) {
            triggerViolation(
              'SPLIT_SCREEN',
              'Terdeteksi menggunakan mode layar belah (Split-Screen) atau jendela mengambang (Pop-Up View). Tutup layar belah untuk melanjutkan ujian.'
            );
          }
          return;
        }

        // Normal HP/Tablet (termasuk address bar & navigation bar):
        // sisi terpanjang >= 72% screenMax dan sisi terpendek >= 75% screenMin
        // Split-Screen 50/50 atau 65/35 atau Pop-Up View akan jatuh di bawah ambang ini
        if (winMax < screenMax * 0.72 || winMin < screenMin * 0.75) {
          triggerViolation(
            'SPLIT_SCREEN',
            'Terdeteksi menggunakan mode layar belah (Split-Screen) atau jendela mengambang (Pop-Up View). Tutup layar belah untuk melanjutkan ujian.'
          );
        }
      } else {
        // Di Desktop / Laptop (Windows Snap, macOS Split View, atau jendela diperkecil):
        // Gunakan outerWidth / outerHeight karena rasio terhadap screen.availWidth/availHeight
        // TIDAK berubah saat user melakukan zoom browser (Ctrl+ / Ctrl-).
        const winW = window.outerWidth > 0 ? window.outerWidth : window.innerWidth;
        const winH = window.outerHeight > 0 ? window.outerHeight : window.innerHeight;
        if (!winW || !winH || !availW || !availH) return;

        if (winW < availW * 0.78 || winH < availH * 0.72) {
          triggerViolation(
            'SPLIT_SCREEN',
            'Terdeteksi menggunakan layar belah (Split-Screen) atau mengecilkan jendela browser. Maksimalkan jendela browser untuk melanjutkan ujian.'
          );
        }
      }
    };

    let resizeDebounce = null;
    const handleResizeForSplit = () => {
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(detectSplitScreen, 350);
    };

    // Cek awal saat masuk ujian (menangkap siswa yang SUDAH layar belah sebelum mulai)
    const initialTimer = setTimeout(detectSplitScreen, 600);
    // Cek berkala setiap 2.5 detik (menangkap layar belah yang masih aktif setelah unlock)
    const intervalTimer = setInterval(detectSplitScreen, 2500);

    window.addEventListener('resize', handleResizeForSplit);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      if (resizeDebounce) clearTimeout(resizeDebounce);
      window.removeEventListener('resize', handleResizeForSplit);
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

        // Beri jeda 2.5 detik setelah buka kunci agar transisi keyboard/fullscreen di Mi Browser tidak langsung mengunci ulang
        unlockGraceUntilRef.current = Date.now() + 2500;

        setIsLocked(false);
        isLockedRef.current = false;
        setViolationCount(0);
        setShowWarningModal(false);

        // Kembalikan wake lock (fullscreen hanya dipicu manual atau aman tanpa rotasi paksa)
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
