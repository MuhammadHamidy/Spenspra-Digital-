'use client';

import { useEffect, useRef } from 'react';
import { tokenStorage } from '@/lib/common/tokenStorage';

// Sesi bertahan 8 Jam kerja aktif agar guru & siswa tidak terputus saat mengajar / ujian
const INACTIVITY_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

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
          const isSpenspra = typeof window !== 'undefined' && window.location.hostname.includes('spenspra.com');
          const isSch = typeof window !== 'undefined' && window.location.hostname.includes('spenspra.sch.id');
          const loginUrl = isSpenspra
            ? 'https://sso.spenspra.com/login?reason=inactivity&app=belajar'
            : isSch
            ? 'https://sso.spenspra.sch.id/login?reason=inactivity&app=belajar'
            : (process.env.NEXT_PUBLIC_SSO_LOGIN_URL ? `${process.env.NEXT_PUBLIC_SSO_LOGIN_URL}?reason=inactivity&app=belajar` : 'http://sso.localhost/login?reason=inactivity&app=belajar');
          window.location.href = loginUrl;
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
