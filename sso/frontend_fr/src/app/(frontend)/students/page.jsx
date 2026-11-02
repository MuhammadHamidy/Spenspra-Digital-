'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { schoolPeopleApi } from '@/lib/features/schoolPeopleApi';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { getRole } from '@/lib/access/portalAccess';
import Pagination from '@/components/Pagination';
import AppIcon from '@/components/AppIcon';

const TYPE_CONFIG = {
  SISWA: {
    label: 'Peserta Didik (Siswa)',
    shortLabel: 'Siswa',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    color: 'border-blue-500',
    functions: ['Presensi Harian', 'Peminjaman Buku Perpus', 'Akses e-Rapor Siswa'],
  },
  GURU: {
    label: 'Tenaga Pendidik (Guru)',
    shortLabel: 'Guru',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: 'border-emerald-500',
    functions: ['Presensi Masuk & Jam Mengajar', 'Layanan Perpustakaan', 'Akses SSO Guru & e-Rapor'],
  },
  TENAGA_KEPENDIDIKAN: {
    label: 'Tenaga Kependidikan (Tendik / Staff)',
    shortLabel: 'Tendik / TU',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    color: 'border-purple-500',
    functions: ['Presensi Pegawai / TU', 'Administrasi Sekolah', 'Layanan Perpustakaan'],
  },
  KEPALA_SEKOLAH: {
    label: 'Kepala Sekolah',
    shortLabel: 'Kepsek',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    color: 'border-amber-500',
    functions: ['Verifikasi Kehadiran Eksekutif', 'Validasi Dokumen Digital', 'Akses Penuh SSO'],
  },
};

export default function BarcodeMultifungsiPage() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedCardForModal, setSelectedCardForModal] = useState(null);

  // Print & Export Configuration State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printScope, setPrintScope] = useState('ALL_STUDENTS'); // 'ALL_STUDENTS' | 'BY_CLASS' | 'FILTERED' | 'CURRENT_PAGE'
  const [selectedPrintClass, setSelectedPrintClass] = useState('ALL');
  const [separatePagePerClass, setSeparatePagePerClass] = useState(true);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanInputToken, setScanInputToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

  const getBarcodeImageUrl = (personId, size = 256) =>
    `${apiBase}/master/people/${encodeURIComponent(personId)}/barcode?size=${size}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Ambil data master people (sumber utama barcode)
      const peopleList = await schoolPeopleApi.list();
      setPeople(Array.isArray(peopleList) ? peopleList : []);
    } catch (err) {
      console.warn('Gagal memuat master people:', err.message);
      setError('Gagal memuat data barcode civitas dari server backend.');
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Daftar opsi rombel kelas
  const classOptions = useMemo(() => {
    const set = new Set();
    people.forEach((p) => {
      if (p.class_name && p.class_name.trim()) set.add(p.class_name.trim());
    });
    return ['ALL', ...Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))];
  }, [people]);

  // Daftar rombel khusus siswa
  const studentClasses = useMemo(() => {
    const set = new Set();
    people.forEach((p) => {
      if (p.person_type === 'SISWA' && p.class_name && p.class_name.trim()) {
        set.add(p.class_name.trim());
      }
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [people]);

  // Seluruh siswa terurut rapi: Rombel Kelas ASC lalu Nama Siswa ASC
  const sortedStudents = useMemo(() => {
    const list = people.filter((p) => p.person_type === 'SISWA');
    return [...list].sort((a, b) => {
      const classA = a.class_name || '';
      const classB = b.class_name || '';
      const classComp = classA.localeCompare(classB, undefined, { numeric: true, sensitivity: 'base' });
      if (classComp !== 0) return classComp;
      return (a.full_name || '').localeCompare(b.full_name || '', 'id', { sensitivity: 'base' });
    });
  }, [people]);

  // Sinkronisasi kelas pilihan cetak
  useEffect(() => {
    if (classFilter !== 'ALL' && studentClasses.includes(classFilter)) {
      setSelectedPrintClass(classFilter);
    } else if (studentClasses.length > 0 && (!selectedPrintClass || selectedPrintClass === 'ALL')) {
      setSelectedPrintClass(studentClasses[0]);
    }
  }, [classFilter, studentClasses, selectedPrintClass]);

  const { user } = useAuth();
  const role = getRole(user);
  const isSiswa = role === 'SISWA' || role === 'ROLE-SISWA';

  // Filter civitas
  const filteredPeople = useMemo(() => {
    if (isSiswa && user) {
      const studentNisn = String(user.nisn || user.username?.replace('siswa_', '') || user.nimNip?.replace('NISN. ', '') || '').trim().toLowerCase();
      const studentId = String(user.id || user.person_id || '').trim();
      const studentName = String(user.fullName || user.full_name || '').trim().toLowerCase();

      const matched = people.filter((p) => {
        const pNisn = String(p.nisn || '').trim().toLowerCase();
        const pId = String(p.id || '').trim();
        const pName = String(p.full_name || '').trim().toLowerCase();
        return (studentNisn && pNisn === studentNisn) || (studentId && pId === studentId) || (studentName && pName === studentName);
      });

      return matched;
    }

    return people.filter((p) => {
      if (roleFilter !== 'ALL' && p.person_type !== roleFilter) return false;
      if (classFilter !== 'ALL' && p.class_name !== classFilter) return false;
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const name = (p.full_name || '').toLowerCase();
      const nisn = (p.nisn || '').toLowerCase();
      const nip = (p.nip || '').toLowerCase();
      const token = (p.barcode_token || '').toLowerCase();
      const cls = (p.class_name || '').toLowerCase();
      return name.includes(q) || nisn.includes(q) || nip.includes(q) || token.includes(q) || cls.includes(q);
    });
  }, [people, roleFilter, classFilter, search, isSiswa, user]);

  // Reset nomor halaman ke 1 saat filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, classFilter, search]);

  // Data terpaginasi untuk tampilan halaman aktif di layar
  const paginatedPeople = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPeople.slice(start, start + pageSize);
  }, [filteredPeople, currentPage, pageSize]);

  // Helper pemotong lembar A4 (3x4 = 12 kartu per lembar)
  const chunkIntoSheets = (items, chunkSize = 12) => {
    const sheets = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      sheets.push(items.slice(i, i + chunkSize));
    }
    return sheets;
  };

  // Kalkulasi lembar cetak aktif untuk PDF / Printer (Bebas Terpotong)
  const activePrintSheets = useMemo(() => {
    if (isSiswa) {
      return chunkIntoSheets(filteredPeople.length > 0 ? [filteredPeople[0]] : []);
    }

    if (printScope === 'ALL_STUDENTS') {
      if (separatePagePerClass) {
        // Kelompokkan per rombel kelas, setiap kelas mulai halaman baru
        const sheets = [];
        const classMap = new Map();
        sortedStudents.forEach((student) => {
          const cls = student.class_name?.trim() || 'Lainnya';
          if (!classMap.has(cls)) classMap.set(cls, []);
          classMap.get(cls).push(student);
        });

        classMap.forEach((studentsInClass) => {
          const classSheets = chunkIntoSheets(studentsInClass, 12);
          sheets.push(...classSheets);
        });
        return sheets.length > 0 ? sheets : [[]];
      } else {
        // Mode hemat kertas: bersambung 12 per halaman
        const sheets = chunkIntoSheets(sortedStudents, 12);
        return sheets.length > 0 ? sheets : [[]];
      }
    }

    if (printScope === 'BY_CLASS') {
      const target = selectedPrintClass || studentClasses[0] || '';
      const classStudents = sortedStudents.filter(
        (s) => (s.class_name || '').trim() === (target || '').trim()
      );
      const sheets = chunkIntoSheets(classStudents, 12);
      return sheets.length > 0 ? sheets : [[]];
    }

    if (printScope === 'FILTERED') {
      const sheets = chunkIntoSheets(filteredPeople, 12);
      return sheets.length > 0 ? sheets : [[]];
    }

    if (printScope === 'CURRENT_PAGE') {
      const sheets = chunkIntoSheets(paginatedPeople, 12);
      return sheets.length > 0 ? sheets : [[]];
    }

    return chunkIntoSheets(paginatedPeople, 12);
  }, [
    isSiswa,
    filteredPeople,
    printScope,
    separatePagePerClass,
    sortedStudents,
    selectedPrintClass,
    studentClasses,
    paginatedPeople,
  ]);

  // Ringkasan preview cetak
  const printSummary = useMemo(() => {
    let count = 0;
    if (printScope === 'ALL_STUDENTS') {
      count = sortedStudents.length;
    } else if (printScope === 'BY_CLASS') {
      count = sortedStudents.filter(
        (s) => (s.class_name || '').trim() === (selectedPrintClass || studentClasses[0] || '').trim()
      ).length;
    } else if (printScope === 'FILTERED') {
      count = filteredPeople.length;
    } else {
      count = paginatedPeople.length;
    }
    const totalSheets = activePrintSheets.length;
    return { count, totalSheets };
  }, [printScope, sortedStudents, selectedPrintClass, studentClasses, filteredPeople, paginatedPeople, activePrintSheets]);

  // Eksekusi Cetak / Simpan PDF
  const handleExecutePrint = () => {
    setIsPreparingPrint(true);
    setIsPrintModalOpen(false);
    setTimeout(() => {
      setIsPreparingPrint(false);
      window.print();
    }, 150);
  };

  // Handle Verify / Resolve Barcode Real-time via API
  const handleResolveBarcode = async (e) => {
    e?.preventDefault();
    if (!scanInputToken.trim()) return;

    setScanLoading(true);
    setScanError('');
    setScanResult(null);

    try {
      const result = await schoolPeopleApi.resolveBarcode(scanInputToken.trim());
      setScanResult(result);
    } catch (err) {
      setScanError(err.message || 'Token barcode tidak valid atau sudah dicabut.');
    } finally {
      setScanLoading(false);
    }
  };

  // Statistik
  const stats = useMemo(() => {
    const total = people.length;
    const active = people.filter((p) => p.barcode_status === 'ACTIVE' && p.is_active).length;
    const siswa = people.filter((p) => p.person_type === 'SISWA').length;
    const guru = people.filter((p) => p.person_type === 'GURU').length;
    const tendik = people.filter((p) => p.person_type === 'TENAGA_KEPENDIDIKAN' || p.person_type === 'KEPALA_SEKOLAH').length;
    return { total, active, siswa, guru, tendik };
  }, [people]);

  return (
    <div className="students-print-page max-w-7xl mx-auto px-2 sm:px-0">
      {/* Tampilan Layar Interaktif (Disembunyikan saat Mencetak/Print) */}
      <div className="print-screen-view space-y-4 sm:space-y-6">
        {/* Header Utama */}
        <div className="border-b border-slate-200 pb-3 sm:pb-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4 print:hidden">
          <div>
            {isSiswa && (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg mb-2 shadow-2xs cursor-pointer"
              >
                ← Kembali ke Menu
              </Link>
            )}
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {isSiswa ? 'Kartu Barcode Saya' : 'Kartu Barcode Multifungsi Civitas'}
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {isSiswa ? 'Peserta Didik' : 'Siswa • Guru • Tendik'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isSiswa
                ? 'Tunjukkan barcode ini kepada petugas sekolah atau pustakawan.'
                : 'Master token barcode resmi SMP Negeri 1 Prambon untuk Presensi Digital, Perpustakaan, dan Akses Layanan SSO.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Tombol Scanner Verifikasi (Hanya Admin / Guru) */}
            {!isSiswa && (
              <button
                type="button"
                onClick={() => {
                  setIsScannerOpen(true);
                  setScanResult(null);
                  setScanError('');
                  setScanInputToken('');
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <AppIcon name="search" color="blue" size={14} />
                <span>Uji / Validasi Token Barcode</span>
              </button>
            )}

            {/* Tombol Print & Ekspor Lembar Kartu */}
            <div className="flex items-center gap-2">
              {isSiswa ? (
                <button
                  type="button"
                  onClick={() => {
                    setPrintScope('CURRENT_PAGE');
                    handleExecutePrint();
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Cetak Kartu Saya</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintScope('ALL_STUDENTS');
                      setIsPrintModalOpen(true);
                    }}
                    title="Cetak barcode siswa semua rombel atau rombel pilihan ke dalam 1 file PDF"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Cetak / Ekspor Barcode (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintScope('CURRENT_PAGE');
                      handleExecutePrint();
                    }}
                    title={`Cetak kartu pada halaman aktif saja (${paginatedPeople.length} kartu)`}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Halaman Ini ({paginatedPeople.length})</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

      {/* Ringkasan Statistik (Hanya untuk Admin / Guru) */}
      {!isSiswa && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:hidden">
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Barcode</p>
            <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{stats.total}</p>
          </div>
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Status Aktif</p>
            <p className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">{stats.active}</p>
          </div>
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Siswa (Pelajar)</p>
            <p className="text-xl font-bold text-blue-700 mt-1 tabular-nums">{stats.siswa}</p>
          </div>
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Guru (Pendidik)</p>
            <p className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">{stats.guru}</p>
          </div>
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
            <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Tendik & TU</p>
            <p className="text-xl font-bold text-purple-700 mt-1 tabular-nums">{stats.tendik}</p>
          </div>
        </div>
      )}

      {/* Error Banner jika ada */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs print:hidden">
          {error}
        </div>
      )}

      {/* Toolbar Filter & Pencarian (Hanya untuk Admin / Guru) */}
      {!isSiswa && (
        <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 shadow-xs print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Filter Peran Civitas */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-600 mr-1">Kategori:</span>
              {[
                { id: 'ALL', label: 'Semua Civitas' },
                { id: 'SISWA', label: 'Siswa' },
                { id: 'GURU', label: 'Guru' },
                { id: 'TENAGA_KEPENDIDIKAN', label: 'Tendik / TU' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    roleFilter === tab.id
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="w-full sm:w-72">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Cari nama, NISN, NIP, token..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Filter Rombel Siswa jika filter SISWA atau ALL dipilih */}
          {(roleFilter === 'SISWA' || roleFilter === 'ALL') && classOptions.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 mr-1">Rombel Siswa:</span>
              {classOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassFilter(c)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    classFilter === c
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c === 'ALL' ? 'Semua Kelas' : c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid Kartu Barcode Multifungsi */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          Memuat data barcode resmi civitas sekolah…
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
          {isSiswa
            ? 'Belum ada kartu barcode yang ditautkan ke akun Anda. Silakan hubungi admin sekolah untuk menerbitkan barcode.'
            : search || roleFilter !== 'ALL' || classFilter !== 'ALL'
            ? 'Tidak ada data civitas yang cocok dengan filter atau pencarian saat ini.'
            : 'Belum ada data identitas civitas dengan barcode. Tambahkan civitas baru di menu Master Data.'}
        </div>
      ) : (
        <div className="space-y-4">
          <div className={isSiswa ? "max-w-md mx-auto" : "barcode-cards-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"}>
            {paginatedPeople.map((person) => {
              const config = TYPE_CONFIG[person.person_type] || TYPE_CONFIG.SISWA;
              const isActive = person.barcode_status === 'ACTIVE' && person.is_active;
              const identifier = person.nisn ? `NISN: ${person.nisn}` : person.nip ? `NIP: ${person.nip}` : '';

              return (
                <article
                  key={person.id}
                  id={`barcode-card-${person.id}`}
                  className="student-qr-card bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-all"
                >
                  {/* Nama Khusus Mode Cetak (Sesuai Permintaan: Hanya Barcode dan Nama saat Cetak) */}
                  <div className="hidden print-only-name">
                    {person.full_name}
                  </div>

                  {/* Header Kartu Resmi (Hanya Tampil di Layar, Sembunyikan saat Cetak) */}
                  <div className="print-card-header flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="student-card-logo w-9 h-9 rounded-lg bg-white border border-slate-200/80 p-0.5 flex items-center justify-center shrink-0">
                        <Image
                          src="/image/logo-prambon.png"
                          alt="Logo SMPN 1 Prambon"
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="student-card-school text-[9px] font-bold text-blue-700 tracking-wider uppercase block truncate">
                          SMP NEGERI 1 PRAMBON
                        </span>
                        <h2
                          className="text-sm font-bold text-slate-900 leading-tight truncate"
                          title={person.full_name}
                        >
                          {person.full_name}
                        </h2>
                        {identifier && (
                          <p className="student-card-nisn text-[10px] text-slate-500 font-mono">
                            {identifier}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${config.badge}`}>
                        {person.class_name ? `Rombel ${person.class_name}` : config.shortLabel}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                          isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {isActive ? 'Aktif' : person.barcode_status}
                      </span>
                    </div>
                  </div>

                  {/* Area Barcode / QR Code Resmi dari Backend SSO */}
                  <div className="qr-image-wrapper flex flex-col items-center justify-center p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl">
                    <div className="w-32 h-32 flex items-center justify-center bg-white p-1 rounded-md shadow-2xs">
                      <img
                        src={getBarcodeImageUrl(person.id, 256)}
                        alt={`QR barcode ${person.full_name}`}
                        width={256}
                        height={256}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="mt-2 text-center w-full print:hidden">
                      <span className="block text-[10px] text-slate-500 font-mono truncate select-all">
                        {person.barcode_token}
                      </span>
                    </div>
                  </div>

                  {/* Tag Fungsi & Keterangan (Hanya Layar) */}
                  {isSiswa ? (
                    <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-100 text-center print:hidden">
                      <p className="text-xs font-semibold text-blue-900">
                        Absensi Harian & Perpustakaan
                      </p>
                      <p className="text-[11px] text-blue-600 mt-0.5">
                        Tingkatkan kecerahan layar HP saat discan oleh petugas
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 print:hidden">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Cakupan Layanan Terintegrasi:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {config.functions.map((fn, idx) => (
                            <span key={idx} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                              ✓ {fn}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 print:hidden">
                        <span className="text-[11px] text-slate-400 font-medium">{config.label}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCardForModal(person)}
                          className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer text-[11px]"
                        >
                          Detail Token →
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>

          {/* Kontrol Navigasi Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredPeople.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[12, 24, 36, 48, 96]}
            itemLabel="kartu civitas"
          />
        </div>
      )}

      {/* Modal Detail Kartu */}
      {selectedCardForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Detail Token Barcode Resmi
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCardForModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Lengkap:</span>
                  <span className="font-bold text-slate-900">{selectedCardForModal.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipe Civitas:</span>
                  <span className="font-semibold text-slate-900">{selectedCardForModal.person_type}</span>
                </div>
                {(selectedCardForModal.nisn || selectedCardForModal.nip) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{selectedCardForModal.nisn ? 'NISN:' : 'NIP:'}</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {selectedCardForModal.nisn || selectedCardForModal.nip}
                    </span>
                  </div>
                )}
                {selectedCardForModal.class_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rombel Kelas:</span>
                    <span className="font-bold text-blue-600">{selectedCardForModal.class_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Token:</span>
                  <span className={`font-bold ${selectedCardForModal.barcode_status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {selectedCardForModal.barcode_status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1 font-semibold">Token Barcode String (SSO Secret):</span>
                <div className="bg-slate-50 border border-slate-300 p-3 rounded-xl break-all font-mono tabular-nums text-[11px] text-slate-900 select-all">
                  {selectedCardForModal.barcode_token}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCardForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scanner / Verifikasi Barcode Real-Time via API */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Verifikasi Barcode Real-Time
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Validasi token barcode langsung ke server SSO (<code>/api/barcode/resolve</code>).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveBarcode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Masukkan / Tempel Token Barcode:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PRAMBON-88E2F9..."
                    value={scanInputToken}
                    onChange={(e) => setScanInputToken(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={scanLoading}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {scanLoading ? 'Memeriksa…' : 'Validasi'}
                  </button>
                </div>
              </div>

              {scanError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                  <AppIcon name="caution" color="red" size={16} />
                  <span>{scanError}</span>
                </div>
              )}

              {scanResult && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <AppIcon name="tick" color="green" size={16} />
                    <span>Barcode Valid & Terverifikasi</span>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-emerald-200 text-slate-800">
                    <p><strong>Nama:</strong> {scanResult.full_name}</p>
                    <p><strong>Tipe:</strong> {scanResult.person_type}</p>
                    {scanResult.nisn && <p><strong>NISN:</strong> {scanResult.nisn}</p>}
                    {scanResult.nip && <p><strong>NIP:</strong> {scanResult.nip}</p>}
                    {scanResult.class_name && <p><strong>Kelas / Rombel:</strong> {scanResult.class_name}</p>}
                    <p>
                      <strong>Status Barcode:</strong>{' '}
                      <span className="font-bold text-emerald-700">{scanResult.barcode_status}</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL CETAK & EKSPOR BARCODE SUPERADMIN ===================== */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold border border-blue-100 shadow-2xs">
                  🖨️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Cetak & Ekspor Barcode Siswa (PDF)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Format Presisi A4 Portrait • 12 Kartu/Halaman • Bebas Terpotong
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Konten Pilihan Cetak */}
            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pilih Data yang Akan Dicetak:
                </label>
                <div className="space-y-2">
                  {/* Opsi 1: Seluruh Siswa di Semua Kelas */}
                  <div
                    onClick={() => setPrintScope('ALL_STUDENTS')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      printScope === 'ALL_STUDENTS'
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="print_scope"
                      checked={printScope === 'ALL_STUDENTS'}
                      onChange={() => setPrintScope('ALL_STUDENTS')}
                      className="mt-0.5 text-blue-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          Seluruh Siswa (Semua Kelas dalam 1 File)
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800">
                          {sortedStudents.length} Siswa
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Mencetak barcode seluruh peserta didik dari kelas 7, 8, dan 9 ke dalam satu dokumen PDF siap cetak.
                      </p>
                    </div>
                  </div>

                  {/* Opsi 2: Per Rombel / Kelas Tertentu */}
                  <div
                    onClick={() => setPrintScope('BY_CLASS')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      printScope === 'BY_CLASS'
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="print_scope"
                      checked={printScope === 'BY_CLASS'}
                      onChange={() => setPrintScope('BY_CLASS')}
                      className="mt-0.5 text-blue-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          Berdasarkan Rombel / Kelas Tertentu
                        </span>
                        {studentClasses.length > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
                            {sortedStudents.filter(s => (s.class_name || '').trim() === selectedPrintClass).length} Siswa
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Hanya mencetak barcode siswa pada rombel kelas tertentu.
                      </p>

                      {printScope === 'BY_CLASS' && (
                        <div className="mt-2.5 pt-2 border-t border-blue-200/60 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-600">Pilih Kelas:</span>
                          <select
                            value={selectedPrintClass}
                            onChange={(e) => setSelectedPrintClass(e.target.value)}
                            className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {studentClasses.map((cls) => (
                              <option key={cls} value={cls}>
                                Kelas {cls} ({sortedStudents.filter(s => (s.class_name || '').trim() === cls).length} Siswa)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Opsi 3: Sesuai Filter / Pencarian Aktif */}
                  <div
                    onClick={() => setPrintScope('FILTERED')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      printScope === 'FILTERED'
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="print_scope"
                      checked={printScope === 'FILTERED'}
                      onChange={() => setPrintScope('FILTERED')}
                      className="mt-0.5 text-blue-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          Sesuai Filter & Pencarian Aktif di Layar
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
                          {filteredPeople.length} Civitas
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Mencetak data yang sedang aktif terfilter (Kategori: {roleFilter}, Rombel: {classFilter}{search ? `, Kata kunci: "${search}"` : ''}).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opsi Tata Letak & Pemisahan Lembar */}
              {printScope === 'ALL_STUDENTS' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={separatePagePerClass}
                      onChange={(e) => setSeparatePagePerClass(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        Pisahkan Halaman Baru untuk Setiap Kelas
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {separatePagePerClass
                          ? 'Aktif: Setiap rombel kelas selalu mulai di lembar baru sehingga sangat mudah dibagikan per wali kelas.'
                          : 'Non-aktif (Hemat Kertas): Kartu dicetak bersambung 12 kartu per lembar tanpa jeda halaman kosong per kelas.'}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Ringkasan & Spesifikasi Lembar Cetak */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-blue-900">
                  <span>Total Data Akan Dicetak:</span>
                  <span className="font-bold text-sm tabular-nums">{printSummary.count} Kartu Barcode</span>
                </div>
                <div className="flex items-center justify-between text-blue-800">
                  <span>Estimasi Lembar Kertas A4:</span>
                  <span className="font-bold text-sm tabular-nums">{printSummary.totalSheets} Halaman</span>
                </div>
                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-blue-700">
                  <span>Layout: A4 Portrait • 3 Kolom × 4 Baris (12 Kartu/Halaman)</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    ✓ 100% Anti-Terpotong
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecutePrint}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Cetak Sekarang / Simpan PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ===================== DEDICATED PRINT CONTAINER (ANTI-TERPOTONG & 1 FILE MULTI-KELAS) ===================== */}
      <div className="barcode-print-document">
        {activePrintSheets.map((sheetItems, sheetIdx) => (
          <div key={sheetIdx} className="barcode-print-sheet">
            <div className="barcode-print-grid">
              {sheetItems.map((person) => {
                const identifier = person.nisn ? `NISN: ${person.nisn}` : person.nip ? `NIP: ${person.nip}` : '';
                const metaLabel = person.class_name
                  ? `KELAS ${person.class_name.toUpperCase()}`
                  : person.person_type === 'GURU'
                  ? 'GURU PENGAMPU'
                  : person.person_type === 'TENAGA_KEPENDIDIKAN'
                  ? 'TENDIK / TU'
                  : 'SMPN 1 PRAMBON';

                return (
                  <div key={person.id} className="barcode-print-card">
                    <div className="print-card-name" title={person.full_name}>
                      {person.full_name}
                    </div>
                    <div className="print-card-meta">
                      {metaLabel}
                      {identifier ? ` • ${identifier}` : ''}
                    </div>
                    <div className="print-card-qr">
                      <img
                        src={getBarcodeImageUrl(person.id, 512)}
                        alt={`QR barcode ${person.full_name}`}
                        width={512}
                        height={512}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
