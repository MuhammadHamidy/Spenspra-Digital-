'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function AppLayoutWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';

  // Rute Portal Siswa & Publik (Desain e-Perpus Spenspra - Figma Frame.png s/d Frame-6.png)
  // Halaman-halaman ini memiliki Navbar dan Footer tersendiri, TIDAK menggunakan Sidebar Admin
  const isStudentPortalPage =
    pathname === '/' ||
    pathname.startsWith('/bibliografi') ||
    pathname.startsWith('/bookmark') ||
    pathname.startsWith('/peminjaman') ||
    pathname === '/absensi' ||
    pathname === '/akun' ||
    pathname === '/pinjam' ||
    pathname === '/kiosk' ||
    pathname === '/layanan-mandiri' ||
    pathname === '/perpus' ||
    pathname === '/pembelajaran' ||
    pathname.startsWith('/sso') ||
    pathname.startsWith('/docs') ||
    pathname === '/riwayat-kunjungan';

  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    tokenStorage.syncCookies();
    const user = tokenStorage.getUser();

    // Halaman admin pustakawan memerlukan login jika diakses langsung
    if (!user && !isStudentPortalPage && !isLoginPage) {
      setIsAuthenticated(false);
      setIsAuthChecked(true);
      router.replace('/login');
    } else if (user && isLoginPage) {
      setIsAuthenticated(true);
      setIsAuthChecked(true);
      router.replace('/pustakawan');
    } else {
      setIsAuthenticated(Boolean(user));
      setIsAuthChecked(true);
    }
  }, [pathname, isStudentPortalPage, isLoginPage, router]);

  // Loading state saat verifikasi awal
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-[#F6FAFD] text-[#0A1931] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-400">Memeriksa Akses...</p>
        </div>
      </div>
    );
  }

  // 1. Standalone layout untuk halaman Login
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col w-full font-sans">
        <main className="w-full flex-1 flex">{children}</main>
      </div>
    );
  }

  // 2. Standalone layout untuk Portal Siswa & Publik (Full Width, Desain Bersih Sesuai Figma)
  if (isStudentPortalPage) {
    return (
      <div className="min-h-screen bg-white text-slate-800 font-sans">
        <main className="w-full">{children}</main>
      </div>
    );
  }

  // 3. Layout Area Administrasi Pustakawan (dengan Sidebar & Navbar Admin)
  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-800 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
