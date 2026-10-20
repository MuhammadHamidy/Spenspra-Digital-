'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import ProfileMenu from './ProfileMenu';
import { redirectToSsoLogin } from '@/lib/features/beranda/ssoHelper';

export default function Navbar({ user }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Beranda', href: '/' },
    { name: 'Bibliografi', href: '/bibliografi' },
    { name: 'Bookmark', href: '/bookmark' },
    { name: 'Absensi', href: '/kiosk' },
    { name: 'Peminjaman Buku', href: '/pinjam' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left: Logo SMPN 1 Prambon */}
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
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors relative py-2 ${
                  isActive
                    ? 'text-[#4B3B78] font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#4B3B78]'
                    : 'text-slate-600 hover:text-[#4B3B78]'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right: User Profile or Login Button */}
        <div className="relative flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-10 h-10 rounded-full border-2 border-slate-200 hover:border-[#4B3B78] flex items-center justify-center overflow-hidden transition-all cursor-pointer focus:outline-none"
                title={user.nama}
              >
                {user.foto ? (
                  <Image
                    src={user.foto}
                    alt={user.nama}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-6 h-6 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                )}
              </button>
              <ProfileMenu user={user} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => redirectToSsoLogin()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4B3B78] hover:bg-[#3D2E66] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Masuk SSO</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
