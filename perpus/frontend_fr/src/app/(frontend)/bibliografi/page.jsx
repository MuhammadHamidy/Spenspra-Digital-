'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import BookCard from '@/components/perpus/BookCard';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

const PAGE_SIZE = 15;

export default function BibliografiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQ = searchParams.get('q') || '';
  const urlGenre = searchParams.get('genre') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  // Filter & Search Input State
  const [searchInput, setSearchInput] = useState(urlQ);
  const [selectedGenre, setSelectedGenre] = useState(urlGenre);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Data & Pagination State
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarks, setBookmarks] = useState({});
  const [currentPage, setCurrentPage] = useState(urlPage > 0 ? urlPage : 1);
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

    try {
      const stored = localStorage.getItem('spenspra_lib_bookmarks');
      if (stored) setBookmarks(JSON.parse(stored));
    } catch (e) {}

    // Close dropdown on click outside
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch books from backend
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Prioritaskan booksApi (dengan filter category & search)
      let list = await booksApi.getBooks(urlQ, urlGenre);
      
      // Fallback jika booksApi kosong
      if (!list || list.length === 0) {
        list = await berandaApi.getBuku(urlQ, 50, 0);
        if (urlGenre && Array.isArray(list)) {
          list = list.filter((b) =>
            (b.kategori || b.category || '').toLowerCase().includes(urlGenre.toLowerCase())
          );
        }
      }

      setBooks(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Gagal memuat bibliografi:', err);
      setError('Gagal memuat katalog buku. Silakan periksa koneksi atau coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [urlQ, urlGenre]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Tombol Cari aktif jika input terisi atau genre dipilih (State 1 vs State 2)
  const isCariEnabled = Boolean(searchInput.trim() || selectedGenre);

  // Handle Search Execution
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!isCariEnabled) return;

    const params = new URLSearchParams();
    if (searchInput.trim()) params.set('q', searchInput.trim());
    if (selectedGenre) params.set('genre', selectedGenre);
    params.set('page', '1');
    setCurrentPage(1);

    router.push(`/bibliografi?${params.toString()}`);
  };

  const handleSelectGenre = (genre) => {
    setSelectedGenre(genre);
    setIsDropdownOpen(false);
  };

  // Toggle Bookmark
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
    } catch (err) {}
  };

  // Pagination calculation
  const totalBooks = books.length;
  const totalPages = Math.ceil(totalBooks / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentBooks = books.slice(startIndex, startIndex + PAGE_SIZE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/bibliografi?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-[#1E2538] selection:text-white">
      <div>
        <Navbar user={user} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header Bibliografi */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Bibliografi
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 font-medium">
              Pilih buku yang ingin Anda baca!
            </p>
          </div>

          {/* Filter Bar: Input Cari, Dropdown Genre, Tombol Cari (Frame-1 s/d Frame-5) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10">
            {/* 1. Input Pencarian */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
                placeholder="Cari buku disini!"
                className="w-full pl-4 pr-10 py-2.5 bg-white text-xs sm:text-sm text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1E2538] focus:border-[#1E2538] shadow-2xs"
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>

            {/* 2. Dropdown Genre Buku (State 3, 4, 5) */}
            <div className="relative sm:w-48" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-700 hover:border-slate-400 focus:outline-none transition-colors shadow-2xs cursor-pointer"
              >
                <span className={selectedGenre ? 'font-semibold text-slate-900' : 'text-slate-500'}>
                  {selectedGenre || 'Pilih Genre Buku'}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Options */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 animate-in fade-in slide-in-from-top-1 duration-100">
                  <button
                    type="button"
                    onClick={() => handleSelectGenre('')}
                    className="w-full text-left px-3.5 py-2 text-xs sm:text-sm text-slate-700 hover:bg-[#1E2538] hover:text-white transition-colors cursor-pointer"
                  >
                    Semua Genre
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectGenre('Fiksi')}
                    className="w-full text-left px-3.5 py-2 text-xs sm:text-sm text-slate-700 hover:bg-[#1E2538] hover:text-white transition-colors cursor-pointer"
                  >
                    Fiksi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectGenre('Non-Fiksi')}
                    className="w-full text-left px-3.5 py-2 text-xs sm:text-sm text-slate-700 hover:bg-[#1E2538] hover:text-white transition-colors cursor-pointer"
                  >
                    Non-Fiksi
                  </button>
                </div>
              )}
            </div>

            {/* 3. Tombol Cari (State 1: Disabled abu-abu, State 2: Enabled gelap) */}
            <button
              type="button"
              disabled={!isCariEnabled}
              onClick={handleSearchSubmit}
              className={`px-7 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-2xs ${
                isCariEnabled
                  ? 'bg-[#1E2538] hover:bg-[#141B2B] text-white cursor-pointer active:scale-95'
                  : 'bg-[#8C95A6] text-white opacity-80 cursor-not-allowed'
              }`}
            >
              Cari
            </button>
          </div>

          {/* 3 State Data Wajib: Error, Loading, Empty, atau Data Grid */}
          {error ? (
            <div className="p-12 text-center text-sm text-slate-600 bg-white rounded-3xl border border-red-100 shadow-xs my-8">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 sm:gap-6">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
                  <div className="w-full aspect-[3/4] bg-slate-200 rounded-xl mb-3" />
                  <div className="h-4 bg-slate-200 rounded-sm mb-2 w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-sm w-1/2" />
                </div>
              ))}
            </div>
          ) : currentBooks.length === 0 ? (
            <div className="p-16 text-center bg-slate-50 rounded-3xl border border-slate-200/80 my-8">
              <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800">Buku Tidak Ditemukan</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Tidak ada koleksi buku yang sesuai dengan kriteria pencarian Anda. Silakan coba kata kunci atau genre lainnya.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 sm:gap-6">
              {currentBooks.map((buku) => (
                <BookCard
                  key={buku.id}
                  book={buku}
                  isBookmarked={Boolean(bookmarks[buku.id])}
                  onToggleBookmark={(e, b) => toggleBookmark(e, b)}
                  onClick={(b) => router.push(`/bibliografi/${b.id}`)}
                />
              ))}
            </div>
          )}

          {/* Pagination: Disembunyikan jika hasil pencarian sedikit / hanya 1 halaman (State 6) */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-12 mb-6">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                aria-label="Halaman sebelumnya"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const isActive = p === currentPage;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToPage(p)}
                    className={`w-8 h-8 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'text-slate-900 font-bold border-b-2 border-slate-900 rounded-none'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                aria-label="Halaman berikutnya"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </main>
      </div>

      <PerpusFooterMain />
    </div>
  );
}
