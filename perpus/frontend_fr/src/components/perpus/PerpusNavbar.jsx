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
          {/* Tombol Kembali ke Portal Layanan SSO (Menu Kartu) */}
          <a
            href={
              typeof window !== 'undefined' && window.location.hostname.includes('spenspra.com')
                ? 'https://sso.spenspra.com/dashboard'
                : typeof window !== 'undefined' && window.location.hostname.includes('spenspra.sch.id')
                ? 'https://sso.spenspra.sch.id/dashboard'
                : 'http://sso.localhost/dashboard'
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs"
            title="Kembali ke Menu Pilihan Aplikasi"
          >
            <svg className="w-3.5 h-3.5 text-[#4B3B78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="hidden sm:inline">Portal Layanan</span>
          </a>

          {currentUser ? (
            <div className="flex items-center gap-2.5">
              {(currentUser.roleName === 'PUSTAKAWAN' || currentUser.role === 'PUSTAKAWAN' || currentUser.roleName === 'ADMIN_PERPUS' || currentUser.role === 'ADMIN_PERPUS' || currentUser.roleName === 'SUPER_ADMIN') && (
                <Link
                  href="/pustakawan"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4B3B78] text-white hover:bg-[#3D2E66] text-xs font-semibold transition-all shadow-xs"
                >
                  <svg className="w-3.5 h-3.5 text-[#F2C94C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="hidden sm:inline">Meja Pustakawan</span>
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
