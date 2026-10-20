'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getRole } from '@/lib/access/portalAccess';
import { schoolPeopleApi } from '@/lib/features/schoolPeopleApi';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { getDynamicAppUrl } from '@/lib/common/urlHelper';

export default function CivitasDashboard() {
  const { user } = useAuth();
  const role = getRole(user);
  const isKepalaSekolah = role.includes('KEPALA');
  const isSiswa = role.includes('SISWA');

  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    classes: 0,
  });
  const [academicPeriod, setAcademicPeriod] = useState({
    year: '2025/2026',
    semester: 'GENAP',
    kkm: 75,
  });

  const raporBaseUrl = getDynamicAppUrl(process.env.NEXT_PUBLIC_RAPOR_URL, 'rapor');
  const perpusBaseUrl = getDynamicAppUrl(process.env.NEXT_PUBLIC_PERPUS_URL, 'perpus');
  const belajarBaseUrl = getDynamicAppUrl(process.env.NEXT_PUBLIC_ELEARNING_URL, 'belajar');

  const getRaporLaunchUrl = (targetPath = '') => {
    const token = tokenStorage.getToken() || 'sso-session-token';
    const userPayload = {
      id: user?.id || user?.person_id || 'user-1',
      username: user?.username || '',
      fullName: user?.fullName || user?.full_name || '',
      roleName: isKepalaSekolah ? 'KEPALA_SEKOLAH' : (role || 'GURU'),
      nimNip: user?.nimNip || user?.nip || user?.nisn || '',
    };
    const encodedUser = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(JSON.stringify(userPayload)))) : '';
    const redirectParam = targetPath ? `&redirect=${encodeURIComponent(targetPath)}` : '';
    return `${raporBaseUrl}/sso/callback?access_token=${encodeURIComponent(token)}&institution_id=smpn1prambon&sub=${encodeURIComponent(user?.id || '')}&user=${encodedUser}${redirectParam}`;
  };

  const getBelajarLaunchUrl = (targetPath = '') => {
    const token = tokenStorage.getToken() || 'sso-session-token';
    const userPayload = {
      id: user?.id || user?.person_id || 'user-1',
      username: user?.username || '',
      fullName: user?.fullName || user?.full_name || '',
      roleName: isKepalaSekolah ? 'KEPALA_SEKOLAH' : (role || 'GURU'),
      nimNip: user?.nimNip || user?.nip || user?.nisn || '',
    };
    const encodedUser = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(JSON.stringify(userPayload)))) : '';
    const redirectParam = targetPath ? `&redirect=${encodeURIComponent(targetPath)}` : '';
    return `${belajarBaseUrl}/sso/callback?access_token=${encodeURIComponent(token)}&institution_id=smpn1prambon&sub=${encodeURIComponent(user?.id || '')}&user=${encodedUser}${redirectParam}`;
  };

  const getPerpusLaunchUrl = () => {
    const isPustakawan = role === 'ADMIN_PERPUS' || role === 'PUSTAKAWAN';
    if (isPustakawan) {
      return `${perpusBaseUrl}/pustakawan`;
    }
    return perpusBaseUrl;
  };

  useEffect(() => {
    try {
      const storedPeriod = localStorage.getItem('spenspra_academic_period');
      const storedKkm = localStorage.getItem('spenspra_school_kkm');
      if (storedPeriod) {
        const parsed = JSON.parse(storedPeriod);
        if (storedKkm && Number(storedKkm) > 0) {
          parsed.kkm = Number(storedKkm);
        }
        setAcademicPeriod(parsed);
      } else if (storedKkm && Number(storedKkm) > 0) {
        setAcademicPeriod((prev) => ({ ...prev, kkm: Number(storedKkm) }));
      }
    } catch (e) {}

    Promise.all([
      schoolPeopleApi.list().catch(() => []),
      classApiAdapter.getAll().catch(() => []),
    ]).then(([people, classes]) => {
      const pList = Array.isArray(people) ? people : [];
      const cList = Array.isArray(classes) ? classes : [];
      const teacherList = pList.filter((p) => p.person_type === 'GURU');
      const studentList = pList.filter((p) => p.person_type === 'SISWA');

      setStats({
        teachers: teacherList.length,
        students: studentList.length,
        classes: cList.length,
      });
    }).catch(() => {});
  }, []);

  // ────────────────────────────────────────────────────────────
  // TAMPILAN KHUSUS KEPALA SEKOLAH
  // ────────────────────────────────────────────────────────────
  if (isKepalaSekolah) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        <div className="space-y-6 animate-in fade-in">
          {/* Header Eksekutif Kepala Sekolah */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 to-[#4B3B78] p-6 text-white shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-[11px] font-bold text-white backdrop-blur-xs">
                  <span>👑</span>
                  <span>Executive Oversight & Leadership Panel</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Fitur & Hak Akses Kepala Sekolah (SMPN 1 Prambon)
                </h2>
                <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
                  Kepala Sekolah memiliki wewenang supervisi eksekutif tanpa harus mengedit data teknis: 
                  memantau kemajuan nilai akademik, pengesahan resmi rapor siswa dengan tanda tangan digital, 
                  serta evaluasi budaya literasi sekolah.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <a
                  href={getRaporLaunchUrl('/admin/monitoring')}
                  className="rounded-xl bg-white text-blue-900 px-4 py-2.5 text-xs font-bold hover:bg-blue-50 transition shadow-xs flex items-center gap-1.5"
                >
                  <span>📊</span>
                  <span>Monitoring Nilai di e-Rapor ↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* 3 PILAR UTAMA FITUR KEPALA SEKOLAH */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                  ✍️
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  1. Pengesahan & TTD Digital Rapor
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kepala Sekolah dapat membubuhkan tanda tangan digital dan persetujuan resmi secara massal 
                  untuk seluruh rombel (Kelas 7, 8, dan 9).
                </p>
                <ul className="text-[11px] text-slate-500 space-y-1 list-disc pl-4">
                  <li>Otomatis memuat tanda tangan & NIP Kepala Sekolah.</li>
                  <li>Mengaktifkan format cetak 3 kolom resmi.</li>
                  <li>Status pengesahan tercatat aman di sistem database.</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <a
                  href={getRaporLaunchUrl('/admin/monitoring?tab=ENDORSEMENTS')}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-bold transition shadow-2xs"
                >
                  <span>Buka Tanda Tangan Digital Rapor</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                  📈
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  2. Monitoring Nilai Seluruh Guru
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Melihat grafik kelengkapan pengisian nilai UTS, UAS, dan capaian kompetensi oleh guru mata pelajaran dan wali kelas secara real-time.
                </p>
                <ul className="text-[11px] text-slate-500 space-y-1 list-disc pl-4">
                  <li>Mengetahui guru atau kelas yang belum melengkapi nilai sebelum batas waktu.</li>
                  <li>Distribusi sebaran nilai siswa terhadap KKM ({academicPeriod.kkm || 75}).</li>
                  <li>Mencegah keterlambatan pencetakan buku rapor siswa.</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <a
                  href={getRaporLaunchUrl('/admin/monitoring')}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-bold transition shadow-2xs"
                >
                  <span>Tinjau Progres Nilai Guru</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
                  📖
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  3. Evaluasi Budaya Literasi Siswa
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Memantau statistik peminjaman buku perpustakaan dan kunjungan literasi siswa berbasis scan barcode kartu identitas.
                </p>
                <ul className="text-[11px] text-slate-500 space-y-1 list-disc pl-4">
                  <li>Rekapitulasi minat baca per jenjang kelas.</li>
                  <li>Pengawasan koleksi buku dan utilisasi fasilitas perpustakaan.</li>
                  <li>Bahan evaluasi rapat pimpinan dan kurikulum.</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <a
                  href={getPerpusLaunchUrl()}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white py-2 text-xs font-bold transition shadow-2xs"
                >
                  <span>Tinjau Laporan Perpustakaan</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Matriks Kesiapan Akademik Sekolah (Semester Berjalan)
            </h3>
            <div className="grid gap-3 sm:grid-cols-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tahun Ajaran</span>
                <p className="text-base font-black text-slate-900">{academicPeriod.year}</p>
                <span className="text-blue-700 font-semibold">Semester {academicPeriod.semester}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Rombel Diawasi</span>
                <p className="text-base font-black text-slate-900">{stats.classes} Rombongan Belajar</p>
                <span className="text-slate-500">Kelas 7, 8, 9</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Peserta Didik</span>
                <p className="text-base font-black text-slate-900">{stats.students} Siswa</p>
                <span className="text-slate-500">100% Memiliki Token Barcode</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tenaga Pendidik</span>
                <p className="text-base font-black text-slate-900">{stats.teachers} Guru Pengampu</p>
                <span className="text-emerald-700 font-semibold">Siap Input Nilai Rapor</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // TAMPILAN GURU & CIVITAS BIASA
  // ────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Banner Sambutan Guru / Siswa */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EDEAF5] px-2.5 py-0.5 text-[10px] font-semibold text-[#4B3B78] uppercase tracking-wider mb-2">
            {isSiswa ? 'Portal Peserta Didik' : 'Portal Civitas Akademika'}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
            Selamat Datang, {user?.fullName || user?.full_name || user?.username || (isSiswa ? 'Siswa' : 'Bapak/Ibu Guru')}
          </h1>
          <p className="mt-1 text-sm text-[#667085] font-normal">
            Portal Layanan Digital Terpadu SMP Negeri 1 Prambon
          </p>
        </div>
        <div className="flex items-center gap-3.5 bg-[#FAF9FD] px-4 py-3 rounded-xl border border-[#EDEAF5] shrink-0 self-start sm:self-auto">
          <div className="w-10 h-10 rounded-full bg-[#EDEAF5] text-[#3D2E66] flex items-center justify-center font-bold text-sm tracking-wide shadow-xs shrink-0">
            {isSiswa ? 'SW' : (role?.slice(0, 2).toUpperCase() || 'GU')}
          </div>
          <div className="text-left">
            <p className="font-bold text-[#172033] text-sm leading-tight">
              {user?.nimNip || user?.nip || user?.nisn || user?.username || 'Akun Aktif'}
            </p>
            <span className="inline-block mt-0.5 rounded-full bg-[#EDEAF5] px-2 py-0.5 text-[10px] font-semibold text-[#30264F] uppercase tracking-wider">
              {isSiswa ? 'PESERTA DIDIK' : (role || 'GURU')}
            </span>
          </div>
        </div>
      </div>

      {/* Pilihan Layanan Aplikasi Civitas */}
      <div>
        <h2 className="text-xs font-bold text-[#667085] uppercase tracking-wider mb-4 px-1">
          {isSiswa ? 'Layanan Siswa Terpadu' : 'Layanan Aplikasi Civitas'}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {/* Menu 1: Spenspra Belajar (LMS & CBT) */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm hover:shadow-md hover:border-[#F2C94C] transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-lg bg-[#FEF9E7] text-[#9A7B00] flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#172033] text-lg">Spenspra Belajar</h3>
                <span className="text-[10px] font-semibold text-[#8B6E00] bg-[#FFFBEA] border border-[#F2C94C] px-2 py-0.5 rounded-full">
                  LMS & CBT
                </span>
              </div>
              <p className="text-sm text-[#667085] mt-1.5 leading-relaxed">
                {isSiswa
                  ? 'Akses materi pelajaran dari guru, kumpulkan tugas online, dan kerjakan ujian CBT.'
                  : 'Platform pembelajaran daring, bank materi, penugasan digital, serta ujian CBT anti-cheat.'}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
              <a
                href={getBelajarLaunchUrl()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#2E7D5B] hover:bg-[#236348] active:bg-[#1A4C36] text-white py-2.5 px-4 text-sm font-semibold transition shadow-sm cursor-pointer"
              >
                <span>Buka Belajar & CBT</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          {/* Menu 2: e-Rapor SPENSPRA */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm hover:shadow-md hover:border-[#B9B0D2] transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-lg bg-[#EDEAF5] text-[#4B3B78] flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-[#172033] text-lg">e-Rapor Spenspra</h3>
              <p className="text-sm text-[#667085] mt-1.5 leading-relaxed">
                {isSiswa
                  ? 'Lihat capaian nilai harian, nilai sumatif tengah/akhir semester, dan rekapitulasi buku rapor.'
                  : 'Penginputan nilai UTS, UAS, monitoring capaian belajar siswa, dan pencetakan rapor oleh wali kelas.'}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
              <a
                href={getRaporLaunchUrl()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#4B3B78] hover:bg-[#3D2E66] active:bg-[#30264F] text-white py-2.5 px-4 text-sm font-semibold transition shadow-sm cursor-pointer"
              >
                <span>{isSiswa ? 'Lihat Nilai & Rapor' : 'Buka Aplikasi e-Rapor'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          {/* Menu 3: e-Perpustakaan */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm hover:shadow-md hover:border-[#A8CBDD] transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-lg bg-[#E4F1F8] text-[#4F8FBB] flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-bold text-[#172033] text-lg">e-Perpustakaan</h3>
              <p className="text-sm text-[#667085] mt-1.5 leading-relaxed">
                {isSiswa
                  ? 'Katalog koleksi buku sekolah, status peminjaman buku, dan riwayat bacaan siswa.'
                  : 'Katalog pustaka sekolah, sirkulasi peminjaman buku, dan riwayat bacaan civitas sekolah.'}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
              <a
                href={getPerpusLaunchUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#4F8FBB] hover:bg-[#397394] active:bg-[#2E607C] text-white py-2.5 px-4 text-sm font-semibold transition shadow-sm cursor-pointer"
              >
                <span>Buka Perpustakaan</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          {/* Menu 4: Presensi Barcode */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-lg bg-[#FFF6D6] text-[#A97E0D] flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#172033] text-lg">{isSiswa ? 'Kartu Barcode & Absensi' : 'Presensi Barcode'}</h3>
                <span className="text-[10px] font-semibold text-[#1C5038] bg-[#F7FCF9] border border-[#A9D8BC] px-2 py-0.5 rounded-full">
                  Terintegrasi
                </span>
              </div>
              <p className="text-sm text-[#667085] mt-1.5 leading-relaxed">
                {isSiswa
                  ? 'Kartu barcode identitas digital resmi Anda untuk absensi harian dan presensi di sekolah.'
                  : 'Pencatatan presensi kehadiran siswa dan kelas berbasis kartu barcode resmi Spenspra.'}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
              <Link
                href="/students"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F8F9FC] text-[#172033] py-2.5 px-4 text-sm font-semibold transition shadow-sm cursor-pointer"
              >
                <span>Lihat Kartu Barcode Saya</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
