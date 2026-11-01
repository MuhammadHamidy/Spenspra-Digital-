'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import ConfirmModal from './ConfirmModal';

export default function Sidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useInactivityTimeout(() => {
    logout();
  });

  const menuSections = [
    {
      section: 'Utama',
      items: [
        {
          label: 'Dashboard',
          href: '/pustakawan',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          label: 'Riwayat Pengunjung',
          href: '/pustakawan/absensi',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ),
        },
        {
          label: 'Riwayat Peminjaman',
          href: '/pustakawan/peminjaman',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
      ],
    },
    {
      section: 'Sirkulasi & Koleksi',
      items: [
        {
          label: 'Daftar Buku',
          href: '/books',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          label: 'Data Siswa & Guru',
          href: '/members',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          label: 'Tanggungan & Denda',
          href: '/loans/tracking',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        },
        {
          label: 'Koreksi Literasi & Kuis',
          href: '/reading-insights',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      section: 'Pengaturan',
      items: [
        {
          label: 'Akun Pustakawan',
          href: '/pustakawan/akun',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 md:z-30 w-64 h-screen bg-white text-slate-800 border-r border-slate-200 shadow-sm md:shadow-none flex flex-col justify-between shrink-0 select-none transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header Branding - e-Rapor Spenspra Style */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
            <Link
              href="/pustakawan"
              onClick={onCloseMobile}
              className="flex items-center gap-3 min-w-0 group"
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200/80 p-0.5">
                <Image
                  src="/image/new_logo_prambon.png"
                  alt="Logo SMPN 1 Prambon"
                  width={34}
                  height={34}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-[#4B3B78] leading-tight tracking-tight truncate group-hover:text-[#3D2E66] transition-colors">
                  SMPN 1 PRAMBON
                </h1>
                <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F2C94C] shrink-0" />
                  <span className="truncate">Perpustakaan Digital</span>
                </p>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden cursor-pointer"
              aria-label="Tutup Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
            {menuSections.map((section) => (
              <div key={section.section}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
                  {section.section}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      item.href === '/pustakawan'
                        ? pathname === '/pustakawan'
                        : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        target={item.isExternal ? '_blank' : undefined}
                        onClick={onCloseMobile}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                          isActive
                            ? 'bg-[#4B3B78] text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-[#3D2E66] hover:bg-[#FAF9FD]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`shrink-0 transition-colors ${
                              isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#4B3B78]'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.isExternal && (
                          <span className="text-[10px] text-slate-400 group-hover:text-[#4B3B78]">↗</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Navigation & Logout */}
        <div className="p-3 border-t border-slate-200 shrink-0 bg-white space-y-2">
          <a
            href={
              typeof window !== 'undefined' && window.location.hostname.includes('spenspra.com')
                ? 'https://sso.spenspra.com/dashboard'
                : typeof window !== 'undefined' && window.location.hostname.includes('spenspra.sch.id')
                ? 'https://sso.spenspra.sch.id/dashboard'
                : 'http://sso.localhost/dashboard'
            }
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#4B3B78] hover:bg-[#EDEAF5] border border-[#DDD7ED] transition-colors"
            title="Kembali ke Portal Utama SSO"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Portal Layanan SSO</span>
          </a>

          <button
            type="button"
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200/60 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Keluar Sesi</span>
          </button>
        </div>

        {/* Logout Confirmation Modal */}
        <ConfirmModal
          isOpen={isLogoutConfirmOpen}
          title="Konfirmasi Keluar Sesi"
          message="Apakah Anda yakin ingin keluar dari sistem Perpustakaan? Sesi aktif di peramban ini akan diakhiri."
          confirmText="Ya, Keluar"
          cancelText="Batal"
          isDanger={true}
          onConfirm={logout}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />
      </aside>
    </>
  );
}
