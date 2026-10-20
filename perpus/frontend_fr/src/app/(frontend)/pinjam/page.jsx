'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';

export default function PinjamPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans">
      <div>
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-purple-100 text-[#4B3B78] flex items-center justify-center mx-auto mb-6 shadow-xs">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Peminjaman Buku Mandiri
          </h1>
          <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Halaman kerangka layanan peminjaman buku perpustakaan. Alur pemindaian barcode kartu siswa dan barcode fisik buku akan diimplementasikan pada tahap pengembangan berikutnya.
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
