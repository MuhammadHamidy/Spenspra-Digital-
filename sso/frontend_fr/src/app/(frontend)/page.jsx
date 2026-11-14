'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getRole } from '@/lib/access/portalAccess';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import CivitasDashboard from '@/components/CivitasDashboard';

const publicApplications = [
  { name: 'Spenspra Belajar', description: 'Materi, tugas, dan CBT untuk guru dan siswa.', icon: '📚', key: 'elearning', color: 'from-indigo-600 to-violet-600' },
  { name: 'e-Rapor', description: 'Kelola nilai, progres input, dan laporan hasil belajar.', icon: '📊', key: 'rapor', color: 'from-sky-600 to-cyan-600' },
  { name: 'e-Perpus', description: 'Katalog, peminjaman, dan aktivitas perpustakaan.', icon: '📖', key: 'perpus', color: 'from-emerald-600 to-teal-600' },
  { name: 'Presensi QR', description: 'Presensi kelas dan kunjungan secara digital.', icon: '✓', key: 'presensi', color: 'from-amber-500 to-orange-500' },
];

function PublicApplicationPortal() {
  return (
    <main className="min-h-screen bg-neutral-100 font-sans text-neutral-1000">
      <header className="border-b border-neutral-300 bg-neutral-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <img src="/image/new_logo_prambon.png" alt="Logo SMPN 1 Prambon" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-sm font-bold text-primary-500">SMP NEGERI 1 PRAMBON</p>
              <p className="text-xs text-neutral-700">Portal Layanan Sekolah</p>
            </div>
          </div>
          <a href="/login" className="rounded-md bg-primary-500 px-4 py-2 text-sm font-semibold text-neutral-50 shadow-sm transition hover:bg-primary-700">
            Masuk SSO
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-primary-500">Spenspra Digital</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-neutral-1000 sm:text-4xl">Pilih layanan sekolah</h1>
          <p className="mt-4 text-base leading-7 text-neutral-700">
            Akses berbagai aplikasi sekolah melalui satu akun Single Sign-On (SSO).
            Pilih layanan di bawah untuk melanjutkan.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Daftar aplikasi">
          {publicApplications.map((app) => (
            <a key={app.key} href={`/login?app=${encodeURIComponent(app.key)}`} className="group rounded-lg border border-neutral-300 bg-neutral-50 p-5 shadow-md transition hover:border-primary-300 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-2xl text-primary-700">{app.icon}</div>
              <h2 className="mt-5 text-xl font-bold text-neutral-1000">{app.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-neutral-700">{app.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-500 group-hover:text-primary-700">Buka aplikasi <span aria-hidden="true">→</span></span>
            </a>
          ))}
        </section>

        <div className="mt-8 rounded-lg border border-secondary-300 bg-secondary-50 p-4 text-sm text-secondary-800">
          Login terpusat dengan SSO. Gunakan akun sekolah untuk mengakses layanan sesuai hak akses Anda.
        </div>
      </div>
    </main>
  );
}

export default function MainPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const role = getRole(user);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    if (loading) return;
    if (!user) {
      return;
    }
    if (isSuperAdmin) {
      router.replace('/superadmin');
    } else {
      router.replace('/dashboard');
    }
  }, [user, loading, isSuperAdmin, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Memuat portal SMPN 1 Prambon...</p>
        </div>
      </div>
    );
  }

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  if (!user) {
    return <PublicApplicationPortal />;
  }

  return <CivitasDashboard />;
}
