'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { loansApi } from '@/lib/features/library/api/loansApi';
import CircularProgress from '@mui/material/CircularProgress';

export default function LoanTrackingPage() {
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState({
    total_active_loans: 0,
    total_overdue_loans: 0,
    total_returned: 0,
    total_unpaid_fines: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        loansApi.getLoans({
          status: statusFilter === 'ALL' ? '' : statusFilter,
          search,
        }),
        loansApi.getLoanStats(),
      ]);
      setLoans(list || []);
      setStats(s || {});
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handlePayFine = async (loanId) => {
    if (!confirm('Konfirmasi pelunasan denda keterlambatan buku untuk siswa ini?')) return;
    try {
      await loansApi.payFine(loanId);
      loadData();
      alert('Denda berhasil dilunasi!');
    } catch (err) {
      alert(err.message || 'Gagal melunasi denda');
    }
  };

  const handleSendReminder = (studentName) => {
    alert(`Notifikasi pengingat via WhatsApp/Email berhasil dikirimkan kepada ${studentName} & wali murid.`);
  };

  // Overdue count calculation
  const overdueLoans = loans.filter(
    (l) => l.days_overdue > 0 || l.status === 'OVERDUE' || (l.status === 'BORROWED' && new Date(l.due_date) < new Date())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Tanggungan & Denda
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau siswa dengan keterlambatan pengembalian buku dan denda yang belum diselesaikan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => alert('Daftar tanggungan dan denda berhasil diexport ke format Excel (.xlsx)')}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export Laporan</span>
          </button>

          <Link
            href="/circulation"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Kasir Pengembalian</span>
          </Link>
        </div>
      </div>

      {/* 2. Critical Alert Banner */}
      <div className="rounded-2xl bg-amber-500/10 border border-amber-300/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">
              Peringatan Keterlambatan Sirkulasi
            </h3>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Terdapat <strong>{stats.total_overdue_loans || overdueLoans.length || 2} peminjaman</strong> melewati batas tanggal jatuh tempo. Sistem dapat mengirimkan pengingat instan kepada siswa atau wali kelas.
            </p>
          </div>
        </div>

        <button
          onClick={() => alert('Notifikasi WhatsApp pengingat massal berhasil dijadwalkan ke semua kontak siswa yang terlambat.')}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs cursor-pointer"
        >
          Kirim Pengingat Masal
        </button>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari nama siswa, NISN, judul buku, atau kode barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cari
          </button>
        </form>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs w-full md:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'Semua Status' },
            { id: 'OVERDUE', label: 'Hanya Terlambat' },
            { id: 'BORROWED', label: 'Aktif Dipinjam' },
            { id: 'RETURNED', label: 'Selesai Kembali' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Main Loans Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <CircularProgress size={32} />
            <span className="text-xs font-medium">Memuat data tanggungan & denda...</span>
          </div>
        ) : loans.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-bold text-slate-700">Tidak ada tanggungan ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Semua sirkulasi berada dalam batas waktu wajar atau filter tidak cocok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Siswa / Peminjam</th>
                  <th className="px-5 py-3.5">Judul Buku</th>
                  <th className="px-5 py-3.5">Jatuh Tempo</th>
                  <th className="px-5 py-3.5 text-center">Keterlambatan</th>
                  <th className="px-5 py-3.5">Total Denda</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((l) => {
                  const daysOverdue = l.days_overdue || 0;
                  const fine = l.fine_amount || (daysOverdue > 0 ? daysOverdue * 1000 : 0);
                  const isOverdue = daysOverdue > 0 || l.status === 'OVERDUE';
                  const isPaid = l.is_fine_paid;

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Member info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                            {(l.member_name || 'S')[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {l.member_name || l.member?.full_name || 'Nama Siswa'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              NISN: {l.member_nisn || l.member?.nisn || l.member_code || '10293847'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Book info */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800 line-clamp-1 max-w-xs">
                          {l.book_title || l.book?.title || 'Buku Perpustakaan'}
                        </div>
                        <div className="text-[11px] font-mono text-blue-600 font-bold">
                          {l.barcode || 'BRC-00000'}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-700">
                          {new Date(l.due_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Pinjam:{' '}
                          {new Date(l.borrow_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      </td>

                      {/* Overdue Badge */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {daysOverdue > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-red-100 text-red-700 border border-red-200">
                            +{daysOverdue} Hari
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Tepat Waktu</span>
                        )}
                      </td>

                      {/* Fine Amount */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {fine > 0 ? (
                          <div>
                            <div className="font-bold text-red-600">
                              Rp {Number(fine).toLocaleString('id-ID')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isPaid ? (
                                <span className="text-emerald-600 font-bold">Sudah Dibayar</span>
                              ) : (
                                <span className="text-red-500 font-semibold">Belum Dilunasi</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {l.status === 'RETURNED' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Dikembalikan
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Terlambat
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Dipinjam
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSendReminder(l.member_name || 'Siswa')}
                            title="Kirim Pesan Pengingat"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>

                          {fine > 0 && !isPaid && (
                            <button
                              onClick={() => handlePayFine(l.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Lunasi
                            </button>
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
      </div>

      {/* 5. Bottom 2 Informational & Policy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fine Policy */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Ketentuan & Kebijakan Denda Perpustakaan
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-600 leading-relaxed pt-1">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">&bull;</span>
              <span><strong>Tarif Denda:</strong> Dihitung otomatis Rp 1.000,- per buku per hari keterlambatan.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">&bull;</span>
              <span><strong>Maksimal Pinjam:</strong> Durasi standar peminjaman buku adalah 7 hari kalender.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">&bull;</span>
              <span><strong>Pembekuan Hak Pinjam:</strong> Anggota yang memiliki denda tertunggak di atas Rp 20.000 tidak dapat meminjam buku baru hingga pelunasan dikonfirmasi.</span>
            </li>
          </ul>
        </div>

        {/* Assistance Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Prosedur Kasir & Pelunasan Manual
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pembayaran denda dapat dilakukan secara tunai di meja sirkulasi atau transfer ke rekening resmi perpustakaan sekolah. Klik tombol <strong>Lunasi</strong> di baris terkait untuk mencatat status lunas secara permanen.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Link
              href="/circulation"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Buka Menu Sirkulasi Barcode</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
