'use client';

import React, { useState, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';

export default function AppLayoutWrapper({ children }) {
  // Pantau aktivitas pengguna & auto-logout setelah 15 menit tidak aktif
  useInactivityTimeout();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname() || '';

  // Mode Ujian Kiosk (/ujian/[id]/run):
  // Sembunyikan Sidebar & Navbar secara total agar siswa tidak bisa mengakses Home, Notif, maupun navigasi lain
  const isCBTExamRunning = pathname.includes('/ujian/') && pathname.includes('/run');

  if (isCBTExamRunning) {
    return (
      <div className="min-h-screen w-full bg-neutral-900 flex flex-col font-sans select-none overflow-x-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans relative">
      <Suspense fallback={<aside className="hidden md:block w-64 bg-white border-r border-slate-200 min-h-screen shrink-0" />}>
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
