'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import CameraBarcodeScanner, { playScannerBeep } from '@/components/perpus/CameraBarcodeScanner';
import { attendanceApi } from '@/lib/features/library/api/attendanceApi';
import { membersApi } from '@/lib/features/library/api/membersApi';
import CircularProgress from '@mui/material/CircularProgress';

export default function PustakawanAbsensiPage() {
  const [activeTab, setActiveTab] = useState('SCAN'); // 'SCAN' | 'MANUAL' | 'LOGS'
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

  // Format tanggal & jam
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Muat data anggota dan log presensi hari ini
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

      // Gabungkan dengan localStorage logs
      try {
        const stored = localStorage.getItem('lib_attendance_logs');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const todayLocals = parsed.filter((l) => l.timestamp && l.timestamp.startsWith(todayISO));
            const existingIds = new Set(logs.map((l) => String(l.id)));
            todayLocals.forEach((l) => {
              if (!existingIds.has(String(l.id))) {
                logs.unshift({
                  id: l.id || `local-${l.timestamp}`,
                  visitor_name: l.name || 'Siswa Spenspra',
                  visitor_type: l.className === 'Tamu Umum' ? 'GUEST' : 'MEMBER',
                  purpose: l.purpose || 'MEMBACA',
                  method: l.method || 'BARCODE_SCAN',
                  timestamp: l.timestamp,
                  created_at: l.timestamp,
                  notes: l.notes || 'Presensi Kiosk/Admin',
                });
                existingIds.add(String(l.id));
              }
            });
          }
        }
      } catch (e) {}

      // Urutkan dari yang terbaru
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
      // 1. Cari anggota terdaftar secara lokal terlebih dahulu
      let matchedMember = members.find(
        (m) =>
          (m.barcode_token && m.barcode_token.toLowerCase() === clean.toLowerCase()) ||
          (m.identity_number && m.identity_number.toLowerCase() === clean.toLowerCase()) ||
          (m.member_code && m.member_code.toLowerCase() === clean.toLowerCase())
      );

      // 2. Kirim permintaan pencatatan presensi ke backend API
      const payload = {
        barcode_token: clean,
        visitor_name: matchedMember ? (matchedMember.full_name || matchedMember.name) : clean,
        visitor_type: matchedMember ? (matchedMember.member_type || 'MEMBER') : 'MEMBER',
        purpose: selectedPurpose,
        method: 'BARCODE_SCAN',
        notes: `Presensi Petugas Perpustakaan - ${selectedPurpose}`,
      };

      let recordResult = null;
      try {
        recordResult = await attendanceApi.recordManualVisit(payload);
      } catch (apiErr) {
        // Fallback jika offline
        recordResult = {
          id: `att-${Date.now()}`,
          visitor_name: matchedMember ? (matchedMember.full_name || matchedMember.name) : clean,
          purpose: selectedPurpose,
          created_at: new Date().toISOString(),
          method: 'BARCODE_SCAN',
        };
      }

      // Simpan log lokal
      const newLogItem = {
        id: recordResult?.id || `local-${Date.now()}`,
        name: matchedMember ? (matchedMember.full_name || matchedMember.name) : clean,
        visitor_name: matchedMember ? (matchedMember.full_name || matchedMember.name) : clean,
        studentId: matchedMember?.id || clean,
        identityNumber: matchedMember?.identity_number || clean,
        className: matchedMember?.class_name || 'Civitas Spenspra',
        purpose: selectedPurpose,
        method: 'BARCODE_SCAN',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        notes: `Presensi Petugas Perpustakaan`,
      };

      try {
        const stored = localStorage.getItem('lib_attendance_logs');
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(newLogItem);
        localStorage.setItem('lib_attendance_logs', JSON.stringify(list.slice(0, 300)));
      } catch (e) {}

      setLastDetectedPerson(newLogItem);
      setTodayLogs((prev) => [newLogItem, ...prev]);
      playScannerBeep();
      setSuccessMsg(`Presensi ${newLogItem.visitor_name} (${selectedPurpose}) berhasil dicatat!`);
      setTimeout(() => setSuccessMsg(''), 4500);
      setManualInput('');
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memproses presensi pengunjung.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter riwayat hari ini
  const filteredTodayLogs = useMemo(() => {
    if (!logSearch.trim()) return todayLogs;
    const q = logSearch.toLowerCase();
    return todayLogs.filter(
      (l) =>
        (l.visitor_name || l.name || '').toLowerCase().includes(q) ||
        (l.purpose || '').toLowerCase().includes(q) ||
        (l.identityNumber || '').toLowerCase().includes(q)
    );
  }, [todayLogs, logSearch]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
          {/* Top Breadcrumb & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                <Link href="/pustakawan" className="hover:text-blue-600 transition">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-slate-800">Presensi Pengunjung</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>📋</span>
                <span>Absensi Pengunjung Perpustakaan</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {todayDateStr} • Catat kehadiran siswa, guru, atau tamu perpustakaan via barcode scanner maupun manual.
              </p>
            </div>

            {/* Quick Action to Sirkulasi */}
            <Link
              href="/pustakawan/peminjaman"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4B3B78] hover:bg-[#3D2E66] text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <span>📦</span>
              <span>Buka Meja Peminjaman Buku</span>
              <span>→</span>
            </Link>
          </div>

          {/* Toast Notifikasi Sukses / Error */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="text-lg">✅</span>
              <span className="flex-1">{successMsg}</span>
              <button type="button" onClick={() => setSuccessMsg('')} className="hover:opacity-75">
                ✕
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500 text-white text-xs sm:text-sm font-semibold shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="text-lg">⚠️</span>
              <span className="flex-1">{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg('')} className="hover:opacity-75">
                ✕
              </button>
            </div>
          )}

          {/* Grid Layout: Kiri Scanner / Form Presensi, Kanan Live Log Hari Ini */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Kolom Kiri: Scanner Kamera / Form Input (7 Kolom) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Pilihan Keperluan Kunjungan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  1. Pilih Keperluan Kunjungan:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'MEMBACA', label: 'Membaca', icon: '📖', desc: 'Membaca koleksi' },
                    { id: 'PEMINJAMAN', label: 'Meminjam', icon: '📦', desc: 'Peminjaman buku' },
                    { id: 'PEMBELAJARAN', label: 'Belajar', icon: '🎓', desc: 'Kegiatan kelas' },
                    { id: 'TAMU', label: 'Tamu / Umum', icon: '🤝', desc: 'Kunjungan luar' },
                  ].map((p) => {
                    const isSelected = selectedPurpose === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPurpose(p.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-xs'
                            : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xl mb-1">{p.icon}</div>
                        <div>
                          <div className="text-xs font-bold">{p.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{p.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mode Input: Scanner Kamera vs Manual */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Pindai Barcode atau Cari Identitas:
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveTab('SCAN')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        activeTab === 'SCAN'
                          ? 'bg-white text-blue-600 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📷 Kamera Scanner
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('MANUAL')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        activeTab === 'MANUAL'
                          ? 'bg-white text-blue-600 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ⌨️ Input Manual / USB
                    </button>
                  </div>
                </div>

                {activeTab === 'SCAN' ? (
                  <div className="space-y-3">
                    <div className="relative w-full h-80 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                      <CameraBarcodeScanner
                        isScanning={!isProcessing}
                        onScan={(barcode) => handleProcessAttendance(barcode)}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 text-center">
                      Arahkan barcode kartu pelajar siswa atau stiker barcode buku tepat di bingkai scanner. Scanner otomatis mendeteksi kode.
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
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Masukkan NISN / Kode Barcode / Nama Siswa:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Contoh: MBR-2026-0001 atau NISN 0081234567..."
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!manualInput.trim() || isProcessing}
                          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          {isProcessing ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Catat Presensi'}
                        </button>
                      </div>
                    </div>

                    {/* Quick Selection Dari Siswa Terdaftar */}
                    {members.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Pilih Cepat Siswa / Guru:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                          {members.slice(0, 10).map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleProcessAttendance(m.barcode_token || m.identity_number || m.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-medium transition cursor-pointer"
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
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-3 animate-in fade-in">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">
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
                  <span className="text-[11px] font-mono text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                    {new Date(lastDetectedPerson.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>
              )}
            </div>

            {/* Kolom Kanan: Log Kehadiran Hari Ini (5 Kolom) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pengunjung Hari Ini</h3>
                  <p className="text-[11px] text-slate-400">Total {todayLogs.length} kunjungan tercatat</p>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 text-xs font-medium transition cursor-pointer"
                  title="Segarkan daftar pengunjung"
                >
                  🔄 Refresh
                </button>
              </div>

              {/* Search Log Pengunjung */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama pengunjung..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>

              {/* List Log Pengunjung */}
              {loadingLogs ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <CircularProgress size={24} sx={{ color: '#4B3B78' }} />
                  <span className="text-xs text-slate-400">Memuat data log hari ini...</span>
                </div>
              ) : filteredTodayLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada pengunjung yang terabsensi hari ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 divide-y divide-slate-100">
                  {filteredTodayLogs.map((log, index) => {
                    const timeStr = log.timestamp || log.created_at;
                    const formattedTime = timeStr
                      ? new Date(timeStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      : '-';

                    return (
                      <div key={log.id || index} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={log.visitor_name || log.name}>
                            {log.visitor_name || log.name || 'Pengunjung Perpustakaan'}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-blue-600">{log.purpose || 'MEMBACA'}</span>
                            <span>•</span>
                            <span>{log.className || log.notes || 'Siswa'}</span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                          {formattedTime} WIB
                        </span>
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
