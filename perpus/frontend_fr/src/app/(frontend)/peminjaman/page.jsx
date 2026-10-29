'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { loansApi } from '@/lib/features/library/api/loansApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

function formatRupiah(amount) {
  const num = Number(amount || 0);
  return `Rp. ${num.toLocaleString('id-ID')},00`;
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function PeminjamanPage() {
  const router = useRouter();
  const [loans, setLoans] = useState([]);
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
        identityNumber: local.nimNip || local.nisn || '',
      });
    }
  }, []);

  // Fetch loans from backend
  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loansApi.getLoans();
      let list = Array.isArray(res) ? res : [];

      // Filter untuk siswa login jika data ada
      const currentUser = tokenStorage.getUser();
      if (currentUser && currentUser.id && list.length > 0) {
        const studentLoans = list.filter(
          (l) =>
            String(l.member_id) === String(currentUser.id) ||
            String(l.member_code).toLowerCase() === String(currentUser.nimNip || currentUser.nisn || '').toLowerCase()
        );
        if (studentLoans.length > 0) {
          list = studentLoans;
        }
      }

      setLoans(list);
    } catch (err) {
      console.warn('Gagal memuat riwayat peminjaman:', err);
      setError('Gagal memuat riwayat peminjaman buku. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans selection:bg-[#1E2538] selection:text-white">
      <div>
        <Navbar user={user} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header Peminjaman Buku */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Peminjaman Buku
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 font-medium">
              Riwayat buku yang sedang atau telah Anda pinjam.
            </p>
          </div>

          {/* 3 State Data: Error, Loading, Empty, atau Tabel */}
          {error ? (
            <div className="p-12 text-center text-sm text-slate-600 bg-white rounded-3xl border border-red-100 shadow-xs my-8">
              <p className="text-red-600 font-semibold mb-3">{error}</p>
              <button
                type="button"
                onClick={fetchLoans}
                className="px-5 py-2 rounded-xl bg-[#1E2538] hover:bg-[#141B2B] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : loading ? (
            <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs animate-pulse">
              <div className="h-12 bg-[#1E2538]" />
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg" />
                ))}
              </div>
            </div>
          ) : loans.length === 0 ? (
            /* Empty State Sesuai Panduan */
            <div className="py-20 text-center bg-slate-50/70 rounded-3xl border border-slate-200/80 p-8 my-6">
              <div className="w-14 h-14 rounded-full bg-slate-200/80 text-slate-500 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800">Belum Ada Riwayat Peminjaman</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Anda belum memiliki riwayat peminjaman buku aktif maupun arsip pengembalian di perpustakaan.
              </p>
              <Link
                href="/bibliografi"
                className="inline-block mt-6 px-6 py-2.5 bg-[#1E2538] hover:bg-[#141B2B] text-white text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer"
              >
                Cari Buku untuk Dipinjam
              </Link>
            </div>
          ) : (
            /* Tabel Peminjaman Sesuai Peminjaman Buku.png & Peminjaman Buku-1.png */
            <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#1E2538] text-white text-[11px] font-bold tracking-wider uppercase">
                    <th className="py-4 px-4 sm:px-6 w-28">COVER BUKU</th>
                    <th className="py-4 px-4">JUDUL</th>
                    <th className="py-4 px-4">KODE EKSEMPLAR</th>
                    <th className="py-4 px-4">PENULIS</th>
                    <th className="py-4 px-4">DENDA</th>
                    <th className="py-4 px-4 text-center">STATUS</th>
                    <th className="py-4 px-4 text-center">PENGAMBILAN & PENGEMBALIAN</th>
                    <th className="py-4 px-4 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loans.map((loan) => {
                    const statusUpper = (loan.status || '').toUpperCase();
                    const isSelesai = statusUpper === 'RETURNED' || statusUpper === 'SELESAI' || statusUpper === 'SELESAI DI PINJAM';

                    const coverUrl = loan.cover_url || loan.book_cover_url || '';
                    const title = loan.book_title || loan.title || 'Buku Perpustakaan';
                    const callNumber = loan.call_number || loan.barcode || loan.item_barcode || loan.loan_code || '0196-PB-24';
                    const author = loan.book_author || loan.author || 'Penulis Spenspra';
                    const fine = loan.fine_amount !== undefined ? loan.fine_amount : 0;
                    const borrowDate = loan.borrow_date || loan.loan_date || loan.created_at;
                    const dueDate = loan.return_date || loan.due_date;

                    return (
                      <tr key={loan.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* 1. Cover Buku */}
                        <td className="py-4 px-4 sm:px-6 align-middle">
                          <div className="w-16 h-20 relative rounded-md overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs">
                            {coverUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={coverUrl}
                                alt={title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px] p-1 text-center font-bold">
                                COVER
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 2. Judul */}
                        <td className="py-4 px-4 font-bold text-slate-900 align-middle">
                          {title}
                        </td>

                        {/* 3. Kode Eksemplar */}
                        <td className="py-4 px-4 text-slate-600 align-middle font-mono text-xs">
                          {callNumber}
                        </td>

                        {/* 4. Penulis (Italic) */}
                        <td className="py-4 px-4 text-slate-600 italic align-middle">
                          {author}
                        </td>

                        {/* 5. Denda (Selalu Tampil terformat Rupiah) */}
                        <td className="py-4 px-4 text-slate-700 font-medium align-middle whitespace-nowrap">
                          {formatRupiah(fine)}
                        </td>

                        {/* 6. Status: Sedang Dipinjam (Merah) vs Selesai Dipinjam (Hijau) */}
                        <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                          {isSelesai ? (
                            <span className="text-emerald-700 font-bold text-xs tracking-wide">
                              SELESAI<br />DI PINJAM
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold text-xs tracking-wide">
                              SEDANG<br />DI PINJAM
                            </span>
                          )}
                        </td>

                        {/* 7. Pengambilan & Pengembalian (Badge) */}
                        <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                          <div className="flex flex-col gap-1.5 items-center justify-center">
                            {/* Tanggal Pengambilan: Hijau (sedang pinjam) / Abu-abu (selesai) */}
                            <span
                              className={`px-3 py-1 rounded-md text-[11px] font-semibold text-white ${
                                isSelesai ? 'bg-slate-400' : 'bg-[#1E7E55]'
                              }`}
                            >
                              {formatDateIndo(borrowDate)}
                            </span>

                            {/* Tanggal Pengembalian: Merah (sedang pinjam) / Abu-abu (selesai) */}
                            <span
                              className={`px-3 py-1 rounded-md text-[11px] font-semibold text-white ${
                                isSelesai ? 'bg-slate-400' : 'bg-[#C53030]'
                              }`}
                            >
                              {formatDateIndo(dueDate)}
                            </span>
                          </div>
                        </td>

                        {/* 8. Aksi (Feedback & Quiz) */}
                        <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                          <div className="flex flex-col gap-1.5 items-center justify-center">
                            {isSelesai ? (
                              <>
                                <Link
                                  href={`/peminjaman/${loan.id}/feedback`}
                                  className="w-24 py-1.5 text-center text-xs font-semibold rounded-md bg-[#1E2538] hover:bg-[#141B2B] text-white transition-colors cursor-pointer shadow-2xs"
                                >
                                  Feedback
                                </Link>
                                <Link
                                  href={`/peminjaman/${loan.id}/quiz`}
                                  className="w-24 py-1.5 text-center text-xs font-semibold rounded-md bg-[#1E2538] hover:bg-[#141B2B] text-white transition-colors cursor-pointer shadow-2xs"
                                >
                                  Quiz
                                </Link>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled
                                  className="w-24 py-1.5 text-center text-xs font-semibold rounded-md bg-[#8C95A6] text-white opacity-80 cursor-not-allowed"
                                  title="Feedback dapat diisi setelah buku selesai dikembalikan"
                                >
                                  Feedback
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  className="w-24 py-1.5 text-center text-xs font-semibold rounded-md bg-[#8C95A6] text-white opacity-80 cursor-not-allowed"
                                  title="Quiz dapat diisi setelah buku selesai dikembalikan"
                                >
                                  Quiz
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <PerpusFooterMain />
    </div>
  );
}
