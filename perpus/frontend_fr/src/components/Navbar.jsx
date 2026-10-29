'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const getBreadcrumb = () => {
    if (pathname === '/pustakawan' || pathname === '/pustakwan' || pathname === '/') return { section: 'Dashboard Pustakawan', sub: 'Administrasi' };
    if (pathname.startsWith('/books/import')) return { section: 'Import Data Buku', sub: 'Batch Excel' };
    if (pathname.startsWith('/books')) return { section: 'Daftar Buku', sub: 'Manajemen Koleksi' };
    if (pathname.startsWith('/members')) return { section: 'Data Siswa & Guru', sub: 'Anggota Perpustakaan' };
    if (pathname.startsWith('/visitors')) return { section: 'Tracking Pengunjung', sub: 'Presensi & Keperluan' };
    if (pathname.startsWith('/loans/tracking')) return { section: 'Tanggungan & Denda', sub: 'Pemantauan Terlambat' };
    if (pathname.startsWith('/circulation')) return { section: 'Laporan Peminjaman', sub: 'Sirkulasi' };
    if (pathname.startsWith('/profile')) return { section: 'Profil Akun', sub: 'Pengaturan' };
    return { section: 'Admin Panel', sub: 'Perpustakaan' };
  };

  const breadcrumb = getBreadcrumb();

  const getInitials = (name) => {
    if (!name) return 'A';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
        <Link href="/pustakawan" className="hover:text-blue-600 transition-colors">
          {breadcrumb.section}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-semibold">{breadcrumb.sub}</span>
      </div>

      {/* Right: Search + Notifications + User Avatar */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Search Bar */}
        <div className="relative hidden md:block w-72">
          <input
            type="text"
            placeholder="Cari buku atau data..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Notification Bell with Badge */}
        <button
          title="Notifikasi Sistem"
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* User Profile Avatar with Online Badge */}
        <Link
          href="/pustakawan/akun"
          title="Buka Profil & Akun Pustakawan"
          className="flex items-center gap-3 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#193D9B] to-[#1E4DBD] text-white flex items-center justify-center shadow-xs overflow-hidden group-hover:ring-2 group-hover:ring-blue-400">
            {user?.avatar || user?.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar || user.photo} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
              {user?.fullName?.replace(/Prambon/gi, 'Prambon') || 'Pustakawan SMPN 1 Prambon'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Pustakawan
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}
