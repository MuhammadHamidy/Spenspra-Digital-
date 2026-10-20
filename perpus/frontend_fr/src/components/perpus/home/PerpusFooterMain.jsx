'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function PerpusFooterMain({ onSearchSubmit }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    if (onSearchSubmit) {
      onSearchSubmit(keyword.trim());
    } else {
      router.push(`/bibliografi?q=${encodeURIComponent(keyword.trim())}`);
    }
  };

  return (
    <footer className="w-full bg-[#FAF9FD] border-t border-slate-200/80 pt-10 pb-8 text-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Search Bar Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-10 border-b border-slate-200/80">
          <div className="w-12 h-12 relative flex-shrink-0">
            <Image
              src="/image/new_logo_prambon.png"
              alt="Logo SMPN 1 Prambon"
              width={48}
              height={48}
              className="w-full h-full object-contain"
            />
          </div>

          <form onSubmit={handleSearch} className="flex w-full sm:w-auto max-w-lg items-center gap-0">
            <div className="relative flex-1 sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Masukkan Judul/Penulis...."
                className="w-full pl-10 pr-4 py-2.5 bg-white text-xs text-slate-800 placeholder-slate-400 border border-slate-300 rounded-l-xl focus:outline-none focus:ring-1 focus:ring-[#183A4B] focus:border-[#183A4B]"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#183A4B] hover:bg-[#0f2530] text-white text-xs font-semibold rounded-r-xl transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Middle Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 py-10">
          {/* Fitur Utama */}
          <div className="md:col-span-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 font-sans">
              FITUR UTAMA
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li>
                <Link href="/" className="hover:text-[#4B3B78] transition-colors">
                  Dasboard
                </Link>
              </li>
              <li>
                <Link href="/bibliografi" className="hover:text-[#4B3B78] transition-colors">
                  Bibliografi
                </Link>
              </li>
              <li>
                <Link href="/bookmark" className="hover:text-[#4B3B78] transition-colors">
                  Bookmark
                </Link>
              </li>
              <li>
                <Link href="/kiosk" className="hover:text-[#4B3B78] transition-colors">
                  Absensi
                </Link>
              </li>
              <li>
                <Link href="/pinjam" className="hover:text-[#4B3B78] transition-colors">
                  Peminjaman Buku
                </Link>
              </li>
            </ul>
          </div>

          {/* Tentang Kami */}
          <div className="md:col-span-5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 font-sans">
              TENTANG KAMI
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Perpustakaan SMPN 1 Prambon Sidoarjo merupakan ruang belajar yang menyediakan berbagai
              sumber pengetahuan untuk mendukung kegiatan belajar dan meningkatkan minat baca siswa.
              Kami hadir untuk membantu setiap siswa menemukan informasi, inspirasi, dan cerita baru
              melalui pengalaman membaca yang menyenangkan.
            </p>
          </div>

          {/* Join Us */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 font-sans">
              Join Us
            </h4>
            <div className="flex items-center gap-3 text-slate-600">
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors"
                aria-label="YouTube SMPN 1 Prambon"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Instagram SMPN 1 Prambon"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 border-t border-slate-200/80 text-center text-xs text-slate-500 font-medium">
          &copy; 2026 Perpustakaan SMPN 1 PRAMBON SIDOARJO
        </div>
      </div>
    </footer>
  );
}
