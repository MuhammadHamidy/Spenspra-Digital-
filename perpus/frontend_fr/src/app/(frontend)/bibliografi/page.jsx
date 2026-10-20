'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import BookDetailModal from '@/components/perpus/home/BookDetailModal';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';

export default function BibliografiPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQ);
  const [bukuList, setBukuList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadBooks() {
      try {
        setLoading(true);
        const list = await berandaApi.getBuku(query, 50, 0);
        if (isMounted) setBukuList(list);
      } catch (err) {
        console.warn('Gagal memuat katalog:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBooks();
    return () => {
      isMounted = false;
    };
  }, [query]);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans">
      <div>
        <Navbar user={user} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Katalog Bibliografi Buku
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Pencarian koleksi pustaka terpadu SMPN 1 Prambon
            </p>
          </div>

          {/* Search Box */}
          <div className="mb-8 max-w-xl">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari berdasarkan judul, penulis, atau kategori..."
                className="w-full pl-11 pr-4 py-3 bg-white text-sm text-slate-800 placeholder-slate-400 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/30 focus:border-[#4B3B78] shadow-xs"
              />
            </div>
          </div>

          {/* Results Grid */}
          {loading ? (
            <div className="py-20 text-center text-sm text-slate-400">
              Sedang mencari buku di katalog...
            </div>
          ) : bukuList.length === 0 ? (
            <div className="py-16 text-center bg-slate-50/70 rounded-3xl border border-slate-100 p-8">
              <h3 className="text-base font-bold text-slate-700">Buku Tidak Ditemukan</h3>
              <p className="text-xs text-slate-400 mt-1">
                Tidak ada koleksi yang cocok dengan kata kunci &quot;{query}&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 sm:gap-6">
              {bukuList.map((buku) => (
                <div
                  key={buku.id}
                  onClick={() => setSelectedBook(buku)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 mb-3 shadow-xs">
                    {buku.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={buku.cover_url} alt={buku.judul} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-50 text-[#4B3B78] text-xs font-bold p-2 text-center">
                        {buku.judul}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#4B3B78] transition-colors font-sans mb-1">
                      {buku.judul}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mb-3">{buku.penulis}</p>

                    <div>
                      {buku.tersedia ? (
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

      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
      />
    </div>
  );
}
