'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '@/components/perpus/home/Navbar';
import PerpusFooterMain from '@/components/perpus/home/PerpusFooterMain';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { attendanceApi } from '@/lib/features/library/api/attendanceApi';

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

function getPurposeBadge(purpose) {
  const p = (purpose || '').toUpperCase();
  if (p.includes('BACA') || p.includes('MEMBACA')) {
    return {
      label: 'Membaca Buku',
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  }
  if (p.includes('PINJAM') || p.includes('MEMINJAM')) {
    return {
      label: 'Peminjaman / Pengembalian',
      className: 'bg-blue-50 text-blue-700 border border-blue-200',
    };
  }
  if (p.includes('AJAR') || p.includes('PEMBELAJARAN') || p.includes('TUGAS')) {
    return {
      label: 'Pembelajaran / Tugas',
      className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    };
  }
  return {
    label: purpose || 'Kunjungan Umum',
    className: 'bg-slate-100 text-slate-700 border border-slate-200',
  };
}

export default function AbsensiPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Sync user profile for Navbar and filter
  useEffect(() => {
    const local = tokenStorage.getUser();
    if (local) {
      setUser({
        id: local.id || 'siswa-1',
        nama: local.nama || local.fullName || local.full_name || local.username || 'Siswa Spenspra',
        peran: local.peran || local.roleName || 'SISWA',
        kelas_atau_jabatan: local.kelas_atau_jabatan || local.className || local.kelas || 'Peserta Didik',
        foto: local.photoUrl || local.foto || null,
        nisn: local.nimNip || local.nisn || '',
      });
    }
  }, []);

  const loadAttendances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const local = tokenStorage.getUser();
      const studentId = local?.id || '';
      const studentName = local?.nama || local?.fullName || '';

      const res = await attendanceApi.getAttendances(studentId || studentName, '');
      const list = Array.isArray(res) ? res : res?.data || [];

      // Filter khusus kunjungan siswa yang sedang login jika respons berupa semua data
      const userList = list.filter((item) => {
        if (!studentId && !studentName) return true;
        const matchesId = item.member_id && String(item.member_id) === String(studentId);
        const matchesName = item.visitor_name && item.visitor_name.toLowerCase().includes(studentName.toLowerCase());
        const matchesCode = item.member_code && (item.member_code === local?.nimNip || item.member_code === local?.nisn);
        return matchesId || matchesName || matchesCode;
      });

      // Urutkan dari yang paling baru
      userList.sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));
      setAttendances(userList);
    } catch (err) {
      console.error('Gagal memuat log absensi perpustakaan:', err);
      // Coba fallback ke data lokal jika backend offline
      try {
        const stored = localStorage.getItem('perpusdig_visitor_logs');
        if (stored) {
          const parsed = JSON.parse(stored);
          setAttendances(Array.isArray(parsed) ? parsed : []);
        } else {
          setError('Gagal memuat riwayat absensi. Silakan periksa koneksi Anda.');
        }
      } catch {
        setError('Gagal memuat riwayat absensi. Silakan periksa koneksi Anda.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendances();
  }, [loadAttendances]);

  // Pagination calculation
  const totalItems = attendances.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return attendances.slice(start, start + pageSize);
  }, [attendances, currentPage, pageSize]);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans text-slate-800">
      <div>
        <Navbar user={user} />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
          {/* Header Title & Subtitle sesuai gaya Peminjaman */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2538] tracking-tight">
              Absensi Perpustakaan
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              Riwayat kunjungan Anda ke perpustakaan SMP Negeri 1 Prambon.
            </p>
          </div>

          {/* 1. STATE: Loading Skeleton */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-12 bg-slate-200 rounded-t-xl w-full" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg w-full" />
              ))}
            </div>
          )}

          {/* 2. STATE: Error with Retry */}
          {!loading && error && (
            <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl max-w-md mx-auto shadow-xs">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Gagal Memuat Data</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">{error}</p>
              <button
                type="button"
                onClick={loadAttendances}
                className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-[#1E2538] hover:bg-[#141B2B] text-white transition-colors cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* 3. STATE: Empty State */}
          {!loading && !error && attendances.length === 0 && (
            <div className="py-20 text-center border border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800">Belum Ada Riwayat Kunjungan</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                Anda belum memiliki catatan presensi di perpustakaan. Kunjungi perpustakaan dan lakukan presensi di Kiosk presensi mandiri.
              </p>
            </div>
          )}

          {/* 4. STATE: Table Data */}
          {!loading && !error && attendances.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead>
                  <tr className="bg-[#1E2538] text-white text-xs font-semibold uppercase tracking-wider">
                    <th scope="col" className="py-4 px-4 text-center w-16">
                      No
                    </th>
                    <th scope="col" className="py-4 px-6">
                      Tanggal
                    </th>
                    <th scope="col" className="py-4 px-6 text-center">
                      Jam Kunjungan
                    </th>
                    <th scope="col" className="py-4 px-6">
                      Keperluan
                    </th>
                    <th scope="col" className="py-4 px-6 text-center">
                      Metode Presensi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedList.map((item, index) => {
                    const rowNum = (currentPage - 1) * pageSize + index + 1;
                    const dateRaw = item.created_at || item.timestamp || item.date || item.visit_date;
                    const purposeInfo = getPurposeBadge(item.purpose || item.keperluan);
                    const method = (item.method || item.attendance_method || 'BARCODE_SCAN').toUpperCase();

                    return (
                      <tr
                        key={item.id || index}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* No */}
                        <td className="py-4 px-4 text-center font-medium text-slate-500 align-middle">
                          {rowNum}
                        </td>

                        {/* Tanggal */}
                        <td className="py-4 px-6 font-semibold text-slate-800 align-middle whitespace-nowrap">
                          {formatDateIndo(dateRaw)}
                        </td>

                        {/* Jam */}
                        <td className="py-4 px-6 text-center text-slate-600 align-middle whitespace-nowrap font-mono text-xs">
                          {formatTimeIndo(dateRaw)} WIB
                        </td>

                        {/* Keperluan */}
                        <td className="py-4 px-6 align-middle">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${purposeInfo.className}`}
                          >
                            {purposeInfo.label}
                          </span>
                        </td>

                        {/* Metode Presensi */}
                        <td className="py-4 px-6 text-center align-middle whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                            {method.includes('FACE') ? (
                              <>
                                <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Scan Wajah</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                                <span>Barcode Kartu</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination jika lebih dari 1 halaman */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                  <p className="text-xs text-slate-500">
                    Menampilkan <span className="font-semibold text-slate-700">{(currentPage - 1) * pageSize + 1}</span> -{' '}
                    <span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, totalItems)}</span> dari{' '}
                    <span className="font-semibold text-slate-700">{totalItems}</span> kunjungan
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      &lt;
                    </button>
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      const isCurrent = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 text-xs rounded-md font-medium transition-colors ${
                            isCurrent
                              ? 'bg-[#1E2538] text-white'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <PerpusFooterMain />
    </div>
  );
}
