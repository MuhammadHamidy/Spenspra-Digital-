'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { redirectToSsoLogin } from '@/lib/features/beranda/ssoHelper';

export default function PerpusNavbar({
  currentUser,
  setCurrentUser,
  router,
}) {
  return (
    <header className="relative w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 relative z-10">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-xs border border-slate-100 flex-shrink-0 p-0.5">
            <Image
              src="/image/logo_prambon.png"
              alt="Logo SMPN 1 Prambon"
              width={34}
              height={34}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <p className="font-bold text-[#0A1931] text-sm leading-tight">
              Perpustakaan SMPN 1 Prambon
            </p>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              Layanan Mandiri Perpustakaan
            </p>
          </div>
        </div>

        {/* Right Section: User Profile & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2.5">
              {(currentUser.roleName === 'PUSTAKAWAN' || currentUser.role === 'PUSTAKAWAN' || currentUser.roleName === 'SUPER_ADMIN') && (
                <Link
                  href="/pustakawan"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-all shadow-xs"
                >
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="hidden sm:inline">Dashboard Pustakawan</span>
                </Link>
              )}
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline px-2">
                {currentUser.fullName || currentUser.nama || 'Pengguna'}
              </span>
              <button
                type="button"
                onClick={() => {
                  tokenStorage.clear();
                  setCurrentUser(null);
                  router.refresh();
                }}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-red-600 text-xs font-semibold transition-all cursor-pointer"
                title="Keluar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
