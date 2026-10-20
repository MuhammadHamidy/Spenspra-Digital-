'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';

export default function BacaPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans">
      <div>
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-100 text-[#4F8FBB] flex items-center justify-center mx-auto mb-6 shadow-xs">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Ruang Baca & Presensi Mandiri
          </h1>
          <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Halaman kerangka presensi membaca buku di tempat. Aktivitas membaca Anda tercatat secara otomatis ke log literasi harian perpustakaan.
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
