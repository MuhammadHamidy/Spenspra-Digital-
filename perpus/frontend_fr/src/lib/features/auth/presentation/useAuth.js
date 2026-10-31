'use client';

import { useState, useEffect, useCallback } from 'react';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { httpClient } from '@/lib/common/httpClient';
import { loginUseCase, logoutUseCase } from '../application/loginUseCase';
import { useRouter, usePathname } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Memvalidasi apakah sesi token dan server backend benar-benar aktif
  const validateSession = useCallback(async () => {
    tokenStorage.syncCookies();
    const storedUser = tokenStorage.getUser();
    const token = tokenStorage.getToken();

    if (!storedUser || !token) {
      setUser(null);
      setLoading(false);
      // Jika mencoba mengakses rute terproteksi (bukan login, bukan root /perpus /layanan-mandiri)
      if (pathname !== '/login' && pathname !== '/' && pathname !== '/perpus' && pathname !== '/layanan-mandiri' && pathname !== '/kiosk') {
        router.replace('/login');
      }
      return;
    }

    try {
      // Tes koneksi langsung ke backend
      await httpClient.get('/roles', { cache: 'no-store' });
      setUser(storedUser);
      if (pathname === '/login') {
        router.replace('/');
      }
    } catch (err) {
      console.warn('[useAuth] Backend tidak merespons atau sesi tidak valid:', err.message);
      // Hapus sesi lokal karena backend mati atau token tidak valid
      tokenStorage.clear();
      setUser(null);
      if (pathname !== '/login' && pathname !== '/' && pathname !== '/perpus' && pathname !== '/layanan-mandiri' && pathname !== '/kiosk') {
        router.replace('/login?error=backend_offline');
      }
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await loginUseCase(username, password);
      setUser(res.user);
      return res;
    } catch (err) {
      tokenStorage.clear();
      setUser(null);
      const errStr = (err?.message || '').toLowerCase();
      if (errStr.includes('fetch') || errStr.includes('network') || errStr.includes('koneksi') || errStr.includes('failed to fetch')) {
        throw new Error('Gagal terhubung ke server backend (Server Offline). Pastikan server backend Go API sudah dijalankan di port 8080.');
      }
      throw new Error(err.message || 'Login gagal. Periksa kembali NIP/Username dan Kata Sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    logoutUseCase();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    } else {
      router.replace('/login');
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
