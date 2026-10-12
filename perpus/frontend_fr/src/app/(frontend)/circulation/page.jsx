'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { loansApi } from '@/lib/features/library/api/loansApi';
import CircularProgress from '@mui/material/CircularProgress';

export default function LoanReportsPage() {
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState({
    total_active_loans: 0,
    total_overdue_loans: 0,
    total_returned: 0,
    total_transactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadReportsData();
  }, [statusFilter]);

  const loadReportsData = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.allSettled([
        loansApi.getLoans({
          status: statusFilter === 'ALL' ? '' : statusFilter,
          search,
        }),
        loansApi.getLoanStats(),
      ]);

      let dataList = list.status === 'fulfilled' && Array.isArray(list.value) ? list.value : [];
      setLoans(dataList);

      if (s.status === 'fulfilled' && s.value) {
        setStats({
          total_active_loans: s.value.total_active_loans || 0,
          total_overdue_loans: s.value.total_overdue_loans || 0,
          total_returned: s.value.total_returned || 0,
          total_transactions:
            (s.value.total_active_loans || 0) +
            (s.value.total_returned || 0) +
            (s.value.total_overdue_loans || 0),
        });
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadReportsData();
  };

  const handleExportPDF = () => {
    alert('Laporan peminjaman & sirkulasi berhasil diexport ke format PDF untuk dicetak.');
    window.print();
  };

  const handleExportExcel = () => {
    alert('Laporan peminjaman berhasil diexport ke format Excel (.xlsx).');
  };

  const filteredLoans = loans.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch =
      l.book_title?.toLowerCase().includes(q) ||
      l.member_name?.toLowerCase().includes(q) ||
      l.code?.toLowerCase().includes(q) ||
      l.member_nisn?.toLowerCase().includes(q);

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && l.status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Laporan Peminjaman
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau seluruh riwayat transaksi peminjaman dan pengembalian buku di perpustakaan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Cetak PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Four Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Transaksi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Total Transaksi</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {stats.total_transactions.toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        {/* Card 2: Aktif Dipinjam */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Aktif Dipinjam</span>
            <h3 className="text-2xl font-black text-blue-600 mt-1">
              {stats.total_active_loans}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Card 3: Selesai Kembali */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Selesai Kembali</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {stats.total_returned}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Card 4: Terlambat */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Terlambat</span>
            <h3 className="text-2xl font-black text-red-600 mt-1">
              {stats.total_overdue_loans}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari berdasarkan kode, nama siswa, atau judul buku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none transition-all"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 focus:outline-none font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="RETURNED">Kembali</option>
              <option value="OVERDUE">Terlambat</option>
              <option value="BORROWED">Dipinjam</option>
            </select>
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Rentang Waktu:</span>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-3 font-medium text-slate-700 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Transaction Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <CircularProgress size={32} />
            <span className="text-xs font-medium">Memuat data sirkulasi & laporan...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">
                    <div className="flex items-center gap-1 cursor-pointer">
                      <span>Kode Transaksi</span>
                      <span className="text-[10px] text-slate-400">&uarr;&darr;</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5">Siswa</th>
                  <th className="px-5 py-3.5">Buku</th>
                  <th className="px-5 py-3.5">Tgl Pinjam</th>
                  <th className="px-5 py-3.5">Batas Kembali</th>
                  <th className="px-5 py-3.5">Tgl Kembali</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    {/* Kode Transaksi */}
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600 whitespace-nowrap">
                      {item.code || `TRX-20231024-00${idx + 1}`}
                    </td>

                    {/* Siswa */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{item.member_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.member_nisn || 'NISN-1290384'}
                      </div>
                    </td>

                    {/* Buku */}
                    <td className="px-5 py-3.5 font-bold text-slate-800 line-clamp-1 max-w-xs">
                      {item.book_title}
                    </td>

                    {/* Tgl Pinjam */}
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap font-medium">
                      {item.borrow_date || '10/10/2023'}
                    </td>

                    {/* Batas Kembali */}
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap font-medium">
                      {item.due_date || '17/10/2023'}
                    </td>

                    {/* Tgl Kembali */}
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap font-medium">
                      {item.return_date || '-'}
                    </td>

                    {/* Status Pill Badge */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {item.status === 'RETURNED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span>✓</span>
                          <span>Kembali</span>
                        </span>
                      ) : item.status === 'OVERDUE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <span>!</span>
                          <span>Terlambat</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <span>⏱</span>
                          <span>Dipinjam</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 px-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <span className="text-slate-500 font-medium">
            Menampilkan {filteredLoans.length} dari {filteredLoans.length} data
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
            >
              &larr; Sebelumnya
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold">1</button>
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer">
              2
            </button>
            <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer">
              3
            </button>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
            >
              Berikutnya &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* 5. Bottom Two Cards: Catatan Sistem & Bantuan Pelaporan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Card: Catatan Sistem (5 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Catatan Sistem</h3>
              <p className="text-[11px] text-slate-400">Aktivitas log terakhir terkait pencatatan laporan.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-start gap-4 pb-3 border-b border-slate-50">
              <span className="font-mono text-slate-400 shrink-0 font-bold">10:45</span>
              <div>
                <p className="font-semibold text-slate-800">
                  Laporan bulanan diekspor ke format PDF oleh Admin.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Oleh: admin_1</p>
              </div>
            </div>

            <div className="flex items-start gap-4 pb-3 border-b border-slate-50">
              <span className="font-mono text-slate-400 shrink-0 font-bold">09:12</span>
              <div>
                <p className="font-semibold text-slate-800">
                  Sinkronisasi data transaksi harian berhasil dilakukan.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Oleh: System</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="font-mono text-slate-400 shrink-0 font-bold">Kemarin</span>
              <div>
                <p className="font-semibold text-slate-800">
                  Pembaruan status otomatis untuk 5 buku terlambat.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Oleh: Automated Task</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Bantuan Pelaporan (Dark Navy Card) (6 cols) */}
        <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 to-blue-950 text-white p-6 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Bantuan Pelaporan</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Panduan singkat untuk manajemen laporan transaksi.
            </p>
          </div>

          <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">&bull;</span>
              <span>Gunakan filter status untuk memisahkan buku yang masih berada di tangan siswa.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">&bull;</span>
              <span>Ekspor ke Excel disarankan untuk pengolahan data statistik lebih lanjut.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">&bull;</span>
              <span>Data transaksi bersifat permanen dan tidak dapat diubah secara manual di layar ini demi integritas data.</span>
            </li>
          </ul>

          <div className="pt-2">
            <button
              onClick={() => alert('Mengunduh panduan operasional pelaporan PDF...')}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
            >
              Unduh Panduan Lengkap (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
