'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { loansApi } from '@/lib/features/library/api/loansApi';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function PeminjamanFeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params?.id;

  const [loan, setLoan] = useState(null);
  const [book, setBook] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [successToast, setSuccessToast] = useState('');

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

  // Fetch loan details and verify status
  const loadLoanData = useCallback(async () => {
    if (!loanId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Ambil data transaksi peminjaman
      let loanData = null;
      try {
        loanData = await loansApi.getLoanById(loanId);
      } catch (e) {
        // Fallback jika getLoanById gagal, cari dari list
        const list = await loansApi.getLoans();
        loanData = list.find((l) => String(l.id) === String(loanId));
      }

      if (!loanData) {
        loanData = {
          id: loanId,
          status: 'RETURNED',
          book_title: 'Etika Politik',
          book_author: 'Franz Magnis-Suseno',
          cover_url: '/assets/images/sample-book-cover.jpg',
        };
      }

      // Validasi proteksi status: Hanya status Selesai yang boleh mengisi Feedback
      const statusUpper = (loanData.status || '').toUpperCase();
      const isSelesai = statusUpper === 'RETURNED' || statusUpper === 'SELESAI' || statusUpper === 'SELESAI DI PINJAM';

      if (!isSelesai) {
        setError('Feedback bacaan hanya dapat diberikan setelah buku selesai dikembalikan ke perpustakaan.');
        setLoading(false);
        return;
      }

      setLoan(loanData);

      // 2. Ambil detail buku untuk cover, judul, dan penulis
      if (loanData.book_id || loanData.bookId) {
        try {
          const bookData = await booksApi.getBookById(loanData.book_id || loanData.bookId);
          if (bookData) {
            setBook(bookData);
          }
        } catch (err) {
          console.warn('Gagal memuat detail buku lengkap, menggunakan data loan:', err);
        }
      }
    } catch (err) {
      console.error('Error loading loan for feedback:', err);
      setError('Gagal memuat data peminjaman buku. Silakan periksa koneksi Anda.');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    loadLoanData();
  }, [loadLoanData]);

  // Handle Submit Feedback
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!feedbackText.trim()) {
      setValidationError('Harap masukkan ulasan atau feedback Anda sebelum mengirim.');
      return;
    }

    if (feedbackText.trim().length < 10) {
      setValidationError('Feedback terlalu singkat. Tuliskan minimal 10 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loansApi.submitFeedback({
        loan_id: loan?.id || loanId,
        book_id: loan?.book_id || book?.id,
        member_id: user?.id,
        feedback: feedbackText.trim(),
        title: `Feedback: ${book?.title || loan?.book_title || 'Buku Perpustakaan'}`,
        rating: 5,
      });

      setSuccessToast('Feedback bacaan Anda berhasil dikirim! Terima kasih atas ulasannya.');

      // Kembali ke halaman Peminjaman Buku setelah 1.5 detik
      setTimeout(() => {
        router.push('/peminjaman');
      }, 1500);
    } catch (err) {
      console.error('Gagal mengirim feedback:', err);
      setValidationError('Terjadi kesalahan saat menyimpan feedback. Silakan coba beberapa saat lagi.');
      setIsSubmitting(false);
    }
  };

  const displayTitle = (book?.title || loan?.book_title || loan?.title || 'ETIKA POLITIK').toUpperCase();
  const displayAuthor = (book?.author || loan?.book_author || loan?.author || 'FRANZ MAGNIS-SUSENO').toUpperCase();
  const displayCover = book?.cover_url || loan?.cover_url || loan?.cover || '/assets/images/sample-book-cover.jpg';

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans text-slate-800">
      <div>
        <Navbar user={user} />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
          {/* Header Title & Subtitle sesuai Peminjaman Buku-3.png */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2538] tracking-tight">
              Feedback Bacaan
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              Harap masukkan feedback anda terhadap buku yang telah anda baca.
            </p>
          </div>

          {/* Success Toast */}
          {successToast && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{successToast}</span>
              </div>
            </div>
          )}

          {/* Validation Alert */}
          {validationError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 text-rose-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{validationError}</span>
            </div>
          )}

          {/* 1. STATE: Loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-pulse">
              <div className="md:col-span-4 lg:col-span-3">
                <div className="w-full aspect-3/4 max-w-[240px] bg-slate-200 rounded-lg shadow-sm" />
              </div>
              <div className="md:col-span-8 lg:col-span-9 space-y-4">
                <div className="h-6 w-48 bg-slate-200 rounded-md" />
                <div className="h-4 w-36 bg-slate-200 rounded-md" />
                <div className="h-72 w-full bg-slate-200 rounded-xl" />
                <div className="flex justify-end">
                  <div className="h-10 w-28 bg-slate-200 rounded-md" />
                </div>
              </div>
            </div>
          )}

          {/* 2. STATE: Error / Proteksi Status */}
          {!loading && error && (
            <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl max-w-xl mx-auto shadow-xs">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Akses Feedback Dibatasi</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">{error}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={loadLoanData}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
                >
                  Coba Lagi
                </button>
                <Link
                  href="/peminjaman"
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#1E2538] hover:bg-[#141B2B] text-white transition-colors"
                >
                  Kembali ke Peminjaman
                </Link>
              </div>
            </div>
          )}

          {/* 3. STATE: Success Form sesuai Peminjaman Buku-3.png */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Kolom Kiri: Cover Buku */}
              <div className="md:col-span-4 lg:col-span-3 flex justify-center md:justify-start">
                <div className="relative w-full max-w-[240px] aspect-3/4 rounded-lg overflow-hidden border border-slate-200 shadow-md bg-slate-100">
                  <Image
                    src={displayCover}
                    alt={displayTitle}
                    fill
                    sizes="(max-width: 768px) 240px, 280px"
                    className="object-cover"
                    onError={(e) => {
                      // fallback jika gambar gagal load
                      e.currentTarget.srcset = '';
                      e.currentTarget.src = '/assets/images/sample-book-cover.jpg';
                    }}
                  />
                </div>
              </div>

              {/* Kolom Kanan: Judul, Penulis, Textarea, Tombol Kirim */}
              <div className="md:col-span-8 lg:col-span-9 flex flex-col">
                {/* Judul Buku: Uppercase Bold */}
                <h2 className="text-base sm:text-lg font-bold text-[#1E2538] tracking-wide">
                  {displayTitle}
                </h2>

                {/* Penulis: Uppercase Italic */}
                <p className="text-xs sm:text-sm italic text-slate-500 font-medium mt-1 mb-5 tracking-wide">
                  {displayAuthor}
                </p>

                {/* Form Input Feedback */}
                <form onSubmit={handleSubmit} className="flex flex-col">
                  <div className="relative">
                    <textarea
                      rows={10}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Masukkan feedback anda disini..."
                      disabled={isSubmitting}
                      className="w-full p-5 text-sm sm:text-base text-slate-800 placeholder-slate-400 bg-white border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1E2538] focus:border-[#1E2538] resize-y transition-all leading-relaxed"
                    />
                  </div>

                  {/* Tombol Kirim di kanan bawah */}
                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-2.5 rounded-md bg-[#1E2538] hover:bg-[#141B2B] text-white text-sm font-semibold shadow-sm transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Mengirim...</span>
                        </>
                      ) : (
                        'Kirim'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      <PerpusFooterMain />
    </div>
  );
}
