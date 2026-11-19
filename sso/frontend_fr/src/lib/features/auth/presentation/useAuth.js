'use client';

import { useState, useEffect, useCallback } from 'react';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { loginUseCase, logoutUseCase } from '../application/loginUseCase';
import { useRouter, usePathname } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Memvalidasi apakah sesi token dan server backend benar-benar aktif
  const validateSession = useCallback(async () => {
    // Jika ada parameter logout=1 di halaman manapun (termasuk Beranda '/'), bersihkan seluruh sesi
    if (typeof window !== 'undefined' && window.location.search.includes('logout=1')) {
      try {
        tokenStorage.clear();
        sessionStorage.clear();
        localStorage.removeItem('perpusdig_auth_token');
        localStorage.removeItem('perpusdig_auth_user');
        localStorage.removeItem('spenspra_session_active');
        localStorage.removeItem('spenspra_last_activity');
        localStorage.removeItem('sso_auth_token');
        localStorage.removeItem('sso_auth_user');
        localStorage.removeItem('elearning_auth_token');
        localStorage.removeItem('elearning_auth_user');
        window.history.replaceState({}, '', pathname || '/');
      } catch (e) {}
      setUser(null);
      setLoading(false);
      return;
    }

    if (pathname === '/login') {
      const stored = tokenStorage.getUser();
      setUser(stored);
      setLoading(false);
      return;
    }

    const storedUser = tokenStorage.getUser();
    const token = tokenStorage.getToken();

    if (!storedUser || !token) {
      setUser(null);
      setLoading(false);
      if (pathname !== '/' && pathname !== '/kiosk') {
        router.replace('/login');
      }
      return;
    }

    setUser(storedUser);
    setLoading(false);
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
    setLoading(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/?logout=1';
    } else {
      router.replace('/?logout=1');
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
