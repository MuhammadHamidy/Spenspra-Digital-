'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import { redirectToSsoLogout } from '@/lib/features/beranda/ssoHelper';

export default function AkunSiswaPage() {
  const router = useRouter();
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
        const roleUpper = (currentUser.peran || currentUser.roleName || currentUser.role || '').toUpperCase();
        if (
          roleUpper === 'PUSTAKAWAN' ||
          roleUpper === 'ADMIN_PERPUS' ||
          roleUpper === 'SUPER_ADMIN' ||
          roleUpper === 'KEPALA_SEKOLAH'
        ) {
          router.replace('/pustakawan/akun');
          return;
        }

        const classCodes = currentUser.class_codes || currentUser.classCodes || [];
        const classStr =
          currentUser.kelas_atau_jabatan ||
          currentUser.className ||
          currentUser.kelas ||
          (classCodes.length > 0 ? classCodes.join(', ') : 'VII A');

        setUser({
          id: currentUser.id || 'siswa-1',
          nama: currentUser.nama || currentUser.fullName || currentUser.full_name || currentUser.username || 'Rizky Fernandez',
          nis: currentUser.nis || currentUser.nimNip || currentUser.nim_nip || currentUser.nip || currentUser.nisn || '10018',
          kelas: classStr,
          email: currentUser.email || 'rizkyfr20@gmail.com',
          telepon: currentUser.phone || currentUser.telepon || currentUser.no_telepon || currentUser.no_hp || '0851009001',
          foto: currentUser.photoUrl || currentUser.photo_url || currentUser.foto || null,
          peran: currentUser.peran || currentUser.roleName || 'SISWA',
        });
      } else {
        // Fallback default sesuai Akun Siswa.png jika token baru/mock
        setUser({
          nama: 'Rizky Fernandez',
          nis: '10018',
          kelas: 'VII A',
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

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans text-slate-800">
      <div>
        <Navbar user={user} />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
          {/* Header Title & Subtitle sesuai Akun Siswa.png */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2538] tracking-tight uppercase">
              AKUN SISWA
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-600 font-medium tracking-wide">
              SMP NEGERI 1 PRAMBON – SIDOARJO
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

          {/* 2. Kartu Profil Siswa sesuai Akun Siswa.png */}
          {!loading && user && (
            <div>
              <div className="p-6 sm:p-8 md:p-10 border border-slate-700/80 rounded-2xl bg-white shadow-2xs">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
                  {/* Kolom Kiri: Pas Foto Siswa (Latar Merah Formal) */}
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
                      ) : (
                        /* SVG Pas Foto Siswa Berseragam SMP Latar Belakang Merah */
                        <div className="relative w-full h-full flex flex-col items-center justify-end overflow-hidden">
                          {/* Kepala dan Rambut */}
                          <div className="relative z-10 flex flex-col items-center mb-1">
                            <div className="w-20 h-24 rounded-full bg-[#fcd5b8] relative flex flex-col items-center shadow-inner">
                              {/* Rambut */}
                              <div className="absolute -top-3 w-22 h-14 bg-slate-900 rounded-t-full" />
                              {/* Alis & Mata */}
                              <div className="mt-8 flex gap-4">
                                <div className="w-2 h-1 bg-slate-800 rounded-full" />
                                <div className="w-2 h-1 bg-slate-800 rounded-full" />
                              </div>
                              {/* Hidung & Senyum */}
                              <div className="mt-2 w-1.5 h-2 bg-[#e29367] rounded-full" />
                              <div className="mt-1.5 w-4 h-1 border-b-2 border-slate-700 rounded-full" />
                            </div>
                            {/* Leher */}
                            <div className="w-8 h-6 bg-[#f7c29e] -mt-1" />
                          </div>

                          {/* Baju Putih OSIS SMP & Dasi Biru */}
                          <div className="w-44 h-24 bg-white rounded-t-3xl relative flex flex-col items-center shadow-md">
                            {/* Kerah Baju */}
                            <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[14px] border-t-slate-200" />
                            {/* Dasi Biru SMP */}
                            <div className="w-3.5 h-16 bg-[#1A3D63] rounded-b-md shadow-xs -mt-1 flex flex-col items-center">
                              <div className="w-4 h-3 bg-[#132d4b] rounded-t-xs" />
                            </div>
                            {/* Emblem Osis Kiri */}
                            <div className="absolute right-6 top-8 w-4 h-5 bg-[#D97706]/20 border border-[#D97706] rounded-xs" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kolom Kanan: Detail Informasi Siswa */}
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

                      {/* Baris 2: NIS */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-4 sm:col-span-3 font-semibold text-slate-800">
                          NIS
                        </span>
                        <div className="col-span-8 sm:col-span-9 flex items-center font-semibold text-slate-900 font-mono">
                          <span className="mr-3 font-normal font-sans text-slate-500">:</span>
                          <span>{user.nis}</span>
                        </div>
                      </div>

                      {/* Baris 3: Kelas */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-4 sm:col-span-3 font-semibold text-slate-800">
                          Kelas
                        </span>
                        <div className="col-span-8 sm:col-span-9 flex items-center font-semibold text-slate-900">
                          <span className="mr-3 font-normal text-slate-500">:</span>
                          <span>{user.kelas}</span>
                        </div>
                      </div>

                      {/* Baris 4: E-Mail */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-4 sm:col-span-3 font-semibold text-slate-800">
                          E-Mail
                        </span>
                        <div className="col-span-8 sm:col-span-9 flex items-center font-medium text-slate-800">
                          <span className="mr-3 font-normal text-slate-500">:</span>
                          <span>{user.email}</span>
                        </div>
                      </div>

                      {/* Baris 5: No. Telepon */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-4 sm:col-span-3 font-semibold text-slate-800">
                          No. Telepon
                        </span>
                        <div className="col-span-8 sm:col-span-9 flex items-center font-semibold text-slate-900 font-mono">
                          <span className="mr-3 font-normal font-sans text-slate-500">:</span>
                          <span>{user.telepon}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tombol Keluar Akun di kanan bawah sesuai Akun Siswa.png */}
              <div className="mt-6 flex justify-end">
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
          )}
        </main>
      </div>

      <PerpusFooterMain />
    </div>
  );
}
