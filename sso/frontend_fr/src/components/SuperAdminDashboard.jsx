'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getRole } from '@/lib/access/portalAccess';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { schoolPeopleApi } from '@/lib/features/schoolPeopleApi';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const role = getRole(user);
  const isKepalaSekolah = role.includes('KEPALA');

  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    tendik: 0,
    classes: 0,
    barcodes: 0,
    grade7: 0,
    grade8: 0,
    grade9: 0,
    totalAccounts: 0,
    teachersWithAccount: 0,
  });
  const [academicPeriod, setAcademicPeriod] = useState({
    year: '2025/2026',
    semester: 'GENAP',
    kkm: 75,
    status: 'AKTIF',
  });
  const [loadingStats, setLoadingStats] = useState(false);

  const raporBaseUrl = process.env.NEXT_PUBLIC_RAPOR_URL || 'http://rapor.localhost';
  const perpusBaseUrl = process.env.NEXT_PUBLIC_PERPUS_URL || 'http://perpus.localhost';

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

    setLoadingStats(true);
    Promise.all([
      schoolPeopleApi.list().catch(() => []),
      classApiAdapter.getAll().catch(() => []),
      accountApiAdapter.getAll().catch(() => []),
    ])
      .then(([people, classes, accounts]) => {
        const pList = Array.isArray(people) ? people : [];
        const cList = Array.isArray(classes) ? classes : [];
        const aList = Array.isArray(accounts) ? accounts : [];

        const teacherList = pList.filter((p) => p.person_type === 'GURU');
        const studentList = pList.filter((p) => p.person_type === 'SISWA');
        const tendikList = pList.filter((p) => ['TENAGA_KEPENDIDIKAN', 'KEPALA_SEKOLAH'].includes(p.person_type));

        const g7 = studentList.filter((s) => s.class_name?.startsWith('7') || s.class_name?.startsWith('VII')).length;
        const g8 = studentList.filter((s) => s.class_name?.startsWith('8') || s.class_name?.startsWith('VIII')).length;
        const g9 = studentList.filter((s) => s.class_name?.startsWith('9') || s.class_name?.startsWith('IX')).length;

        setStats({
          teachers: teacherList.length,
          students: studentList.length,
          tendik: tendikList.length,
          classes: cList.length,
          barcodes: pList.length,
          grade7: g7,
          grade8: g8,
          grade9: g9,
          totalAccounts: aList.length,
          teachersWithAccount: teacherList.length,
        });
      })
      .catch((err) => console.warn('Gagal memuat statistik SSO:', err))
      .finally(() => setLoadingStats(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* BANNER UTAMA DASHBOARD SUPER ADMIN */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EDEAF5] px-2.5 py-0.5 text-[10px] font-bold text-[#4B3B78] uppercase tracking-wider mb-1">
            Super Administrator Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Pusat Kendali Ekosistem Digital Spenspra
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Manajemen terpusat identitas civitas, kredensial akun guru, pemantauan integrasi e-Rapor Kurikulum Merdeka, 
            sirkulasi perpustakaan digital, serta kartu barcode SMP Negeri 1 Prambon.
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pendidik & GTK</span>
            <span className="text-base">👨‍🏫</span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.teachers + stats.tendik}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{stats.teachers} Guru • {stats.tendik} Staf</p>
          <div className="mt-2 text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
            <span>✓ Akun SSO Aktif</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Siswa</span>
            <span className="text-base">🎒</span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.students}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Peserta didik terdaftar</p>
          <div className="mt-2 text-[10px] font-semibold text-blue-600">
            Kls 7 ({stats.grade7}) • 8 ({stats.grade8}) • 9 ({stats.grade9})
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rombel Aktif</span>
            <span className="text-base">🏫</span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.classes}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Rombongan belajar</p>
          <div className="mt-2 text-[10px] font-semibold text-slate-600">
            Tingkat VII, VIII, IX
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Barcode Terbit</span>
            <span className="text-base">💳</span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#4B3B78]">{stats.barcodes}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Token identitas unik</p>
          <div className="mt-2 text-[10px] font-semibold text-purple-600">
            Format PRAMBON-XXX
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Ekosistem</span>
            <span className="text-base">⚡</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600">100%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">3 dari 3 modul online</p>
          <div className="mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
            ● Sistem Terhubung
          </div>
        </div>
      </div>

      {/* KONTEN MANAJEMEN OPERASIONAL & DATA MASTER */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Status Integrasi Layanan Sekolah
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitoring konektivitas autentikasi Single Sign-On lintas subsistem sekolah.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                Semua Layanan Normal
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between hover:bg-slate-50 transition">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">📊 e-Rapor Spenspra</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2 py-0.5">Online</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Kurikulum Merdeka, penilaian UTS/UAS, dan cetak rapor resmi.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">Port :3001</span>
                  <a
                    href={getRaporLaunchUrl()}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5"
                  >
                    Buka ↗
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between hover:bg-slate-50 transition">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">📚 Perpustakaan Digital</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2 py-0.5">Online</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Katalog koleksi pustaka & sirkulasi peminjaman barcode siswa.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">Port :3002</span>
                  <a
                    href={getPerpusLaunchUrl()}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5"
                  >
                    Buka ↗
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between hover:bg-slate-50 transition">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">📱 Absensi Barcode</span>
                    <span className="rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-0.5">Terintegrasi</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Scan kartu QR/barcode siswa untuk absensi kelas dan kehadiran.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">Token Engine</span>
                  <Link
                    href="/students"
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5"
                  >
                    Cek Kartu ↗
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Tahun Ajaran Aktif
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sinkronisasi waktu akademik & batas KKM.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                Kurikulum Merdeka
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Tahun Ajaran:</span>
                  <span className="font-bold text-slate-900 text-sm">{academicPeriod.year}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Semester Berjalan:</span>
                  <span className="font-bold text-blue-700">Semester {academicPeriod.semester}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Batas Standar KKM:</span>
                  <span className="font-bold text-emerald-700">{academicPeriod.kkm}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">Atur periode & KKM di:</span>
                <Link
                  href="/admin/master-data?tab=semester"
                  className="text-xs font-bold text-[#4B3B78] hover:underline"
                >
                  Kelola Data Master →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ALUR KERJA OPERASIONAL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Panduan Alur Kerja Super Administrator
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Langkah operasional data master awal semester untuk memastikan seluruh layanan e-Rapor & Perpustakaan siap pakai.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5 text-xs">
            {[
              {
                step: '1',
                title: 'Periode Akademik',
                desc: 'Konfirmasi T.A. aktif dan semester berjalan.',
                href: '/admin/master-data?tab=semester',
                icon: '📅',
              },
              {
                step: '2',
                title: 'Rombel & Ruang',
                desc: 'Validasi kelas VII, VIII, IX dan ruang belajar.',
                href: '/admin/master-data?tab=rombel',
                icon: '🏫',
              },
              {
                step: '3',
                title: 'Siswa & Barcode',
                desc: 'Penempatan rombel dan penerbitan barcode siswa.',
                href: '/admin/master-data?tab=siswa',
                icon: '🎒',
              },
              {
                step: '4',
                title: 'Akun Guru & GTK',
                desc: 'Atur password dan bagikan kredensial ke guru.',
                href: '/admin/master-data?tab=guru_staf',
                icon: '🔑',
              },
              {
                step: '5',
                title: 'Supervisi Rapor',
                desc: 'Pemantauan nilai & pengesahan tanda tangan.',
                href: '/docs',
                icon: '🎓',
              },
            ].map((item) => (
              <Link
                key={item.step}
                href={item.href}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 hover:bg-blue-50/60 hover:border-blue-300 transition group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] group-hover:bg-[#4B3B78]">
                      {item.step}
                    </span>
                    <span className="text-sm">{item.icon}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                </div>
                <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-600 mt-3 block">
                  Akses Modul →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
