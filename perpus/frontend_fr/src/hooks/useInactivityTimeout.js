'use client';

import { useEffect, useRef } from 'react';
import { tokenStorage } from '@/lib/common/tokenStorage';

// 15 Menit tidak ada interaksi pengguna -> Auto Logout
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 1000;

export function useInactivityTimeout(onTimeout) {
  const lastThrottleRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Pastikan ada sesi aktif
    const token = tokenStorage.getToken();
    if (!token) return;

    tokenStorage.recordActivity();

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle pencatatan aktivitas maksimal sekali tiap 5 detik
      if (now - lastThrottleRef.current > 5000) {
        lastThrottleRef.current = now;
        tokenStorage.recordActivity();
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    const intervalId = setInterval(() => {
      const currentToken = tokenStorage.getToken();
      if (!currentToken) return;

      const lastActivity = tokenStorage.getLastActivity();
      if (lastActivity > 0 && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
        // Hapus total seluruh sesi
        tokenStorage.clear();
        if (typeof onTimeout === 'function') {
          onTimeout();
        } else {
          window.location.href = 'http://sso.localhost/login?reason=inactivity';
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(intervalId);
    };
  }, [onTimeout]);
}
