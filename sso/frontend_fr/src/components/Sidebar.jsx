'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getRole } from '@/lib/access/portalAccess';

function SidebarContent({ mobileOpen = false, onCloseMobile = () => {} }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const role = getRole(user);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Sub-menu accordion state
  const [openSubMenus, setOpenSubMenus] = useState({
    masterData: true,
  });

  const toggleSubMenu = (key) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const currentTab = searchParams ? searchParams.get('tab') : null;

  const isSubActive = (sub) => {
    if (sub.tab) {
      const activeTabName = currentTab || 'rombel';
      return pathname.startsWith('/admin/master-data') && activeTabName.toLowerCase() === sub.tab.toLowerCase();
    }
    return pathname === sub.href;
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 md:sticky md:top-0 flex min-h-screen w-64 shrink-0 select-none flex-col justify-between border-r border-slate-200 bg-white text-slate-800 shadow-xl md:shadow-sm transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-white px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <Image
                  src="/image/new_logo_prambon.png"
                  alt="Logo SMP Negeri 1 Prambon"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-[#4B3B78]">SMPN 1 PRAMBON</h1>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-600">Portal SSO & Identitas</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Tutup Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Menus */}
          <nav className="space-y-4 p-3">
            {/* Section: Utama */}
            <div>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Utama</p>
              <div className="space-y-0.5">
                <Link
                  href={isSuperAdmin ? "/superadmin" : "/dashboard"}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    (pathname === '/superadmin' || pathname === '/dashboard' || pathname === '/')
                      ? 'bg-[#4B3B78] font-semibold text-white shadow-xs'
                      : 'text-slate-600 hover:bg-[#FAF9FD] hover:text-[#3D2E66]'
                  }`}
                >
                  <span className={`w-4 text-center text-sm ${pathname === '/superadmin' || pathname === '/' ? 'text-white' : 'text-slate-400'}`}>⌂</span>
                  <span className="truncate">Beranda SSO</span>
                </Link>
              </div>
            </div>

            {/* Section: Panel Super Admin */}
            {isSuperAdmin && (
              <div>
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Panel Super Admin (SSO)
                </p>
                <div className="space-y-0.5">
                  {/* Master Data dengan Sub Menu */}
                  <div>
                    <div className="flex items-center">
                      <Link
                        href="/admin/master-data"
                        onClick={onCloseMobile}
                        className={`flex-1 flex items-center gap-2.5 rounded-l-lg px-3 py-2 text-xs font-medium transition-all ${
                          pathname.startsWith('/admin/master-data')
                            ? 'bg-[#EDEAF5] text-[#3D2E66] font-bold'
                            : 'text-slate-600 hover:bg-[#FAF9FD] hover:text-[#3D2E66]'
                        }`}
                      >
                        <span className="w-4 text-center text-sm">⚙️</span>
                        <span className="truncate">Data Master</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleSubMenu('masterData')}
                        className={`p-2 rounded-r-lg transition-colors cursor-pointer ${
                          pathname.startsWith('/admin/master-data')
                            ? 'bg-[#EDEAF5] text-[#3D2E66]'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/80'
                        }`}
                        title="Buka/Tutup Sub Menu Data Master"
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            openSubMenus.masterData ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Sub-menu Data Master */}
                    {openSubMenus.masterData && (
                      <div className="pl-6 pr-1 pt-1 pb-1 space-y-1 border-l-2 border-[#B9B0D2] ml-4 my-1">
                        {[
                          { label: 'Rombongan Belajar', href: '/admin/master-data?tab=rombel', tab: 'rombel' },
                          { label: 'Data Siswa', href: '/admin/master-data?tab=siswa', tab: 'siswa' },
                          { label: 'Guru & GTK', href: '/admin/master-data?tab=guru_staf', tab: 'guru_staf' },
                          { label: 'T.A & Semester', href: '/admin/master-data?tab=semester', tab: 'semester' },
                        ].map((sub) => {
                          const active = isSubActive(sub);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={onCloseMobile}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                                active
                                  ? 'bg-[#4B3B78] text-white font-semibold shadow-2xs'
                                  : 'text-slate-500 hover:text-[#3D2E66] hover:bg-[#FAF9FD]'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-slate-300'}`} />
                              <span className="truncate">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Other Super Admin Menus */}
                  {[
                    ['Akses Aplikasi', '/admin/app-access', '🔐'],
                    ['Kartu QR / Barcode', '/students', '🪪'],
                    ['Import Excel', '/admin/import', '📥'],
                    ['Audit Log', '/admin/audit-log', '📋'],
                  ].map(([label, href, icon]) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={onCloseMobile}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                          active
                            ? 'bg-[#4B3B78] font-semibold text-white shadow-xs'
                            : 'text-slate-600 hover:bg-[#FAF9FD] hover:text-[#3D2E66]'
                        }`}
                      >
                        <span className={`w-4 text-center text-sm ${active ? 'text-white' : 'text-slate-400'}`}>
                          {icon}
                        </span>
                        <span className="truncate">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {!isSuperAdmin && (
              <div>
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Layanan Civitas
                </p>
                <div className="space-y-0.5">
                  <Link
                    href="/students"
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      pathname.startsWith('/students')
                        ? 'bg-[#4B3B78] font-semibold text-white shadow-xs'
                        : 'text-slate-600 hover:bg-[#FAF9FD] hover:text-[#3D2E66]'
                    }`}
                  >
                    <span className="w-4 text-center text-sm">🪪</span>
                    <span className="truncate">Kartu Barcode Saya</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Section: Akun */}
            <div>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Akun</p>
              <div className="space-y-0.5">
                {[
                  ['Profil Pengguna', '/profile', '👤'],
                  ['Dokumentasi SSO', '/docs', '📖'],
                ].map(([label, href, icon]) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onCloseMobile}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        active
                          ? 'bg-[#4B3B78] font-semibold text-white shadow-xs'
                          : 'text-slate-600 hover:bg-[#FAF9FD] hover:text-[#3D2E66]'
                      }`}
                    >
                      <span className={`w-4 text-center text-sm ${active ? 'text-white' : 'text-slate-400'}`}>
                        {icon}
                      </span>
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

      </aside>
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
