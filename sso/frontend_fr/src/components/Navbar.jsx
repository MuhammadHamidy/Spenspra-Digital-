'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getRole } from '@/lib/access/portalAccess';
import ConfirmModal from './ConfirmModal';

export default function Navbar({ onToggleMobileSidebar = () => {} }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = getRole(user);
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  // Menutup dropdown ketika klik di luar elemen
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getBreadcrumb = () => {
    if (pathname === '/superadmin') return { section: 'Panel Super Admin', sub: 'Pusat Kendali Ekosistem' };
    if (pathname === '/dashboard') return { section: 'Portal Civitas', sub: 'Layanan Sekolah' };
    if (pathname === '/') return { section: 'SSO Spenspra', sub: 'Beranda' };
    if (pathname.startsWith('/admin/master-data')) return { section: 'Panel Admin', sub: 'Data Master' };
    if (pathname.startsWith('/admin/app-access')) return { section: 'Panel Admin', sub: 'Akses Aplikasi' };
    if (pathname.startsWith('/admin/import')) return { section: 'Panel Admin', sub: 'Import Excel' };
    if (pathname.startsWith('/admin/audit-log')) return { section: 'Panel Admin', sub: 'Audit Log' };
    if (pathname.startsWith('/students')) return { section: 'Layanan Identitas', sub: 'Kartu QR / Barcode' };
    if (pathname.startsWith('/profile')) return { section: 'Akun', sub: 'Profil Pengguna' };
    if (pathname.startsWith('/docs')) return { section: 'Bantuan', sub: 'Dokumentasi SSO' };
    return { section: 'SSO Spenspra', sub: 'SMP Negeri 1 Prambon' };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Hamburger (mobile) + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4B3B78] cursor-pointer"
          aria-label="Buka Menu Navigasi"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-[#4B3B78] transition-colors font-medium">
            {breadcrumb.section}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold truncate max-w-[150px] sm:max-w-none">{breadcrumb.sub}</span>
        </div>
      </div>

      {/* Right: User Profile Button with Dropdown Menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
          className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer border border-transparent hover:border-slate-200 focus:outline-none"
          title="Buka Menu Profil & Akun"
        >
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {user?.fullName || user?.full_name || user?.username || 'Pengguna'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              {role === 'SUPER_ADMIN' ? 'Super Administrator' : role}
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EDEAF5] text-[#4B3B78] border border-[#B9B0D2]/60 shadow-2xs overflow-hidden shrink-0">
            {user?.avatar || user?.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar || user.photo} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-5 h-5 text-[#4B3B78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>

          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180 text-slate-700' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* PROFILE DROPDOWN MENU */}
        {isProfileDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
            {/* Header Profil Dropdown */}
            <div className="px-4 py-3 border-b border-slate-100 bg-[#FAF9FD]/60">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user?.fullName || user?.full_name || user?.username || 'Pengguna SSO'}
              </p>
              <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                {user?.nimNip || user?.nip || user?.username || '-'}
              </p>
              <div className="mt-1.5">
                <span className="rounded-full bg-[#EDEAF5] px-2.5 py-0.5 text-[10px] font-bold text-[#30264F] uppercase tracking-wider border border-[#7C6FA0]/20">
                  {role === 'SUPER_ADMIN' ? 'Super Administrator' : role}
                </span>
              </div>
            </div>

            {/* Menu Links */}
            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setIsProfileDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-[#FAF9FD] hover:text-[#4B3B78] transition"
              >
                <span className="text-sm">👤</span>
                <div>
                  <div className="font-semibold">Profil & Keamanan Akun</div>
                  <div className="text-[10px] text-slate-400">Atur sandi & data diri</div>
                </div>
              </Link>

              {Boolean(user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN' || user?.roleName === 'ADMIN_PERPUS') && (
                <Link
                  href="/students"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-[#FAF9FD] hover:text-[#4B3B78] transition"
                >
                  <span className="text-sm">🪪</span>
                  <div>
                    <div className="font-semibold">Kelola Barcode Digital</div>
                    <div className="text-[10px] text-slate-400">Prambon barcode token</div>
                  </div>
                </Link>
              )}
            </div>

            {/* Tombol Logout Sesi */}
            <div className="border-t border-slate-100 pt-1 mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsProfileDropdownOpen(false);
                  setIsLogoutConfirmOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-danger-500 hover:bg-danger-50 hover:text-danger-700 transition cursor-pointer text-left"
              >
                <svg className="w-4 h-4 text-danger-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Keluar Sesi (Logout)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        title="Konfirmasi Keluar Sesi"
        message="Apakah Anda yakin ingin keluar dari Single Sign-On (SSO)? Seluruh akses portal sekolah aktif akan diakhiri."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        isDanger={true}
        onConfirm={logout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </header>
  );
}

