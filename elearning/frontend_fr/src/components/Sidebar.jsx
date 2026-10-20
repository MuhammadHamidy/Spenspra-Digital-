'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { tokenStorage } from '@/lib/common/tokenStorage';
import ConfirmModal from '@/components/ConfirmModal';

function SidebarContent({ mobileOpen = false, onCloseMobile = () => {} }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [openSubMenus, setOpenSubMenus] = useState({
    lms: true,
    cbt: true,
  });

  const toggleSubMenu = (menuKey) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  useEffect(() => {
    const currentUser = tokenStorage.getUser();
    setUser(currentUser);
  }, []);

  const role = String(user?.roleName || user?.role || user?.role_name || '').toUpperCase();
  const isSiswa = role.includes('SISWA') || role.includes('STUDENT');
  const isAdmin = role.includes('ADMIN') || role === 'SUPER_ADMIN';
  const isKepalaSekolah = role.includes('KEPALA');
  const isGuru = !isAdmin && !isKepalaSekolah && !isSiswa;

  // Helper check status aktif
  const isItemActive = (item) => {
    if (item.subItems) {
      return item.subItems.some((sub) => pathname === sub.href);
    }
    if (item.href === '/') return pathname === '/';
    return pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  };

  const isSubItemActive = (sub) => pathname === sub.href;

  // ================= 1. MENU SISWA =================
  const studentMenuSections = [
    {
      section: 'Portal Belajar Siswa',
      items: [
        {
          label: 'Dashboard Belajar',
          href: '/',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          label: 'Materi Pelajaran',
          href: '/materi',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          label: 'Tugas & PR Siswa',
          href: '/tugas',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
        },
        {
          label: 'e-Ujian (CBT Online)',
          href: '/ujian',
          badge: 'Anti-Cheat',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
      ],
    },
  ];

  // ================= 2. MENU GURU =================
  const teacherMenuSections = [
    {
      section: 'Utama',
      items: [
        {
          label: 'Dashboard Guru',
          href: '/',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
      ],
    },
    {
      section: 'Manajemen Belajar (LMS)',
      items: [
        {
          label: 'Kelola Materi Kelas',
          href: '/guru/materi',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          label: 'Bank Tugas & Penilaian',
          href: '/guru/tugas',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
        },
      ],
    },
    {
      section: 'e-Ujian & Anti-Cheat (CBT)',
      items: [
        {
          label: 'Bank Soal & Jadwal Ujian',
          href: '/guru/ujian',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          label: 'Live Proctoring Monitor',
          href: '/guru/monitoring',
          badge: 'Live',
          badgeColor: 'bg-[#C0392B] text-white',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ),
        },
      ],
    },
  ];

  // ================= 3. MENU ADMINISTRATOR =================
  const adminMenuSections = [
    {
      section: 'Utama',
      items: [
        {
          label: 'Dashboard Admin LMS',
          href: '/',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
      ],
    },
    {
      section: 'Supervisi LMS & CBT',
      items: [
        {
          label: 'Bank Materi Sekolah',
          href: '/guru/materi',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          label: 'Bank Tugas Sekolah',
          href: '/guru/tugas',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
        },
        {
          label: 'Jadwal & Bank Ujian',
          href: '/guru/ujian',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          label: 'Live Proctoring Anti-Cheat',
          href: '/guru/monitoring',
          badge: 'Anti-Cheat',
          badgeColor: 'bg-[#C0392B] text-white',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ),
        },
      ],
    },
  ];

  let menuSections = isSiswa ? studentMenuSections : isAdmin || isKepalaSekolah ? adminMenuSections : teacherMenuSections;

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const executeLogout = () => {
    try {
      tokenStorage.clear();
      sessionStorage.clear();
      localStorage.clear();
    } catch (e) {}
    const isProd = typeof window !== 'undefined' && window.location.hostname.includes('spenspra.com');
    const isSch = typeof window !== 'undefined' && window.location.hostname.includes('spenspra.sch.id');
    const targetLogin = isProd ? 'https://sso.spenspra.com/login' : isSch ? 'https://sso.spenspra.sch.id/login' : (process.env.NEXT_PUBLIC_SSO_LOGIN_URL || 'http://sso.localhost/login');
    window.location.href = targetLogin;
  };

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-neutral-1000/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 md:z-30 w-64 bg-white text-neutral-800 flex flex-col justify-between min-h-screen shrink-0 select-none border-r border-neutral-200 shadow-xl md:shadow-xs transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="overflow-y-auto flex-1">
          {/* Header Branding */}
          <div className="px-4 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-primary-50/50 to-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-[8px] bg-white p-1 shadow-xs border border-neutral-200 flex items-center justify-center shrink-0">
                <Image
                  src="/image/new_logo_prambon.png"
                  alt="Logo SMP Negeri 1 Prambon"
                  width={36}
                  height={36}
                  className="object-contain w-full h-full"
                  priority
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-primary-500 font-bold text-sm tracking-tight leading-tight truncate">
                  SMPN 1 PRAMBON
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse"></span>
                  <p className="text-[11px] font-semibold text-neutral-600 truncate">
                    Spenspra Belajar
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-[6px] text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-4">
            {menuSections.map((sec, idx) => (
              <div key={idx}>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  {sec.section}
                </p>
                <div className="space-y-1">
                  {sec.items.map((item) => {
                    const active = isItemActive(item);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-[8px] text-xs font-medium transition-all group ${
                          active
                            ? 'bg-primary-500 text-white font-semibold shadow-xs'
                            : 'text-neutral-700 hover:text-primary-600 hover:bg-primary-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`shrink-0 transition-colors ${
                              active ? 'text-white' : 'text-neutral-400 group-hover:text-primary-500'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-[999px] ${
                              item.badgeColor || 'bg-accent-500 text-neutral-900'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer User Info & Logout */}
        <div className="p-3 border-t border-neutral-200 bg-neutral-50/70 space-y-2">
          <div className="bg-white p-2.5 rounded-[8px] border border-neutral-200/80 shadow-xs flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 font-bold text-xs ${
                isSiswa
                  ? 'bg-secondary-100 text-secondary-600'
                  : isAdmin
                  ? 'bg-purple-100 text-primary-500'
                  : 'bg-accent-100 text-amber-700'
              }`}
            >
              {isSiswa ? 'SW' : isAdmin ? 'AD' : 'GR'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-800 truncate">
                {user?.fullName || user?.full_name || user?.username || (isSiswa ? 'Siswa Belajar' : 'Guru Pengampu')}
              </p>
              <p className="text-[10px] text-neutral-500 truncate">
                {isSiswa ? `Kelas ${user?.className || user?.class_name || '7A'}` : role || 'Pengajar'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[8px] text-xs font-semibold text-danger-500 hover:bg-danger-50 transition-colors cursor-pointer border border-transparent hover:border-danger-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      <ConfirmModal
        isOpen={showLogoutModal}
        title="Konfirmasi Keluar Sesi"
        message="Apakah Anda yakin ingin keluar dari Spenspra Belajar?"
        confirmLabel="Ya, Keluar"
        cancelLabel="Batal"
        type="danger"
        onConfirm={executeLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
}

export default function Sidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  return (
    <Suspense fallback={<aside className="hidden md:block w-64 bg-white border-r border-neutral-200 min-h-screen shrink-0" />}>
      <SidebarContent mobileOpen={mobileOpen} onCloseMobile={onCloseMobile} />
    </Suspense>
  );
}
