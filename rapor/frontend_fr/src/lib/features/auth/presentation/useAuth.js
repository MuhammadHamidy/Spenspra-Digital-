'use client';

import { useState, useEffect, useCallback } from 'react';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { usePathname } from 'next/navigation';

const SSO_LOGIN_URL = process.env.NEXT_PUBLIC_SSO_LOGIN_URL;

function redirectToSSO() {
  if (typeof window === 'undefined') return;
  if (!SSO_LOGIN_URL) {
    console.error('NEXT_PUBLIC_SSO_LOGIN_URL belum dikonfigurasi.');
    return;
  }
  window.location.assign(SSO_LOGIN_URL);
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Memvalidasi apakah sesi token dan server backend benar-benar aktif
  const validateSession = useCallback(async () => {
    tokenStorage.syncCookies();
    const storedUser = tokenStorage.getUser();
    const token = tokenStorage.getToken();

    if (!storedUser || !token) {
      setUser(null);
      setLoading(false);
      if (pathname !== '/sso/callback' && pathname !== '/' && pathname !== '/kiosk') {
        redirectToSSO();
      }
      return;
    }

    // Sesi yang tersimpan sudah dibuat oleh login yang berhasil. Jangan
    // menunggu request tambahan saat startup; endpoint yang dipanggil halaman
    // akan menangani sesi yang sudah tidak valid.
    setUser(storedUser);
    setLoading(false);
  }, [pathname]);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  const login = async () => {
    tokenStorage.clear();
    redirectToSSO();
  };

  const logout = () => {
    setUser(null);
    tokenStorage.clear();
    setLoading(false);
    if (typeof window !== 'undefined') {
      const isProd = window.location.hostname.includes('spenspra.com');
      const isSch = window.location.hostname.includes('spenspra.sch.id');
      const ssoLogoutTarget = isProd
        ? 'https://sso.spenspra.com/login?logout=1'
        : isSch
        ? 'https://sso.spenspra.sch.id/login?logout=1'
        : (process.env.NEXT_PUBLIC_SSO_LOGIN_URL ? `${process.env.NEXT_PUBLIC_SSO_LOGIN_URL}?logout=1` : 'http://sso.localhost/login?logout=1');
      window.location.href = ssoLogoutTarget;
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
