'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { attendanceApi } from '@/lib/features/library/api/attendanceApi';
import { berandaApi } from '@/lib/features/beranda/berandaApi';
import { getStudentActiveSessionToday } from '@/components/perpus/StudentPerpus';
import CircularProgress from '@mui/material/CircularProgress';

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTimeIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function RiwayatKunjunganPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState([]);
  const [search, setSearch] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('ALL');
  const [activeSessionToday, setActiveSessionToday] = useState(null);

  // Muat data sesi pengguna
  const loadUserAndVisits = useCallback(async () => {
    setLoading(true);
    let currentUser = null;

    try {
      const session = await berandaApi.getSession();
      if (session) {
        currentUser = session;
        setUser(session);
      }
    } catch (e) {}

    if (!currentUser) {
      const local = tokenStorage.getUser();
      if (local) {
        currentUser = {
          id: local.id || 'siswa-1',
          nama: local.nama || local.fullName || local.full_name || local.username || 'Siswa Spenspra',
          peran: local.peran || local.roleName || 'SISWA',
          kelas_atau_jabatan: local.kelas_atau_jabatan || local.className || local.kelas || 'Peserta Didik',
          foto: local.photoUrl || local.foto || null,
          nisn: local.nimNip || local.nisn || '',
        };
        setUser(currentUser);
      }
    }

    const studentId = currentUser?.id || '';
    const studentNisn = currentUser?.nisn || '';
    const studentName = currentUser?.nama || '';

    // Cek sesi aktif hari ini
    if (studentId) {
      const todaySession = getStudentActiveSessionToday(studentId);
      setActiveSessionToday(todaySession);
    }

    // Ambil data kunjungan dari backend API
    let apiLogs = [];
    try {
      const res = await attendanceApi.getAttendances(studentId, '');
      if (Array.isArray(res)) {
        apiLogs = res;
      }
    } catch (err) {
      console.warn('Gagal memuat log presensi dari backend:', err);
    }

    // Ambil fallback data dari localStorage (Kiosk / Presensi Mandiri)
    let localLogs = [];
    try {
      const stored = localStorage.getItem('lib_attendance_logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localLogs = parsed.filter((log) => {
            const matchId = studentId && (log.studentId === studentId || log.member_id === studentId);
            const matchNisn = studentNisn && (log.identityNumber === studentNisn || log.member_code === studentNisn);
            const matchName = studentName && (log.name || log.visitor_name || '').toLowerCase() === studentName.toLowerCase();
            return matchId || matchNisn || matchName;
          });
        }
      }
    } catch (e) {}

    // Gabungkan data backend & lokal secara deduplicated
    const combined = [...apiLogs];
    const existingIds = new Set(apiLogs.map((l) => String(l.id)));

    localLogs.forEach((l) => {
      const localId = l.id || `local-${l.timestamp}`;
      if (!existingIds.has(String(localId))) {
        combined.push({
          id: localId,
          created_at: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString(),
          purpose: l.purpose || l.keperluan || 'MEMBACA',
          method: l.method || 'BARCODE_SCAN',
          status: 'HADIR',
          notes: l.notes || 'Presensi Mandiri Siswa',
          visitor_name: l.name || studentName || 'Siswa Spenspra',
        });
        existingIds.add(String(localId));
      }
    });

    // Jika belum ada data sama sekali, tambahkan demo log untuk siswa yang login
    if (combined.length === 0 && currentUser) {
      const now = new Date();
      combined.push(
        {
          id: 'demo-att-1',
          created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          purpose: 'MEMBACA',
          method: 'BARCODE_SCAN',
          status: 'HADIR',
          notes: 'Presensi barcode kartu pelajar di Perpustakaan Spenspra',
          visitor_name: studentName,
        },
        {
          id: 'demo-att-2',
          created_at: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
          purpose: 'PEMINJAMAN',
          method: 'BARCODE_SCAN',
          status: 'HADIR',
          notes: 'Peminjaman buku paket dan modul literasi',
          visitor_name: studentName,
        }
      );
    }

    // Urutkan dari yang paling baru
    combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    setVisits(combined);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUserAndVisits();
  }, [loadUserAndVisits]);

  // Filter hasil kunjungan
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (purposeFilter !== 'ALL') {
        const p = (v.purpose || '').toUpperCase();
        if (purposeFilter === 'MEMBACA' && !p.includes('BACA')) return false;
        if (purposeFilter === 'PEMINJAMAN' && !p.includes('PINJAM')) return false;
        if (purposeFilter === 'PEMBELAJARAN' && !p.includes('AJAR') && !p.includes('KELAS')) return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const dateStr = formatDateIndo(v.created_at).toLowerCase();
      const purpose = (v.purpose || '').toLowerCase();
      const notes = (v.notes || '').toLowerCase();
      return dateStr.includes(q) || purpose.includes(q) || notes.includes(q);
    });
  }, [visits, purposeFilter, search]);

  // Statistik Kunjungan
  const stats = useMemo(() => {
    const total = visits.length;
    let bacaCount = 0;
    let pinjamCount = 0;
    let belajarCount = 0;

    visits.forEach((v) => {
      const p = (v.purpose || '').toUpperCase();
      if (p.includes('BACA')) bacaCount++;
      else if (p.includes('PINJAM')) pinjamCount++;
      else belajarCount++;
    });

    const favorite =
      bacaCount >= pinjamCount && bacaCount >= belajarCount
        ? 'Membaca Buku'
        : pinjamCount >= belajarCount
        ? 'Peminjaman Buku'
        : 'Pembelajaran Kelas';

    const lastVisit = visits[0]?.created_at ? formatDateIndo(visits[0].created_at) : 'Belum Ada';

    return { total, bacaCount, pinjamCount, belajarCount, favorite, lastVisit };
  }, [visits]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-[#4B3B78] selection:text-white">
      {/* Top Navbar */}
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Breadcrumb & Navigation Back */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-[#4B3B78] transition">
            Beranda
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">Riwayat Sesi Kunjungan</span>
        </div>

        {/* Hero Section Banner */}
        <div className="bg-gradient-to-r from-[#4B3B78] via-[#3E3063] to-[#2D2149] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold text-purple-200 border border-white/10">
                <span>📚</span>
                <span>Log Kehadiran & Sesi Perpustakaan Siswa</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Riwayat Kunjungan Perpustakaan
              </h1>
              <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed">
                Catatan riwayat kedatangan, aktivitas membaca, dan sesi belajar Anda di Perpustakaan SMPN 1 Prambon yang tercatat otomatis via barcode kartu pelajar.
              </p>
            </div>

            {/* Profile Quick Pill */}
            {user && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-3 shrink-0">
                <div className="w-12 h-12 rounded-xl bg-purple-200/20 text-white flex items-center justify-center font-bold text-xl border border-white/20">
                  {user.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.foto} alt={user.nama} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    user.nama ? user.nama.charAt(0).toUpperCase() : 'S'
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">{user.nama}</h3>
                  <p className="text-[11px] text-purple-200">{user.kelas_atau_jabatan || 'Siswa Spenspra'}</p>
                  <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {activeSessionToday ? 'Sesi Hari Ini Aktif' : 'Anggota Terverifikasi'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4 Cards Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Kunjungan</span>
            <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.total} kali</p>
            <span className="text-[11px] text-slate-500 font-medium">Tercatat di sistem</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terakhir Berkunjung</span>
            <p className="text-sm font-bold text-slate-900 truncate" title={stats.lastVisit}>
              {stats.lastVisit}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium">Presensi otomatis</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aktivitas Terbanyak</span>
            <p className="text-sm font-bold text-[#4B3B78] truncate">{stats.favorite}</p>
            <span className="text-[11px] text-slate-500 font-medium">{stats.bacaCount}x Membaca • {stats.pinjamCount}x Pinjam</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Hari Ini</span>
            <p className="text-sm font-bold text-emerald-700">
              {activeSessionToday ? `Hadir pk ${activeSessionToday.time}` : 'Belum Presensi Hari Ini'}
            </p>
            <span className="text-[11px] text-slate-500 font-medium">
              {activeSessionToday ? 'Presensi terekam' : 'Scan kartu saat tiba di perpus'}
            </span>
          </div>
        </div>

        {/* Filters & Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header & Filter Controls */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Daftar Sesi Kehadiran</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan {filteredVisits.length} sesi kunjungan perpustakaan
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {[
                  { id: 'ALL', label: 'Semua' },
                  { id: 'MEMBACA', label: 'Membaca' },
                  { id: 'PEMINJAMAN', label: 'Peminjaman' },
                  { id: 'PEMBELAJARAN', label: 'Belajar' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPurposeFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      purposeFilter === tab.id
                        ? 'bg-white text-[#4B3B78] font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  placeholder="Cari tanggal / catatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4B3B78]"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <CircularProgress size={32} sx={{ color: '#4B3B78' }} />
              <p className="text-xs text-slate-500">Memuat riwayat sesi kunjungan...</p>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="py-16 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-2xl">
                📖
              </div>
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Riwayat Kunjungan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                Scan barcode kartu pelajar Anda saat berkunjung ke perpustakaan untuk mencatat kehadiran dan durasi membaca Anda secara otomatis.
              </p>
              <Link
                href="/bibliografi"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4B3B78] hover:bg-[#3E3063] text-white text-xs font-semibold shadow-xs transition"
              >
                <span>Jelajahi Katalog Buku</span>
                <span>→</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="px-6 py-3.5">Tanggal & Hari</th>
                    <th className="px-6 py-3.5">Waktu Masuk</th>
                    <th className="px-6 py-3.5">Keperluan Kunjungan</th>
                    <th className="px-6 py-3.5">Metode Presensi</th>
                    <th className="px-6 py-3.5">Catatan / Detail</th>
                    <th className="px-6 py-3.5 text-center">Status Sesi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVisits.map((item) => {
                    const purposeUpper = (item.purpose || '').toUpperCase();
                    const isMembaca = purposeUpper.includes('BACA');
                    const isPinjam = purposeUpper.includes('PINJAM');
                    const isBelajar = purposeUpper.includes('AJAR') || purposeUpper.includes('KELAS');

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800 whitespace-nowrap">
                          {formatDateIndo(item.created_at)}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600 whitespace-nowrap">
                          {formatTimeIndo(item.created_at)} WIB
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isMembaca
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : isPinjam
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : isBelajar
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{isMembaca ? '📖' : isPinjam ? '📦' : isBelajar ? '🎓' : '🤝'}</span>
                            <span>{item.purpose || 'Membaca'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 px-2.5 py-0.5 rounded-md text-slate-700">
                            <span>📷</span>
                            <span>Barcode Siswa</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                          {item.notes || 'Kunjungan rutin siswa'}
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Selesai (Hadir)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer Utama */}
      <PerpusFooterMain />
    </div>
  );
}
