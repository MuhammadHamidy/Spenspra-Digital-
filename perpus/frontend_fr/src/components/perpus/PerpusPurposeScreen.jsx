'use client';

import React from 'react';

export default function PerpusPurposeScreen({ handleSelectPurpose }) {
  return (
    <div className="w-full max-w-6xl flex flex-col items-center py-6 sm:py-12 space-y-8 animate-in fade-in zoom-in-95 duration-200 mx-auto px-4">
      {/* Header Hero */}
      <div className="text-center space-y-2.5 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0066CC] text-xs font-bold mb-1">
          <span>🏛️</span>
          <span>Layanan Mandiri Perpustakaan SMPN 1 Prambon</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0A1931] tracking-tight leading-tight">
          Ada keperluan apa hari ini?
        </h2>
        <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
          Sentuh salah satu pilihan di bawah untuk memulai presensi atau sirkulasi buku menggunakan barcode kartu pelajar.
        </p>
      </div>

      {/* 4 Interactive Purpose Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
        {/* Card 1: Peminjaman Buku */}
        <div
          onClick={() => handleSelectPurpose('PINJAM')}
          className="group relative bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200/90 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-5 group-hover:scale-105 transition-transform shadow-xs">
              📚
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#0A1931] group-hover:text-blue-600 transition-colors">
              Peminjaman Buku
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              Meminjam buku koleksi perpustakaan untuk dibawa pulang secara mandiri.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-1">
            <p className="text-xs font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
              Pindai QR Siswa/Guru &rarr;
            </p>
            <p className="text-[11px] text-slate-400">
              Kenali akun, lalu lanjut pindai buku
            </p>
          </div>
        </div>

        {/* Card 2: Pengembalian Buku */}
        <div
          onClick={() => handleSelectPurpose('KEMBALI')}
          className="group relative bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200/90 hover:border-amber-500 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-5 group-hover:scale-105 transition-transform shadow-xs">
              🔄
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#0A1931] group-hover:text-amber-600 transition-colors">
              Pengembalian Buku
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              Mengembalikan buku pinjaman yang sudah selesai dibaca ke perpustakaan.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-1">
            <p className="text-xs font-bold text-amber-600 group-hover:text-amber-700 transition-colors">
              Pindai QR Siswa/Guru &rarr;
            </p>
            <p className="text-[11px] text-slate-400">
              Cek daftar buku pinjaman, lalu kembalikan
            </p>
          </div>
        </div>

        {/* Card 3: Membaca di Tempat */}
        <div
          onClick={() => handleSelectPurpose('MEMBACA')}
          className="group relative bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200/90 hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-5 group-hover:scale-105 transition-transform shadow-xs">
              📖
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#0A1931] group-hover:text-indigo-600 transition-colors">
              Membaca di Tempat
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              Membaca buku, referensi, majalah, atau ensiklopedia di ruang baca perpustakaan.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-1">
            <p className="text-xs font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">
              Presensi Kehadiran &rarr;
            </p>
            <p className="text-[11px] text-slate-400">
              Cukup pindai barcode kartu pelajar
            </p>
          </div>
        </div>

        {/* Card 4: Belajar di Kelas / Literasi */}
        <div
          onClick={() => handleSelectPurpose('PEMBELAJARAN')}
          className="group relative bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200/90 hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mb-5 group-hover:scale-105 transition-transform shadow-xs">
              🎓
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#0A1931] group-hover:text-emerald-600 transition-colors">
              Belajar di Kelas / Literasi
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              Untuk jam literasi rombel, riset tugas mandiri, atau diskusi kelompok belajar.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-1">
            <p className="text-xs font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors">
              Presensi Rombel &rarr;
            </p>
            <p className="text-[11px] text-slate-400">
              Cukup pindai barcode kartu pelajar
            </p>
          </div>
        </div>
      </div>

      {/* Opsi Tambahan: Tamu / Pengunjung Umum */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => handleSelectPurpose('TAMU')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
        >
          <span>🤝</span>
          <span>Kunjungan Tamu Dinas / Wali Murid / Alumni Umum &rarr;</span>
        </button>
      </div>
    </div>
  );
}
