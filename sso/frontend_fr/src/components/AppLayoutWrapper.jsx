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

  if (pathname === '/login') return children;

  // Untuk akun Guru dan Civitas Non-Super Admin: Tidak ada Sidebar dan tidak ada Navbar!
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] text-[#172033] font-sans flex flex-col">
        {/* Header Bersih & Minimalis Khusus Guru/Civitas Sesuai DESIGN fix.md */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-6 sm:px-10 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white p-1 border border-[#E5E7EB] shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/image/new_logo_prambon.png"
                alt="Logo SMPN 1 Prambon"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#4B3B78] leading-tight tracking-tight">
                SMP NEGERI 1 PRAMBON
              </h1>
              <p className="text-[11px] font-medium text-[#667085]">
                Portal Layanan Sekolah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-[#172033] leading-tight">
                {user?.fullName || user?.full_name || user?.username || 'Guru Pengampu'}
              </p>
              <p className="text-[11px] text-[#667085]">
                {user?.nimNip || user?.nip || (role === 'SUPER_ADMIN' ? 'Super Admin' : 'Guru Pengampu')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#C0392B] hover:bg-[#FFF9F8] hover:border-[#F1B4AC] text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Keluar</span>
            </button>
          </div>
        </header>

        <ConfirmModal
          isOpen={isLogoutConfirmOpen}
          title="Konfirmasi Keluar Sesi"
          message="Keluar dari sesi portal SSO SMPN 1 Prambon? Seluruh sesi aktif akan diakhiri."
          confirmText="Ya, Keluar"
          cancelText="Batal"
          isDanger={true}
          onConfirm={logout}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />

        {/* Konten Utama Terpusat */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
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

