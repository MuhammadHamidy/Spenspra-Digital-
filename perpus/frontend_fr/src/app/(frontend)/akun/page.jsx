'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import { redirectToSsoLogout } from '@/lib/features/beranda/ssoHelper';

/**
 * Menentukan konfigurasi judul, label identitas, dan peran berdasarkan data akun pengguna
 */
export function resolveRoleConfig(currentUser) {
  const roleUpper = (
    currentUser?.peran ||
    currentUser?.roleName ||
    currentUser?.role ||
    ''
  ).toUpperCase();

  const titleUpper = (
    currentUser?.kelas_atau_jabatan ||
    currentUser?.jabatan ||
    currentUser?.className ||
    ''
  ).toUpperCase();

  const nameUpper = (
    currentUser?.nama ||
    currentUser?.fullName ||
    currentUser?.full_name ||
    ''
  ).toUpperCase();

  // 1. PENDIDIK / GURU
  const isTeacher =
    roleUpper === 'GURU' ||
    roleUpper === 'PENDIDIK' ||
    roleUpper === 'TEACHER' ||
    roleUpper === 'WALI_KELAS' ||
    titleUpper.includes('PENDIDIK') ||
    titleUpper.includes('GURU') ||
    nameUpper.includes('S.PD') ||
    nameUpper.includes('M.PD') ||
    nameUpper.includes('DRA.') ||
    nameUpper.includes('DRS.');

  // 2. PUSTAKAWAN / ADMIN PERPUS
  const isLibrarian =
    roleUpper === 'PUSTAKAWAN' ||
    roleUpper === 'ADMIN_PERPUS' ||
    titleUpper.includes('PUSTAKAWAN');

  // 3. KEPALA SEKOLAH
  const isPrincipal =
    roleUpper === 'KEPALA_SEKOLAH' ||
    roleUpper === 'PRINCIPAL' ||
    titleUpper.includes('KEPALA SEKOLAH');

  // 4. TENAGA KEPENDIDIKAN / TATA USAHA
  const isStaff =
    roleUpper === 'STAFF' ||
    roleUpper === 'STAF' ||
    roleUpper === 'TATA_USAHA' ||
    roleUpper === 'TENAGA_KEPENDIDIKAN' ||
    titleUpper.includes('TATA USAHA') ||
    titleUpper.includes('TENAGA KEPENDIDIKAN');

  if (isTeacher) {
    return {
      type: 'PENDIDIK',
      pageTitle: 'AKUN PENDIDIK',
      subtitle: 'SMP NEGERI 1 PRAMBON – SIDOARJO',
      idLabel: 'NIP / NUPTK',
      groupLabel: 'Status / Jabatan',
      defaultGroupValue: 'Pendidik',
      isStaff: true,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
  }

  if (isLibrarian) {
    return {
      type: 'PUSTAKAWAN',
      pageTitle: 'AKUN PUSTAKAWAN',
      subtitle: 'SMP NEGERI 1 PRAMBON – SIDOARJO',
      idLabel: 'NIP / ID Petugas',
      groupLabel: 'Jabatan',
      defaultGroupValue: 'Pustakawan Perpustakaan',
      isStaff: true,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    };
  }

  if (isPrincipal) {
    return {
      type: 'KEPALA_SEKOLAH',
      pageTitle: 'AKUN KEPALA SEKOLAH',
      subtitle: 'SMP NEGERI 1 PRAMBON – SIDOARJO',
      idLabel: 'NIP',
      groupLabel: 'Jabatan',
      defaultGroupValue: 'Kepala Sekolah',
      isStaff: true,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  if (isStaff) {
    return {
      type: 'STAFF',
      pageTitle: 'AKUN TENAGA KEPENDIDIKAN',
      subtitle: 'SMP NEGERI 1 PRAMBON – SIDOARJO',
      idLabel: 'NIP / NIK',
      groupLabel: 'Unit Kerja',
      defaultGroupValue: 'Tenaga Kependidikan',
      isStaff: true,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  // 5. Default: SISWA
  return {
    type: 'SISWA',
    pageTitle: 'AKUN SISWA',
    subtitle: 'SMP NEGERI 1 PRAMBON – SIDOARJO',
    idLabel: 'NIS',
    groupLabel: 'Kelas',
    defaultGroupValue: 'VII A',
    isStaff: false,
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

export default function AkunPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      let currentUser = null;

      try {
        const session = await berandaApi.getSession();
        if (session) {
          currentUser = session;
        }
      } catch (e) {
        console.warn('Gagal memuat sesi backend, menggunakan tokenStorage:', e);
      }

      if (!currentUser) {
        const local = tokenStorage.getUser();
        if (local) {
          currentUser = local;
        }
      }

      if (currentUser) {
        const classCodes = currentUser.class_codes || currentUser.classCodes || [];
        const classStr =
          currentUser.kelas_atau_jabatan ||
          currentUser.jabatan ||
          currentUser.className ||
          currentUser.kelas ||
          (classCodes.length > 0 ? classCodes.join(', ') : '');

        setUser({
          id: currentUser.id || 'usr-1',
          nama: currentUser.nama || currentUser.fullName || currentUser.full_name || currentUser.username || 'Civitas Spenspra',
          nisNip: currentUser.nis || currentUser.nimNip || currentUser.nim_nip || currentUser.nip || currentUser.nisn || currentUser.identity_number || '-',
          kelasAtauJabatan: classStr,
          email: currentUser.email || '',
          telepon: currentUser.phone || currentUser.telepon || currentUser.no_telepon || currentUser.no_hp || '',
          foto: currentUser.photoUrl || currentUser.photo_url || currentUser.foto || currentUser.avatar || null,
          peran: currentUser.peran || currentUser.roleName || currentUser.role || '',
        });
      } else {
        // Fallback Siswa default
        setUser({
          nama: 'Rizky Fernandez',
          nisNip: '10018',
          kelasAtauJabatan: 'VII A',
          email: 'rizkyfr20@gmail.com',
          telepon: '0851009001',
          foto: null,
          peran: 'SISWA',
        });
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  const handleLogout = () => {
    tokenStorage.clear();
    redirectToSsoLogout();
  };

  const roleMeta = resolveRoleConfig(user);

  // Nilai Grup/Kelas/Jabatan yang tampil
  const displayGroupValue = user?.kelasAtauJabatan || roleMeta.defaultGroupValue;

  // Nilai Email
  const displayEmail =
    user?.email && !user.email.includes('rizkyfr20')
      ? user.email
      : roleMeta.isStaff
      ? `${(user?.nama || 'pendidik')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '.')
          .replace(/\.+/g, '.')
          .replace(/^\.|\.$/g, '')}@smpn1prambon.sch.id`
      : user?.email || '-';

  // Nilai Telepon
  const displayPhone =
    user?.telepon && user.telepon !== '0851009001'
      ? user.telepon
      : roleMeta.isStaff
      ? '-'
      : user?.telepon || '-';

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans text-slate-800">
      <div>
        <Navbar user={user} />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
          {/* Header Title & Subtitle disesuaikan secara dinamis dengan Role */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2538] tracking-tight uppercase">
              {roleMeta.pageTitle}
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-600 font-medium tracking-wide">
              {roleMeta.subtitle}
            </p>
          </div>

          {/* 1. Loading Skeleton */}
          {loading && (
            <div className="p-8 sm:p-10 border border-slate-700/60 rounded-2xl animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-4 max-w-[240px] aspect-3/4 bg-slate-200 rounded-xl" />
                <div className="md:col-span-8 space-y-6">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-6 bg-slate-200 rounded-md w-3/4" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Kartu Profil Akun Terstruktur Sesuai Peran */}
          {!loading && user && (
            <div>
              <div className="p-6 sm:p-8 md:p-10 border border-slate-700/80 rounded-2xl bg-white shadow-2xs">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
                  {/* Kolom Kiri: Pas Foto Formal Latar Merah */}
                  <div className="md:col-span-5 lg:col-span-4 flex justify-center md:justify-start">
                    <div className="relative w-full max-w-[240px] aspect-3/4 rounded-xl overflow-hidden shadow-md bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center border border-red-800/20">
                      {user.foto ? (
                        <Image
                          src={user.foto}
                          alt={user.nama}
                          fill
                          sizes="(max-width: 768px) 240px, 280px"
                          className="object-cover"
                        />
                      ) : roleMeta.isStaff ? (
                        /* Pas Foto Formal Pendidik / Guru Latar Merah */
                        <div className="relative w-full h-full flex flex-col items-center justify-end overflow-hidden">
                          {/* Kepala dan Rambut Dewasa */}
                          <div className="relative z-10 flex flex-col items-center mb-1">
                            <div className="w-22 h-26 rounded-full bg-[#fbd0b4] relative flex flex-col items-center shadow-inner">
                              {/* Rambut Rapi Pendidik */}
                              <div className="absolute -top-3 w-24 h-16 bg-slate-900 rounded-t-full shadow-xs" />
                              {/* Alis & Mata Dewasa */}
                              <div className="mt-9 flex gap-4">
                                <div className="w-2.5 h-1 bg-slate-900 rounded-full" />
                                <div className="w-2.5 h-1 bg-slate-900 rounded-full" />
                              </div>
                              {/* Hidung & Senyum Ramah */}
                              <div className="mt-2.5 w-1.5 h-2.5 bg-[#e29367] rounded-full" />
                              <div className="mt-1.5 w-5 h-1 border-b-2 border-slate-700 rounded-full" />
                            </div>
                            {/* Leher */}
                            <div className="w-9 h-7 bg-[#f7c29e] -mt-1" />
                          </div>

                          {/* Pakaian Dinas Formal Pendidik / Batik Guru */}
                          <div className="w-48 h-26 bg-[#172033] rounded-t-3xl relative flex flex-col items-center shadow-lg border-t border-slate-600/40">
                            {/* Kemeja Putih Berkerah di Balik Jas/Blazer */}
                            <div className="w-16 h-12 bg-white flex justify-center items-start pt-1">
                              <div className="w-3 h-10 bg-slate-800" />
                            </div>
                            {/* Lencana Pin Dinas / KORPRI di Dada Kiri */}
                            <div className="absolute left-6 top-8 w-4 h-5 bg-amber-400 border border-amber-300 rounded-xs shadow-xs" />
                          </div>
                        </div>
                      ) : (
                        /* Pas Foto Siswa Berseragam OSIS SMP Latar Merah */
                        <div className="relative w-full h-full flex flex-col items-center justify-end overflow-hidden">
                          {/* Kepala dan Rambut Siswa */}
                          <div className="relative z-10 flex flex-col items-center mb-1">
                            <div className="w-20 h-24 rounded-full bg-[#fcd5b8] relative flex flex-col items-center shadow-inner">
                              <div className="absolute -top-3 w-22 h-14 bg-slate-900 rounded-t-full" />
                              <div className="mt-8 flex gap-4">
                                <div className="w-2 h-1 bg-slate-800 rounded-full" />
                                <div className="w-2 h-1 bg-slate-800 rounded-full" />
                              </div>
                              <div className="mt-2 w-1.5 h-2 bg-[#e29367] rounded-full" />
                              <div className="mt-1.5 w-4 h-1 border-b-2 border-slate-700 rounded-full" />
                            </div>
                            <div className="w-8 h-6 bg-[#f7c29e] -mt-1" />
                          </div>

                          {/* Baju Putih OSIS SMP & Dasi Biru */}
                          <div className="w-44 h-24 bg-white rounded-t-3xl relative flex flex-col items-center shadow-md">
                            <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[14px] border-t-slate-200" />
                            <div className="w-3.5 h-16 bg-[#1A3D63] rounded-b-md shadow-xs -mt-1 flex flex-col items-center">
                              <div className="w-4 h-3 bg-[#132d4b] rounded-t-xs" />
                            </div>
                            <div className="absolute right-6 top-8 w-4 h-5 bg-[#D97706]/20 border border-[#D97706] rounded-xs" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kolom Kanan: Rincian Data Disesuaikan Labelnya */}
                  <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-center">
                    <div className="space-y-6 sm:space-y-7 text-sm sm:text-base">
                      {/* Baris 1: Nama */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-4 sm:col-span-3 font-semibold text-slate-800">
                          Nama
                        </span>
                        <div className="col-span-8 sm:col-span-9 flex items-center font-bold text-slate-900">
                          <span className="mr-3 font-normal text-slate-500">:</span>
                          <span>{user.nama}</span>
                        </div>
                      </div>

                      {/* Baris 2: NIP untuk Pendidik/Staf, NIS untuk Siswa */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-4 sm:col-span-3 font-semibold text-slate-800">
                          {roleMeta.idLabel}
                        </span>
                        <div className="col-span-8 sm:col-span-9 flex items-center font-semibold text-slate-900 font-mono">
                          <span className="mr-3 font-normal font-sans text-slate-500">:</span>
                          <span>{user.nisNip}</span>
                        </div>
                      </div>

                      {/* Baris 3: Status / Jabatan untuk Pendidik, Kelas untuk Siswa */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-4 sm:col-span-3 font-semibold text-slate-800">
                          {roleMeta.groupLabel}
                        </span>
                        <div className="col-span-8 sm:col-span-9 flex items-center font-semibold text-slate-900">
                          <span className="mr-3 font-normal text-slate-500">:</span>
                          <span>{displayGroupValue}</span>
                        </div>
                      </div>

                      {/* Baris 4: E-Mail */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-4 sm:col-span-3 font-semibold text-slate-800">
                          E-Mail
                        </span>
                        <div className="col-span-8 sm:col-span-9 flex items-center font-medium text-slate-800">
                          <span className="mr-3 font-normal text-slate-500">:</span>
                          <span>{displayEmail}</span>
                        </div>
                      </div>

                      {/* Baris 5: No. Telepon */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-4 sm:col-span-3 font-semibold text-slate-800">
                          No. Telepon
                        </span>
                        <div className="col-span-8 sm:col-span-9 flex items-center font-semibold text-slate-900 font-mono">
                          <span className="mr-3 font-normal font-sans text-slate-500">:</span>
                          <span>{displayPhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tombol Aksi di Bagian Bawah */}
              <div className="mt-6 flex items-center justify-between">
                <div>
                  {roleMeta.isStaff && (
                    <Link
                      href="/pustakawan"
                      className="px-5 py-2.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-[#1E2538] text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-2xs"
                    >
                      <svg className="w-4 h-4 text-[#1E2538]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span>Dashboard Admin Pustakawan</span>
                    </Link>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-6 py-2.5 rounded-md bg-[#1E2538] hover:bg-[#141B2B] text-white text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors duration-150 cursor-pointer shadow-sm"
                  >
                    <span>Keluar Akun</span>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <PerpusFooterMain />
    </div>
  );
}
