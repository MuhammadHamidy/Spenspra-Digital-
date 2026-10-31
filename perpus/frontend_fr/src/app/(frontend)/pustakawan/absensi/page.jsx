'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CameraBarcodeScanner, { playScannerBeep } from '@/components/perpus/CameraBarcodeScanner';
import { attendanceApi } from '@/lib/features/library/api/attendanceApi';
import { membersApi } from '@/lib/features/library/api/membersApi';
import CircularProgress from '@mui/material/CircularProgress';

export default function PustakawanAbsensiPage() {
  const [activeTab, setActiveTab] = useState('SCAN'); // 'SCAN' | 'MANUAL'
  const [selectedPurpose, setSelectedPurpose] = useState('MEMBACA');
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Anggota terdaftar & riwayat hari ini
  const [members, setMembers] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [lastDetectedPerson, setLastDetectedPerson] = useState(null);

  // Filter & Search log
  const [logSearch, setLogSearch] = useState('');

  // Format tanggal hari ini
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Muat data anggota dan log presensi hari ini langsung dari backend
  const loadData = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const todayISO = new Date().toISOString().split('T')[0];
      const [membersRes, attRes] = await Promise.allSettled([
        membersApi.getMembers(),
        attendanceApi.getAttendances('', todayISO),
      ]);

      if (membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)) {
        setMembers(membersRes.value);
      }

      let logs = attRes.status === 'fulfilled' && Array.isArray(attRes.value) ? attRes.value : [];

      // Sort logs dari yang paling baru
      logs.sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0));
      setTodayLogs(logs);
    } catch (err) {
      console.warn('Gagal memuat log presensi:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Eksekusi presensi siswa/pengunjung
  const handleProcessAttendance = async (barcodeOrId) => {
    const clean = String(barcodeOrId).trim();
    if (!clean) return;

    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Cari data anggota terdaftar
      let matchedMember = members.find(
        (m) =>
          (m.barcode_token && m.barcode_token.toLowerCase() === clean.toLowerCase()) ||
          (m.identity_number && m.identity_number.toLowerCase() === clean.toLowerCase()) ||
          (m.member_code && m.member_code.toLowerCase() === clean.toLowerCase())
      );

      // 2. Kirim pencatatan presensi langsung ke backend API
      const payload = {
        barcode_token: clean,
        visitor_name: matchedMember ? (matchedMember.full_name || matchedMember.name) : clean,
        visitor_type: matchedMember ? (matchedMember.member_type || 'MEMBER') : 'MEMBER',
        purpose: selectedPurpose,
        method: 'BARCODE_SCAN',
        notes: `Presensi Petugas Perpustakaan - ${selectedPurpose}`,
      };

      const recordResult = await attendanceApi.recordManualVisit(payload);

      const visitorName = recordResult?.visitor_name || (matchedMember ? (matchedMember.full_name || matchedMember.name) : clean);
      const newLogItem = {
        id: recordResult?.id || `att-${Date.now()}`,
        name: visitorName,
        visitor_name: visitorName,
        studentId: matchedMember?.id || clean,
        identityNumber: matchedMember?.identity_number || clean,
        className: matchedMember?.class_name || 'Civitas Spenspra',
        purpose: selectedPurpose,
        method: 'BARCODE_SCAN',
        timestamp: recordResult?.created_at || new Date().toISOString(),
        created_at: recordResult?.created_at || new Date().toISOString(),
        notes: `Presensi Petugas Perpustakaan`,
      };

      setTodayLogs((prev) => [newLogItem, ...prev]);
      setLastDetectedPerson(newLogItem);

      playScannerBeep();
      setSuccessMsg(`Presensi berhasil: ${visitorName} (${selectedPurpose})`);
      setManualInput('');

      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err) {
      console.error('Error saat mencatat presensi:', err);
      setErrorMsg(err.message || 'Gagal memproses presensi. Pastikan kode barcode terdaftar.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTodayLogs = useMemo(() => {
    if (!logSearch.trim()) return todayLogs;
    const q = logSearch.toLowerCase();
    return todayLogs.filter(
      (l) =>
        (l.visitor_name && l.visitor_name.toLowerCase().includes(q)) ||
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.purpose && l.purpose.toLowerCase().includes(q)) ||
        (l.className && l.className.toLowerCase().includes(q))
    );
  }, [todayLogs, logSearch]);

  const purposeOptions = [
    {
      id: 'MEMBACA',
      label: 'Membaca',
      desc: 'Membaca buku di ruang baca',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: 'PEMINJAMAN',
      label: 'Meminjam / Kembali',
      desc: 'Sirkulasi buku koleksi',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      ),
    },
    {
      id: 'PEMBELAJARAN',
      label: 'Belajar Bersama',
      desc: 'Tugas & aktivitas kelas',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'TAMU',
      label: 'Tamu / Umum',
      desc: 'Kunjungan pihak luar',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Halaman (Bersih, tanpa duplikasi breadcrumb) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#EDEAF5] text-[#4B3B78]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </span>
            <span>Absensi Pengunjung Perpustakaan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {todayDateStr} • Catat kehadiran siswa, guru, atau tamu perpustakaan secara digital via scanner maupun input langsung.
          </p>
        </div>
      </div>

      {/* Toast Notifikasi Sukses / Error */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-3">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span className="flex-1">{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} className="hover:opacity-75 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-3">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="flex-1">{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} className="hover:opacity-75 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Grid Utama: Kiri Scanner & Form, Kanan Log Pengunjung */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Form & Scanner (7 Kolom) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-6">
          {/* 1. Keperluan Kunjungan (e-Rapor Style Pills) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              1. Pilih Keperluan Kunjungan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {purposeOptions.map((p) => {
                const isSelected = selectedPurpose === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPurpose(p.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#EDEAF5] border-[#4B3B78] text-[#3D2E66] font-bold shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-[#FAF9FD] hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg w-fit mb-2 ${isSelected ? 'bg-[#4B3B78] text-white' : 'bg-white text-slate-500 border border-slate-200/80'}`}>
                      {p.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{p.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">{p.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Pindai Barcode / Input Manual */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Pindai Kartu Siswa / Barcode
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('SCAN')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'SCAN'
                      ? 'bg-white text-[#4B3B78] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Kamera Scanner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('MANUAL')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'MANUAL'
                      ? 'bg-white text-[#4B3B78] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Input Manual / Barcode Gun</span>
                </button>
              </div>
            </div>

            {activeTab === 'SCAN' ? (
              <div className="space-y-3">
                <div className="relative w-full h-80 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                  <CameraBarcodeScanner
                    isScanning={!isProcessing}
                    onScan={(barcode) => handleProcessAttendance(barcode)}
                  />
                </div>
                <p className="text-[11px] text-slate-500 text-center">
                  Arahkan QR code kartu pelajar siswa atau barcode fisik tepat di depan kamera scanner.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessAttendance(manualInput);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Masukkan NISN / Kode Anggota / Barcode:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: MBR-2026-0001 atau NISN 0081234567..."
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4B3B78] focus:border-transparent transition-all"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!manualInput.trim() || isProcessing}
                      className="px-4 py-2 rounded-lg bg-[#4B3B78] hover:bg-[#3D2E66] disabled:bg-slate-300 text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      {isProcessing ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Catat Presensi'}
                    </button>
                  </div>
                </div>

                {/* Pilih Cepat dari Siswa Terdaftar */}
                {members.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Pilih Cepat Siswa / Guru:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {members.slice(0, 8).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleProcessAttendance(m.barcode_token || m.identity_number || m.member_code || m.id)}
                          className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-[#EDEAF5] border border-slate-200 hover:border-[#4B3B78] text-slate-700 hover:text-[#3D2E66] text-[11px] font-medium transition cursor-pointer"
                        >
                          {m.full_name || m.name} ({m.class_name || 'Civitas'})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Banner Siswa Terakhir Yang Tercatat */}
          {lastDetectedPerson && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Presensi Terakhir Berhasil
                </span>
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {lastDetectedPerson.visitor_name}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Kelas: {lastDetectedPerson.className || '-'} • Keperluan: {lastDetectedPerson.purpose}
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-800 bg-white px-2 py-1 rounded-md border border-emerald-200 shrink-0">
                {new Date(lastDetectedPerson.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Log Kehadiran Hari Ini (5 Kolom) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pengunjung Hari Ini</h3>
              <p className="text-[11px] text-slate-400">Total {todayLogs.length} kunjungan tercatat</p>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 text-xs font-medium transition cursor-pointer flex items-center gap-1"
              title="Segarkan data log pengunjung"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          {/* Search Log Pengunjung */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama pengunjung..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4B3B78] focus:border-transparent"
            />
            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* List Log Pengunjung Real-time */}
          {loadingLogs ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <CircularProgress size={22} sx={{ color: '#4B3B78' }} />
              <span className="text-xs text-slate-400">Memuat data log hari ini...</span>
            </div>
          ) : filteredTodayLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Belum ada pengunjung yang tercatat hari ini.
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 divide-y divide-slate-100">
              {filteredTodayLogs.map((log, index) => {
                const timeStr = log.timestamp || log.created_at;
                const dateObj = timeStr ? new Date(timeStr) : null;
                const formattedTime = dateObj && !isNaN(dateObj.getTime())
                  ? `${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
                  : null;

                return (
                  <div key={log.id || index} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-800 truncate" title={log.visitor_name || log.name}>
                        {log.visitor_name || log.name || 'Pengunjung Perpustakaan'}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-[#4B3B78]">{log.purpose || 'MEMBACA'}</span>
                        <span>•</span>
                        <span>{log.className || log.notes || 'Siswa'}</span>
                      </div>
                    </div>

                    {formattedTime && (
                      <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                        {formattedTime}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
