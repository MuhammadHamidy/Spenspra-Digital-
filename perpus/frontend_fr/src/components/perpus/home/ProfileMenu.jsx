'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { redirectToSsoLogout } from '@/lib/features/beranda/ssoHelper';

export default function ProfileMenu({ user, isOpen, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-50 border-2 border-[#4B3B78]/20 flex-shrink-0 flex items-center justify-center">
          {user.foto ? (
            <Image
              src={user.foto}
              alt={user.nama}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-[#4B3B78]">
              {user.nama?.charAt(0) || 'U'}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 truncate">{user.nama}</p>
          <span className="inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded-md bg-[#4B3B78]/10 text-[#4B3B78] uppercase">
            {user.peran || 'ANGGOTA'}
          </span>
          {user.kelas_atau_jabatan && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{user.kelas_atau_jabatan}</p>
          )}
        </div>
      </div>

      <div className="p-2 space-y-1">
        <a
          href={
            typeof window !== 'undefined' && window.location.hostname.includes('spenspra.com')
              ? 'https://sso.spenspra.com/dashboard'
              : typeof window !== 'undefined' && window.location.hostname.includes('spenspra.sch.id')
              ? 'https://sso.spenspra.sch.id/dashboard'
              : 'http://sso.localhost/dashboard'
          }
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#4B3B78] hover:bg-purple-50 rounded-xl transition-colors font-bold text-left"
        >
          <svg className="w-4 h-4 text-[#4B3B78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Portal Layanan SSO</span>
        </a>

        {((user.peran || user.roleName || '').toUpperCase() === 'PUSTAKAWAN' ||
          (user.peran || user.roleName || '').toUpperCase() === 'ADMIN_PERPUS' ||
          (user.peran || user.roleName || '').toUpperCase() === 'SUPER_ADMIN' ||
          (user.peran || user.roleName || '').toUpperCase() === 'KEPALA_SEKOLAH') ? (
          <>
            <a
              href="/pustakawan"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#4B3B78] hover:bg-purple-50 rounded-xl transition-colors font-bold text-left"
            >
              <svg className="w-4 h-4 text-[#4B3B78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Dashboard Admin Pustakawan</span>
            </a>

            <a
              href="/pustakawan/akun"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 rounded-xl transition-colors font-medium text-left"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Profil / Akun Pustakawan</span>
            </a>
          </>
        ) : (
          <>
            {((user.peran || user.roleName || '').toUpperCase() === 'GURU' ||
              (user.peran || user.roleName || '').toUpperCase() === 'WALI_KELAS') && (
              <a
                href="/reading-insights"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#4B3B78] hover:bg-purple-50 rounded-xl transition-colors font-bold text-left"
              >
                <svg className="w-4 h-4 text-[#4B3B78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Koreksi Literasi &amp; Kuis Siswa</span>
              </a>
            )}

            <a
              href="/tugas-literasi"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#1E2538] hover:bg-slate-50 rounded-xl transition-colors font-medium text-left"
            >
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Tugas Literasi Saya</span>
            </a>

            <a
              href="/pinjam"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors font-medium text-left"
            >
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Riwayat Peminjaman Buku</span>
            </a>

            <a
              href="/absensi"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors font-medium text-left"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Presensi Kunjungan Perpus</span>
            </a>

            <a
              href="/akun"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 rounded-xl transition-colors font-medium text-left"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Profil / Akun Saya</span>
            </a>
          </>
        )}

        <div className="border-t border-slate-100 my-1"></div>

        <button
          type="button"
          onClick={() => {
            onClose();
            redirectToSsoLogout();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-left cursor-pointer"
        >
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Keluar dari Akun</span>
        </button>
      </div>
    </div>
  );
}
