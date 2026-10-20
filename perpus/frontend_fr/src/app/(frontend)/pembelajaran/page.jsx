'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';

export default function PembelajaranPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans">
      <div>
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-[#D8A91F] flex items-center justify-center mx-auto mb-6 shadow-xs">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Aktivitas Pembelajaran Kelas
          </h1>
          <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Halaman kerangka kegiatan belajar bersama, diskusi kelompok, dan penugasan kelas di ruang perpustakaan SMPN 1 Prambon.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/"
              className="px-6 py-2.5 rounded-full bg-[#4B3B78] hover:bg-[#3D2E66] text-white text-xs font-semibold shadow-xs transition-all"
            >
              &larr; Kembali ke Beranda
            </Link>
          </div>
        </main>
      </div>
      <PerpusFooterMain />
    </div>
  );
}
