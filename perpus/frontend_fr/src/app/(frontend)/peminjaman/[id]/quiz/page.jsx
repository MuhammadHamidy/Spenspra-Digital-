'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { loansApi } from '@/lib/features/library/api/loansApi';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function PeminjamanQuizPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params?.id;

  const [loan, setLoan] = useState(null);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Questions and Answers State
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

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
        // Fallback object jika mock testing
        loanData = {
          id: loanId,
          status: 'RETURNED',
          book_title: 'Etika Politik',
          book_author: 'Franz Magnis-Suseno',
        };
      }

      // Validasi proteksi status: Hanya status Selesai yang boleh mengisi Quiz
      const statusUpper = (loanData.status || '').toUpperCase();
      const isSelesai = statusUpper === 'RETURNED' || statusUpper === 'SELESAI' || statusUpper === 'SELESAI DI PINJAM';

      if (!isSelesai) {
        setError('Kuis pemahaman hanya dapat diakses setelah buku selesai dikembalikan ke perpustakaan.');
        setLoading(false);
        return;
      }

      setLoan(loanData);

      // Ambil detail buku jika ID buku tersedia
      const bTitle = loanData.book_title || loanData.title || 'Etika Politik';
      const bAuthor = loanData.book_author || loanData.author || 'Franz Magnis-Suseno';

      // 5 Pertanyaan Kuis Sesuai Peminjaman Buku-2.png
      const defaultQuestions = [
        { id: 1, text: `Apa arti ${bTitle} yang kamu ketahui?` },
        { id: 2, text: `Jelaskan definisi ${bTitle} menurut ${bAuthor}!` },
        { id: 3, text: `Sebutkan apa saja yang memengaruhi ${bTitle}?` },
        { id: 4, text: `Bagaimana penerapan materi ${bTitle} dalam kehidupan sehari-hari?` },
        { id: 5, text: `Pesan moral atau pembelajaran utama apa yang Anda dapatkan dari buku ini?` },
      ];

      setQuestions(defaultQuestions);
      const initialAnswers = {};
      defaultQuestions.forEach((q) => {
        initialAnswers[q.id] = '';
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.warn('Gagal memuat data kuis:', err);
      setError('Terjadi kendala saat memuat kuis buku.');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    loadLoanData();
  }, [loadLoanData]);

  const handleAnswerChange = (qId, val) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: val,
    }));
    if (validationError) setValidationError('');
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();

    // Validasi: Semua pertanyaan wajib diisi
    const emptyQuestion = questions.find((q) => !answers[q.id] || !answers[q.id].trim());
    if (emptyQuestion) {
      setValidationError('Semua pertanyaan kuis wajib diisi sebelum mengirim jawaban.');
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    try {
      await loansApi.submitQuiz({
        loan_id: loanId,
        book_id: loan?.book_id,
        answers: answers,
      });

      setSuccessToast('Jawaban kuis Anda berhasil dikirim! Mengalihkan ke halaman peminjaman...');
      setTimeout(() => {
        router.push('/peminjaman');
      }, 2000);
    } catch (err) {
      setValidationError(err.message || 'Gagal mengirim jawaban kuis. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-[#1E2538] selection:text-white">
      <div>
        <Navbar user={user} />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header Quiz (Peminjaman Buku-2.png) */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Quiz
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 font-medium">
              Harap isi quiz dengan benar dan tepat...
            </p>
          </div>

          {/* Success Toast */}
          {successToast && (
            <div className="mb-6 p-4 bg-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-md flex items-center gap-2 animate-in fade-in">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{successToast}</span>
            </div>
          )}

          {/* Error / Not Allowed State */}
          {error ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-red-100 shadow-xs my-8">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm text-slate-700 font-semibold mb-4">{error}</p>
              <Link
                href="/peminjaman"
                className="inline-block px-5 py-2.5 bg-[#1E2538] hover:bg-[#141B2B] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Kembali ke Riwayat Peminjaman
              </Link>
            </div>
          ) : loading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-xl border border-slate-200" />
              ))}
            </div>
          ) : (
            /* Daftar Pertanyaan Quiz Sesuai Peminjaman Buku-2.png */
            <form onSubmit={handleSubmitQuiz} className="space-y-5">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-300/90 p-5 bg-white shadow-2xs transition-all focus-within:border-slate-800"
                >
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-3">
                    {q.text}
                  </label>
                  <textarea
                    rows={2}
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Masukkan jawaban anda disini....."
                    className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent resize-y focus:outline-none leading-relaxed"
                  />
                </div>
              ))}

              {/* Validation Error Banner */}
              {validationError && (
                <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 p-3 rounded-lg">
                  ⚠️ {validationError}
                </p>
              )}

              {/* Tombol Kirim di Kanan Bawah Sesuai Figma */}
              <div className="flex justify-end pt-4 pb-12">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2.5 rounded-lg bg-[#1E2538] hover:bg-[#141B2B] active:scale-95 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Mengirim...' : 'Kirim'}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>

      <PerpusFooterMain />
    </div>
  );
}
