'use client';

import React, { useState, Suspense } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';

export default function AppLayoutWrapper({ children }) {
  // Pantau aktivitas pengguna & auto-logout setelah 15 menit tidak aktif
  useInactivityTimeout();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
