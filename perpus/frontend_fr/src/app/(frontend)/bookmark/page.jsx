'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';

export default function BookmarkPage() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('spenspra_lib_bookmarks');
      if (stored) {
        const obj = JSON.parse(stored);
        setBookmarks(Object.values(obj));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const removeBookmark = (id) => {
    try {
      const stored = localStorage.getItem('spenspra_lib_bookmarks');
      const obj = stored ? JSON.parse(stored) : {};
      delete obj[id];
      localStorage.setItem('spenspra_lib_bookmarks', JSON.stringify(obj));
      setBookmarks(Object.values(obj));
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans">
      <div>
        <Navbar user={user} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Bookmark
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Temukan buku favoritmu yang tersimpan disini
            </p>
          </div>

          {bookmarks.length === 0 ? (
            <div className="py-20 text-center bg-slate-50/60 rounded-3xl border border-slate-100 p-8">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <h3 className="text-base font-bold text-slate-700">Belum Ada Buku Tersimpan</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Tandai buku bacaan yang Anda sukai di beranda dengan menekan ikon bookmark.
              </p>
              <Link
                href="/"
                className="inline-block mt-6 px-5 py-2.5 bg-[#4B3B78] text-white text-xs font-semibold rounded-full shadow-xs hover:bg-[#3D2E66] transition-all"
              >
                Jelajahi Beranda
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 sm:gap-6">
              {bookmarks.map((book) => (
                <div
                  key={book.id}
                  className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 mb-3 shadow-xs">
                    {book.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={book.cover_url} alt={book.judul} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-50 text-[#4B3B78] text-xs font-bold p-2 text-center">
                        {book.judul}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug font-sans">
                        {book.judul}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeBookmark(book.id)}
                        className="text-amber-500 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                        title="Hapus bookmark"
                      >
                        <svg className="w-4 h-4 fill-amber-500 text-amber-500" viewBox="0 0 24 24">
                          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mb-3">{book.penulis}</p>

                    <div>
                      {book.tersedia ? (
                        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold bg-[#2E7D5B] text-white">
                          Tersedia
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold bg-[#C53030] text-white">
                          Tidak Tersedia
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <PerpusFooterMain />
    </div>
  );
}
