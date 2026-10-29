'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import BookCard from '@/components/perpus/BookCard';

export default function DaftarBukuGrid() {
  const router = useRouter();
  const [bukuList, setBukuList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarks, setBookmarks] = useState({});

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await berandaApi.getBuku('', 10, 0);
      setBukuList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Gagal mengambil daftar buku:', err.message);
      setError('Gagal memuat katalog buku bacaan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();

    // Baca bookmark dari localStorage
    try {
      const stored = localStorage.getItem('spenspra_lib_bookmarks');
      if (stored) setBookmarks(JSON.parse(stored));
    } catch (e) {
      // ignore
    }
  }, [fetchBooks]);

  const toggleBookmark = (e, book) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const next = { ...bookmarks };
    if (next[book.id]) {
      delete next[book.id];
    } else {
      next[book.id] = {
        id: book.id,
        judul: book.judul || book.title,
        penulis: book.penulis || book.author,
        cover_url: book.cover_url || book.cover_image,
        tersedia: book.tersedia !== undefined ? book.tersedia : true,
      };
    }
    setBookmarks(next);
    try {
      localStorage.setItem('spenspra_lib_bookmarks', JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  };

  const handleCardClick = (book) => {
    if (book && book.id) {
      router.push(`/bibliografi/${book.id}`);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-16 font-sans">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-sans">
          Daftar Buku Bacaan
        </h2>
      </div>

      {/* 3 State Wajib: Error, Loading, Empty, atau Data */}
      {error ? (
        <div className="p-12 text-center text-sm text-slate-600 bg-white rounded-3xl border border-red-100 shadow-xs">
          <p className="text-red-600 font-semibold mb-3">{error}</p>
          <button
            type="button"
            onClick={fetchBooks}
            className="px-5 py-2 rounded-xl bg-[#1E2538] hover:bg-[#141B2B] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
              <div className="w-full aspect-[3/4] bg-slate-200 rounded-xl mb-3" />
              <div className="h-4 bg-slate-200 rounded-sm mb-2 w-3/4" />
              <div className="h-3 bg-slate-100 rounded-sm w-1/2" />
            </div>
          ))}
        </div>
      ) : bukuList.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-3xl border border-slate-100">
          Koleksi buku belum tersedia saat ini.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 sm:gap-6">
          {bukuList.map((buku) => (
            <BookCard
              key={buku.id}
              book={buku}
              isBookmarked={Boolean(bookmarks[buku.id])}
              onToggleBookmark={(e, b) => toggleBookmark(e, b)}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      {/* Centered "Lihat Selengkapnya" */}
      <div className="text-center mt-10">
        <Link
          href="/bibliografi"
          className="text-sm font-semibold text-[#0084FF] hover:text-[#0070DE] hover:underline inline-flex items-center gap-1.5 transition-colors"
        >
          <span>Lihat Selengkapnya</span>
        </Link>
      </div>
    </section>
  );
}
