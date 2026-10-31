'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';

export default function Navbar({ onToggleMobileSidebar = () => {} }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    setCurrentDateStr(now.toLocaleDateString('id-ID', options));
  }, []);

  const getBreadcrumb = () => {
    if (pathname === '/pustakawan') return { section: 'Perpustakaan', sub: 'Dashboard Utama' };
    if (pathname.startsWith('/pustakawan/absensi')) return { section: 'Sirkulasi', sub: 'Riwayat Pengunjung' };
    if (pathname.startsWith('/pustakawan/peminjaman')) return { section: 'Sirkulasi', sub: 'Riwayat Peminjaman' };
    if (pathname.startsWith('/books/import')) return { section: 'Katalog Buku', sub: 'Import Data Massal' };
    if (pathname.startsWith('/books')) return { section: 'Katalog Buku', sub: 'Daftar & Barcode Eksemplar' };
    if (pathname.startsWith('/members')) return { section: 'Data Master', sub: 'Siswa & Guru Perpustakaan' };
    if (pathname.startsWith('/visitors')) return { section: 'Sirkulasi', sub: 'Riwayat Pengunjung' };
    if (pathname.startsWith('/loans/tracking')) return { section: 'Sirkulasi', sub: 'Tanggungan & Denda' };
    if (pathname.startsWith('/circulation')) return { section: 'Sirkulasi', sub: 'Riwayat Peminjaman' };
    if (pathname.startsWith('/pustakawan/akun') || pathname.startsWith('/profile')) return { section: 'Pengaturan', sub: 'Akun Pustakawan' };
    return { section: 'Perpustakaan', sub: 'SMPN 1 Prambon' };
  };

  const breadcrumb = getBreadcrumb();

  const displayName = user?.fullName || user?.full_name || user?.name || 'Pustakawan SMPN 1 Prambon';
  const roleName = user?.roleName || user?.role || 'Petugas Perpustakaan';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'PS';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 md:hidden cursor-pointer"
          aria-label="Buka Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium truncate">
          <Link href="/pustakawan" className="text-slate-500 hover:text-[#4B3B78] transition-colors truncate">
            {breadcrumb.section}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-[#4B3B78] font-bold truncate">{breadcrumb.sub}</span>
        </div>
      </div>

      {/* Right: Portal Link + Date Chip + User Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Portal SSO Link */}
        <a
          href={
            typeof window !== 'undefined' && window.location.hostname.includes('spenspra.com')
              ? 'https://sso.spenspra.com/dashboard'
              : typeof window !== 'undefined' && window.location.hostname.includes('spenspra.sch.id')
              ? 'https://sso.spenspra.sch.id/dashboard'
              : 'http://sso.localhost/dashboard'
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4B3B78]/20 bg-[#EDEAF5] text-[#4B3B78] hover:bg-[#DDD7ED] text-xs font-bold transition shadow-2xs"
          title="Kembali ke Portal Utama SSO SMPN 1 Prambon"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="hidden sm:inline">Portal Layanan SSO</span>
        </a>

        {/* Date Chip - e-Rapor style */}
        {currentDateStr && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
            <svg className="w-3.5 h-3.5 text-[#4B3B78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{currentDateStr}</span>
          </div>
        )}

        {/* User Profile Avatar & Name */}
        <Link
          href="/pustakawan/akun"
          title="Buka Profil & Akun Pustakawan"
          className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#4B3B78] text-white flex items-center justify-center font-bold text-xs shadow-2xs group-hover:bg-[#3D2E66] transition-colors overflow-hidden">
            {user?.avatar || user?.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar || user.photo} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-[#4B3B78] transition-colors max-w-[160px] truncate">
              {displayName}
            </p>
            <p className="text-[10px] text-slate-400 font-medium capitalize truncate">
              {roleName}
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}
