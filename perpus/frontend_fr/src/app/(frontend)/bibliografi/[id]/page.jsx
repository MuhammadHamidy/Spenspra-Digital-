'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function DetailBukuPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params?.id;

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
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

  // Fetch book detail from backend
  const loadBookDetail = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    setError(null);
    try {
      let data = await booksApi.getBook(bookId);

      // Fallback jika booksApi tidak menemukan langsung (misal ID berasal dari katalog beranda)
      if (!data) {
        const catalog = await berandaApi.getBuku('', 100, 0);
        data = catalog.find((b) => String(b.id) === String(bookId));
      }

      if (data) {
        setBook(data);
      } else {
        setError('Buku tidak ditemukan di katalog perpustakaan.');
      }
    } catch (err) {
      console.warn('Gagal memuat detail buku:', err);
      // Fallback coba baca dari katalog umum
      try {
        const catalog = await berandaApi.getBuku('', 100, 0);
        const matched = catalog.find((b) => String(b.id) === String(bookId));
        if (matched) {
          setBook(matched);
        } else {
          setError('Gagal memuat detail buku dari server. Silakan coba lagi.');
        }
      } catch (fallbackErr) {
        setError('Gagal memuat detail buku dari server. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    loadBookDetail();

    // Cek status bookmark dari localStorage
    try {
      const stored = localStorage.getItem('spenspra_lib_bookmarks');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[bookId]) {
          setIsBookmarked(true);
        }
      }
    } catch (e) {}
  }, [bookId, loadBookDetail]);

  // Toggle Bookmark
  const handleToggleBookmark = () => {
    if (!book) return;
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);

    try {
      const stored = localStorage.getItem('spenspra_lib_bookmarks');
      const list = stored ? JSON.parse(stored) : {};
      if (nextState) {
        list[book.id] = {
          id: book.id,
          judul: book.title || book.judul,
          penulis: book.author || book.penulis,
          cover_url: book.cover_url || book.cover_image,
          tersedia: book.available_copies !== undefined ? book.available_copies > 0 : true,
        };
      } else {
        delete list[book.id];
      }
      localStorage.setItem('spenspra_lib_bookmarks', JSON.stringify(list));
    } catch (e) {}
  };

  const title = (book?.title || book?.judul || '').toUpperCase();
  const author = (book?.author || book?.penulis || '').toUpperCase();
  const coverUrl = book?.cover_url || book?.cover_image || '';
  const description =
    book?.description ||
    book?.deskripsi ||
    'Buku ini merupakan bagian dari koleksi perpustakaan resmi SMP Negeri 1 Prambon yang dapat dibaca dan dipinjam oleh civitas akademika sekolah.';

  // Metadata detail tabel 13 baris sesuai Menu Bibliografi.png
  const detailRows = [
    { label: 'Judul Seri', value: book?.series_title || '-' },
    { label: 'No. Panggil', value: book?.call_number || '-' },
    {
      label: 'Penerbit',
      value: book?.publisher ? `${book.publisher}${book.publish_year ? `., ${book.publish_year}` : ''}` : '-',
    },
    {
      label: 'Deskripsi Fisik',
      value: book?.physical_description || (book?.total_pages ? `${book.total_pages} hal. ; 21 cm.` : '-'),
    },
    { label: 'Bahasa', value: book?.language || 'Indonesia' },
    { label: 'ISBN/ISSN', value: book?.isbn || '-' },
    { label: 'Klasifikasi', value: book?.classification || book?.call_number || '-' },
    { label: 'Tipe Isi', value: book?.content_type || '-' },
    { label: 'Tipe Pembawa', value: book?.carrier_type || '-' },
    { label: 'Edisi', value: book?.edition || '-' },
    { label: 'Subjek', value: book?.category || book?.kategori || 'Pustaka Siswa' },
    { label: 'Info Detail Spesifik', value: book?.specific_detail || '-' },
    { label: 'Pernyataan', value: book?.statement_of_responsibility || book?.author || '-' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-[#1E2538] selection:text-white">
      <div>
        <Navbar user={user} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Detail Buku
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 font-medium">
              Berikut informasi lengkap dari buku yang Anda pilih
            </p>
          </div>

          {/* 3 State Data: Error, Loading, atau Content */}
          {error ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-red-100 shadow-xs max-w-lg mx-auto my-12">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Gagal Memuat Buku</h3>
              <p className="text-xs text-slate-500 mb-5">{error}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={loadBookDetail}
                  className="px-5 py-2 rounded-xl bg-[#1E2538] hover:bg-[#141B2B] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Coba Lagi
                </button>
                <Link
                  href="/bibliografi"
                  className="px-5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Kembali ke Bibliografi
                </Link>
              </div>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 animate-pulse my-6">
              <div className="md:col-span-4 aspect-[3/4] bg-slate-200 rounded-2xl" />
              <div className="md:col-span-8 space-y-4">
                <div className="h-6 bg-slate-200 rounded-md w-1/4 mb-4" />
                <div className="h-8 bg-slate-200 rounded-md w-3/4" />
                <div className="h-5 bg-slate-100 rounded-md w-1/2" />
                <div className="h-20 bg-slate-100 rounded-md w-full mt-4" />
                <div className="h-64 bg-slate-100 rounded-2xl w-full mt-6" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
              {/* Kolom Kiri: Cover Buku (Menu Bibliografi.png) */}
              <div className="md:col-span-4">
                <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-md border border-slate-100 bg-slate-100">
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                      <svg className="w-12 h-12 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="text-xs font-semibold text-slate-600">{title}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Kolom Kanan: Bookmark Status, Judul, Penulis, Deskripsi, Tabel Informasi Detail */}
              <div className="md:col-span-8">
                {/* 1. Status Bookmark (Tersimpan / Simpan) */}
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={handleToggleBookmark}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-amber-600 transition-colors cursor-pointer group"
                  >
                    <svg
                      className={`w-4 h-4 transition-colors ${
                        isBookmarked ? 'text-amber-500 fill-amber-500' : 'text-slate-400 group-hover:text-amber-500'
                      }`}
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
                    <span className={isBookmarked ? 'text-slate-900 font-semibold' : 'text-slate-500'}>
                      {isBookmarked ? 'Tersimpan' : 'Simpan'}
                    </span>
                  </button>
                </div>

                {/* 2. Judul Buku (Kapital Bold) */}
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans leading-snug">
                  {title}
                </h2>

                {/* 3. Penulis (Italic Kapital) */}
                <p className="text-xs sm:text-sm italic font-semibold text-slate-600 mt-1 mb-4 uppercase">
                  {author}
                </p>

                {/* 4. Deskripsi Sinopsis Buku */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 whitespace-pre-line">
                  {description}
                </p>

                {/* 5. Tabel Informasi Detail (Menu Bibliografi.png) */}
                <div className="pt-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3 font-sans">
                    Informasi Detail
                  </h3>

                  <div className="border-t border-slate-100 pt-1">
                    <table className="w-full text-xs sm:text-sm text-slate-700 border-collapse">
                      <tbody>
                        {detailRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-1.5 pr-4 text-slate-600 font-medium w-48 sm:w-56 align-top">
                              {row.label}
                            </td>
                            <td className="py-1.5 px-2 text-slate-400 w-4 align-top">:</td>
                            <td className="py-1.5 pl-2 text-slate-800 font-normal align-top">
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <PerpusFooterMain />
    </div>
  );
}
