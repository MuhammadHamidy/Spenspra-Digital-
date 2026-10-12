'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { attendanceApi } from '@/lib/features/library/api/attendanceApi';
import { loansApi } from '@/lib/features/library/api/loansApi';
import CircularProgress from '@mui/material/CircularProgress';

// Helper format date
function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Helper format time
function formatTimeIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function VisitorTrackingPage() {
  const [attendances, setAttendances] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'NON_BORROWER' | 'BORROWER' | 'PEMBELAJARAN' | 'MEMBACA' | 'TAMU'
  const [purposeFilter, setPurposeFilter] = useState('ALL');
  const [loanStatusFilter, setLoanStatusFilter] = useState('ALL'); // 'ALL' | 'BORROWING' | 'NOT_BORROWING'
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  // Load attendance logs & loans
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, loanRes] = await Promise.allSettled([
        attendanceApi.getAttendances('', selectedDate),
        loansApi.getLoans(),
      ]);

      let backendAtt = attRes.status === 'fulfilled' && Array.isArray(attRes.value) ? attRes.value : [];
      let loanList = loanRes.status === 'fulfilled' && Array.isArray(loanRes.value) ? loanRes.value : [];
      setLoans(loanList);

      // Local storage fallback / enrichment from Kiosk
      let localLogs = [];
      try {
        const stored = localStorage.getItem('lib_attendance_logs');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            localLogs = parsed;
          }
        }
      } catch (e) {
        console.warn('Could not read local attendance logs:', e);
      }

      // Filter local logs matching selectedDate if present
      const formattedLocal = localLogs
        .filter((l) => {
          if (!selectedDate) return true;
          if (l.timestamp) {
            return l.timestamp.startsWith(selectedDate);
          }
          return true;
        })
        .map((l) => ({
          id: l.id || `local-${Math.random()}`,
          member_id: l.studentId || null,
          visitor_name: l.name || 'Pengunjung Kiosk',
          visitor_type: l.className === 'Tamu Umum' ? 'GUEST' : 'MEMBER',
          method: 'FACE_RECOGNITION',
          purpose: l.purpose || 'PEMBELAJARAN',
          confidence_score: 95.5,
          photo_url: l.photo || null,
          visited_at: l.timestamp || new Date().toISOString(),
          identity_number: l.studentId || '',
          class_name: l.className || 'Siswa',
          is_local_sync: true,
        }));

      // Combine backend and local, deduplicating by ID or identity_number + approx time
      const map = new Map();
      backendAtt.forEach((item) => {
        map.set(item.id, item);
      });
      formattedLocal.forEach((item) => {
        if (!map.has(item.id)) {
          // Check if name + date already exists
          const exists = Array.from(map.values()).some(
            (b) =>
              b.visitor_name?.toLowerCase() === item.visitor_name?.toLowerCase() &&
              b.visited_at?.slice(0, 10) === item.visited_at?.slice(0, 10)
          );
          if (!exists) {
            map.set(item.id, item);
          }
        }
      });

      const combined = Array.from(map.values());
      // Sort newest first
      combined.sort((a, b) => new Date(b.visited_at) - new Date(a.visited_at));
      setAttendances(combined);
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Enrich each attendance with book loan information
  const enrichedVisitors = useMemo(() => {
    return attendances.map((att) => {
      // Find matching loan records for this visitor
      const matchingLoans = loans.filter((loan) => {
        const matchId =
          (att.member_id && loan.member_id === att.member_id) ||
          (att.identity_number && loan.member_nisn === att.identity_number) ||
          (att.visitor_name &&
            loan.member_name &&
            att.visitor_name.toLowerCase().trim() === loan.member_name.toLowerCase().trim());

        if (!matchId) return false;

        // Check if loan was made today / on visit date, or is currently active
        if (selectedDate && loan.borrow_date) {
          return loan.borrow_date.startsWith(selectedDate) || loan.status === 'BORROWED';
        }
        return loan.status === 'BORROWED';
      });

      const isBorrowingBook =
        matchingLoans.length > 0 ||
        att.purpose === 'PINJAM' ||
        att.purpose === 'PINJAM_KEMBALI' ||
        att.purpose === 'PEMINJAM';

      // Normalize purpose tag
      let purposeType = 'PEMBELAJARAN';
      let purposeLabel = 'Belajar di Kelas';
      let purposeBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

      const pUpper = (att.purpose || '').toUpperCase();
      if (pUpper === 'TAMU' || att.visitor_type === 'GUEST') {
        purposeType = 'TAMU';
        purposeLabel = 'Tamu / Pengunjung';
        purposeBadgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
      } else if (pUpper === 'MEMBACA' || pUpper === 'BACA') {
        purposeType = 'MEMBACA';
        purposeLabel = 'Membaca di Tempat';
        purposeBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
      } else if (pUpper.includes('PINJAM') || isBorrowingBook) {
        purposeType = 'PEMINJAM';
        purposeLabel = 'Meminjam / Sirkulasi';
        purposeBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
      } else {
        purposeType = 'PEMBELAJARAN';
        purposeLabel = 'Belajar di Kelas';
        purposeBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      }

      return {
        ...att,
        matchingLoans,
        isBorrowingBook,
        purposeType,
        purposeLabel,
        purposeBadgeColor,
      };
    });
  }, [attendances, loans, selectedDate]);

  // Filter visitors based on search, active tab, purpose filter, and loan filter
  const filteredVisitors = useMemo(() => {
    return enrichedVisitors.filter((v) => {
      // 1. Search Query
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.visitor_name?.toLowerCase().includes(q) ||
        v.identity_number?.toLowerCase().includes(q) ||
        v.class_name?.toLowerCase().includes(q) ||
        v.purposeLabel?.toLowerCase().includes(q) ||
        v.matchingLoans?.some((l) => l.book_title?.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Active Tab Filter
      if (activeTab === 'NON_BORROWER' && v.isBorrowingBook) return false;
      if (activeTab === 'BORROWER' && !v.isBorrowingBook) return false;
      if (activeTab === 'PEMBELAJARAN' && v.purposeType !== 'PEMBELAJARAN') return false;
      if (activeTab === 'MEMBACA' && v.purposeType !== 'MEMBACA') return false;
      if (activeTab === 'TAMU' && v.purposeType !== 'TAMU') return false;

      // 3. Dropdown purpose filter
      if (purposeFilter !== 'ALL' && v.purposeType !== purposeFilter) return false;

      // 4. Dropdown loan status filter
      if (loanStatusFilter === 'BORROWING' && !v.isBorrowingBook) return false;
      if (loanStatusFilter === 'NOT_BORROWING' && v.isBorrowingBook) return false;

      return true;
    });
  }, [enrichedVisitors, search, activeTab, purposeFilter, loanStatusFilter]);

  // Statistics summaries
  const stats = useMemo(() => {
    const total = enrichedVisitors.length;
    const borrowers = enrichedVisitors.filter((v) => v.isBorrowingBook).length;
    const nonBorrowers = total - borrowers;
    const learning = enrichedVisitors.filter((v) => v.purposeType === 'PEMBELAJARAN').length;
    const reading = enrichedVisitors.filter((v) => v.purposeType === 'MEMBACA').length;
    const guests = enrichedVisitors.filter((v) => v.purposeType === 'TAMU').length;

    return { total, borrowers, nonBorrowers, learning, reading, guests };
  }, [enrichedVisitors]);

  // Export handlers
  const handleExportPDF = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (filteredVisitors.length === 0) {
      alert('Tidak ada data pengunjung untuk diexport.');
      return;
    }

    const headers = [
      'No',
      'Nama Pengunjung',
      'Tipe',
      'NISN / ID',
      'Waktu Hadir',
      'Keperluan',
      'Status Peminjaman',
      'Buku Yang Dipinjam',
      'Metode Presensi',
    ];

    const rows = filteredVisitors.map((v, i) => [
      i + 1,
      `"${(v.visitor_name || '').replace(/"/g, '""')}"`,
      v.visitor_type || 'MEMBER',
      `"${v.identity_number || '-'}"`,
      `"${v.visited_at ? new Date(v.visited_at).toLocaleString('id-ID') : '-'}"`,
      `"${v.purposeLabel}"`,
      v.isBorrowingBook ? 'Meminjam Buku' : 'Hanya Berkunjung (Non-Peminjam)',
      `"${(v.matchingLoans || []).map((l) => l.book_title).join(', ') || '-'}"`,
      v.method || 'FACE_RECOGNITION',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `tracking_pengunjung_${selectedDate || 'semua'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Tracking Pengunjung Perpustakaan
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 ml-1">
            Pantau kehadiran pengunjung, pisahkan antara pengunjung non-peminjam dengan yang meminjam buku, serta lacak keperluan masing-masing secara real-time.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={loadData}
            title="Muat Ulang Data"
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl border border-emerald-300 hover:border-emerald-400 bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Key Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pengunjung */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Pengunjung
            </span>
            <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              👥
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-slate-900">{stats.total}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hadir pada tanggal {selectedDate || 'terpilih'}
            </p>
          </div>
        </div>

        {/* Non-Peminjam (Belajar, Membaca, Tamu) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Non-Peminjam
            </span>
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              ✨
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-emerald-700">{stats.nonBorrowers}</h3>
            <p className="text-[11px] text-emerald-600/80 mt-0.5 font-medium">
              Belajar ({stats.learning}) &bull; Membaca ({stats.reading})
            </p>
          </div>
        </div>

        {/* Pengunjung Meminjam Buku */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              Meminjam Buku
            </span>
            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
              📚
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-indigo-700">{stats.borrowers}</h3>
            <p className="text-[11px] text-indigo-600/80 mt-0.5 font-medium">
              Ada transaksi peminjaman buku
            </p>
          </div>
        </div>

        {/* Tamu / Eksternal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">
              Tamu Umum
            </span>
            <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm">
              🤝
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-sky-700">{stats.guests}</h3>
            <p className="text-[11px] text-sky-600/80 mt-0.5 font-medium">
              Wali murid, alumni, atau tamu dinas
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Filter Tabs: Pemisah Non-Peminjam vs Peminjam */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Semua Pengunjung ({stats.total})
        </button>

        <button
          onClick={() => setActiveTab('NON_BORROWER')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'NON_BORROWER'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
              : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <span>🌱 Non-Peminjam (Hanya Berkunjung)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'NON_BORROWER' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
            {stats.nonBorrowers}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('BORROWER')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'BORROWER'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50'
          }`}
        >
          <span>📚 Meminjam Buku</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'BORROWER' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
            {stats.borrowers}
          </span>
        </button>

        <span className="w-[1px] h-6 bg-slate-200 mx-1 hidden md:block"></span>

        <button
          onClick={() => setActiveTab('PEMBELAJARAN')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'PEMBELAJARAN'
              ? 'bg-slate-800 text-white'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          🎓 Belajar di Kelas ({stats.learning})
        </button>

        <button
          onClick={() => setActiveTab('MEMBACA')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'MEMBACA'
              ? 'bg-slate-800 text-white'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          📖 Membaca di Tempat ({stats.reading})
        </button>

        <button
          onClick={() => setActiveTab('TAMU')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'TAMU'
              ? 'bg-slate-800 text-white'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          🤝 Tamu Umum ({stats.guests})
        </button>
      </div>

      {/* 4. Filter Toolbar: Date, Search, Purpose, Loan Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa/guru, NISN, kelas, atau judul buku dipinjam..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs text-slate-800 font-bold bg-transparent border-0 focus:outline-none cursor-pointer"
            />
            {selectedDate && (
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 ml-1 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                title="Kembali ke Hari Ini"
              >
                Hari Ini
              </button>
            )}
          </div>

          {/* Filter Keperluan Dropdown */}
          <select
            value={purposeFilter}
            onChange={(e) => setPurposeFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Keperluan</option>
            <option value="PEMBELAJARAN">🎓 Belajar di Kelas</option>
            <option value="MEMBACA">📖 Membaca di Tempat</option>
            <option value="PEMINJAM">📚 Meminjam Buku</option>
            <option value="TAMU">🤝 Tamu / Pengunjung</option>
          </select>

          {/* Filter Status Peminjaman */}
          <select
            value={loanStatusFilter}
            onChange={(e) => setLoanStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Status Pinjam</option>
            <option value="NOT_BORROWING">Hanya Berkunjung (Non-Peminjam)</option>
            <option value="BORROWING">Sedang Meminjam Buku</option>
          </select>
        </div>
      </div>

      {/* 5. Main Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <CircularProgress size={36} thickness={4} />
            <p className="text-xs text-slate-500 font-medium">Memuat log kehadiran pengunjung...</p>
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-3xl mx-auto mb-3">
              🔍
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Tidak ada data pengunjung ditemukan
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Belum ada presensi yang sesuai dengan filter atau tanggal yang dipilih. Cobalah ubah tanggal atau bersihkan pencarian.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setActiveTab('ALL');
                setPurposeFilter('ALL');
                setLoanStatusFilter('ALL');
                const today = new Date().toISOString().split('T')[0];
                setSelectedDate(today);
              }}
              className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Pengunjung</th>
                  <th className="py-3.5 px-4">Identitas / Kelas</th>
                  <th className="py-3.5 px-4">Waktu Presensi</th>
                  <th className="py-3.5 px-4">Keperluan Kunjungan</th>
                  <th className="py-3.5 px-4">Status Peminjaman Buku</th>
                  <th className="py-3.5 px-4">Metode</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredVisitors.map((v, idx) => {
                  const hasLoan = v.isBorrowingBook;
                  const loanCount = v.matchingLoans?.length || 0;

                  return (
                    <tr
                      key={v.id || idx}
                      className="hover:bg-slate-50/60 transition-colors group cursor-default"
                    >
                      {/* 1. Pengunjung Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 shrink-0">
                            {v.photo_url ? (
                              <img
                                src={v.photo_url}
                                alt={v.visitor_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-slate-600">
                                {v.visitor_name ? v.visitor_name.charAt(0).toUpperCase() : 'P'}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {v.visitor_name || 'Tanpa Nama'}
                            </p>
                            <span className="text-[10px] font-medium text-slate-400">
                              {v.visitor_type === 'GUEST' ? 'Tamu / Umum' : 'Anggota Perpus'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Identitas / Kelas */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">
                          {v.class_name || (v.visitor_type === 'GUEST' ? 'Tamu Umum' : 'Siswa')}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {v.identity_number || v.member_code || '-'}
                        </p>
                      </td>

                      {/* 3. Waktu Presensi */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 font-mono">
                          {formatTimeIndo(v.visited_at)} WIB
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatDateIndo(v.visited_at)}
                        </p>
                      </td>

                      {/* 4. Keperluan Kunjungan */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${v.purposeBadgeColor}`}
                        >
                          <span>
                            {v.purposeType === 'PEMBELAJARAN' && '🎓'}
                            {v.purposeType === 'MEMBACA' && '📖'}
                            {v.purposeType === 'PEMINJAM' && '📚'}
                            {v.purposeType === 'TAMU' && '🤝'}
                          </span>
                          <span>{v.purposeLabel}</span>
                        </span>
                      </td>

                      {/* 5. Status Peminjaman Buku (Separated logic) */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {hasLoan ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <span>📚 Meminjam Buku</span>
                              {loanCount > 0 && <span>({loanCount})</span>}
                            </span>
                            {v.matchingLoans && v.matchingLoans.length > 0 ? (
                              <div className="text-[11px] text-slate-600 line-clamp-1 font-medium" title={v.matchingLoans.map(l => l.book_title).join(', ')}>
                                {v.matchingLoans.map((l) => l.book_title).join(', ')}
                              </div>
                            ) : (
                              <p className="text-[11px] text-indigo-600/80 italic">
                                Transaksi peminjaman mandiri
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <span>✨ Hanya Berkunjung</span>
                            <span className="text-[9px] text-slate-400">(Non-Peminjam)</span>
                          </span>
                        )}
                      </td>

                      {/* 6. Metode Presensi */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                          {v.method === 'FACE_RECOGNITION' && (
                            <span className="text-blue-600">👤 Wajah (Face Rec)</span>
                          )}
                          {v.method === 'BARCODE_SCAN' && (
                            <span className="text-amber-600">📷 Scan Kartu</span>
                          )}
                          {v.method === 'MANUAL' && (
                            <span className="text-slate-500">✍️ Presensi Manual</span>
                          )}
                          {!v.method && <span>Otomatis</span>}
                        </span>
                      </td>

                      {/* 7. Action Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedVisitor(v)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Menampilkan <strong className="text-slate-800">{filteredVisitors.length}</strong> dari{' '}
            <strong className="text-slate-800">{enrichedVisitors.length}</strong> total pengunjung
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Non-Peminjam: {stats.nonBorrowers}
            </span>
            <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Peminjam Buku: {stats.borrowers}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Detail Modal Dialog */}
      {selectedVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => setSelectedVisitor(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Header Profile */}
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                {selectedVisitor.photo_url ? (
                  <img
                    src={selectedVisitor.photo_url}
                    alt={selectedVisitor.visitor_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-slate-600">
                    {selectedVisitor.visitor_name?.charAt(0).toUpperCase() || 'P'}
                  </span>
                )}
              </div>
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 mb-1">
                  {selectedVisitor.visitor_type === 'GUEST' ? 'Tamu / Umum' : 'Siswa / Guru Terdaftar'}
                </span>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {selectedVisitor.visitor_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {selectedVisitor.identity_number || selectedVisitor.member_code || '-'}
                </p>
              </div>
            </div>

            {/* Modal Body Details */}
            <div className="py-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Keperluan Kunjungan:</span>
                  <span className={`inline-block mt-1 font-bold px-2 py-0.5 rounded-md ${selectedVisitor.purposeBadgeColor}`}>
                    {selectedVisitor.purposeLabel}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Status Peminjaman:</span>
                  <span className="font-bold text-slate-800 block mt-1">
                    {selectedVisitor.isBorrowingBook ? (
                      <span className="text-indigo-600">📚 Meminjam Buku</span>
                    ) : (
                      <span className="text-emerald-600">✨ Hanya Berkunjung (Non-Peminjam)</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Waktu Presensi:</span>
                  <span className="font-bold text-slate-800 font-mono block mt-0.5">
                    {formatTimeIndo(selectedVisitor.visited_at)} WIB
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDateIndo(selectedVisitor.visited_at)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Metode Presensi:</span>
                  <span className="font-bold text-slate-800 block mt-0.5">
                    {selectedVisitor.method === 'FACE_RECOGNITION'
                      ? '👤 Face Recognition'
                      : selectedVisitor.method === 'BARCODE_SCAN'
                      ? '📷 Barcode Scan'
                      : '✍️ Manual'}
                  </span>
                </div>
              </div>

              {/* Books Borrowed Section */}
              {selectedVisitor.isBorrowingBook && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Koleksi Buku Yang Dipinjam</span>
                    <span className="text-[11px] font-normal text-indigo-600">
                      {selectedVisitor.matchingLoans?.length || 0} buku
                    </span>
                  </h4>
                  {selectedVisitor.matchingLoans && selectedVisitor.matchingLoans.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedVisitor.matchingLoans.map((l, i) => (
                        <div
                          key={l.id || i}
                          className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-slate-800">{l.book_title}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Barcode: {l.code || l.barcode || '-'} &bull; Jatuh Tempo:{' '}
                              {formatDateIndo(l.due_date)}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            l.status === 'BORROWED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {l.status === 'BORROWED' ? 'Dipinjam' : 'Kembali'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-500 italic text-[11px]">
                      Siswa memilih keperluan meminjam buku melalui layanan mandiri.
                    </div>
                  )}
                </div>
              )}

              {/* Non-Borrower Note */}
              {!selectedVisitor.isBorrowingBook && (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center gap-3">
                  <span className="text-xl">🌿</span>
                  <div>
                    <p className="font-bold text-emerald-900 text-xs">
                      Pengunjung Tidak Meminjam Buku
                    </p>
                    <p className="text-[11px] text-emerald-700/90 mt-0.5">
                      Pengunjung hadir untuk keperluan {selectedVisitor.purposeLabel.toLowerCase()} tanpa meminjam koleksi buku ke luar perpustakaan.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Sesi aktif batas 1 hari (auto restart besok)
              </span>
              <button
                onClick={() => setSelectedVisitor(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
