'use client';

import React from 'react';

export default function PerpusPurposeScreen({ handleSelectPurpose }) {
  return (
    <div className="w-full max-w-5xl flex flex-col items-center py-8 sm:py-16 space-y-10 animate-in fade-in zoom-in-95 duration-200 mx-auto">
      {/* Header Hero */}
      <div className="text-center space-y-3 max-w-2xl">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0A1931] tracking-tight leading-tight">
          Ada keperluan apa hari ini?
        </h2>
        <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
          Sentuh salah satu pilihan di bawah untuk mulai presensi dengan barcode kartu pelajar.
        </p>
      </div>

      {/* 3 Interactive Purpose Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* Card 1: Tamu / Pengunjung */}
        <div
          onClick={() => handleSelectPurpose('TAMU')}
          className="group relative bg-white rounded-3xl p-8 border-2 border-slate-200/90 hover:border-sky-500 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-6 group-hover:scale-105 transition-transform">
              🤝
            </div>
            <h3 className="text-xl font-black text-[#0A1931]">
              Tamu / Pengunjung
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              Untuk wali murid, tamu dinas, alumni, atau pengunjung umum.
            </p>
          </div>

          <div className="mt-8 pt-4">
            <span className="text-xs font-bold text-sky-600 group-hover:text-sky-700 transition-colors">
              Lanjut ke presensi kunjungan &rarr;
            </span>
          </div>
        </div>

        {/* Card 2: Membaca / Meminjam */}
        <div
          onClick={() => handleSelectPurpose('PEMINJAM')}
          className="group relative bg-white rounded-3xl p-8 border-2 border-slate-200/90 hover:border-amber-500 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
              <div className="relative w-5 h-5">
                <div className="absolute top-0 left-0 w-3.5 h-3.5 bg-emerald-400 rounded-xs transform -rotate-6 opacity-90"></div>
                <div className="absolute top-0.5 left-1 w-3.5 h-3.5 bg-pink-500 rounded-xs opacity-90"></div>
                <div className="absolute top-1 left-2 w-3.5 h-3.5 bg-sky-400 rounded-xs transform rotate-6 opacity-90"></div>
              </div>
            </div>
            <h3 className="text-xl font-black text-[#0A1931]">
              Membaca / Meminjam
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              Membaca koleksi di tempat, atau meminjam dan mengembalikan buku sendiri.
            </p>
          </div>

          <div className="mt-8 pt-4 space-y-1">
            <p className="text-xs font-bold text-amber-600 group-hover:text-amber-700 transition-colors">
              Pindai barcode kartu pelajar &rarr;
            </p>
            <p className="text-xs text-slate-500">
              Setelah itu, pindai buku
            </p>
          </div>
        </div>

        {/* Card 3: Belajar di Kelas */}
        <div
          onClick={() => handleSelectPurpose('PEMBELAJARAN')}
          className="group relative bg-white rounded-3xl p-8 border-2 border-emerald-500 shadow-sm hover:shadow-lg hover:border-emerald-600 transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-6 group-hover:scale-105 transition-transform">
              🎓
            </div>
            <h3 className="text-xl font-black text-[#0A1931]">
              Belajar di Kelas
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              Untuk jam literasi, tugas mandiri, riset, atau diskusi kelompok.
            </p>
          </div>

          <div className="mt-8 pt-4">
            <span className="text-xs font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors">
              Pindai barcode kartu &rarr;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
