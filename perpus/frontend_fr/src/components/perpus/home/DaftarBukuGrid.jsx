'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { berandaApi } from '@/lib/features/beranda/berandaApi';

export default function DaftarBukuGrid({ onSelectBook }) {
  const [bukuList, setBukuList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function fetchBooks() {
      try {
        setLoading(true);
        const list = await berandaApi.getBuku('', 10, 0);
        if (isMounted) setBukuList(list);
      } catch (err) {
        console.warn('Gagal mengambil daftar buku:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchBooks();

    // Baca bookmark dari localStorage
    try {
      const stored = localStorage.getItem('spenspra_lib_bookmarks');
      if (stored) setBookmarks(JSON.parse(stored));
    } catch (e) {
      // ignore
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleBookmark = (e, book) => {
    e.stopPropagation();
    const next = { ...bookmarks };
    if (next[book.id]) {
      delete next[book.id];
    } else {
      next[book.id] = {
        id: book.id,
        judul: book.judul,
        penulis: book.penulis,
        cover_url: book.cover_url,
        tersedia: book.tersedia,
      };
    }
    setBookmarks(next);
    try {
      localStorage.setItem('spenspra_lib_bookmarks', JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight font-sans">
          Daftar Buku Bacaan
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
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
          {bukuList.map((buku) => {
            const isBookmarked = !!bookmarks[buku.id];
            return (
              <div
                key={buku.id}
                onClick={() => onSelectBook?.(buku)}
                className="bg-white p-3.5 rounded-2xl border border-slate-100/90 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer"
              >
                {/* Book Cover */}
                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 mb-3 shadow-xs">
                  {buku.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={buku.cover_url}
                      alt={buku.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-50 text-[#4B3B78] text-xs font-semibold p-2 text-center">
                      {buku.judul}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#4B3B78] transition-colors font-sans">
                        {buku.judul}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => toggleBookmark(e, buku)}
                        className="text-slate-400 hover:text-amber-500 p-0.5 transition-colors cursor-pointer flex-shrink-0"
                        title={isBookmarked ? 'Hapus dari bookmark' : 'Simpan bookmark'}
                      >
                        <svg
                          className={`w-4 h-4 ${isBookmarked ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`}
                          fill={isBookmarked ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                          />
                        </svg>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mb-2">{buku.penulis}</p>
                  </div>

                  {/* Availability Badge */}
                  <div>
                    {buku.tersedia ? (
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-[#2E7D5B] text-white">
                        Tersedia
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-[#C53030] text-white">
                        Tidak Tersedia
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Centered "Lihat Selengkapnya" */}
      <div className="text-center mt-10">
        <Link
          href="/bibliografi"
          className="text-sm font-semibold text-[#4F8FBB] hover:text-[#397394] hover:underline inline-flex items-center gap-1.5 transition-colors"
        >
          <span>Lihat Selengkapnya</span>
        </Link>
      </div>
    </section>
  );
}
