'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { tokenStorage } from '@/lib/common/tokenStorage';
import ProfileModal from './ProfileModal';
import ConfirmModal from './ConfirmModal';

export default function Navbar({ onToggleMobileSidebar = () => {} }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [user, setUser] = useState(null);

  // Profile menu state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [modalTab, setModalTab] = useState('profile'); // 'profile' | 'password'

  const dropdownRef = useRef(null);

  // Sync user state and date
  useEffect(() => {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    setCurrentDateStr(now.toLocaleDateString('id-ID', options));

    const loadUser = () => {
      setUser(tokenStorage.getUser());
    };
    loadUser();

    // Listen to real-time profile updates
    const handleProfileUpdated = (e) => {
      if (e?.detail) {
        setUser(e.detail);
      } else {
        loadUser();
      }
    };

    window.addEventListener('user-profile-updated', handleProfileUpdated);
    window.addEventListener('storage', loadUser);

    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdated);
      window.removeEventListener('storage', loadUser);
    };
  }, []);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const getBreadcrumb = () => {
    if (pathname === '/') return { section: 'e-Rapor', sub: 'Ringkasan Utama' };
    if (pathname.startsWith('/sso/callback')) return { section: 'Autentikasi SSO', sub: 'Menyelesaikan Autentikasi' };
    if (pathname.startsWith('/penilaian/pts')) return { section: 'Penilaian', sub: 'Input Nilai USTS' };
    if (pathname.startsWith('/penilaian/uas')) return { section: 'Penilaian', sub: 'Input Nilai UAS (Coming Soon)' };
    if (pathname.startsWith('/admin/monitoring')) return { section: 'Monitoring', sub: 'Supervisi & Pengesahan' };
    if (pathname.startsWith('/wali-kelas')) return { section: 'Penilaian', sub: 'Wali Kelas' };
    if (pathname.includes('/attendance/session/')) return { section: 'Presensi', sub: 'Pemindai QR Kelas' };
    if (pathname.startsWith('/attendance/monitoring')) return { section: 'Presensi', sub: 'Monitoring Presensi' };
    if (pathname.startsWith('/attendance')) return { section: 'Presensi', sub: 'Daftar Sesi Kelas' };
    if (pathname.startsWith('/admin/import')) return { section: 'Administrasi', sub: 'Import Data' };
    if (pathname.startsWith('/admin/teachers')) return { section: 'Data Master', sub: 'Kelola Akun Guru' };
    if (pathname.startsWith('/admin/subjects')) return { section: 'Data Master', sub: 'Mata Pelajaran' };
    if (pathname.startsWith('/admin/schedule')) return { section: 'Data Master', sub: 'Pemetaan Jadwal' };
    if (pathname.startsWith('/admin/rekap')) return { section: 'Laporan', sub: 'Rekap Nilai' };
    if (pathname.startsWith('/students')) return { section: 'Data Master', sub: 'Data Siswa & Kartu QR' };
    if (pathname.startsWith('/profile')) return { section: 'Pengaturan', sub: 'Profil Akun' };
    return { section: 'e-Rapor', sub: 'SMP Negeri 1 Prambon' };
  };

  const breadcrumb = getBreadcrumb();
  const roleStr = String(user?.roleName || user?.role || user?.role_id || '').toUpperCase();
  const isKepalaSekolah = roleStr.includes('KEPALA');
  const isAdmin = roleStr.includes('ADMIN') || roleStr === 'SUPER_ADMIN';

  const displayName = user?.fullName || user?.full_name || (isKepalaSekolah ? 'Kepala Sekolah' : isAdmin ? 'Administrator Sekolah' : user?.username || 'Guru Pengampu');
  const displayNip = user?.nimNip || user?.nim_nip || user?.nip || (isKepalaSekolah ? 'Kepala Sekolah SMPN 1 Prambon' : isAdmin ? 'Akses Administrator' : 'Akses SSO Sekolah');
  const roleName = isKepalaSekolah ? 'Kepala Sekolah' : isAdmin ? 'Admin e-Rapor' : (user?.roleName || user?.role_name || 'Guru Pengampu');
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || (isKepalaSekolah ? 'KS' : 'GR');

  const handleOpenModal = (tab) => {
    setModalTab(tab);
    setIsModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    try {
      tokenStorage.clear();
      sessionStorage.clear();
      // Hapus data sesi, tapi PERTAHANKAN draf nilai & deskripsi capaian guru
      const PRESERVED_PREFIXES = ['spenspra_draft_', 'spenspra_pts_', 'spenspra_uas_', 'spenspra_topic_'];
      Object.keys(localStorage).forEach((key) => {
        if (!PRESERVED_PREFIXES.some((p) => key.startsWith(p))) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}
    setIsDropdownOpen(false);
    const isProd = typeof window !== 'undefined' && window.location.hostname.includes('spenspra.com');
    const isSch = typeof window !== 'undefined' && window.location.hostname.includes('spenspra.sch.id');
    const targetLogin = isProd
      ? 'https://sso.spenspra.com/login'
      : isSch
      ? 'https://sso.spenspra.sch.id/login'
      : (process.env.NEXT_PUBLIC_SSO_LOGIN_URL || 'http://sso.localhost/login');
    window.location.href = targetLogin;
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        {/* Left: Hamburger (Mobile) & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
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
            <span className="text-slate-900 font-semibold">{breadcrumb.sub}</span>
          </div>
        </div>

        {/* Right: Date & Interactive User Profile Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Date Chip */}
          {currentDateStr && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{currentDateStr}</span>
            </div>
          )}

          {/* User Profile Info Trigger (Clickable) */}
          <div className="relative pl-2 sm:pl-3 border-l border-slate-200" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100/80 active:bg-slate-200/70 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/20"
              title="Klik untuk membuka menu profil & kata sandi"
            >
              <div className="w-9 h-9 rounded-full bg-[#EDEAF5] group-hover:bg-[#B9B0D2]/40 text-[#4B3B78] border border-[#B9B0D2]/50 flex items-center justify-center shadow-xs transition-all duration-200 overflow-hidden">
                {user?.avatar || user?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar || user.photo} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-5 h-5 text-[#4B3B78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div className="hidden md:block text-left text-xs max-w-[160px]">
                <p className="font-semibold text-slate-800 leading-tight truncate group-hover:text-[#4B3B78] transition-colors">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {displayNip}
                </p>
              </div>
              {/* Chevron icon */}
              <svg
                className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 hidden sm:block ${
                  isDropdownOpen ? 'rotate-180 text-[#4B3B78]' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Floating Popover Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header User Card */}
                <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#193D9B] to-[#1E4DBD] text-white flex items-center justify-center shadow-sm overflow-hidden">
                      {user?.avatar || user?.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar || user.photo} alt="Profil" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate font-mono">
                        {displayNip}
                      </p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {roleName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="px-2 py-1.5 space-y-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenModal('profile')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-[#193D9B] hover:bg-blue-50/70 font-medium transition cursor-pointer text-left"
                  >
                    <svg className="w-4 h-4 text-[#193D9B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Update Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenModal('password')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-[#193D9B] hover:bg-blue-50/70 font-medium transition cursor-pointer text-left"
                  >
                    <svg className="w-4 h-4 text-[#193D9B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Ubah Password</span>
                  </button>

                  <Link
                    href="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-medium transition cursor-pointer text-left"
                  >
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Pengaturan Akun Lengkap</span>
                  </Link>
                </div>

                {/* Divider & Logout */}
                <div className="pt-1.5 border-t border-slate-100 px-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsLogoutConfirmOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-danger-500 hover:bg-danger-50 font-medium transition cursor-pointer text-left text-xs"
                  >
                    <svg className="w-4 h-4 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Interactive Profile & Password Modal */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTab={modalTab}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        title="Konfirmasi Keluar Sesi"
        message="Apakah Anda yakin ingin keluar dari sistem e-Rapor? Seluruh sesi aktif di peramban ini akan diakhiri."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        isDanger={true}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </>
  );
}
