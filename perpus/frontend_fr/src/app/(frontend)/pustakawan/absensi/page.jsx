'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { attendanceApi } from '@/lib/features/library/api/attendanceApi';
import CircularProgress from '@mui/material/CircularProgress';

export default function PustakawanAbsensiPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default hari ini format YYYY-MM-DD
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [stats, setStats] = useState({
    today_visitors: 0,
    member_visitors: 0,
    guest_visitors: 0,
    total_visits: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Muat data riwayat kunjungan dan statistik
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, statsRes] = await Promise.allSettled([
        attendanceApi.getAttendances(search, selectedDate),
        attendanceApi.getAttendanceStats(),
      ]);

      let logList = attRes.status === 'fulfilled' && Array.isArray(attRes.value) ? attRes.value : [];

      // Sort log dari yang paling baru
      logList.sort((a, b) => {
        const timeA = new Date(a.visited_at || a.created_at || a.timestamp || 0).getTime();
        const timeB = new Date(b.visited_at || b.created_at || b.timestamp || 0).getTime();
        return timeB - timeA;
      });

      setLogs(logList);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
    } catch (err) {
      console.warn('Gagal memuat log pengunjung:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter logs berdasarkan keperluan
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (selectedPurpose !== 'ALL') {
      result = result.filter((l) => {
        const p = (l.purpose || '').toUpperCase();
        if (selectedPurpose === 'MEMBACA') return p === 'MEMBACA' || p.includes('BACA');
        if (selectedPurpose === 'PINJAM') return p === 'PINJAM' || p === 'PEMINJAMAN' || p.includes('PINJAM') || p.includes('KEMBALI');
        if (selectedPurpose === 'BELAJAR') return p === 'BELAJAR' || p === 'BELAJAR_BERSAMA' || p.includes('BELAJAR') || p.includes('PEMBELAJARAN');
        if (selectedPurpose === 'TAMU') return p === 'TAMU' || p.includes('TAMU') || p.includes('UMUM');
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => {
        const name = (l.visitor_name || l.name || l.full_name || '').toLowerCase();
        const idNum = (l.identity_number || l.studentId || l.nisn || l.nip || '').toLowerCase();
        const cls = (l.class_name || l.className || '').toLowerCase();
        return name.includes(q) || idNum.includes(q) || cls.includes(q);
      });
    }

    return result;
  }, [logs, selectedPurpose, search]);

  // Pagination calculation
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Helper badge keperluan
  const renderPurposeBadge = (purpose) => {
    const p = (purpose || 'MEMBACA').toUpperCase();
    if (p.includes('PINJAM') || p.includes('KEMBALI')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          Meminjam / Kembali
        </span>
      );
    }
    if (p.includes('BELAJAR') || p.includes('PEMBELAJARAN')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Belajar Bersama
        </span>
      );
    }
    if (p.includes('TAMU') || p.includes('UMUM')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Tamu / Umum
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        Membaca Buku
      </span>
    );
  };

  // Helper format tanggal dan jam WIB
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const datePart = d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timePart = d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${datePart} • ${timePart} WIB`;
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
            Sirkulasi Kunjungan
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Riwayat Pengunjung Perpustakaan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data kehadiran dan aktivitas kunjungan civitas SMP Negeri 1 Prambon di perpustakaan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* 4 Kartu Ringkasan Kunjungan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Pengunjung
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#4B3B78] flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{filteredLogs.length}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Sesuai filter tanggal & pencarian</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Siswa & Anggota
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">
              {filteredLogs.filter((l) => (l.visitor_type || '').toUpperCase() !== 'GUEST').length}
            </h3>
            <p className="text-xs text-emerald-600 font-semibold mt-0.5">Civitas Terdaftar</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Keperluan Membaca
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">
              {filteredLogs.filter((l) => (l.purpose || '').toUpperCase().includes('BACA') || (l.purpose || '').toUpperCase() === 'MEMBACA').length}
            </h3>
            <p className="text-xs text-blue-600 font-semibold mt-0.5">Ruang Baca & Literasi</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tamu & Umum
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">
              {filteredLogs.filter((l) => (l.visitor_type || '').toUpperCase() === 'GUEST' || (l.purpose || '').toUpperCase().includes('TAMU')).length}
            </h3>
            <p className="text-xs text-amber-600 font-semibold mt-0.5">Kunjungan Eksternal</p>
          </div>
        </div>
      </div>

      {/* Kontrol Pencarian & Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Input Pencarian */}
          <div className="sm:col-span-5 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama pengunjung, NISN, NIP, atau kelas..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/20 focus:border-[#4B3B78] transition"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter Keperluan */}
          <div className="sm:col-span-4">
            <select
              value={selectedPurpose}
              onChange={(e) => {
                setSelectedPurpose(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/20 focus:border-[#4B3B78] transition"
            >
              <option value="ALL">Semua Keperluan Kunjungan</option>
              <option value="MEMBACA">Membaca Buku di Perpustakaan</option>
              <option value="PINJAM">Meminjam / Mengembalikan Buku</option>
              <option value="BELAJAR">Belajar Bersama / Kelas</option>
              <option value="TAMU">Tamu / Kunjungan Umum</option>
            </select>
          </div>

          {/* Filter Tanggal */}
          <div className="sm:col-span-3 flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#4B3B78]/20 focus:border-[#4B3B78] transition"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
                title="Tampilkan Semua Tanggal"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabel Data Pengunjung */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Pengunjung</th>
                <th className="py-3.5 px-4">Identitas & Kelas</th>
                <th className="py-3.5 px-4">Keperluan Kunjungan</th>
                <th className="py-3.5 px-4">Metode Presensi</th>
                <th className="py-3.5 px-4">Waktu Berkunjung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <CircularProgress size={28} sx={{ color: '#4B3B78' }} />
                      <p className="text-xs text-slate-400 font-semibold">Memuat riwayat pengunjung perpustakaan...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-slate-700">Tidak Ada Kunjungan Tercatat</p>
                      <p className="text-xs text-slate-400">
                        {selectedDate
                          ? `Belum ada pengunjung yang terdata pada tanggal ${selectedDate}.`
                          : 'Belum ada data kunjungan yang sesuai dengan kata kunci pencarian.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, index) => {
                  const rawVisitorName = log.visitor_name || log.name || log.full_name || 'Pengunjung Perpustakaan';
                  const guestMatch = log.visitor_type === 'GUEST' ? rawVisitorName.match(/^(.*?)\s*\(([^)]+)\)$/) : null;
                  const visitorName = guestMatch ? guestMatch[1].trim() : rawVisitorName;
                  const idNum = log.identity_number || log.studentId || log.nisn || log.nip || '-';
                  const className =
                    log.class_name ||
                    log.className ||
                    (guestMatch ? guestMatch[2].trim() : log.visitor_type === 'GUEST' ? 'Tamu Luar' : 'Siswa');
                  const method = (log.method || 'SCAN').toUpperCase();
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr key={log.id || index} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#EDEAF5] text-[#4B3B78] flex items-center justify-center font-bold text-xs shrink-0">
                            {visitorName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">{visitorName}</p>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {log.visitor_type === 'GUEST' ? `Jabatan: ${className}` : `ID: ${idNum}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {className}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderPurposeBadge(log.purpose)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          {method.includes('FACE') ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Face Scan
                            </>
                          ) : method.includes('MANUAL') || log.visitor_type === 'GUEST' ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Buku Tamu (Tanpa Scan)
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                              Barcode Card
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {formatDateTime(log.visited_at || log.created_at || log.timestamp)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        {!loading && filteredLogs.length > pageSize && (
          <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Menampilkan {paginatedLogs.length} dari {totalItems} kunjungan
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
    </div>
  );
}
