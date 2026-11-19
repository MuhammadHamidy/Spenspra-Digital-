'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getRole } from '@/lib/access/portalAccess';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { getDynamicAppUrl } from '@/lib/common/urlHelper';

const publicApplications = [
  {
    name: 'Spenspra Belajar',
    badge: 'LMS & CBT Anti-Cheat',
    description: 'Pusat pembelajaran digital: materi interaktif, penugasan mandiri, dan pelaksanaan ujian CBT serentak dengan sistem pengawasan kiosk darurat.',
    features: ['Bank Soal CBT', 'Kiosk Proctoring', 'Materi & Tugas'],
    key: 'elearning',
    theme: {
      badge: 'bg-success-50 text-success-800 border-success-300',
      iconBg: 'bg-success-50 text-success-500 border-success-300/60',
      hoverBorder: 'hover:border-success-500/60',
      btn: 'bg-success-500 hover:bg-success-800 text-white',
    },
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    name: 'e-Rapor Spenspra',
    badge: 'Kurikulum Merdeka',
    description: 'Pengelolaan nilai rapor akademik, perumusan capaian tujuan pembelajaran (TP), monitoring kemajuan nilai kelas, dan pencetakan buku rapor resmi.',
    features: ['Buku Induk Walas', 'Penilaian KKM 75', 'Cetak 3-Kolom'],
    key: 'rapor',
    theme: {
      badge: 'bg-primary-50 text-primary-700 border-primary-300',
      iconBg: 'bg-primary-50 text-primary-500 border-primary-300/60',
      hoverBorder: 'hover:border-primary-500/60',
      btn: 'bg-primary-500 hover:bg-primary-700 text-white',
    },
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: 'e-Perpustakaan',
    badge: 'Pustaka & Sirkulasi',
    description: 'Katalog buku fisik dan digital sekolah, otomasi sirkulasi peminjaman berbasis barcode RFID, pencatatan kunjungan, dan analisis budaya literasi.',
    features: ['Katalog Koleksi', 'Barcode RFID', 'Reading Insights'],
    key: 'perpus',
    theme: {
      badge: 'bg-secondary-50 text-secondary-700 border-secondary-300',
      iconBg: 'bg-secondary-50 text-secondary-500 border-secondary-300/60',
      hoverBorder: 'hover:border-secondary-500/60',
      btn: 'bg-secondary-500 hover:bg-secondary-700 text-white',
    },
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    name: 'Presensi Digital QR',
    badge: 'Kehadiran Terpadu',
    description: 'Pencatatan presensi siswa real-time per kelas, sinkronisasi otomatis ke lembar kehadiran buku rapor sisipan, dan rekapitulasi ketidakhadiran walas.',
    features: ['Scan Barcode QR', 'Sinkronisasi Rapor', 'Rekap Alfa/Izin'],
    key: 'presensi',
    theme: {
      badge: 'bg-accent-50 text-neutral-800 border-accent-300',
      iconBg: 'bg-accent-50 text-accent-700 border-accent-300/60',
      hoverBorder: 'hover:border-accent-500/60',
      btn: 'bg-accent-500 hover:bg-accent-600 text-neutral-1000',
    },
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

function PublicApplicationPortal() {
  return (
    <main className="min-h-screen bg-neutral-100 font-sans text-neutral-1000 flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-white p-1 border border-neutral-300 shadow-2xs flex items-center justify-center shrink-0">
              <img src="/image/new_logo_prambon.png" alt="Logo SMPN 1 Prambon" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm sm:text-base font-bold text-primary-500 leading-tight tracking-tight">
                  SMP NEGERI 1 PRAMBON
                </p>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary-50 text-primary-700 border border-primary-100">
                  AKREDITASI A
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Portal Single Sign-On & Ekosistem Layanan Sekolah
              </p>
            </div>
          </div>
          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 sm:px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-primary-700 active:bg-primary-800"
          >
            <span>Masuk Akun SSO</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </header>

      {/* Hero & System Grid */}
      <div className="mx-auto max-w-7xl w-full px-5 py-8 sm:px-8 sm:py-12 flex-1 space-y-8">
        <section className="max-w-3xl space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold text-primary-700 border border-primary-100">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            <span>Gerbang Layanan Terpadu Spenspra Digital</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold leading-tight text-neutral-1000 tracking-tight">
            Pusat Akses Layanan Pendidikan Sekolah
          </h1>
          <p className="text-xs sm:text-sm leading-relaxed text-neutral-700 font-normal">
            Akses seluruh platform pendidikan, pembelajaran daring, administrasi e-Rapor, dan perpustakaan digital melalui satu kredensial akun Single Sign-On (SSO) resmi.
          </p>
        </section>

        {/* 4 System Cards Grid */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Daftar aplikasi">
          {publicApplications.map((app) => (
            <a
              key={app.key}
              href={`/login?app=${encodeURIComponent(app.key)}`}
              className={`group rounded-2xl border border-neutral-300 bg-white p-5 shadow-2xs transition-all duration-200 flex flex-col justify-between ${app.theme.hoverBorder} hover:shadow-md`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${app.theme.iconBg}`}>
                    {app.icon}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${app.theme.badge}`}>
                    {app.badge}
                  </span>
                </div>

                <div>
                  <h2 className="text-base font-bold text-neutral-1000 group-hover:text-primary-700 transition-colors">
                    {app.name}
                  </h2>
                  <p className="mt-1.5 min-h-[56px] text-xs leading-relaxed text-neutral-700">
                    {app.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {app.features.map((f, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-3.5 border-t border-neutral-100 flex items-center justify-between text-xs font-bold text-primary-500 group-hover:text-primary-700">
                <span>Masuk Layanan</span>
                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </div>
            </a>
          ))}
        </section>

        {/* Info Note Banner */}
        <div className="rounded-xl border border-secondary-300 bg-secondary-50 p-4 text-xs text-secondary-800 flex items-start sm:items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-secondary-100 text-secondary-700 flex items-center justify-center shrink-0 font-bold text-xs">
            i
          </div>
          <p className="leading-relaxed">
            Satu akun untuk semua layanan. Bapak/Ibu Guru, Staf Pustakawan, dan Peserta Didik dapat langsung masuk menggunakan akun SSO resmi yang diterbitkan oleh Administrator Sekolah.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-300 bg-white py-5 px-5 sm:px-8 text-xs text-neutral-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800">SMP Negeri 1 Prambon</span>
            <span>•</span>
            <span>Kabupaten Sidoarjo</span>
            <span>•</span>
            <span>NPSN 20501867</span>
          </div>
          <p className="text-[11px] text-neutral-500">
            Hak Cipta © {new Date().getFullYear()} Spenspra Digital Ecosystem. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

export default function MainPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const role = getRole(user);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('logout=1')) {
      try {
        tokenStorage.clear();
        sessionStorage.clear();
        localStorage.removeItem('perpusdig_auth_token');
        localStorage.removeItem('perpusdig_auth_user');
        localStorage.removeItem('spenspra_session_active');
        localStorage.removeItem('spenspra_last_activity');
        localStorage.removeItem('sso_auth_token');
        localStorage.removeItem('sso_auth_user');
        localStorage.removeItem('elearning_auth_token');
        localStorage.removeItem('elearning_auth_user');
        window.history.replaceState({}, '', '/');
      } catch (e) {}
      return;
    }
    if (loading) return;
    if (!user) {
      return;
    }
    if (isSuperAdmin) {
      router.replace('/superadmin');
      return;
    }

    const token = tokenStorage.getToken() || 'sso-session-token';
    const isEducator = ['GURU', 'WALI_KELAS', 'PENDIDIK', 'KEPALA_SEKOLAH', 'TENDIK'].includes(role);
    const isSiswa = role.includes('SISWA');
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
    const belajarBaseUrl = getDynamicAppUrl(process.env.NEXT_PUBLIC_ELEARNING_URL || process.env.NEXT_PUBLIC_BELAJAR_URL, 'belajar');
    window.location.replace(`${belajarBaseUrl}/sso/callback?access_token=${encodeURIComponent(token)}&institution_id=smpn1prambon&sub=${encodeURIComponent(user?.id || '')}&user=${encodedUser}`);
  }, [user, loading, isSuperAdmin, role, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
          <p className="text-xs font-semibold text-neutral-500">Memuat portal SMPN 1 Prambon...</p>
        </div>
      </div>
    );
  }

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  return <PublicApplicationPortal />;
}
