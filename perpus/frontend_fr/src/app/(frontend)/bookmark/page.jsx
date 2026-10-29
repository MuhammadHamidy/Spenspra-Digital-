'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import BookCard from '@/components/perpus/BookCard';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function BookmarkPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Sync user profile for Navbar
  useEffect(() => {
    const local = tokenStorage.getUser();
    if (local) {
      setUser({
        id: local.id || 'siswa-1',
        nama: local.nama || local.fullName || local.full_name || local.username || 'Siswa Spenspra',
        peran: local.peran || local.roleName || 'SISWA',
        kelas_atau_jabatan: local.kelas_atau_jabatan || local.className || local.kelas || 'Peserta Didik',
        foto: local.photoUrl || local.foto || null,
      });
    }
  }, []);

  // Muat data bookmark dan sinkronkan stok ketersediaan terkini dari backend
  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = localStorage.getItem('spenspra_lib_bookmarks');
      let items = [];
      if (stored) {
        const parsed = JSON.parse(stored);
        items = Object.values(parsed);
      }

      if (items.length > 0) {
        // Ambil data buku terbaru dari backend untuk memastikan status "Tersedia" selalu konsisten
        try {
          const freshBooks = await berandaApi.getBuku('', 100, 0);
          if (Array.isArray(freshBooks) && freshBooks.length > 0) {
            const freshMap = new Map(freshBooks.map((b) => [String(b.id), b]));
            items = items.map((item) => {
              const fresh = freshMap.get(String(item.id));
              if (fresh) {
                return {
                  ...item,
                  tersedia: fresh.tersedia !== undefined ? fresh.tersedia : fresh.stok > 0,
                  cover_url: fresh.cover_url || item.cover_url,
                  penulis: fresh.penulis || item.penulis,
                  judul: fresh.judul || item.judul,
                };
              }
              return item;
            });
          }
        } catch (syncErr) {
          // Tetap tampilkan item tersimpan jika fetch sync gagal
        }
      }

      setBookmarks(items);
    } catch (err) {
      console.warn('Gagal memuat bookmark:', err);
      setError('Gagal membaca data bookmark tersimpan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // Hapus bookmark langsung saat ikon diklik (Menu Bookmark.png)
  const handleRemoveBookmark = (e, book) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      const stored = localStorage.getItem('spenspra_lib_bookmarks');
      const list = stored ? JSON.parse(stored) : {};
      delete list[book.id];
      localStorage.setItem('spenspra_lib_bookmarks', JSON.stringify(list));
      setBookmarks(Object.values(list));
    } catch (err) {}
  };

  const handleCardClick = (book) => {
    if (book && book.id) {
      router.push(`/bibliografi/${book.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-[#1E2538] selection:text-white">
      <div>
        <Navbar user={user} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header Bookmark */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Bookmark
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 font-medium">
              Temukan buku favoritmu yang tersimpan disini
            </p>
          </div>

          {/* 3 State Data: Error, Loading, Empty, atau Grid */}
          {error ? (
            <div className="p-12 text-center text-sm text-slate-600 bg-white rounded-3xl border border-red-100 shadow-xs my-8">
              <p className="text-red-600 font-semibold mb-3">{error}</p>
              <button
                type="button"
                onClick={loadBookmarks}
                className="px-5 py-2 rounded-xl bg-[#1E2538] hover:bg-[#141B2B] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 sm:gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
                  <div className="w-full aspect-[3/4] bg-slate-200 rounded-xl mb-3" />
                  <div className="h-4 bg-slate-200 rounded-sm mb-2 w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-sm w-1/2" />
                </div>
              ))}
            </div>
          ) : bookmarks.length === 0 ? (
            /* Empty State Sesuai Panduan */
            <div className="py-20 text-center bg-slate-50/70 rounded-3xl border border-slate-200/80 p-8 my-6">
              <div className="w-14 h-14 rounded-full bg-slate-200/80 text-slate-500 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800">Belum Ada Buku Tersimpan</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Tandai buku yang Anda sukai di beranda atau bibliografi dengan menekan ikon bookmark untuk membacanya nanti.
              </p>
              <Link
                href="/bibliografi"
                className="inline-block mt-6 px-6 py-2.5 bg-[#1E2538] hover:bg-[#141B2B] text-white text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer"
              >
                Jelajahi Bibliografi
              </Link>
            </div>
          ) : (
            /* Grid 5 Kolom Sesuai Menu Bookmark.png */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 sm:gap-6">
              {bookmarks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  isBookmarked={true}
                  onToggleBookmark={(e, b) => handleRemoveBookmark(e, b)}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <PerpusFooterMain />
    </div>
  );
}
