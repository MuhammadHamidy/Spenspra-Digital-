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
  const isKioskPage = pathname === '/kiosk';
  const isPerpusPage = pathname === '/perpus';
  const isRootPage = pathname === '/';
  const isPublicPage = isLoginPage || isKioskPage || isPerpusPage || isRootPage;
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    tokenStorage.syncCookies();
    const user = tokenStorage.getUser();

    if (!user && !isPublicPage) {
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
  }, [pathname, isPublicPage, isLoginPage, router]);

  // Loading state before initial auth check finishes
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-[#F6FAFD] text-[#0A1931] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-400">Memeriksa Akses...</p>
        </div>
      </div>
    );
  }

  // Redirecting unauthenticated user from protected page to login
  if (!isAuthenticated && !isPublicPage) {
    return (
      <div className="min-h-screen bg-[#F6FAFD] text-[#0A1931] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-400">Mengarahkan ke Halaman Login...</p>
        </div>
      </div>
    );
  }

  // Redirecting authenticated user from login page to dashboard
  if (isAuthenticated && isLoginPage) {
    return (
      <div className="min-h-screen bg-[#F6FAFD] text-[#0A1931] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-400">Mengarahkan ke Dashboard...</p>
        </div>
      </div>
    );
  }

  // Standalone layout for login page (unauthenticated) - full screen for split view
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col w-full font-sans">
        <main className="w-full flex-1 flex">{children}</main>
      </div>
    );
  }

  // Standalone full-width layout for Layanan Mandiri screen (root page / or /perpus or legacy /kiosk)
  if (isKioskPage || isPerpusPage || isRootPage) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0A1931] font-sans">
        <main className="w-full">{children}</main>
      </div>
    );
  }

  // Main app layout for authenticated user (Librarian / Admin) - matching LibSystem Pro screenshot
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

