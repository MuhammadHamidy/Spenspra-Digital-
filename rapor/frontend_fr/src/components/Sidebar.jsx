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

  // State untuk mengontrol dropdown sub-menu yang terbuka
  const [openSubMenus, setOpenSubMenus] = useState({
    monitoring: true,
    penilaian: true,
    supervisi: true,
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

  const role = String(user?.roleName || user?.role || '').toUpperCase();
  const isAdmin = role.includes('ADMIN') || role === 'SUPER_ADMIN';
  const isKepalaSekolah = role.includes('KEPALA');
  const isGuru = !isAdmin && !isKepalaSekolah;
  const isWalas = isAdmin || isKepalaSekolah || Boolean(user?.className || user?.class_name);

  const currentTab = searchParams ? searchParams.get('tab') : null;

  // Helper check status aktif
  const isItemActive = (item) => {
    if (item.subItems) {
      return item.subItems.some((sub) => isSubItemActive(sub));
    }
    if (item.href === '/') return pathname === '/';
    return pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  };

  const isSubItemActive = (sub) => {
    if (sub.tab) {
      const activeTabName = currentTab ? currentTab.toUpperCase() : 'TEACHERS';
      return pathname.startsWith('/admin/monitoring') && activeTabName === sub.tab.toUpperCase();
    }
    return pathname === sub.href;
  };

  // Menu untuk GURU
  const teacherMenuSections = [
    {
      section: 'Utama',
      items: [
        {
          label: 'Dashboard',
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
      section: 'Penilaian Guru',
      items: [
        {
          key: 'penilaian',
          label: 'Penilaian Siswa',
          href: '/penilaian/pts',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          subItems: [
            {
              label: 'Input Nilai USTS',
              href: '/penilaian/pts',
            },
            {
              label: 'Input Nilai UAS',
              href: '/penilaian/uas',
            },
          ],
        },
        {
          label: 'Wali Kelas',
          href: '/wali-kelas',
          isWalasOnly: true,
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
        },
      ],
    },
  ];

  // Menu Administrator (Admin e-Rapor)
  const adminMenuSections = [
    {
      section: 'Utama',
      items: [
        {
          label: 'Dashboard',
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
      section: 'Pengelolaan e-Rapor',
      items: [
        {
          label: 'Data Guru & Walas',
          href: '/admin/teachers',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          label: 'Pengampu Mata Pelajaran',
          href: '/admin/schedule',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          label: 'Mata Pelajaran Rapor',
          href: '/admin/subjects',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          ),
        },
        {
          key: 'monitoring',
          label: 'Monitoring & Supervisi',
          href: '/admin/monitoring',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
          subItems: [
            {
              label: 'Progres Nilai & Tenggat Guru',
              href: '/admin/monitoring?tab=TEACHERS',
              tab: 'TEACHERS',
            },
            {
              label: 'Matriks Kelengkapan Rombel',
              href: '/admin/monitoring?tab=MATRIX',
              tab: 'MATRIX',
            },
            {
              label: 'Pengesahan Rapor Kepala Sekolah',
              href: '/admin/monitoring?tab=ENDORSEMENTS',
              tab: 'ENDORSEMENTS',
            },
          ],
        },
        {
          label: 'Rekapitulasi Nilai Walas',
          href: '/wali-kelas',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
        },
        {
          label: 'Backup & Restore Data',
          href: '/admin/backup',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          ),
        },
      ],
    },
  ];

  // Menu untuk KEPALA SEKOLAH
  const kepalaSekolahMenuSections = [
    {
      section: 'Utama',
      items: [
        {
          label: 'Dashboard',
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
      section: 'Supervisi Eksekutif',
      items: [
        {
          key: 'supervisi',
          label: 'Monitoring & Pengesahan',
          href: '/admin/monitoring',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          subItems: [
            {
              label: 'Progres Nilai & Tenggat Guru',
              href: '/admin/monitoring?tab=TEACHERS',
              tab: 'TEACHERS',
            },
            {
              label: 'Matriks Kelengkapan Rombel',
              href: '/admin/monitoring?tab=MATRIX',
              tab: 'MATRIX',
            },
            {
              label: 'Pengesahan Tanda Tangan Digital',
              href: '/admin/monitoring?tab=ENDORSEMENTS',
              tab: 'ENDORSEMENTS',
            },
          ],
        },
        {
          label: 'Rekap & Cetak Rapor',
          href: '/admin/rekap',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          ),
        },
      ],
    },
  ];

  let menuSections = teacherMenuSections;
  if (isKepalaSekolah) {
    menuSections = kepalaSekolahMenuSections;
  } else if (isAdmin) {
    menuSections = adminMenuSections;
  }

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const executeLogout = () => {
    document.cookie = 'perpusdig_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
    document.cookie = 'perpusdig_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost;';
    document.cookie = 'perpusdig_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.localhost;';
    document.cookie = 'perpusdig_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.spenspra.com;';
    document.cookie = 'perpusdig_auth_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
    document.cookie = 'perpusdig_auth_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost;';
    document.cookie = 'perpusdig_auth_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.localhost;';
    document.cookie = 'perpusdig_auth_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.spenspra.com;';
    try {
      tokenStorage.clear();
      sessionStorage.clear();
      localStorage.clear();
    } catch (e) {}
    const isProd = typeof window !== 'undefined' && window.location.hostname.includes('spenspra.com');
    window.location.href = isProd ? 'https://spenspra.com/login' : 'http://sso.localhost/login';
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Container (Responsive: Drawer on mobile, fixed-width on desktop) */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 md:z-30 w-64 bg-white text-slate-800 flex flex-col justify-between min-h-screen shrink-0 select-none border-r border-slate-200 shadow-xl md:shadow-sm transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header Branding dengan Logo Resmi */}
        <div className="overflow-y-auto flex-1">
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white p-1 shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
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
                <h1 className="text-[#4B3B78] font-bold text-sm tracking-tight leading-tight truncate">
                  SMPN 1 PRAMBON
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F2C94C]"></span>
                  <p className="text-[11px] font-semibold text-slate-600 truncate">
                    Sistem e-Rapor
                  </p>
                </div>
              </div>
            </div>

            {/* Tombol Tutup pada Layar Mobile */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Navigation Sections */}
          <nav className="p-3 space-y-4">
            {menuSections.map((sec, idx) => (
              <div key={idx}>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {sec.section}
                </p>
                <div className="space-y-1">
                  {sec.items.map((item) => {
                    const hasSub = Array.isArray(item.subItems) && item.subItems.length > 0;
                    const active = isItemActive(item);
                    const isOpen = hasSub && openSubMenus[item.key || item.label.toLowerCase()];

                    if (hasSub) {
                      return (
                        <div key={item.key || item.label} className="space-y-0.5">
                          {/* Parent Button with Accordion Chevron */}
                          <button
                            type="button"
                            onClick={() => toggleSubMenu(item.key || item.label.toLowerCase())}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                              active
                                ? 'bg-[#EDEAF5] text-[#3D2E66] font-bold'
                                : 'text-slate-700 hover:text-[#3D2E66] hover:bg-[#FAF9FD]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`shrink-0 transition-colors ${active ? 'text-[#4B3B78]' : 'text-slate-400 group-hover:text-[#4B3B78]'}`}>
                                {item.icon}
                              </span>
                              <span className="truncate">{item.label}</span>
                            </div>

                            <svg
                              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                                isOpen ? 'rotate-180 text-slate-700' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Sub-menu Dropdown List */}
                          {isOpen && (
                            <div className="ml-5 pl-2.5 border-l-2 border-[#B9B0D2] space-y-1 py-1 animate-in fade-in duration-150">
                              {item.subItems.map((sub) => {
                                const subActive = isSubItemActive(sub);
                                return (
                                  <Link
                                    key={sub.href}
                                    href={sub.href}
                                    onClick={onCloseMobile}
                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                      subActive
                                        ? 'bg-[#4B3B78] text-white font-bold shadow-2xs'
                                        : 'text-slate-600 hover:text-[#3D2E66] hover:bg-[#FAF9FD] font-medium'
                                    }`}
                                  >
                                    <span className="truncate">{sub.label}</span>
                                    {subActive && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 ml-1.5" />
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                          active
                            ? 'bg-[#4B3B78] text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-[#3D2E66] hover:bg-[#FAF9FD]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`shrink-0 transition-colors ${
                              active ? 'text-white' : 'text-slate-400 group-hover:text-[#4B3B78]'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.isWalasOnly && !isWalas && (
                          <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/80 flex items-center gap-1">
                            <svg className="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Terkunci
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

        {/* Footer User Profile & Logout Button */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isKepalaSekolah
                ? 'bg-purple-100 text-purple-700'
                : isAdmin
                ? 'bg-blue-100 text-blue-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user?.fullName || user?.full_name || user?.username || 'Pengguna'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.roleName || user?.role || (isAdmin ? 'Admin e-Rapor' : 'Guru Pengampu')}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Keluar Aplikasi</span>
          </button>
        </div>
      </aside>

      {/* Modal Konfirmasi Logout */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Keluar dari Aplikasi e-Rapor?"
        message="Anda akan keluar dari sesi akun e-Rapor dan portal SSO SMP Negeri 1 Prambon."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        type="danger"
        onConfirm={executeLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
}

export default function Sidebar(props) {
  return (
    <Suspense fallback={<aside className="hidden md:block w-64 bg-white border-r border-slate-200 min-h-screen shrink-0" />}>
      <SidebarContent {...props} />
    </Suspense>
  );
}
