'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loansApi } from '@/lib/features/library/api/loansApi';
import { membersApi } from '@/lib/features/library/api/membersApi';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { attendanceApi } from '@/lib/features/library/api/attendanceApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function LibrarianDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [loanStats, setLoanStats] = useState({
    total_active_loans: 0,
    total_overdue_loans: 0,
    total_returned: 0,
    total_unpaid_fines: 0,
  });
  const [visitorStats, setVisitorStats] = useState({
    today_visitors: 0,
    member_visitors: 0,
    guest_visitors: 0,
    total_visits: 0,
  });
  const [membersCount, setMembersCount] = useState(0);
  const [recentLoans, setRecentLoans] = useState([]);
  const [bookCount, setBookCount] = useState(0);
  const [bookList, setBookList] = useState([]);

  useEffect(() => {
    const user = tokenStorage.getUser();
    if (!user) {
      setCurrentUser(null);
      setLoading(false);
      router.replace('/login');
      return;
    }

    // Validasi sesi admin dengan backend terlebih dahulu
    loansApi.getLoanStats()
      .then((stats) => {
        setCurrentUser(user);
        setLoanStats(stats || {});
        loadDashboardData();
      })
      .catch((err) => {
        console.warn('[Dashboard] Sesi admin tidak valid atau backend offline:', err);
        tokenStorage.clear();
        setCurrentUser(null);
        setLoading(false);
        router.replace('/login');
      });
  }, [router]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [lStats, loans, members, books, attStats] = await Promise.allSettled([
        loansApi.getLoanStats(),
        loansApi.getLoans(),
        membersApi.getMembers(),
        booksApi.getBooks(),
        attendanceApi.getAttendanceStats(),
      ]);

      if (lStats.status === 'fulfilled') setLoanStats(lStats.value || {});
      if (loans.status === 'fulfilled') setRecentLoans(loans.value || []);
      if (members.status === 'fulfilled') setMembersCount((members.value || []).length);
      if (books.status === 'fulfilled') {
        const bks = books.value || [];
        setBookCount(bks.length);
        setBookList(bks);
      }

      let todayVisitorsCount = 0;
      if (attStats.status === 'fulfilled' && attStats.value) {
        todayVisitorsCount = attStats.value.today_visitors || 0;
        setVisitorStats(attStats.value);
      }

      // Merge local logs count if any
      try {
        const local = localStorage.getItem('lib_attendance_logs');
        if (local) {
          const parsed = JSON.parse(local);
          const today = new Date().toISOString().split('T')[0];
          const todayLocal = parsed.filter((l) => l.timestamp && l.timestamp.startsWith(today)).length;
          if (todayLocal > todayVisitorsCount) {
            setVisitorStats((prev) => ({
              ...prev,
              today_visitors: todayLocal,
            }));
          }
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Waiting for client-side auth check
  if (currentUser === undefined || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Memuat data dashboard perpustakaan...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // Aktivitas sepekan dihitung langsung dari data transaksi peminjaman database
  const weeklyData = [
    { day: 'Sen', borrow: 0, returnCount: 0 },
    { day: 'Sel', borrow: 0, returnCount: 0 },
    { day: 'Rab', borrow: 0, returnCount: 0 },
    { day: 'Kam', borrow: 0, returnCount: 0 },
    { day: 'Jum', borrow: 0, returnCount: 0 },
    { day: 'Sab', borrow: 0, returnCount: 0 },
  ];

  recentLoans.forEach((l) => {
    if (l.borrow_date) {
      const d = new Date(l.borrow_date);
      const dayShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()];
      const target = weeklyData.find((w) => w.day === dayShort);
      if (target) {
        target.borrow += 1;
        if (l.status === 'RETURNED') target.returnCount += 1;
      }
    }
  });

  // Kategori buku dihitung langsung dari koleksi buku database seeder
  const catMap = {};
  bookList.forEach((b) => {
    const cat = b.category || 'Umum';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });
  const totalB = bookCount || 1;
  const colorPalette = ['bg-blue-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-amber-500', 'bg-purple-600'];
  const categories = Object.keys(catMap).map((catName, idx) => ({
    name: catName,
    count: catMap[catName],
    percent: Math.round((catMap[catName] / totalB) * 100),
    color: colorPalette[idx % colorPalette.length],
  }));

  const totalBooksDisplay = bookCount;
  const activeLoansDisplay = loanStats.total_active_loans || 0;
  const totalMembersDisplay = membersCount;
  const totalFinesDisplay = loanStats.total_unpaid_fines || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 shadow-md border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Selamat Datang di Portal Pustakawan SMPN 1 Prambon, {currentUser?.fullName?.replace(/Prambon/gi, 'Prambon') || 'Pustakawan'}.
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Pantau aktivitas sirkulasi buku, status keterlambatan & denda siswa, serta kelola katalog perpustakaan secara real-time.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Link
              href="/pustakawan/absensi"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>📋</span>
              <span>Absensi Pengunjung</span>
            </Link>
            <Link
              href="/pustakawan/peminjaman"
              className="px-4 py-2.5 bg-[#4B3B78] hover:bg-[#3D2E66] text-white rounded-xl text-xs font-bold shadow-md shadow-purple-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>📦</span>
              <span>Peminjaman Buku</span>
            </Link>
            <Link
              href="/visitors"
              className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>👥 Tracking ({visitorStats.today_visitors})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top 5 Stats Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Pengunjung Hari Ini */}
        <Link
          href="/visitors"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
              Pengunjung Hari Ini
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              👥
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
              {visitorStats.today_visitors}
            </h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <span>&rarr; Buka Tracking Presensi</span>
            </p>
          </div>
        </Link>

        {/* Card 2: Total Judul Buku */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Koleksi Buku
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{totalBooksDisplay}</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <span>&uarr; Siap dipinjam</span>
              <span className="text-slate-400 font-normal">&bull; terdaftar</span>
            </p>
          </div>
        </div>

        {/* Card 3: Peminjaman Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Peminjaman Aktif
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{activeLoansDisplay}</h3>
            <p className="text-xs text-indigo-600 font-semibold mt-1">
              {loanStats.total_overdue_loans || 0} buku terlambat
            </p>
          </div>
        </div>

        {/* Card 4: Anggota / Siswa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Anggota Terdaftar
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{totalMembersDisplay}</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <span>Face recognition</span>
            </p>
          </div>
        </div>

        {/* Card 5: Denda Tertunggak */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tanggungan Denda
            </span>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-red-600">
              Rp {Number(totalFinesDisplay).toLocaleString('id-ID')}
            </h3>
            <p className="text-xs text-red-500 font-semibold mt-1">
              {loanStats.total_overdue_loans || 0} akun perlu penyelesaian
            </p>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Activity Trend & Popular Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Aktivitas Peminjaman & Pengembalian
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Statistik lalu lintas sirkulasi buku sepekan terakhir
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
                Peminjaman
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                Pengembalian
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-60 flex items-end justify-between gap-3 pt-6 px-2">
            {weeklyData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1.5 h-44">
                  {/* Borrow Bar */}
                  <div
                    style={{ height: `${(item.borrow / 45) * 100}%` }}
                    className="w-full max-w-[20px] bg-blue-600 rounded-t-md transition-all duration-300 group-hover:bg-blue-700 relative"
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap transition-opacity">
                      {item.borrow}
                    </span>
                  </div>
                  {/* Return Bar */}
                  <div
                    style={{ height: `${(item.returnCount / 45) * 100}%` }}
                    className="w-full max-w-[20px] bg-emerald-500 rounded-t-md transition-all duration-300 group-hover:bg-emerald-600 relative"
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap transition-opacity">
                      {item.returnCount}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-slate-800">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Popular Categories Progress Bars */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Kategori Buku Populer</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Berdasarkan frekuensi peminjaman siswa
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {categories.map((cat, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">{cat.name}</span>
                  <span className="text-slate-500">{cat.count} buku</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/books"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-between"
            >
              <span>Lihat Detail Katalog Buku</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Recent Circulation Table + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Circulation Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Sirkulasi & Peminjaman Terbaru
              </h2>
              <p className="text-xs text-slate-400">
                Catatan transaksi sirkulasi buku terkini di perpustakaan
              </p>
            </div>
            <Link
              href="/circulation"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Buku</th>
                  <th className="px-5 py-3">Peminjam</th>
                  <th className="px-5 py-3">Jatuh Tempo</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLoans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      Belum ada transaksi peminjaman aktif tercatat.
                    </td>
                  </tr>
                ) : (
                  recentLoans.map((loan, idx) => {
                    const isOverdue = loan.status === 'OVERDUE' || (loan.status === 'BORROWED' && new Date(loan.due_date) < new Date());
                    const isReturned = loan.status === 'RETURNED';

                    return (
                      <tr key={loan.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-800 line-clamp-1">
                            {loan.book_title || loan.book?.title || 'Judul Buku Perpustakaan'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {loan.barcode || loan.book_barcode || 'BRC-849204'}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">
                            {loan.member_name || loan.member?.full_name || 'Siswa'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {loan.member_nisn || loan.member?.nisn || 'NISN Terdaftar'}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-600 whitespace-nowrap">
                          {loan.due_date
                            ? new Date(loan.due_date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '7 Hari'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {isReturned ? (
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & System Status */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-800">Aksi Cepat Admin</h2>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <Link
                href="/books"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Manajemen Buku</h3>
                  <p className="text-[11px] text-slate-400">Tambah koleksi & eksemplar</p>
                </div>
              </Link>

              <Link
                href="/books/import"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Import Excel Massal</h3>
                  <p className="text-[11px] text-slate-400">Upload batch data koleksi</p>
                </div>
              </Link>

              <Link
                href="/loans/tracking"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Tanggungan & Denda</h3>
                  <p className="text-[11px] text-slate-400">Penagihan buku jatuh tempo</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
