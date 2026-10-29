'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getRole } from '@/lib/access/portalAccess';
import { schoolPeopleApi } from '@/lib/features/schoolPeopleApi';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
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
      className: user?.className || user?.kelas || '',
      courseNames: user?.courseNames || user?.course_names || user?.courses || [],
      courseIds: user?.courseIds || user?.course_ids || [],
      classCodes: user?.classCodes || user?.class_codes || user?.classes || [],
      classIds: user?.classIds || user?.class_ids || [],
    };
    const encodedUser = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(JSON.stringify(userPayload)))) : '';
    const redirectParam = targetPath ? `&redirect=${encodeURIComponent(targetPath)}` : '';
    const yearParam = academicPeriod?.year ? `&academic_year=${encodeURIComponent(academicPeriod.year)}` : '';
    const semParam = academicPeriod?.semester ? `&academic_semester=${encodeURIComponent(academicPeriod.semester)}` : '';
    const kkmParam = academicPeriod?.kkm ? `&school_kkm=${encodeURIComponent(academicPeriod.kkm)}` : '';
    return `${raporBaseUrl}/sso/callback?access_token=${encodeURIComponent(token)}&institution_id=smpn1prambon&sub=${encodeURIComponent(user?.id || '')}&user=${encodedUser}${yearParam}${semParam}${kkmParam}${redirectParam}`;
  };

  const getBelajarLaunchUrl = (targetPath = '') => {
    const token = tokenStorage.getToken() || 'sso-session-token';
    const userPayload = {
      id: user?.id || user?.person_id || 'user-1',
      username: user?.username || '',
      fullName: user?.fullName || user?.full_name || '',
      roleName: isKepalaSekolah ? 'KEPALA_SEKOLAH' : (role || 'GURU'),
      nimNip: user?.nimNip || user?.nip || user?.nisn || '',
      className: user?.className || user?.kelas || '',
      courseNames: user?.courseNames || user?.course_names || user?.courses || [],
      courseIds: user?.courseIds || user?.course_ids || [],
      classCodes: user?.classCodes || user?.class_codes || user?.classes || [],
      classIds: user?.classIds || user?.class_ids || [],
    };
    const encodedUser = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(JSON.stringify(userPayload)))) : '';
    const redirectParam = targetPath ? `&redirect=${encodeURIComponent(targetPath)}` : '';
    return `${belajarBaseUrl}/sso/callback?access_token=${encodeURIComponent(token)}&institution_id=smpn1prambon&sub=${encodeURIComponent(user?.id || '')}&user=${encodedUser}${redirectParam}`;
  };

  const getPerpusLaunchUrl = (targetPath = '') => {
    const isPustakawan = role === 'ADMIN_PERPUS' || role === 'PUSTAKAWAN';
    const destination = isPustakawan ? '/pustakawan' : (targetPath || '/');
    const token = tokenStorage.getToken() || 'sso-session-token';
    const userPayload = {
      id: user?.id || user?.person_id || 'user-1',
      username: user?.username || '',
      fullName: user?.fullName || user?.full_name || '',
      roleName: isKepalaSekolah ? 'KEPALA_SEKOLAH' : (role || (isSiswa ? 'SISWA' : 'GURU')),
      nimNip: user?.nimNip || user?.nip || user?.nisn || '',
      nama: user?.fullName || user?.full_name || '',
      peran: isSiswa ? 'SISWA' : (role || 'GURU'),
      kelas_atau_jabatan: user?.className || user?.kelas || (isSiswa ? 'Peserta Didik' : 'Pendidik'),
    };
    const encodedUser = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(JSON.stringify(userPayload)))) : '';
    const redirectParam = destination ? `&redirect=${encodeURIComponent(destination)}` : '';
    return `${perpusBaseUrl}/sso/callback?access_token=${encodeURIComponent(token)}&institution_id=smpn1prambon&sub=${encodeURIComponent(user?.id || '')}&user=${encodedUser}${redirectParam}`;
  };

  useEffect(() => {
    // Muat periode akademik aktif dari backend server secara real-time
    accountApiAdapter.getAcademicPeriod().then((serverPeriod) => {
      if (serverPeriod?.year && serverPeriod?.semester) {
        setAcademicPeriod(serverPeriod);
        try {
          localStorage.setItem('spenspra_academic_period', JSON.stringify(serverPeriod));
          if (serverPeriod.kkm) localStorage.setItem('spenspra_school_kkm', String(serverPeriod.kkm));

          const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
          const domainAttr = hostname.includes('spenspra.com') ? '; domain=.spenspra.com' : '';
          document.cookie = `spenspra_academic_year=${encodeURIComponent(serverPeriod.year)}; path=/; max-age=31536000; SameSite=Lax${domainAttr}`;
          document.cookie = `spenspra_academic_semester=${encodeURIComponent(serverPeriod.semester)}; path=/; max-age=31536000; SameSite=Lax${domainAttr}`;
          document.cookie = `spenspra_school_kkm=${encodeURIComponent(serverPeriod.kkm || 75)}; path=/; max-age=31536000; SameSite=Lax${domainAttr}`;

          document.cookie = `spenspra_academic_year=${encodeURIComponent(serverPeriod.year)}; path=/; max-age=31536000; SameSite=Lax`;
          document.cookie = `spenspra_academic_semester=${encodeURIComponent(serverPeriod.semester)}; path=/; max-age=31536000; SameSite=Lax`;
          document.cookie = `spenspra_school_kkm=${encodeURIComponent(serverPeriod.kkm || 75)}; path=/; max-age=31536000; SameSite=Lax`;
        } catch (e) {}
      }
    }).catch(() => {});

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
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6 pb-12 px-3 sm:px-6">
      {/* Banner Sambutan Guru / Siswa */}
      {isSiswa ? (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/30 p-4 sm:p-6 shadow-xs">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#4B3B78] text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-sm shrink-0">
              {(user?.fullName || user?.full_name || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-block px-2 py-0.5 rounded-md bg-[#EDEAF5] text-[#4B3B78] text-[10px] font-bold uppercase tracking-wider mb-1">
                Peserta Didik
              </span>
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                {user?.fullName || user?.full_name || user?.username || 'Siswa Spenspra'}
              </h1>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {user?.className || user?.class_name ? `Kelas ${user?.className || user?.class_name} • ` : ''}
                {user?.nimNip || user?.nisn ? `NISN: ${user?.nimNip || user?.nisn}` : 'SMP Negeri 1 Prambon'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EDEAF5] px-2.5 py-0.5 text-[10px] font-semibold text-[#4B3B78] uppercase tracking-wider mb-2">
              Portal Civitas Akademika
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
              Selamat Datang, {user?.fullName || user?.full_name || user?.username || 'Bapak/Ibu Guru'}
            </h1>
            <p className="mt-1 text-sm text-[#667085] font-normal">
              Portal Layanan Digital Terpadu SMP Negeri 1 Prambon
            </p>
          </div>
          <div className="flex items-center gap-3.5 bg-[#FAF9FD] px-4 py-3 rounded-xl border border-[#EDEAF5] shrink-0 self-start sm:self-auto">
            <div className="w-10 h-10 rounded-full bg-[#EDEAF5] text-[#3D2E66] flex items-center justify-center font-bold text-sm tracking-wide shadow-xs shrink-0">
              {role?.slice(0, 2).toUpperCase() || 'GU'}
            </div>
            <div className="text-left">
              <p className="font-bold text-[#172033] text-sm leading-tight">
                {user?.nimNip || user?.nip || user?.username || 'Akun Aktif'}
              </p>
              <span className="inline-block mt-0.5 rounded-full bg-[#EDEAF5] px-2 py-0.5 text-[10px] font-semibold text-[#30264F] uppercase tracking-wider">
                {role || 'GURU'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pilihan Layanan Aplikasi Civitas (2 Kolom x 2 Baris) */}
      <div>
        <div className="flex items-center justify-between mb-3.5 px-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {isSiswa ? 'Pilih Layanan Siswa' : 'Layanan Aplikasi Civitas'}
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            3 Layanan Terintegrasi SSO
          </span>
        </div>

        {isSiswa ? (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Spenspra Belajar (LMS & Ujian) */}
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#2E7D5B]/50 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-[12px] bg-[#E8F5E9] text-[#2E7D5B] flex items-center justify-center border border-[#C8E6C9] group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-[#2E7D5B] bg-[#E8F5E9] border border-[#C8E6C9] px-2.5 py-1 rounded-[999px]">
                    LMS & CBT
                  </span>
                </div>
                <h3 className="font-bold text-[#172033] text-lg group-hover:text-[#2E7D5B] transition-colors">
                  Spenspra Belajar
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] mt-1.5 leading-relaxed">
                  Platform pembelajaran daring, bank materi, penugasan digital, serta ujian CBT anti-cheat.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F2F4F7]">
                <a
                  href={getBelajarLaunchUrl()}
                  className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#2E7D5B] hover:bg-[#236348] active:bg-[#1A4C36] text-white px-5 py-2.5 text-sm font-semibold transition shadow-xs cursor-pointer"
                >
                  <span>Buka Belajar & CBT</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* 2. e-Rapor Spenspra */}
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#4B3B78]/50 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-[12px] bg-[#EDEAF5] text-[#4B3B78] flex items-center justify-center border border-[#DDD7ED] group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-[#4B3B78] bg-[#EDEAF5] border border-[#DDD7ED] px-2.5 py-1 rounded-[999px]">
                    Nilai Rapor
                  </span>
                </div>
                <h3 className="font-bold text-[#172033] text-lg group-hover:text-[#4B3B78] transition-colors">
                  e-Rapor Spenspra
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] mt-1.5 leading-relaxed">
                  Penginputan nilai UTS, UAS, monitoring capaian belajar siswa, dan pencetakan rapor oleh wali kelas.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F2F4F7]">
                <a
                  href={getRaporLaunchUrl()}
                  className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#4B3B78] hover:bg-[#3D2E66] active:bg-[#30264F] text-white px-5 py-2.5 text-sm font-semibold transition shadow-xs cursor-pointer"
                >
                  <span>Buka Aplikasi e-Rapor</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* 3. e-Perpustakaan */}
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#4F8FBB]/50 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-[12px] bg-[#E4F1F8] text-[#4F8FBB] flex items-center justify-center border border-[#CDE5F1] group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-[#4F8FBB] bg-[#E4F1F8] border border-[#CDE5F1] px-2.5 py-1 rounded-[999px]">
                    Katalog Pustaka
                  </span>
                </div>
                <h3 className="font-bold text-[#172033] text-lg group-hover:text-[#4F8FBB] transition-colors">
                  e-Perpustakaan
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] mt-1.5 leading-relaxed">
                  Katalog pustaka sekolah, sirkulasi peminjaman buku, dan riwayat bacaan civitas sekolah.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F2F4F7]">
                <a
                  href={getPerpusLaunchUrl()}
                  className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#4F8FBB] hover:bg-[#3D749B] active:bg-[#315D7C] text-white px-5 py-2.5 text-sm font-semibold transition shadow-xs cursor-pointer"
                >
                  <span>Buka Perpustakaan</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {/* Menu 1: Spenspra Belajar (LMS & CBT) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FEF9E7] text-[#9A7B00] flex items-center justify-center border border-[#F2C94C]/30 group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-[#8B6E00] bg-[#FFFBEA] border border-[#F2C94C] px-2.5 py-1 rounded-full">
                    LMS & CBT
                  </span>
                </div>
                <h3 className="font-bold text-[#172033] text-lg group-hover:text-emerald-700 transition-colors">
                  Spenspra Belajar
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] mt-1.5 leading-relaxed">
                  Platform pembelajaran daring, kelola bank materi ajar, penugasan digital, serta pelaksanaan ujian CBT dengan pengawasan anti-cheat.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <a
                  href={getBelajarLaunchUrl()}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#2E7D5B] hover:bg-[#236348] active:bg-[#1A4C36] text-white py-2.5 px-4 text-sm font-semibold transition shadow-xs cursor-pointer"
                >
                  <span>Buka Belajar & CBT</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Menu 2: e-Rapor SPENSPRA */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#B9B0D2] transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#EDEAF5] text-[#4B3B78] flex items-center justify-center border border-[#DDD7ED] group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-[#4B3B78] bg-[#EDEAF5] border border-[#DDD7ED] px-2.5 py-1 rounded-full">
                    Kurikulum Merdeka
                  </span>
                </div>
                <h3 className="font-bold text-[#172033] text-lg group-hover:text-[#4B3B78] transition-colors">
                  e-Rapor Spenspra
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] mt-1.5 leading-relaxed">
                  Penginputan nilai harian, UTS, UAS, monitoring capaian belajar siswa, dan pencetakan buku rapor resmi oleh wali kelas.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <a
                  href={getRaporLaunchUrl()}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#4B3B78] hover:bg-[#3D2E66] active:bg-[#30264F] text-white py-2.5 px-4 text-sm font-semibold transition shadow-xs cursor-pointer"
                >
                  <span>Buka Aplikasi e-Rapor</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Menu 3: e-Perpustakaan */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#A8CBDD] transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#E4F1F8] text-[#4F8FBB] flex items-center justify-center border border-sky-100 group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                    Pustaka Digital
                  </span>
                </div>
                <h3 className="font-bold text-[#172033] text-lg group-hover:text-[#4F8FBB] transition-colors">
                  e-Perpustakaan
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] mt-1.5 leading-relaxed">
                  Katalog pustaka sekolah, sirkulasi peminjaman dan pengembalian buku, serta riwayat bacaan civitas sekolah.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <a
                  href={getPerpusLaunchUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F8FBB] hover:bg-[#397394] active:bg-[#2E607C] text-white py-2.5 px-4 text-sm font-semibold transition shadow-xs cursor-pointer"
                >
                  <span>Buka Perpustakaan</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
