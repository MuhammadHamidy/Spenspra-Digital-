'use client';

import React, { useEffect, useState } from 'react';
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

  const isLibrarian = role === 'ADMIN_PERPUS' || role === 'PUSTAKAWAN';
  const isRaporAdmin = role === 'ADMIN_RAPOR';

  const getRaporLaunchUrl = (targetPath = '') => {
    const token = tokenStorage.getToken() || 'sso-session-token';
    const raporRole = isKepalaSekolah
      ? 'KEPALA_SEKOLAH'
      : isRaporAdmin
      ? 'ADMIN_RAPOR'
      : isSiswa
      ? 'SISWA'
      : 'GURU';

    const userPayload = {
      id: user?.id || user?.person_id || 'user-1',
      username: user?.username || '',
      fullName: user?.fullName || user?.full_name || '',
      roleName: raporRole,
      peran: raporRole,
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
    const belajarRole = isSiswa ? 'SISWA' : 'GURU';
    const userPayload = {
      id: user?.id || user?.person_id || 'user-1',
      username: user?.username || '',
      fullName: user?.fullName || user?.full_name || '',
      roleName: belajarRole,
      peran: belajarRole,
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
    const destination = isLibrarian ? '/pustakawan' : (targetPath || '/');
    const token = tokenStorage.getToken() || 'sso-session-token';
    const userPayload = {
      id: user?.id || user?.person_id || 'user-1',
      username: user?.username || '',
      fullName: user?.fullName || user?.full_name || '',
      roleName: isLibrarian ? 'ADMIN_PERPUS' : (isKepalaSekolah ? 'KEPALA_SEKOLAH' : (isSiswa ? 'SISWA' : 'GURU')),
      nimNip: user?.nimNip || user?.nip || user?.nisn || '',
      nama: user?.fullName || user?.full_name || '',
      peran: isLibrarian ? 'ADMIN_PERPUS' : (isSiswa ? 'SISWA' : 'GURU'),
      kelas_atau_jabatan: isLibrarian ? 'Pustakawan / Guru' : (user?.className || user?.kelas || (isSiswa ? 'Peserta Didik' : 'Pendidik')),
    };
    const encodedUser = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(JSON.stringify(userPayload)))) : '';
    const redirectParam = destination ? `&redirect=${encodeURIComponent(destination)}` : '';
    return `${perpusBaseUrl}/sso/callback?access_token=${encodeURIComponent(token)}&institution_id=smpn1prambon&sub=${encodeURIComponent(user?.id || '')}&user=${encodedUser}${redirectParam}`;
  };

  useEffect(() => {
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
  // TAMPILAN KHUSUS KEPALA SEKOLAH (EXECUTIVE OVERSIGHT SUITE)
  // ────────────────────────────────────────────────────────────
  if (isKepalaSekolah) {
    return (
      <div className="mx-auto max-w-6xl space-y-7 pb-12 animate-in fade-in duration-200">
        {/* Executive Header Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-primary-300/40 bg-gradient-to-br from-[#2D2348] via-[#3C2F60] to-[#4B3B78] text-white p-7 sm:p-9 shadow-sm">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-accent-300 backdrop-blur-md border border-white/10">
                <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
                <span>Panel Pengawasan Eksekutif Kepala Sekolah</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                Supervisi Akademik & Kepemimpinan Sekolah
              </h1>
              <p className="text-xs sm:text-sm text-neutral-200 font-normal leading-relaxed">
                Pemantauan terpadu seluruh subsistem digital SMPN 1 Prambon: pengesahan massal tanda tangan digital buku rapor, monitoring keterisian nilai guru pengampu, serta evaluasi budaya literasi sekolah.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href={getRaporLaunchUrl('/admin/monitoring?tab=ENDORSEMENTS')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-neutral-1000 px-5 py-3 text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Pengesahan TTD Rapor</span>
              </a>
              <a
                href={getRaporLaunchUrl('/admin/monitoring')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white px-5 py-3 text-xs font-bold transition border border-white/20 backdrop-blur-xs cursor-pointer"
              >
                <span>Monitoring Nilai Guru</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>

        {/* Executive Metric Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-neutral-300 bg-white p-4.5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Tahun Akademik</span>
            <p className="text-xl font-bold text-neutral-1000 tracking-tight">{academicPeriod.year}</p>
            <p className="text-xs font-semibold text-primary-500">Semester {academicPeriod.semester} • KKM {academicPeriod.kkm || 75}</p>
          </div>
          <div className="rounded-xl border border-neutral-300 bg-white p-4.5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Rombongan Belajar</span>
            <p className="text-xl font-bold text-neutral-1000 tracking-tight">{stats.classes || 30} Rombel</p>
            <p className="text-xs text-neutral-700">Tingkat 7, 8, dan 9 Paralel</p>
          </div>
          <div className="rounded-xl border border-neutral-300 bg-white p-4.5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Peserta Didik Aktif</span>
            <p className="text-xl font-bold text-neutral-1000 tracking-tight">{stats.students || 960} Siswa</p>
            <p className="text-xs text-success-500 font-medium">100% Terdaftar di SSO</p>
          </div>
          <div className="rounded-xl border border-neutral-300 bg-white p-4.5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Tenaga Pendidik</span>
            <p className="text-xl font-bold text-neutral-1000 tracking-tight">{stats.teachers || 58} Guru</p>
            <p className="text-xs text-neutral-700">Pengampu Mata Pelajaran</p>
          </div>
        </section>

        {/* 3 Executive Control Pillars */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Akses Modul Supervisi Kepala Sekolah
            </h2>
            <span className="text-[11px] text-neutral-500 font-medium">
              Otoritas Validasi & Kebijakan
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {/* Pillar 1: Pengesahan & TTD Digital Rapor */}
            <div className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-2xs hover:border-success-500/60 hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-success-50 text-success-500 border border-success-300/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-success-800 bg-success-50 border border-success-300 px-2.5 py-0.5 rounded-full">
                    Otorisasi Resmi
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-1000 group-hover:text-success-800 transition-colors">
                    Pengesahan & TTD Digital Rapor
                  </h3>
                  <p className="mt-1.5 text-xs text-neutral-700 leading-relaxed">
                    Membubuhkan tanda tangan digital tersertifikasi dan persetujuan resmi massal untuk seluruh buku rapor siswa Kelas 7, 8, dan 9.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-500 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                    Format Cetak 3-Kolom Resmi Kemendikbud
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                    Riwayat persetujuan terekam permanen
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-neutral-100">
                <a
                  href={getRaporLaunchUrl('/admin/monitoring?tab=ENDORSEMENTS')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-success-500 hover:bg-success-800 text-white py-2.5 px-4 text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <span>Buka Lembar Pengesahan Rapor</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            {/* Pillar 2: Monitoring Nilai Seluruh Guru */}
            <div className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-2xs hover:border-primary-500/60 hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-500 border border-primary-300/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-primary-700 bg-primary-50 border border-primary-300 px-2.5 py-0.5 rounded-full">
                    Audit Nilai
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-1000 group-hover:text-primary-700 transition-colors">
                    Monitoring Pengisian Nilai Guru
                  </h3>
                  <p className="mt-1.5 text-xs text-neutral-700 leading-relaxed">
                    Memantau persentase kelengkapan penginputan nilai formatif, sumatif, dan capaian kompetensi oleh guru mata pelajaran secara real-time.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-500 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                    Deteksi keterlambatan input nilai sebelum cetak
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                    Sebaran ketercapaian KKM {academicPeriod.kkm || 75} per mapel
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-neutral-100">
                <a
                  href={getRaporLaunchUrl('/admin/monitoring')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 hover:bg-primary-700 text-white py-2.5 px-4 text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <span>Buka Dashboard Nilai Guru</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            {/* Pillar 3: Evaluasi Budaya Literasi */}
            <div className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-2xs hover:border-secondary-500/60 hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-secondary-50 text-secondary-500 border border-secondary-300/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-secondary-700 bg-secondary-50 border border-secondary-300 px-2.5 py-0.5 rounded-full">
                    Budaya Baca
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-1000 group-hover:text-secondary-700 transition-colors">
                    Evaluasi Pustaka & Budaya Baca
                  </h3>
                  <p className="mt-1.5 text-xs text-neutral-700 leading-relaxed">
                    Evaluasi intensitas peminjaman buku fisik, kehadiran kunjungan siswa di perpustakaan, dan capaian target literasi sekolah.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-500 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                    Statistik sirkulasi judul buku terfavorit
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                    Laporan kehadiran kunjungan per rombel
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-neutral-100">
                <a
                  href={getPerpusLaunchUrl('/reading-insights')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-500 hover:bg-secondary-700 text-white py-2.5 px-4 text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <span>Buka Laporan Budaya Baca</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // TAMPILAN GURU, SISWA, DAN CIVITAS AKADEMIKA
  // ────────────────────────────────────────────────────────────
  const userRoleLabel = isSiswa
    ? 'Peserta Didik'
    : isLibrarian
    ? 'Guru • Admin Perpustakaan'
    : isRaporAdmin
    ? 'Guru • Administrator e-Rapor'
    : 'Pendidik / Guru Pengampu';

  const userIdentifier = isSiswa
    ? (user?.nimNip || user?.nisn ? `NISN: ${user?.nimNip || user?.nisn}` : 'Siswa SMPN 1 Prambon')
    : (user?.nimNip || user?.nip ? `NIP: ${user?.nimNip || user?.nip}` : 'Pendidik SMPN 1 Prambon');

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12 animate-in fade-in duration-200">
      {/* 1. INSTITUTIONAL WELCOME STRIP */}
      <section className="rounded-2xl border border-neutral-300 bg-white p-6 sm:p-7 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold text-primary-700 border border-primary-100">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            <span>Gerbang Layanan Digital Civitas Akademika</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-1000">
            Selamat Datang, {user?.fullName || user?.full_name || user?.username || 'Civitas Spenspra'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed max-w-xl">
            {isSiswa
              ? `Akses mandiri materi pelajaran, pengumpulan tugas digital, dan pelaksanaan e-Ujian CBT anti-cheat untuk Kelas ${user?.className || user?.class_name || 'Binaan'}.`
              : 'Pusat integrasi pengajaran: kelola materi & bank tugas e-learning, penginputan nilai rapor Kurikulum Merdeka, serta sirkulasi perpustakaan.'}
          </p>
        </div>

        {/* User Identity Chip */}
        <div className="flex items-center gap-3.5 bg-neutral-100 px-4 py-3 rounded-xl border border-neutral-300 shrink-0 self-start sm:self-auto">
          <div className="w-11 h-11 rounded-xl bg-primary-500 text-white flex items-center justify-center font-bold text-sm tracking-wide shadow-2xs shrink-0">
            {(user?.fullName || user?.full_name || (isSiswa ? 'S' : 'G')).charAt(0).toUpperCase()}
          </div>
          <div className="text-left space-y-0.5">
            <p className="font-bold text-neutral-1000 text-xs sm:text-sm leading-tight truncate max-w-[180px]">
              {user?.fullName || user?.full_name || user?.username || 'Akun Aktif'}
            </p>
            <p className="text-[11px] font-mono text-neutral-700">
              {userIdentifier}
            </p>
            <span className="inline-block rounded-md bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">
              {userRoleLabel}
            </span>
          </div>
        </div>
      </section>

      {/* 2. ACADEMIC PERIOD & CONNECTIVITY STATUS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-3.5 space-y-0.5">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Tahun Pelajaran</span>
          <p className="font-bold text-neutral-1000 text-sm">{academicPeriod.year}</p>
        </div>
        <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-3.5 space-y-0.5">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Semester Aktif</span>
          <p className="font-bold text-primary-500 text-sm">Semester {academicPeriod.semester}</p>
        </div>
        <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-3.5 space-y-0.5">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Batas KKM Sekolah</span>
          <p className="font-bold text-neutral-1000 text-sm">{academicPeriod.kkm || 75} Poin</p>
        </div>
        <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-3.5 space-y-0.5">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Autentikasi SSO</span>
          <p className="font-bold text-success-500 text-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
            <span>Aktif Terverifikasi</span>
          </p>
        </div>
      </section>

      {/* 3. SISTEM UTAMA SPENSPRA (THE CORE APP SUITE) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Ekosistem Aplikasi Sekolah Terintegrasi
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Pilih sistem aplikasi di bawah ini untuk membuka modul kerja Anda.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-primary-500 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100">
            Single Sign-On (SSO)
          </span>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* ========================================================
              CARD 1: SPENSPRA BELAJAR (LMS & CBT ANTI-CHEAT)
              ======================================================== */}
          <div className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-2xs hover:border-success-500/60 hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
            <div className="space-y-4">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-success-50 text-success-500 border border-success-300/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-success-800 bg-success-50 border border-success-300 px-2.5 py-0.5 rounded-full">
                  LMS & CBT
                </span>
              </div>

              {/* Title & Deskripsi */}
              <div>
                <h3 className="text-lg font-bold text-neutral-1000 group-hover:text-success-800 transition-colors">
                  Spenspra Belajar
                </h3>
                <p className="text-xs text-neutral-700 mt-1.5 leading-relaxed">
                  {isSiswa
                    ? 'Akses materi ajar daring, penyerahan tugas digital, serta ruang pengerjaan ujian CBT dengan proteksi lockdown layar penuh.'
                    : 'Kelola repositori materi ajar, bank tugas mandiri, serta pelaksanaan ujian CBT anti-cheat dengan PIN pengawas acak dinamis.'}
                </p>
              </div>

              {/* Sub-modul Tag Strip */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
                  Bank Soal CBT
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
                  Anti-Cheat Kiosk
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
                  Materi & Tugas
                </span>
              </div>
            </div>

            {/* Launch Action & Shortcuts */}
            <div className="mt-6 pt-4 border-t border-neutral-100 space-y-3">
              <a
                href={getBelajarLaunchUrl()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-success-500 hover:bg-success-800 active:bg-success-800 text-white py-2.5 px-4 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <span>Masuk ke Spenspra Belajar</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              {/* Quick Jump Links */}
              <div className="flex items-center justify-center gap-3 text-[11px] text-neutral-500">
                <a
                  href={getBelajarLaunchUrl(isSiswa ? '/ujian' : '/guru/ujian')}
                  className="hover:text-success-500 transition-colors font-medium hover:underline"
                >
                  {isSiswa ? 'Portal Ujian CBT' : 'Jadwal e-Ujian'}
                </a>
                <span>•</span>
                <a
                  href={getBelajarLaunchUrl(isSiswa ? '/materi' : '/guru/materi')}
                  className="hover:text-success-500 transition-colors font-medium hover:underline"
                >
                  Materi Ajar
                </a>
                <span>•</span>
                <a
                  href={getBelajarLaunchUrl(isSiswa ? '/tugas' : '/guru/tugas')}
                  className="hover:text-success-500 transition-colors font-medium hover:underline"
                >
                  Tugas
                </a>
              </div>
            </div>
          </div>

          {/* ========================================================
              CARD 2: E-RAPOR SPENSPRA (KURIKULUM MERDEKA)
              ======================================================== */}
          <div className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-2xs hover:border-primary-500/60 hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
            <div className="space-y-4">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-500 border border-primary-300/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-primary-700 bg-primary-50 border border-primary-300 px-2.5 py-0.5 rounded-full">
                  Kurikulum Merdeka
                </span>
              </div>

              {/* Title & Deskripsi */}
              <div>
                <h3 className="text-lg font-bold text-neutral-1000 group-hover:text-primary-700 transition-colors">
                  e-Rapor Spenspra
                </h3>
                <p className="text-xs text-neutral-700 mt-1.5 leading-relaxed">
                  {isSiswa
                    ? 'Transkrip nilai capaian kompetensi belajar, laporan rapor sisipan tengah semester, dan buku rapor resmi semester aktif.'
                    : 'Penginputan nilai harian, PTS, UAS, perumusan capaian tujuan pembelajaran (TP), dan cetak buku rapor resmi oleh wali kelas.'}
                </p>
              </div>

              {/* Sub-modul Tag Strip */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
                  Buku Induk Walas
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
                  Penilaian KKM 75
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
                  Cetak 3-Kolom
                </span>
              </div>
            </div>

            {/* Launch Action & Shortcuts */}
            <div className="mt-6 pt-4 border-t border-neutral-100 space-y-3">
              <a
                href={getRaporLaunchUrl()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 hover:bg-primary-700 active:bg-primary-800 text-white py-2.5 px-4 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <span>Masuk ke e-Rapor Spenspra</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              {/* Quick Jump Links */}
              <div className="flex items-center justify-center gap-3 text-[11px] text-neutral-500">
                <a
                  href={getRaporLaunchUrl('/wali-kelas')}
                  className="hover:text-primary-500 transition-colors font-medium hover:underline"
                >
                  Buku Nilai Walas
                </a>
                <span>•</span>
                <a
                  href={getRaporLaunchUrl('/penilaian/uas')}
                  className="hover:text-primary-500 transition-colors font-medium hover:underline"
                >
                  Nilai UAS
                </a>
                <span>•</span>
                <a
                  href={getRaporLaunchUrl('/penilaian/pts')}
                  className="hover:text-primary-500 transition-colors font-medium hover:underline"
                >
                  Nilai PTS
                </a>
              </div>
            </div>
          </div>

          {/* ========================================================
              CARD 3: E-PERPUSTAKAAN (PUSTAKA DIGITAL & SIRKULASI)
              ======================================================== */}
          <div className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-2xs hover:border-secondary-500/60 hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
            <div className="space-y-4">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-secondary-50 text-secondary-500 border border-secondary-300/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-secondary-700 bg-secondary-50 border border-secondary-300 px-2.5 py-0.5 rounded-full">
                  {isLibrarian ? 'Meja Pustakawan' : 'Pustaka Digital'}
                </span>
              </div>

              {/* Title & Deskripsi */}
              <div>
                <h3 className="text-lg font-bold text-neutral-1000 group-hover:text-secondary-700 transition-colors">
                  e-Perpustakaan
                </h3>
                <p className="text-xs text-neutral-700 mt-1.5 leading-relaxed">
                  {isLibrarian
                    ? 'Manajemen sirkulasi peminjaman barcode, registrasi koleksi buku fisik, presensi pengunjung, dan monitoring budaya baca civitas.'
                    : 'Penelusuran katalog koleksi buku perpustakaan sekolah, informasi ketersediaan rak fisik, dan riwayat peminjaman siswa.'}
                </p>
              </div>

              {/* Sub-modul Tag Strip */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
                  Katalog Koleksi
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
                  Barcode RFID
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
                  Reading Insights
                </span>
              </div>
            </div>

            {/* Launch Action & Shortcuts */}
            <div className="mt-6 pt-4 border-t border-neutral-100 space-y-3">
              <a
                href={getPerpusLaunchUrl()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-500 hover:bg-secondary-700 active:bg-secondary-800 text-white py-2.5 px-4 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <span>{isLibrarian ? 'Buka Meja Pustakawan' : 'Masuk ke Perpustakaan'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              {/* Quick Jump Links */}
              <div className="flex items-center justify-center gap-3 text-[11px] text-neutral-500">
                <a
                  href={getPerpusLaunchUrl('/books')}
                  className="hover:text-secondary-500 transition-colors font-medium hover:underline"
                >
                  Katalog Buku
                </a>
                <span>•</span>
                <a
                  href={getPerpusLaunchUrl('/peminjaman')}
                  className="hover:text-secondary-500 transition-colors font-medium hover:underline"
                >
                  Peminjaman
                </a>
                <span>•</span>
                <a
                  href={getPerpusLaunchUrl('/riwayat-kunjungan')}
                  className="hover:text-secondary-500 transition-colors font-medium hover:underline"
                >
                  Kunjungan
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INSTITUTIONAL FOOTNOTE / ACCREDITATION BADGE */}
      <footer className="pt-4 border-t border-neutral-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-800">SMP Negeri 1 Prambon</span>
          <span>•</span>
          <span>Akreditasi A</span>
          <span>•</span>
          <span>NPSN 20501867</span>
        </div>
        <p className="text-[11px] text-neutral-500">
          Single Sign-On (SSO) Terpadu • Sesi Terenkripsi JWT RSA-256
        </p>
      </footer>
    </div>
  );
}
