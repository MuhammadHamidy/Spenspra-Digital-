'use client';

import React, { useState, Suspense } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getRole } from '@/lib/access/portalAccess';
import Image from 'next/image';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import ConfirmModal from './ConfirmModal';

export default function AppLayoutWrapper({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = getRole(user);
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Pantau aktivitas & auto-logout setelah 15 menit idle
  useInactivityTimeout(() => {
    logout();
  });

  if (pathname === '/login' || (pathname === '/' && !user)) return children;

  // Untuk akun Guru dan Civitas Non-Super Admin: Tidak ada Sidebar dan tidak ada Navbar!
  if (!isSuperAdmin) {
    const isSiswa = role.includes('SISWA');
    const roleBadge = isSiswa
      ? 'Peserta Didik'
      : role.includes('KEPALA')
      ? 'Kepala Sekolah'
      : role === 'ADMIN_PERPUS' || role === 'PUSTAKAWAN'
      ? 'Admin Perpustakaan'
      : role === 'ADMIN_RAPOR'
      ? 'Admin e-Rapor'
      : 'Pendidik';

    return (
      <div className="min-h-screen bg-neutral-100 text-neutral-1000 font-sans flex flex-col">
        {/* Header Bersih & Minimalis Khusus Civitas Sesuai Design System */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-300 px-4 sm:px-6 lg:px-8 py-3.5 shadow-2xs">
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-white p-1 border border-neutral-300 shadow-2xs flex items-center justify-center shrink-0">
                <img
                  src="/image/new_logo_prambon.png"
                  alt="Logo SMPN 1 Prambon"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-primary-500 leading-tight tracking-tight">
                    SMP NEGERI 1 PRAMBON
                  </h1>
                  <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary-50 text-primary-700 border border-primary-100">
                    SSO PORTAL
                  </span>
                </div>
                <p className="text-[11px] font-medium text-neutral-500">
                  Pusat Layanan Ekosistem Digital Sekolah
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-neutral-1000 leading-tight">
                  {user?.fullName || user?.full_name || user?.username || 'Civitas Sekolah'}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="text-[10px] font-semibold text-primary-500 bg-primary-50 px-1.5 py-0.2 rounded">
                    {roleBadge}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {user?.nimNip || user?.nip || user?.nisn || 'Terverifikasi'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger-300/80 bg-white text-danger-500 hover:bg-danger-50 text-xs font-semibold transition shadow-2xs cursor-pointer"
                title="Keluar dari sesi Single Sign-On"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Keluar Sesi</span>
              </button>
            </div>
          </div>
        </header>

        <ConfirmModal
          isOpen={isLogoutConfirmOpen}
          title="Konfirmasi Keluar Sesi"
          message="Keluar dari sesi portal SSO SMPN 1 Prambon? Seluruh sesi aktif pada layanan sekolah akan diakhiri secara aman."
          confirmText="Ya, Keluar Sesi"
          cancelText="Batal"
          isDanger={true}
          onConfirm={logout}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />

        {/* Konten Utama Terpusat */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {children}
        </main>
      </div>
    );
  }

  // Tampilan Super Admin tetap menggunakan Sidebar dan Navbar lengkap
  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans relative">
      <Suspense fallback={<aside className="hidden md:block w-64 bg-white border-r border-slate-200 min-h-screen shrink-0" />}>
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}
