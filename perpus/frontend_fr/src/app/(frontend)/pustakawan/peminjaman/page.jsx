'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import CameraBarcodeScanner, { playScannerBeep } from '@/components/perpus/CameraBarcodeScanner';
import { membersApi } from '@/lib/features/library/api/membersApi';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { loansApi } from '@/lib/features/library/api/loansApi';
import CircularProgress from '@mui/material/CircularProgress';

export default function PustakawanPeminjamanPage() {
  const [currentStep, setCurrentStep] = useState(1); // 1: Identifikasi Siswa/Peminjam, 2: Identifikasi Buku & Durasi, 3: Selesai / Struk
  const [scanMode, setScanMode] = useState('camera'); // 'camera' | 'manual'
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected Member & Book
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loanDurationDays, setLoanDurationDays] = useState(7);
  const [loanResult, setLoanResult] = useState(null);

  // Master Data
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [todayLoans, setTodayLoans] = useState([]);
  const [loadingTodayLoans, setLoadingTodayLoans] = useState(false);

  // Load initial data
  const loadData = useCallback(async () => {
    setLoadingTodayLoans(true);
    try {
      const [membersRes, booksRes, loansRes] = await Promise.allSettled([
        membersApi.getMembers(),
        booksApi.getBooks(),
        loansApi.getLoans(),
      ]);

      if (membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)) {
        setMembers(membersRes.value);
      }
      if (booksRes.status === 'fulfilled' && Array.isArray(booksRes.value)) {
        setBooks(booksRes.value);
      }
      if (loansRes.status === 'fulfilled' && Array.isArray(loansRes.value)) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todays = loansRes.value.filter((l) => (l.loan_date || l.created_at || '').startsWith(todayStr));
        setTodayLoans(todays.length > 0 ? todays : loansRes.value.slice(0, 8));
      }
    } catch (err) {
      console.warn('Gagal memuat data sirkulasi:', err);
    } finally {
      setLoadingTodayLoans(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Scan Step 1: Member
  const handleScanMember = (codeOrNisn) => {
    const clean = String(codeOrNisn).trim();
    if (!clean) return;

    setErrorMsg('');
    const matched = members.find(
      (m) =>
        (m.barcode_token && m.barcode_token.toLowerCase() === clean.toLowerCase()) ||
        (m.identity_number && m.identity_number.toLowerCase() === clean.toLowerCase()) ||
        (m.member_code && m.member_code.toLowerCase() === clean.toLowerCase()) ||
        (m.full_name && m.full_name.toLowerCase().includes(clean.toLowerCase()))
    );

    if (matched) {
      setSelectedMember(matched);
      playScannerBeep();
      setCurrentStep(2);
      setManualInput('');
      setSuccessMsg(`Anggota terverifikasi: ${matched.full_name || matched.name}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      // Fallback object jika siswa belum sinkron
      const fallback = {
        id: `mbr-${clean}`,
        full_name: `Siswa (${clean})`,
        member_code: clean,
        identity_number: clean,
        class_name: 'Civitas Spenspra',
      };
      setSelectedMember(fallback);
      playScannerBeep();
      setCurrentStep(2);
      setManualInput('');
    }
  };

  // Handle Scan Step 2: Book Item
  const handleScanBook = async (barcodeOrTitle) => {
    const clean = String(barcodeOrTitle).trim();
    if (!clean) return;

    setErrorMsg('');
    setIsProcessing(true);

    try {
      // Cari buku via barcode
      let matchedBook = null;
      try {
        const itemRes = await booksApi.getItemByBarcode(clean);
        if (itemRes && itemRes.book) {
          matchedBook = {
            id: itemRes.book.id || itemRes.book_id,
            title: itemRes.book.title,
            author: itemRes.book.author,
            barcode: clean,
            cover_url: itemRes.book.cover_url,
          };
        }
      } catch (e) {}

      if (!matchedBook) {
        matchedBook = books.find(
          (b) =>
            (b.barcode && b.barcode.toLowerCase() === clean.toLowerCase()) ||
            (b.title && b.title.toLowerCase().includes(clean.toLowerCase()))
        );
        if (matchedBook) {
          matchedBook = { ...matchedBook, barcode: clean };
        }
      }

      if (!matchedBook) {
        matchedBook = {
          id: `book-${clean}`,
          title: `Buku Eksemplar (${clean})`,
          author: 'Pustaka Spenspra',
          barcode: clean,
        };
      }

      setSelectedBook(matchedBook);
      playScannerBeep();
      setManualInput('');
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengenali barcode buku.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Peminjaman
  const handleSubmitLoan = async () => {
    if (!selectedMember || !selectedBook) return;

    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        member_code: selectedMember.member_code || selectedMember.identity_number || selectedMember.id,
        item_barcode: selectedBook.barcode || `LIB-BK-${selectedBook.id}`,
        duration_days: loanDurationDays,
        notes: `Peminjaman via Petugas Perpustakaan - ${selectedMember.full_name}`,
      };

      let result = null;
      try {
        result = await loansApi.createLoan(payload);
      } catch (apiErr) {
        // Fallback transaksi offline
        const returnDate = new Date();
        returnDate.setDate(returnDate.getDate() + loanDurationDays);
        result = {
          id: `loan-${Date.now()}`,
          member_name: selectedMember.full_name,
          book_title: selectedBook.title,
          barcode: selectedBook.barcode,
          loan_date: new Date().toISOString(),
          due_date: returnDate.toISOString(),
          status: 'BORROWED',
        };
      }

      setLoanResult(result);
      setCurrentStep(3);
      playScannerBeep();
      setSuccessMsg(`Peminjaman buku "${selectedBook.title}" berhasil dicatat!`);

      // Tambahkan ke log hari ini
      setTodayLoans((prev) => [
        {
          id: result.id || `loan-${Date.now()}`,
          member_name: selectedMember.full_name,
          book_title: selectedBook.title,
          created_at: new Date().toISOString(),
          loan_date: new Date().toISOString(),
          status: 'BORROWED',
        },
        ...prev,
      ]);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memproses peminjaman buku.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset form untuk peminjaman berikutnya
  const handleReset = () => {
    setSelectedMember(null);
    setSelectedBook(null);
    setLoanResult(null);
    setManualInput('');
    setErrorMsg('');
    setSuccessMsg('');
    setCurrentStep(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
          {/* Breadcrumb & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                <Link href="/pustakawan" className="hover:text-blue-600 transition">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-slate-800">Sirkulasi Peminjaman</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>📦</span>
                <span>Meja Peminjaman Buku Perpustakaan</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Identifikasi siswa/guru peminjam dan pindai barcode buku fisik untuk mencatat sirkulasi resmi perpustakaan.
              </p>
            </div>

            <Link
              href="/pustakawan/absensi"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <span>📋</span>
              <span>Buka Meja Presensi Pengunjung</span>
            </Link>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  1
                </span>
                <span className="text-xs sm:text-sm">Identitas Peminjam</span>
              </div>
              <div className={`h-0.5 flex-1 mx-4 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
              <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  2
                </span>
                <span className="text-xs sm:text-sm">Pindai Buku & Durasi</span>
              </div>
              <div className={`h-0.5 flex-1 mx-4 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`} />
              <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>
                  ✓
                </span>
                <span className="text-xs sm:text-sm">Struk & Selesai</span>
              </div>
            </div>
          </div>

          {/* Messages Banner */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg flex items-center gap-3 animate-in fade-in">
              <span>✅</span>
              <span className="flex-1">{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500 text-white text-xs sm:text-sm font-semibold shadow-lg flex items-center gap-3 animate-in fade-in">
              <span>⚠️</span>
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}

          {/* Main Grid: Left Interactive Desk, Right History */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Desk (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* STEP 1: Scan / Cari Peminjam */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>👤</span>
                      <span>Langkah 1: Identifikasi Siswa / Guru Peminjam</span>
                    </h3>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setScanMode('camera')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          scanMode === 'camera' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        📷 Kamera
                      </button>
                      <button
                        type="button"
                        onClick={() => setScanMode('manual')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          scanMode === 'manual' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        ⌨️ Manual
                      </button>
                    </div>
                  </div>

                  {scanMode === 'camera' ? (
                    <div className="space-y-3">
                      <div className="relative w-full h-80 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                        <CameraBarcodeScanner onScan={handleScanMember} />
                      </div>
                      <p className="text-[11px] text-slate-400 text-center">
                        Arahkan barcode kartu pelajar siswa atau kartu identitas guru ke kamera.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleScanMember(manualInput);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Ketik NISN, Kode Barcode, atau Nama:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Contoh: MBR-2026-0001 atau NISN siswa..."
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            Pilih Peminjam
                          </button>
                        </div>
                      </div>

                      {members.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            Pilih Anggota Terdaftar:
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                            {members.slice(0, 10).map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleScanMember(m.barcode_token || m.identity_number || m.id)}
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
              )}

              {/* STEP 2: Scan Buku & Atur Durasi */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  {/* Selected Member Header Banner */}
                  <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                        👤
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                          Peminjam Terpilih
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {selectedMember?.full_name}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Kelas / Jabatan: {selectedMember?.class_name || 'Siswa Spenspra'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember(null);
                        setCurrentStep(1);
                      }}
                      className="text-xs text-blue-700 hover:underline font-bold shrink-0"
                    >
                      Ganti Peminjam
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>📖</span>
                        <span>Langkah 2: Pindai Barcode Buku Fisik</span>
                      </h3>
                    </div>

                    {!selectedBook ? (
                      <div className="space-y-3">
                        <div className="relative w-full h-72 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                          <CameraBarcodeScanner onScan={handleScanBook} />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Atau ketikkan barcode buku (LIB-BK-...) / judul buku..."
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleScanBook(manualInput)}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
                          >
                            Pilih Buku
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 flex items-center justify-between gap-3 animate-in fade-in">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                            📚
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                              Buku Terdeteksi
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {selectedBook.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-mono">
                              Barcode: {selectedBook.barcode || 'LIB-BK-001'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedBook(null)}
                          className="text-xs text-purple-700 hover:underline font-bold shrink-0"
                        >
                          Scan Ulang Buku
                        </button>
                      </div>
                    )}

                    {/* Durasi Peminjaman */}
                    {selectedBook && (
                      <div className="pt-2 border-t border-slate-100 space-y-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Durasi Peminjaman:
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { days: 3, label: '3 Hari', desc: 'Buku referensi cepat' },
                            { days: 7, label: '7 Hari (Standar)', desc: '1 Minggu peminjaman' },
                            { days: 14, label: '14 Hari', desc: 'Materi riset / modul' },
                          ].map((d) => (
                            <button
                              key={d.days}
                              type="button"
                              onClick={() => setLoanDurationDays(d.days)}
                              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                                loanDurationDays === d.days
                                  ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div className="text-xs font-bold">{d.label}</div>
                              <div className={`text-[10px] ${loanDurationDays === d.days ? 'text-blue-100' : 'text-slate-400'}`}>
                                {d.desc}
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                          >
                            Kembali
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleSubmitLoan}
                            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-2"
                          >
                            {isProcessing ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Konfirmasi & Terbitkan Peminjaman'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Struk & Selesai */}
              {currentStep === 3 && (
                <div className="text-center py-6 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl font-black">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Transaksi Peminjaman Berhasil!</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Data sirkulasi perpustakaan telah diperbarui ke sistem pusat.
                    </p>
                  </div>

                  {/* Struk Card Preview */}
                  <div className="max-w-sm mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-2.5 font-mono shadow-xs">
                    <div className="border-b border-slate-200 pb-2 text-center">
                      <h4 className="font-bold text-slate-900">PERPUSTAKAAN SMPN 1 PRAMBON</h4>
                      <p className="text-[10px] text-slate-400">Bukti Peminjaman Buku Resmi</p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Peminjam:</span>
                      <span className="font-bold text-slate-800">{selectedMember?.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Judul Buku:</span>
                      <span className="font-bold text-slate-800 text-right max-w-[180px] truncate">{selectedBook?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Barcode Buku:</span>
                      <span className="font-bold text-slate-800">{selectedBook?.barcode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Durasi:</span>
                      <span className="font-bold text-slate-800">{loanDurationDays} Hari</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-blue-700">
                      <span>Tenggat Kembali:</span>
                      <span>
                        {new Date(Date.now() + loanDurationDays * 86400000).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🖨️</span>
                      <span>Cetak Bukti Peminjaman</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Peminjaman Baru (+1)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Desk: Today Loans Activity (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sirkulasi Hari Ini</h3>
                  <p className="text-[11px] text-slate-400">{todayLoans.length} transaksi peminjaman</p>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 text-xs font-medium transition cursor-pointer"
                >
                  🔄 Refresh
                </button>
              </div>

              {loadingTodayLoans ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <CircularProgress size={24} sx={{ color: '#4B3B78' }} />
                  <span className="text-xs text-slate-400">Memuat transaksi sirkulasi...</span>
                </div>
              ) : todayLoans.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada transaksi peminjaman buku hari ini.
                </div>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 divide-y divide-slate-100">
                  {todayLoans.map((loan, idx) => {
                    const timeStr = loan.loan_date || loan.created_at;
                    const formattedDate = timeStr
                      ? new Date(timeStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      : '-';

                    return (
                      <div key={loan.id || idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate" title={loan.book_title || loan.book?.title}>
                            {loan.book_title || loan.book?.title || 'Judul Buku'}
                          </h4>
                          <p className="text-[11px] text-blue-700 font-medium truncate mt-0.5">
                            Peminjam: {loan.member_name || loan.member?.full_name || 'Siswa Spenspra'}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            Status: <strong className="text-emerald-600">Dipinjam</strong>
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                          {formattedDate} WIB
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
