'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import ProfileMenu from './ProfileMenu';
import { redirectToSsoLogin } from '@/lib/features/beranda/ssoHelper';

export default function Navbar({ user }) {
  const pathname = usePathname() || '/';
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    {
      name: 'Beranda',
      href: '/',
      isActive: (path) => path === '/',
    },
    {
      name: 'Bibliografi',
      href: '/bibliografi',
      isActive: (path) => path.startsWith('/bibliografi'),
    },
    {
      name: 'Bookmark',
      href: '/bookmark',
      isActive: (path) => path.startsWith('/bookmark'),
    },
    {
      name: 'Absensi',
      href: '/absensi',
      isActive: (path) => path.startsWith('/absensi') || path.startsWith('/riwayat-kunjungan'),
    },
    {
      name: 'Peminjaman Buku',
      href: '/peminjaman',
      isActive: (path) => path.startsWith('/peminjaman') || path.startsWith('/pinjam'),
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left: Logo SMPN 1 Prambon Sidoarjo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 relative flex-shrink-0">
            <Image
              src="/image/new_logo_prambon.png"
              alt="Logo SMPN 1 Prambon"
              width={48}
              height={48}
              className="w-full h-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
              priority
            />
          </div>
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => {
            const isActive = item.isActive(pathname);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm transition-colors relative py-2 ${
                  isActive
                    ? 'text-[#172033] font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#172033]'
                    : 'text-slate-600 hover:text-[#172033] font-medium'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right: Circular Account Icon (Frame.png) */}
        <div className="relative flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-10 h-10 rounded-full bg-[#1E2538] text-white hover:bg-[#141B2B] flex items-center justify-center overflow-hidden transition-all cursor-pointer focus:outline-none shadow-xs"
                title={user.nama || 'Akun Siswa'}
                aria-label="Menu Akun Siswa"
              >
                {user.foto ? (
                  <Image
                    src={user.foto}
                    alt={user.nama || 'Foto Siswa'}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </button>
              <ProfileMenu user={user} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => redirectToSsoLogin()}
              className="w-10 h-10 rounded-full bg-[#1E2538] text-white hover:bg-[#141B2B] flex items-center justify-center transition-all cursor-pointer shadow-xs focus:outline-none"
              title="Masuk Akun Siswa (SSO)"
              aria-label="Masuk Akun Siswa"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
