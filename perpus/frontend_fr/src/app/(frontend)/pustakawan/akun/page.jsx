'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import { redirectToSsoLogout } from '@/lib/features/beranda/ssoHelper';

export default function PustakawanAkunPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      let currentUser = null;

      try {
        const session = await berandaApi.getSession();
        if (session) {
          currentUser = session;
        }
      } catch (e) {
        console.warn('Gagal memuat sesi backend:', e);
      }

      if (!currentUser) {
        const local = tokenStorage.getUser();
        if (local) {
          currentUser = local;
        }
      }

      if (currentUser) {
        setUser({
          id: currentUser.id || 'admin-1',
          nama: currentUser.nama || currentUser.fullName || currentUser.full_name || currentUser.username || 'Romita Erika Narestifuri, S.Pd.',
          nip: currentUser.nip || currentUser.nimNip || currentUser.nim_nip || '198503122010122003',
          peran: currentUser.peran || currentUser.roleName || 'PUSTAKAWAN',
          jabatan: currentUser.kelas_atau_jabatan || 'Pustakawan / Pengelola Perpustakaan',
          email: currentUser.email || 'romita.erika@smpn1prambon.sch.id',
          telepon: currentUser.phone || currentUser.telepon || currentUser.no_telepon || '081234567890',
          foto: currentUser.photoUrl || currentUser.photo_url || currentUser.foto || currentUser.avatar || null,
        });
      } else {
        setUser({
          nama: 'Romita Erika Narestifuri, S.Pd.',
          nip: '198503122010122003',
          peran: 'PUSTAKAWAN',
          jabatan: 'Pustakawan / Pengelola Perpustakaan',
          email: 'romita.erika@smpn1prambon.sch.id',
          telepon: '081234567890',
          foto: null,
        });
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const handleLogout = () => {
    tokenStorage.clear();
    redirectToSsoLogout();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full font-sans text-slate-800">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/pustakawan" className="hover:text-blue-600 transition">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800">Akun Pustakawan</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>👤</span>
            <span>Profil &amp; Akun Pustakawan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Informasi identitas dan data kredensial staf pengelola Perpustakaan SMPN 1 Prambon.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Ke Portal Siswa</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Keluar Sesi</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4 w-40 h-40 rounded-2xl bg-slate-200 mx-auto" />
            <div className="md:col-span-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-6 bg-slate-200 rounded-md w-3/4" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Profile Card */}
      {!loading && user && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#172033] to-[#1E2538] px-8 py-6 text-white flex items-center justify-between">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-900 tracking-wider uppercase mb-1">
                {user.peran}
              </span>
              <h2 className="text-lg sm:text-xl font-bold">{user.nama}</h2>
              <p className="text-xs text-slate-300 font-mono mt-0.5">NIP: {user.nip}</p>
            </div>
            <div className="hidden sm:flex flex-col items-end text-xs text-slate-300">
              <span className="text-slate-400">Instansi:</span>
              <span className="font-semibold text-white">SMP Negeri 1 Prambon</span>
              <span className="text-[11px] text-slate-400">Sidoarjo, Jawa Timur</span>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Left: Avatar / Photo */}
              <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
                <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-[#1A3D63] to-[#0A1931] flex items-center justify-center border-2 border-slate-200">
                  {user.foto ? (
                    <Image
                      src={user.foto}
                      alt={user.nama}
                      fill
                      sizes="144px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-center text-white">
                      <svg className="w-16 h-16 text-slate-200 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
                        Admin Perpus
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Sesi SSO Aktif
                  </span>
                </div>
              </div>

              {/* Right: Detailed Fields */}
              <div className="md:col-span-8 space-y-5 text-sm">
                <div className="grid grid-cols-12 gap-2 pb-3 border-b border-slate-100">
                  <span className="col-span-4 font-semibold text-slate-500">Nama Lengkap</span>
                  <span className="col-span-8 font-bold text-slate-900">{user.nama}</span>
                </div>

                <div className="grid grid-cols-12 gap-2 pb-3 border-b border-slate-100">
                  <span className="col-span-4 font-semibold text-slate-500">NIP / NUPTK</span>
                  <span className="col-span-8 font-semibold text-slate-800 font-mono">{user.nip}</span>
                </div>

                <div className="grid grid-cols-12 gap-2 pb-3 border-b border-slate-100">
                  <span className="col-span-4 font-semibold text-slate-500">Jabatan &amp; Tugas</span>
                  <span className="col-span-8 font-medium text-slate-800">{user.jabatan}</span>
                </div>

                <div className="grid grid-cols-12 gap-2 pb-3 border-b border-slate-100">
                  <span className="col-span-4 font-semibold text-slate-500">E-Mail Dinas</span>
                  <span className="col-span-8 font-medium text-slate-800">{user.email}</span>
                </div>

                <div className="grid grid-cols-12 gap-2 pb-3 border-b border-slate-100">
                  <span className="col-span-4 font-semibold text-slate-500">Nomor Telepon / WA</span>
                  <span className="col-span-8 font-semibold text-slate-800 font-mono">{user.telepon}</span>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 font-semibold text-slate-500">Hak Akses Modul</span>
                  <div className="col-span-8 flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      Sirkulasi Peminjaman
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      Katalog Buku
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Presensi Pengunjung
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Data Anggota
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
