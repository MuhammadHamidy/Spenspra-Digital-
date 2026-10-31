'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CameraBarcodeScanner, { playScannerBeep } from '@/components/perpus/CameraBarcodeScanner';
import { membersApi } from '@/lib/features/library/api/membersApi';
import { booksApi } from '@/lib/features/library/api/booksApi';
import { loansApi } from '@/lib/features/library/api/loansApi';
import CircularProgress from '@mui/material/CircularProgress';

export default function PustakawanPeminjamanPage() {
  const [activeCirculationTab, setActiveCirculationTab] = useState('PINJAM'); // 'PINJAM' | 'KEMBALI'

  // State Peminjaman (3 Steps)
  const [currentStep, setCurrentStep] = useState(1); // 1: Identitas Peminjam, 2: Pindai Barcode Buku & Durasi, 3: Selesai & Struk
  const [scanMode, setScanMode] = useState('camera'); // 'camera' | 'manual'
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected Member & Book untuk Peminjaman
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loanDurationDays, setLoanDurationDays] = useState(7);
  const [loanResult, setLoanResult] = useState(null);

  // State Pengembalian Buku
  const [returnBarcode, setReturnBarcode] = useState('');
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnResult, setReturnResult] = useState(null);
  const [isReturning, setIsReturning] = useState(false);

  // Master Data
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [todayLoans, setTodayLoans] = useState([]);
  const [loadingTodayLoans, setLoadingTodayLoans] = useState(false);

  // Muat data master dan transaksi hari ini
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
        const todays = loansRes.value.filter((l) =>
          (l.borrow_date || l.loan_date || l.created_at || '').startsWith(todayStr)
        );
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
      setSuccessMsg(`Anggota teridentifikasi: ${matched.full_name || matched.name}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      // Jika barcode belum ada di cache lokal, gunakan clean input sebagai token SSO
      const fallbackMember = {
        id: clean,
        full_name: `Civitas (${clean})`,
        member_code: clean,
        identity_number: clean,
        class_name: 'Warga SMPN 1 Prambon',
      };
      setSelectedMember(fallbackMember);
      playScannerBeep();
      setCurrentStep(2);
      setManualInput('');
    }
  };

  // Handle Scan Step 2: Book Item Barcode
  const handleScanBook = async (barcodeOrTitle) => {
    const clean = String(barcodeOrTitle).trim();
    if (!clean) return;

    setErrorMsg('');
    setIsProcessing(true);

    try {
      let matchedBook = null;

      // 1. Panggil API backend untuk mendapatkan eksemplar buku berdasarkan barcode
      try {
        const itemRes = await booksApi.getItemByBarcode(clean);
        if (itemRes) {
          const title = itemRes.book_title || itemRes.book?.title || itemRes.title;
          const author = itemRes.book_author || itemRes.book?.author || itemRes.author || 'Pustaka Spenspra';
          const bookId = itemRes.book_id || itemRes.book?.id || itemRes.id;
          matchedBook = {
            id: bookId,
            itemId: itemRes.id,
            title: title || `Buku (${clean})`,
            author: author,
            barcode: itemRes.barcode || clean,
            callNumber: itemRes.call_number || itemRes.callNumber,
            status: itemRes.status || 'AVAILABLE',
            itemCondition: itemRes.item_condition || 'GOOD',
            copyNumber: itemRes.copy_number,
          };
        }
      } catch (apiErr) {
        console.warn('Cari item barcode backend:', apiErr);
      }

      // 2. Jika belum ditemukan di endpoint eksemplar, cari di daftar katalog lokal
      if (!matchedBook) {
        const found = books.find(
          (b) =>
            (b.barcode && b.barcode.toLowerCase() === clean.toLowerCase()) ||
            (b.isbn && b.isbn.toLowerCase() === clean.toLowerCase()) ||
            (b.title && b.title.toLowerCase().includes(clean.toLowerCase()))
        );
        if (found) {
          matchedBook = {
            id: found.id,
            title: found.title,
            author: found.author,
            barcode: clean,
            callNumber: found.call_number,
            status: 'AVAILABLE',
          };
        }
      }

      // 3. Fallback jika barcode buku fisik belum terdaftar di sistem
      if (!matchedBook) {
        throw new Error(`Eksemplar buku dengan barcode "${clean}" tidak ditemukan dalam database perpustakaan.`);
      }

      if (matchedBook.status && matchedBook.status !== 'AVAILABLE') {
        throw new Error(`Buku ini tidak dapat dipinjam karena statusnya: ${matchedBook.status}`);
      }

      setSelectedBook(matchedBook);
      playScannerBeep();
      setManualInput('');
      setSuccessMsg(`Buku terpilih: ${matchedBook.title}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengenali barcode buku.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Peminjaman Buku ke Backend
  const handleSubmitLoan = async () => {
    if (!selectedMember || !selectedBook) return;

    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        member_barcode: selectedMember.member_code || selectedMember.identity_number || selectedMember.id,
        book_barcode: selectedBook.barcode,
        duration_days: loanDurationDays,
        notes: `Peminjaman Petugas - ${selectedMember.full_name}`,
      };

      const result = await loansApi.borrowBook(payload);

      setLoanResult(result || {
        member_name: selectedMember.full_name,
        book_title: selectedBook.title,
        barcode: selectedBook.barcode,
        loan_date: new Date().toISOString(),
        due_date: new Date(Date.now() + loanDurationDays * 86400000).toISOString(),
        status: 'BORROWED',
      });

      setCurrentStep(3);
      playScannerBeep();
      setSuccessMsg(`Peminjaman buku "${selectedBook.title}" berhasil dicatat!`);

      // Refresh data
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memproses peminjaman buku.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Pengembalian Buku Cepat
  const handleProcessReturn = async (barcode) => {
    const clean = String(barcode || returnBarcode).trim();
    if (!clean) return;

    setIsReturning(true);
    setErrorMsg('');
    setSuccessMsg('');
    setReturnResult(null);

    try {
      const res = await loansApi.returnBook({
        book_barcode: clean,
        item_condition: returnCondition,
        notes: 'Pengembalian via Meja Sirkulasi Pustakawan',
      });

      setReturnResult(res);
      playScannerBeep();
      setSuccessMsg(`Buku dengan barcode "${clean}" berhasil dikembalikan!`);
      setReturnBarcode('');

      // Refresh data sirkulasi
      loadData();
    } catch (err) {
      setErrorMsg(err.message || `Gagal memproses pengembalian buku "${clean}". Pastikan buku sedang dalam status dipinjam.`);
    } finally {
      setIsReturning(false);
    }
  };

  // Reset form peminjaman
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
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#EDEAF5] text-[#4B3B78]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </span>
            <span>Meja Sirkulasi Buku</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pindai barcode kartu siswa dan barcode buku fisik untuk mencatat peminjaman serta pengembalian buku resmi perpustakaan.
          </p>
        </div>

        {/* Tab Switcher: Peminjaman vs Pengembalian */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveCirculationTab('PINJAM');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCirculationTab === 'PINJAM'
                ? 'bg-white text-[#4B3B78] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Peminjaman Baru</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveCirculationTab('KEMBALI');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCirculationTab === 'KEMBALI'
                ? 'bg-white text-[#4B3B78] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Pengembalian Buku</span>
          </button>
        </div>
      </div>

      {/* Pesan Notifikasi */}
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

      {/* KONTEN UTAMA: MODE PEMINJAMAN */}
      {activeCirculationTab === 'PINJAM' ? (
        <>
          {/* Stepper Progress Bar (e-Rapor Style) */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#4B3B78] font-bold' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep >= 1 ? 'bg-[#4B3B78] text-white' : 'bg-slate-200'}`}>
                  1
                </span>
                <span className="text-xs sm:text-sm">Identitas Peminjam</span>
              </div>
              <div className={`h-0.5 flex-1 mx-4 ${currentStep >= 2 ? 'bg-[#4B3B78]' : 'bg-slate-200'}`} />
              <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#4B3B78] font-bold' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep >= 2 ? 'bg-[#4B3B78] text-white' : 'bg-slate-200'}`}>
                  2
                </span>
                <span className="text-xs sm:text-sm">Pindai Barcode Buku</span>
              </div>
              <div className={`h-0.5 flex-1 mx-4 ${currentStep >= 3 ? 'bg-emerald-600' : 'bg-slate-200'}`} />
              <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>
                  ✓
                </span>
                <span className="text-xs sm:text-sm">Konfirmasi & Struk</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Meja Kerja Peminjaman (7 Kolom) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-6">
              {/* STEP 1: Pindai Siswa / Guru */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800">Langkah 1: Identifikasi Peminjam</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pindai QR code kartu siswa/guru atau ketikkan NISN / kode anggota.
                    </p>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold w-fit">
                    <button
                      type="button"
                      onClick={() => setScanMode('camera')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        scanMode === 'camera' ? 'bg-white text-[#4B3B78] font-bold shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Kamera Scanner
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanMode('manual')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        scanMode === 'manual' ? 'bg-white text-[#4B3B78] font-bold shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Input Manual / Barcode Gun
                    </button>
                  </div>

                  {scanMode === 'camera' ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-72 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                        <CameraBarcodeScanner onScan={handleScanMember} />
                      </div>
                      <p className="text-[11px] text-slate-400 text-center">
                        Arahkan kartu barcode siswa di depan lensa kamera.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleScanMember(manualInput);
                      }}
                      className="space-y-3"
                    >
                      <label className="block text-xs font-semibold text-slate-600">
                        Masukkan NISN / Kode Anggota:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Contoh: MBR-2026-0001 atau NISN..."
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4B3B78]"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!manualInput.trim()}
                          className="px-4 py-2 rounded-lg bg-[#4B3B78] hover:bg-[#3D2E66] disabled:bg-slate-300 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Verifikasi
                        </button>
                      </div>

                      {/* Quick Member List */}
                      {members.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            Pilih Langsung dari Master Siswa:
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                            {members.slice(0, 8).map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleScanMember(m.barcode_token || m.identity_number || m.member_code || m.id)}
                                className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-[#EDEAF5] border border-slate-200 text-slate-700 hover:text-[#3D2E66] text-[11px] font-medium transition cursor-pointer"
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

              {/* STEP 2: Pindai Barcode Buku & Tentukan Durasi */}
              {currentStep === 2 && selectedMember && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Langkah 2: Pindai Barcode Buku</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Pindai stiker barcode eksemplar buku (format: LIB-BK-... atau custom).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-slate-500 hover:text-[#4B3B78] font-semibold cursor-pointer"
                    >
                      Ganti Peminjam
                    </button>
                  </div>

                  {/* Info Peminjam Terpilih */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#4B3B78] text-white flex items-center justify-center font-bold text-xs">
                        {selectedMember.full_name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{selectedMember.full_name}</h4>
                        <p className="text-[11px] text-slate-500">
                          {selectedMember.identity_number || selectedMember.member_code} • {selectedMember.class_name || 'Civitas'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Terverifikasi
                    </span>
                  </div>

                  {/* Mode Scan Buku */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold w-fit">
                    <button
                      type="button"
                      onClick={() => setScanMode('camera')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        scanMode === 'camera' ? 'bg-white text-[#4B3B78] font-bold shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Kamera Scanner
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanMode('manual')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        scanMode === 'manual' ? 'bg-white text-[#4B3B78] font-bold shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Input Manual / Barcode Gun
                    </button>
                  </div>

                  {scanMode === 'camera' ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-72 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                        <CameraBarcodeScanner onScan={handleScanBook} />
                      </div>
                      <p className="text-[11px] text-slate-400 text-center">
                        Posisikan barcode pada bagian cover belakang atau halaman pembuka buku.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleScanBook(manualInput);
                      }}
                      className="space-y-3"
                    >
                      <label className="block text-xs font-semibold text-slate-600">
                        Pindai / Ketik Barcode Buku Eksemplar:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Contoh: LIB-BK-2026-0001-C01..."
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4B3B78]"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!manualInput.trim() || isProcessing}
                          className="px-4 py-2 rounded-lg bg-[#4B3B78] hover:bg-[#3D2E66] disabled:bg-slate-300 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                        >
                          {isProcessing ? <CircularProgress size={14} sx={{ color: 'white' }} /> : 'Pindai'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Buku yang Berhasil Dikenali */}
                  {selectedBook && (
                    <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#4B3B78] uppercase tracking-wider">
                          Eksemplar Buku Terdeteksi
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                          {selectedBook.barcode}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{selectedBook.title}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">Penulis: {selectedBook.author}</p>
                        {selectedBook.callNumber && (
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">No. Panggil: {selectedBook.callNumber}</p>
                        )}
                      </div>

                      {/* Durasi Peminjaman */}
                      <div className="pt-2 border-t border-purple-200/80 flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">Durasi Peminjaman:</label>
                        <select
                          value={loanDurationDays}
                          onChange={(e) => setLoanDurationDays(Number(e.target.value))}
                          className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4B3B78] cursor-pointer"
                        >
                          <option value={3}>3 Hari</option>
                          <option value={7}>7 Hari (Standar)</option>
                          <option value={14}>14 Hari (2 Pekan)</option>
                          <option value={30}>30 Hari (Maksimal)</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleSubmitLoan}
                        disabled={isProcessing}
                        className="w-full py-2.5 rounded-lg bg-[#4B3B78] hover:bg-[#3D2E66] disabled:bg-slate-300 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <CircularProgress size={16} sx={{ color: 'white' }} />
                            <span>Menyimpan ke Database...</span>
                          </>
                        ) : (
                          <span>Konfirmasi Peminjaman Buku</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Transaksi Sukses & Struk */}
              {currentStep === 3 && loanResult && (
                <div className="space-y-5 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold mx-auto">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Peminjaman Berhasil Dicatat</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Transaksi telah terdaftar di database sirkulasi perpustakaan.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Peminjam:</span>
                      <span className="font-bold text-slate-800">{loanResult.member_name || selectedMember?.full_name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Judul Buku:</span>
                      <span className="font-bold text-slate-800 text-right max-w-[200px] truncate">
                        {loanResult.book_title || selectedBook?.title}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Barcode Buku:</span>
                      <span className="font-mono font-bold text-[#4B3B78]">{loanResult.barcode || selectedBook?.barcode}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Batas Kembali:</span>
                      <span className="font-bold text-rose-600">
                        {loanResult.due_date
                          ? new Date(loanResult.due_date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '7 Hari ke depan'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Cetak Struk Peminjaman
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex-1 py-2 rounded-lg bg-[#4B3B78] hover:bg-[#3D2E66] text-white text-xs font-bold transition cursor-pointer"
                    >
                      Peminjaman Baru
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Riwayat Transaksi Hari Ini (5 Kolom) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sirkulasi Terkini</h3>
                  <p className="text-[11px] text-slate-400">Peminjaman tercatat hari ini</p>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-500 text-xs transition cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {loadingTodayLoans ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <CircularProgress size={20} sx={{ color: '#4B3B78' }} />
                  <span className="text-xs text-slate-400">Memuat transaksi...</span>
                </div>
              ) : todayLoans.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada transaksi peminjaman tercatat hari ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 divide-y divide-slate-100">
                  {todayLoans.map((item, idx) => (
                    <div key={item.id || idx} className="pt-2.5 first:pt-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-800 truncate">
                            {item.book_title || 'Buku Perpustakaan'}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Peminjam: <span className="font-semibold text-slate-700">{item.member_name || 'Siswa'}</span>
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">
                          {item.status || 'DIPINJAM'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                        <span>{item.barcode || item.book_barcode || '-'}</span>
                        <span>
                          {item.borrow_date || item.created_at
                            ? new Date(item.borrow_date || item.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* KONTEN UTAMA: MODE PENGEMBALIAN BUKU */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Pemindaian Pengembalian Buku</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pindai barcode stiker buku yang dikembalikan siswa. Sistem akan otomatis memvalidasi denda keterlambatan dan mengubah status eksemplar menjadi tersedia.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Kondisi Fisik Buku:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'GOOD', label: 'Baik & Utuh' },
                    { id: 'FAIR', label: 'Wajar / Lusuh' },
                    { id: 'DAMAGED', label: 'Rusak / Halaman Robek' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setReturnCondition(c.id)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold transition cursor-pointer text-center ${
                        returnCondition === c.id
                          ? 'bg-[#EDEAF5] border-[#4B3B78] text-[#3D2E66]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Form Barcode Pengembalian */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessReturn(returnBarcode);
                }}
                className="space-y-3"
              >
                <label className="block text-xs font-semibold text-slate-700">
                  Barcode Eksemplar Buku:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Pindai atau masukkan barcode buku (LIB-BK-...)"
                    value={returnBarcode}
                    onChange={(e) => setReturnBarcode(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4B3B78]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!returnBarcode.trim() || isReturning}
                    className="px-5 py-2 rounded-lg bg-[#4B3B78] hover:bg-[#3D2E66] disabled:bg-slate-300 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isReturning ? <CircularProgress size={14} sx={{ color: 'white' }} /> : 'Proses Kembali'}
                  </button>
                </div>
              </form>

              {/* Kamera Scanner Pengembalian */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Atau Pindai via Kamera:</span>
                <div className="relative w-full h-64 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                  <CameraBarcodeScanner onScan={handleProcessReturn} />
                </div>
              </div>

              {/* Hasil Pengembalian */}
              {returnResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <span>✓</span>
                    <span>Buku Berhasil Dikembalikan</span>
                  </div>
                  <p className="text-xs text-slate-700">
                    Buku telah kembali ke status <strong>Tersedia (AVAILABLE)</strong> dan siap dipinjamkan kembali.
                  </p>
                  {returnResult.fine_amount > 0 && (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold">
                      Terdapat denda keterlambatan sebesar: Rp {Number(returnResult.fine_amount).toLocaleString('id-ID')} ({returnResult.days_overdue} hari terlambat).
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Panduan Sirkulasi */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Ketentuan Sirkulasi Perpustakaan
            </h3>
            <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4B3B78] mt-1.5 shrink-0" />
                <span>Maksimal peminjaman untuk siswa adalah <strong>3 buku</strong> secara bersamaan.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4B3B78] mt-1.5 shrink-0" />
                <span>Masa pinjam standar adalah <strong>7 hari kalender</strong> sejak tanggal transaksi.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span>Denda keterlambatan sebesar <strong>Rp 1.000 / hari per buku</strong> terhitung setelah melewati tanggal jatuh tempo.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Buku yang dikembalikan langsung otomatis diubah statusnya menjadi <strong>Tersedia</strong> di katalog digital.</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
