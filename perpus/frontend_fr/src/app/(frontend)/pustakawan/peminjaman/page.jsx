'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { loansApi } from '@/lib/features/library/api/loansApi';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { membersApi } from '@/lib/features/library/api/membersApi';
import CircularProgress from '@mui/material/CircularProgress';

export default function PustakawanPeminjamanPage() {
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState({
    total_active_loans: 0,
    total_overdue_loans: 0,
    total_returned: 0,
    total_unpaid_fines: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modal State untuk Aksi Peminjaman Baru & Pengembalian Cepat
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Form Peminjaman Baru
  const [borrowForm, setBorrowForm] = useState({
    member_barcode: '',
    book_barcode: '',
    duration_days: 7,
  });

  // Form Pengembalian Cepat
  const [returnBarcode, setReturnBarcode] = useState('');

  // Muat data peminjaman dari backend
  const loadLoansData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        loansApi.getLoans(),
        loansApi.getLoanStats(),
      ]);

      let dataList = listRes.status === 'fulfilled' && Array.isArray(listRes.value) ? listRes.value : [];

      // Urutkan transaksi dari yang paling baru
      dataList.sort((a, b) => {
        const dateA = new Date(a.borrow_date || a.loan_date || a.created_at || 0).getTime();
        const dateB = new Date(b.borrow_date || b.loan_date || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setLoans(dataList);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
    } catch (err) {
      console.warn('Gagal memuat data peminjaman:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLoansData();
  }, [loadLoansData]);

  // Filter data peminjaman
  const filteredLoans = useMemo(() => {
    let result = loans;

    // Filter berdasarkan status
    if (statusFilter !== 'ALL') {
      result = result.filter((l) => {
        const s = (l.status || '').toUpperCase();
        if (statusFilter === 'ACTIVE') return s === 'BORROWED' || s === 'ACTIVE' || s === 'DIPINJAM';
        if (statusFilter === 'OVERDUE') return s === 'OVERDUE' || s === 'TERLAMBAT';
        if (statusFilter === 'RETURNED') return s === 'RETURNED' || s === 'KEMBALI' || s === 'DIKEMBALIKAN';
        return true;
      });
    }

    // Filter berdasarkan pencarian
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => {
        const bookTitle = (l.book_title || l.title || l.book?.title || '').toLowerCase();
        const bookBarcode = (l.item_barcode || l.book_barcode || l.barcode || '').toLowerCase();
        const memberName = (l.member_name || l.name || l.member?.name || l.borrower_name || '').toLowerCase();
        const memberCode = (l.member_code || l.member_barcode || l.member?.identity_number || '').toLowerCase();
        return (
          bookTitle.includes(q) ||
          bookBarcode.includes(q) ||
          memberName.includes(q) ||
          memberCode.includes(q)
        );
      });
    }

    return result;
  }, [loans, statusFilter, search]);

  // Pagination calculation
  const totalItems = filteredLoans.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLoans.slice(start, start + pageSize);
  }, [filteredLoans, currentPage, pageSize]);

  // Handler Pengembalian Buku Langsung dari Tabel
  const handleDirectReturn = async (itemBarcode) => {
    if (!itemBarcode) return;
    const confirmReturn = window.confirm(`Proses pengembalian buku dengan barcode [${itemBarcode}]?`);
    if (!confirmReturn) return;

    setActionLoading(true);
    setFeedbackMsg({ type: '', text: '' });
    try {
      await loansApi.returnBook({ item_barcode: itemBarcode });
      setFeedbackMsg({ type: 'success', text: `Buku [${itemBarcode}] berhasil dikembalikan ke rak perpustakaan!` });
      await loadLoansData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Gagal memproses pengembalian buku.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Modal Peminjaman Baru
  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!borrowForm.member_barcode || !borrowForm.book_barcode) {
      setFeedbackMsg({ type: 'error', text: 'Barcode Anggota dan Barcode Buku wajib diisi.' });
      return;
    }

    setActionLoading(true);
    setFeedbackMsg({ type: '', text: '' });
    try {
      await loansApi.borrowBook(borrowForm);
      setFeedbackMsg({ type: 'success', text: 'Transaksi peminjaman buku berhasil dicatat!' });
      setIsBorrowModalOpen(false);
      setBorrowForm({ member_barcode: '', book_barcode: '', duration_days: 7 });
      await loadLoansData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Gagal mencatat peminjaman buku.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Modal Pengembalian Cepat
  const handleQuickReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnBarcode.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Barcode Buku wajib diisi.' });
      return;
    }

    setActionLoading(true);
    setFeedbackMsg({ type: '', text: '' });
    try {
      await loansApi.returnBook({ item_barcode: returnBarcode.trim() });
      setFeedbackMsg({ type: 'success', text: `Buku [${returnBarcode}] berhasil dikembalikan!` });
      setIsReturnModalOpen(false);
      setReturnBarcode('');
      await loadLoansData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Gagal memproses pengembalian buku.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Helper render status peminjaman
  const renderStatusBadge = (status, dueDate) => {
    const s = (status || '').toUpperCase();
    const isOverdue = s === 'OVERDUE' || (dueDate && new Date(dueDate) < new Date() && s !== 'RETURNED');

    if (s === 'RETURNED' || s === 'KEMBALI' || s === 'DIKEMBALIKAN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Selesai Kembali
        </span>
      );
    }

    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Terlambat
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Aktif Dipinjam
      </span>
    );
  };

  // Helper format tanggal
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EDEAF5] text-[#4B3B78] uppercase tracking-wider mb-2">
            Sirkulasi Koleksi
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Riwayat & Informasi Peminjaman Buku
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data riwayat transaksi peminjaman, status sirkulasi buku, serta pengembalian buku siswa dan guru.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadLoansData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Segarkan</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReturnModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Kembalikan Buku</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBorrowModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4B3B78] hover:bg-[#3D2E66] text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Catat Peminjaman Baru</span>
          </button>
        </div>
      </div>

      {/* Alert Notifikasi Feedback */}
      {feedbackMsg.text && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 Kartu Metrik Sirkulasi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Transaksi
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#4B3B78] flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{loans.length}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Keseluruhan sirkulasi buku</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Aktif Dipinjam
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{stats.total_active_loans || 0}</h3>
            <p className="text-xs text-blue-600 font-semibold mt-0.5">Sedang dibawa peminjam</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Terlambat (Overdue)
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{stats.total_overdue_loans || 0}</h3>
            <p className="text-xs text-rose-600 font-semibold mt-0.5">Melewati batas kembali</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Selesai Kembali
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{stats.total_returned || 0}</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-0.5">Sudah tersimpan di rak</p>
          </div>
        </div>
      </div>

      {/* Kontrol Pencarian & Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Input Pencarian */}
          <div className="sm:col-span-8 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari berdasarkan judul buku, barcode buku, atau nama peminjam..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/20 focus:border-[#4B3B78] transition"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter Status */}
          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/20 focus:border-[#4B3B78] transition"
            >
              <option value="ALL">Semua Status Peminjaman</option>
              <option value="ACTIVE">Sedang Dipinjam (Aktif)</option>
              <option value="OVERDUE">Terlambat (Jatuh Tempo)</option>
              <option value="RETURNED">Sudah Dikembalikan (Selesai)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Data Riwayat Peminjaman */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Informasi Buku</th>
                <th className="py-3.5 px-4">Peminjam</th>
                <th className="py-3.5 px-4">Tgl Pinjam & Jatuh Tempo</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Denda</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <CircularProgress size={28} sx={{ color: '#4B3B78' }} />
                      <p className="text-xs text-slate-400 font-semibold">Memuat riwayat peminjaman buku...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-slate-700">Tidak Ada Transaksi Peminjaman</p>
                      <p className="text-xs text-slate-400">
                        Belum ada data sirkulasi yang sesuai dengan kriteria filter saat ini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLoans.map((loan, index) => {
                  const bookTitle = loan.book_title || loan.title || loan.book?.title || 'Judul Buku Tidak Tercatat';
                  const bookBarcode = loan.item_barcode || loan.book_barcode || loan.barcode || '-';
                  const memberName = loan.member_name || loan.name || loan.member?.name || loan.borrower_name || 'Civitas Sekolah';
                  const memberCode = loan.member_code || loan.member_barcode || loan.member?.identity_number || '-';
                  const className = loan.class_name || loan.className || loan.member?.class_name || 'Anggota';
                  const borrowDate = loan.borrow_date || loan.loan_date || loan.created_at;
                  const dueDate = loan.due_date;
                  const returnDate = loan.return_date;
                  const fine = Number(loan.fine_amount || loan.fine || 0);
                  const isReturned = (loan.status || '').toUpperCase() === 'RETURNED' || Boolean(returnDate);
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr key={loan.id || index} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{bookTitle}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[11px] font-semibold text-[#4B3B78] bg-[#EDEAF5] px-2 py-0.5 rounded">
                              {bookBarcode}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight">{memberName}</p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {className} • ID: {memberCode}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          <p className="text-slate-600">Pinjam: {formatDate(borrowDate)}</p>
                          <p className={`font-semibold ${!isReturned && dueDate && new Date(dueDate) < new Date() ? 'text-rose-600' : 'text-slate-800'}`}>
                            Tempo: {formatDate(dueDate)}
                          </p>
                          {isReturned && (
                            <p className="text-emerald-600 font-semibold">Kembali: {formatDate(returnDate)}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(loan.status, dueDate)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        {fine > 0 ? (
                          <span className="text-rose-600">Rp {fine.toLocaleString('id-ID')}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {!isReturned ? (
                          <button
                            type="button"
                            onClick={() => handleDirectReturn(bookBarcode)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition cursor-pointer"
                            title="Proses Pengembalian Buku"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Kembalikan</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Selesai</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        {!loading && filteredLoans.length > pageSize && (
          <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Menampilkan {paginatedLoans.length} dari {totalItems} transaksi
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1 text-xs font-bold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Catat Peminjaman Baru */}
      {isBorrowModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Catat Peminjaman Buku Baru</h3>
                <p className="text-xs text-slate-500">Registrasi transaksi peminjaman buku anggota</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBorrowModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBorrowSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor Barcode / NISN / NIP Anggota
                </label>
                <input
                  type="text"
                  required
                  value={borrowForm.member_barcode}
                  onChange={(e) => setBorrowForm({ ...borrowForm, member_barcode: e.target.value })}
                  placeholder="Contoh: SISWA-2026-0001 atau NISN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/20 focus:border-[#4B3B78] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor Barcode Eksemplar Buku
                </label>
                <input
                  type="text"
                  required
                  value={borrowForm.book_barcode}
                  onChange={(e) => setBorrowForm({ ...borrowForm, book_barcode: e.target.value })}
                  placeholder="Contoh: LIB-BK-2026-0001-C01 atau PERPUS-001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/20 focus:border-[#4B3B78] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Durasi Peminjaman (Hari)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={borrowForm.duration_days}
                  onChange={(e) => setBorrowForm({ ...borrowForm, duration_days: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/20 focus:border-[#4B3B78] transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">Standar peminjaman buku perpustakaan adalah 7 hari.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBorrowModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#4B3B78] hover:bg-[#3D2E66] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pengembalian Buku Cepat */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Pengembalian Buku Cepat</h3>
                <p className="text-xs text-slate-500">Scan atau ketik barcode buku yang dikembalikan</p>
              </div>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickReturnSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor Barcode Buku
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={returnBarcode}
                  onChange={(e) => setReturnBarcode(e.target.value)}
                  placeholder="Contoh: LIB-BK-2026-0001-C01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Memproses...' : 'Proses Pengembalian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
