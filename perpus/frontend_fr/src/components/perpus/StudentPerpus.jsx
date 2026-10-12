'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { attendanceApi, booksApi, loansApi, membersApi } from '@/lib/features/library/api';
import { playScannerBeep } from './soundUtils';

import PerpusNavbar from './PerpusNavbar';
import PerpusFooter from './PerpusFooter';
import PerpusPurposeScreen from './PerpusPurposeScreen';
import PerpusAttendanceScreen from './PerpusAttendanceScreen';
import PerpusAttendanceSuccessScreen from './PerpusAttendanceSuccessScreen';
import PerpusBookScanScreen from './PerpusBookScanScreen';
import PerpusReceiptScreen from './PerpusReceiptScreen';
import PerpusBookModal from './PerpusBookModal';

// Preset barcodes from database
const PRESET_DB_BARCODES = [
  { barcode: 'PERPUS-2026-0001-C01', title: 'Clean Code (Format Kustom)', author: 'Robert C. Martin' },
  { barcode: 'LIB-BK-2026-0001-C01', title: 'Clean Code', author: 'Robert C. Martin' },
  { barcode: 'LIB-BK-2026-0002-C01', title: 'Laskar Pelangi', author: 'Andrea Hirata' },
  { barcode: 'LIB-BK-2026-0003-C01', title: 'Effective Java', author: 'Joshua Bloch' },
  { barcode: 'LIB-BK-2026-0004-C01', title: 'Filosofi Teras', author: 'Henry Manampiring' },
  { barcode: 'LIB-BK-2026-0005-C01', title: 'Sapiens', author: 'Yuval Noah Harari' },
  { barcode: 'UNREGISTERED-9999-X', title: 'Buku Tidak Terdaftar (Tes Penolakan)', author: '-' },
];

// Helper Manajemen Sesi Harian Perpustakaan (Batas 1 Hari, Restart saat Berganti Hari)
export const getTodayDateKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const checkAndResetDailyLibrarySession = () => {
  if (typeof window === 'undefined') return {};
  try {
    const todayKey = getTodayDateKey();
    const storedDate = localStorage.getItem('lib_daily_session_date');

    if (storedDate !== todayKey) {
      console.log(`[LibrarySession] Pergantian hari (${storedDate || 'awal'} -> ${todayKey}). Merestart data absen perpus.`);
      localStorage.setItem('lib_daily_session_date', todayKey);
      localStorage.setItem('lib_today_active_sessions', JSON.stringify({}));
      return {};
    }

    const raw = localStorage.getItem('lib_today_active_sessions');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

export const markStudentAttendedToday = (studentId, studentInfo) => {
  if (typeof window === 'undefined' || !studentId) return;
  try {
    const todayKey = getTodayDateKey();
    localStorage.setItem('lib_daily_session_date', todayKey);
    const raw = localStorage.getItem('lib_today_active_sessions');
    const sessions = raw ? JSON.parse(raw) : {};
    sessions[String(studentId)] = {
      ...studentInfo,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
    };
    localStorage.setItem('lib_today_active_sessions', JSON.stringify(sessions));
  } catch (e) {
    console.warn('Failed saving active session:', e);
  }
};

export const getStudentActiveSessionToday = (studentId) => {
  if (!studentId) return null;
  const sessions = checkAndResetDailyLibrarySession();
  return sessions[String(studentId)] || null;
};

export default function StudentPerpus({ initialScreen = 'purpose' }) {
  const router = useRouter();

  // Screen state: 'purpose' | 'attendance' | 'attendance_success' | 'scan' | 'success'
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [selectedPurpose, setSelectedPurpose] = useState(null); // 'TAMU' | 'PEMINJAM' | 'PEMBELAJARAN'
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [attendanceCountdown, setAttendanceCountdown] = useState(10);

  // Auth / Admin Status
  const [currentUser, setCurrentUser] = useState(null);

  // Live Clock State
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Attendance Barcode State (Replacing Face Recognition)
  const [detectedStudent, setDetectedStudent] = useState(null);
  const [isProcessingBarcodeStudent, setIsProcessingBarcodeStudent] = useState(false);
  const [barcodeScanError, setBarcodeScanError] = useState(null);
  const [registeredMembers, setRegisteredMembers] = useState([]);
  const lastScannedStudentRef = useRef({ code: '', time: 0 });

  // Pindai Barcode Buku State
  const [scannedBooks, setScannedBooks] = useState([]);
  const [activeBarcodeMode, setActiveBarcodeMode] = useState('PINJAM'); // 'PINJAM' | 'KEMBALI'
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [bookScanError, setBookScanError] = useState(null);
  const [bookScanSuccess, setBookScanSuccess] = useState(null);
  const [isProcessingBookBarcode, setIsProcessingBookBarcode] = useState(false);
  const lastScannedBookRef = useRef({ code: '', time: 0 });

  // Modal Pop-up Konfirmasi Sirkulasi Buku
  const [pendingBookModal, setPendingBookModal] = useState(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Transaction Receipt State
  const [lastTransaction, setLastTransaction] = useState({
    studentName: '-',
    studentId: '-',
    bookTitle: '-',
    borrowDate: '-',
    dueDate: '-',
    transactionId: '-',
    type: 'PINJAM',
  });
  const [countdown, setCountdown] = useState(15);

  // Load registered members from backend or localStorage
  useEffect(() => {
    const loadMembersList = async () => {
      try {
        const res = await membersApi.getMembers();
        let list = Array.isArray(res) ? res : res?.data || [];
        if (list.length === 0 && typeof window !== 'undefined') {
          const raw = localStorage.getItem('lib_members_data');
          if (raw) list = JSON.parse(raw);
        }
        setRegisteredMembers(list);
      } catch (e) {
        console.warn('Failed loading members list for barcode matcher:', e);
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('lib_members_data');
            if (raw) setRegisteredMembers(JSON.parse(raw));
          } catch {}
        }
      }
    };
    loadMembersList();
  }, []);

  // Select purpose before barcode scanning
  const handleSelectPurpose = (purpose) => {
    setSelectedPurpose(purpose);
    setDetectedStudent(null);
    setBarcodeScanError(null);
    setCurrentScreen('attendance');
  };

  // Complete attendance without book scan (for Pembelajaran or Tamu)
  const handleCompleteAttendanceOnly = () => {
    if (!detectedStudent) {
      alert('Kartu barcode siswa belum dipindai.');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const purposeLabel =
      selectedPurpose === 'PEMBELAJARAN'
        ? 'Belajar di Kelas'
        : selectedPurpose === 'TAMU'
        ? 'Tamu / Pengunjung'
        : 'Membaca / Meminjam';

    const wasAlreadyAttended = Boolean(detectedStudent?.hasActiveSessionToday);

    const record = {
      id: `ATT-${Date.now().toString().slice(-6)}`,
      name: detectedStudent.name,
      studentId: detectedStudent.id,
      className: detectedStudent.className || (selectedPurpose === 'TAMU' ? 'Tamu Umum' : 'Siswa'),
      photo: detectedStudent.photo || null,
      purpose: selectedPurpose || 'PEMBELAJARAN',
      purposeLabel,
      date: dateStr,
      time: detectedStudent.activeSessionTime || timeStr,
      timestamp: now.toISOString(),
      isReusedDailySession: wasAlreadyAttended,
    };

    // Tandai sesi harian aktif untuk siswa ini (batas 1 hari)
    markStudentAttendedToday(detectedStudent.id, {
      name: detectedStudent.name,
      className: record.className,
      time: record.time,
    });

    setAttendanceRecord(record);

    try {
      const existing = JSON.parse(localStorage.getItem('lib_attendance_logs') || '[]');
      existing.unshift(record);
      localStorage.setItem('lib_attendance_logs', JSON.stringify(existing.slice(0, 100)));
    } catch (e) {
      console.warn('Failed saving attendance log:', e);
    }

    setAttendanceCountdown(10);
    setCurrentScreen('attendance_success');
  };

  // Full reset to Home Purpose screen
  const handleFullResetToHome = () => {
    setSelectedPurpose(null);
    setAttendanceRecord(null);
    setDetectedStudent(null);
    setScannedBooks([]);
    setPendingBookModal(null);
    setIsSubmittingAction(false);
    setBarcodeScanError(null);
    setBookScanError(null);
    setBookScanSuccess(null);
    setManualBarcodeInput('');
    setLastTransaction({
      studentName: '',
      studentId: '',
      bookTitle: '',
      borrowDate: '',
      dueDate: '',
      transactionId: '',
      type: 'PINJAM',
    });
    setCurrentScreen('purpose');
  };

  const handleFullResetToAttendance = () => {
    setDetectedStudent(null);
    setBarcodeScanError(null);
    setScannedBooks([]);
    setPendingBookModal(null);
    setCurrentScreen('attendance');
  };

  // 1. Initial Auth Check & Live Clock
  useEffect(() => {
    const user = tokenStorage.getUser();
    setCurrentUser(user);

    const updateClock = () => {
      checkAndResetDailyLibrarySession();

      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      const dayName = days[now.getDay()];
      const dayNum = now.getDate();
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');

      setCurrentTimeStr(`${dayName}, ${dayNum} ${monthName} ${year} | ${hours}.${mins}.${secs}`);
    };

    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // 2. Auto Countdown on Success Screens
  useEffect(() => {
    let timer = null;
    if (currentScreen === 'success') {
      setCountdown(15);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleFullResetToHome();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (currentScreen === 'attendance_success') {
      setAttendanceCountdown(10);
      timer = setInterval(() => {
        setAttendanceCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleFullResetToHome();
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentScreen]);

  // Handle Student Barcode Detection (Kartu Pelajar Barcode)
  const handleStudentBarcodeDetected = async (rawCode) => {
    if (!rawCode || isProcessingBarcodeStudent || detectedStudent) return;
    const cleanCode = String(rawCode).trim();
    if (!cleanCode) return;

    const now = Date.now();
    if (lastScannedStudentRef.current.code === cleanCode && (now - lastScannedStudentRef.current.time) < 2200) {
      return;
    }
    lastScannedStudentRef.current = { code: cleanCode, time: now };

    setIsProcessingBarcodeStudent(true);
    setBarcodeScanError(null);

    try {
      let matchedMember = null;

      // 1. Try backend API getMemberByCode
      try {
        const res = await membersApi.getMemberByCode(cleanCode);
        if (res && (res.id || res.member_code || res.identity_number)) {
          matchedMember = res;
        }
      } catch (apiErr) {
        // continue to list search
      }

      // 2. Search in registeredMembers or fetch search
      if (!matchedMember) {
        const upper = cleanCode.toUpperCase();
        matchedMember = registeredMembers.find(
          (m) =>
            String(m.member_code || '').toUpperCase() === upper ||
            String(m.identity_number || '').toUpperCase() === upper ||
            String(m.id || '').toUpperCase() === upper
        );
      }

      // 3. Fallback to localStorage if not found yet
      if (!matchedMember && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('lib_members_data');
          if (raw) {
            const parsed = JSON.parse(raw);
            const upper = cleanCode.toUpperCase();
            matchedMember = parsed.find(
              (m) =>
                String(m.member_code || '').toUpperCase() === upper ||
                String(m.identity_number || '').toUpperCase() === upper ||
                String(m.id || '').toUpperCase() === upper
            );
          }
        } catch {}
      }

      if (matchedMember) {
        playScannerBeep();
        const studentId = matchedMember.identity_number || matchedMember.member_code || matchedMember.id;
        const existingSession = getStudentActiveSessionToday(studentId);
        const sessionTime = existingSession?.time || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const studentProfile = {
          name: matchedMember.full_name || matchedMember.name,
          id: studentId,
          memberCode: matchedMember.member_code || cleanCode,
          identityNumber: matchedMember.identity_number || studentId,
          className: matchedMember.class_name || matchedMember.address || 'Siswa',
          photo: matchedMember.photo_url || null,
          status: 'ready',
          hasActiveSessionToday: Boolean(existingSession),
          activeSessionTime: sessionTime,
        };

        // Record visit in backend
        try {
          await attendanceApi.recordManualVisit({
            member_code: studentProfile.memberCode,
            member_id: matchedMember.id,
            visitor_name: studentProfile.name,
            visitor_type: 'MEMBER',
            method: 'BARCODE',
            purpose: selectedPurpose || 'MEMBACA',
          });
        } catch (attErr) {
          console.warn('Backend record visit notice (saved locally):', attErr);
        }

        markStudentAttendedToday(studentId, {
          name: studentProfile.name,
          className: studentProfile.className,
          time: sessionTime,
        });

        setDetectedStudent(studentProfile);
        setBarcodeScanError(null);
      } else {
        setBarcodeScanError(
          `Barcode "${cleanCode}" tidak terdaftar di database anggota perpustakaan. Pastikan kartu pelajar telah didaftarkan pustakawan.`
        );
      }
    } catch (err) {
      console.warn('Student barcode verification error:', err);
      setBarcodeScanError('Terjadi kesalahan saat memverifikasi barcode kartu pelajar.');
    } finally {
      setIsProcessingBarcodeStudent(false);
    }
  };

  const handleResetBarcodeScan = () => {
    setDetectedStudent(null);
    setBarcodeScanError(null);
    setIsProcessingBarcodeStudent(false);
  };

  // Barcode Scan Handler for Physical Books
  const handleBookBarcodeDetected = async (rawBarcode) => {
    if (!rawBarcode || isProcessingBookBarcode || pendingBookModal) return;
    const barcode = String(rawBarcode).trim();
    if (!barcode) return;

    const now = Date.now();
    if (lastScannedBookRef.current.code === barcode && (now - lastScannedBookRef.current.time) < 2500) {
      return;
    }
    lastScannedBookRef.current = { code: barcode, time: now };

    setIsProcessingBookBarcode(true);
    setBookScanError(null);
    setBookScanSuccess(null);

    try {
      const res = await booksApi.getItemByBarcode(barcode);
      const item = res?.data || res;

      if (!item || !item.barcode) {
        throw new Error('Data buku tidak ditemukan di sistem perpustakaan.');
      }

      playScannerBeep();
      const book = item.book || {};

      const dateNow = new Date();
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      const borrowDateFormatted = `${dateNow.getDate()} ${months[dateNow.getMonth()]} ${dateNow.getFullYear()}`;
      const dueDateObj = new Date(dateNow.getTime() + 7 * 864e5);
      const dueDateFormatted = `${dueDateObj.getDate()} ${months[dueDateObj.getMonth()]} ${dueDateObj.getFullYear()}`;

      const pendingData = {
        id: item.id,
        barcode: item.barcode,
        title: book.title || item.title || 'Buku Perpustakaan',
        author: book.author || item.author || 'Penulis Tidak Tercatat',
        category: book.category || item.category || 'Umum',
        isbn: book.isbn || item.isbn || '-',
        publisher: book.publisher || '-',
        publishYear: book.publish_year || '-',
        callNumber: item.call_number || book.call_number || '-',
        description: book.description || 'Koleksi resmi Perpustakaan Digital Cerdas.',
        status: item.status || 'AVAILABLE',
        borrowDate: borrowDateFormatted,
        dueDate: dueDateFormatted,
      };

      setPendingBookModal(pendingData);
      setBookScanSuccess(`✅ Buku terdeteksi: ${pendingData.title}. Silakan konfirmasi di pop-up.`);
      setTimeout(() => setBookScanSuccess(null), 4000);
    } catch (err) {
      console.warn('Book barcode verification failed:', err);
      setBookScanError(
        `❌ Barcode "${barcode}" tidak ditemukan di database perpustakaan! Hanya buku fisik terdaftar yang dapat discan.`
      );
      setTimeout(() => setBookScanError(null), 6000);
    } finally {
      setIsProcessingBookBarcode(false);
    }
  };

  // Execute borrow or return directly from the Pop-up Modal
  const handleExecuteSingleAction = async (bookData, actionType) => {
    if (!detectedStudent) {
      alert('Identitas siswa belum terverifikasi. Silakan lakukan scan kartu pelajar terlebih dahulu.');
      handleFullResetToAttendance();
      return;
    }

    setIsSubmittingAction(true);
    const memberBarcode = detectedStudent.memberCode || detectedStudent.id;

    try {
      if (actionType === 'PINJAM') {
        await loansApi.borrowBook({
          member_barcode: memberBarcode,
          book_barcode: bookData.barcode,
          duration_days: 7,
          notes: 'Peminjaman mandiri siswa',
        });
      } else {
        await loansApi.returnBook({
          book_barcode: bookData.barcode,
          item_condition: 'GOOD',
          notes: 'Pengembalian mandiri siswa',
        });
      }

      setLastTransaction({
        studentName: detectedStudent.name,
        studentId: detectedStudent.id,
        bookTitle: `${bookData.title} - ${bookData.author}`,
        borrowDate: bookData.borrowDate,
        dueDate: bookData.dueDate,
        transactionId: `TRX-${Date.now().toString().slice(-6)}-BK`,
        type: actionType,
      });

      setScannedBooks((prev) => [
        {
          ...bookData,
          type: actionType,
          coverColor: actionType === 'PINJAM' ? '#1A365D' : '#D97706',
        },
        ...prev.filter((b) => b.barcode !== bookData.barcode),
      ]);

      setPendingBookModal(null);
      setCurrentScreen('success');
    } catch (err) {
      alert(`Gagal memproses ${actionType === 'PINJAM' ? 'peminjaman' : 'pengembalian'}: ${err.message || 'Periksa status buku di server.'}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleAddManualBarcode = (e) => {
    e.preventDefault();
    if (!manualBarcodeInput.trim()) return;
    handleBookBarcodeDetected(manualBarcodeInput.trim());
    setManualBarcodeInput('');
  };

  const handleRemoveBook = (indexToRemove) => {
    setScannedBooks((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleConfirmTransaction = async (actionType) => {
    if (scannedBooks.length === 0) {
      alert('Silakan scan minimal 1 buku fisik sebelum melakukan konfirmasi.');
      return;
    }

    if (!detectedStudent) {
      alert('Identitas siswa belum terverifikasi. Silakan lakukan scan barcode kartu pelajar terlebih dahulu.');
      handleFullResetToAttendance();
      return;
    }

    const firstBook = scannedBooks[0];
    const dateNow = new Date();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const borrowDateFormatted = `${dateNow.getDate()} ${months[dateNow.getMonth()]} ${dateNow.getFullYear()}`;
    const dueDateObj = new Date(dateNow.getTime() + 7 * 864e5);
    const dueDateFormatted = `${dueDateObj.getDate()} ${months[dueDateObj.getMonth()]} ${dueDateObj.getFullYear()}`;

    setLastTransaction({
      studentName: detectedStudent.name,
      studentId: detectedStudent.id,
      bookTitle: scannedBooks.length === 1 ? firstBook.title : `${firstBook.title} (+${scannedBooks.length - 1} buku lainnya)`,
      borrowDate: borrowDateFormatted,
      dueDate: dueDateFormatted,
      transactionId: `TRX-${Date.now().toString().slice(-6)}-BK`,
      type: actionType,
    });

    setCurrentScreen('success');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0A1931] flex flex-col justify-between selection:bg-blue-100 font-sans">
      {/* Top Navbar */}
      <PerpusNavbar
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        router={router}
      />

      {/* Main Content */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        {currentScreen === 'purpose' && (
          <PerpusPurposeScreen handleSelectPurpose={handleSelectPurpose} />
        )}

        {currentScreen === 'attendance' && (
          <PerpusAttendanceScreen
            selectedPurpose={selectedPurpose}
            setCurrentScreen={setCurrentScreen}
            detectedStudent={detectedStudent}
            setDetectedStudent={setDetectedStudent}
            isProcessingBarcode={isProcessingBarcodeStudent}
            barcodeScanError={barcodeScanError}
            setBarcodeScanError={setBarcodeScanError}
            handleCompleteAttendanceOnly={handleCompleteAttendanceOnly}
            handleResetBarcodeScan={handleResetBarcodeScan}
            handleBarcodeScanned={handleStudentBarcodeDetected}
            registeredMembers={registeredMembers}
          />
        )}

        {currentScreen === 'attendance_success' && (
          <PerpusAttendanceSuccessScreen
            attendanceRecord={attendanceRecord}
            attendanceCountdown={attendanceCountdown}
            handleFullResetToHome={handleFullResetToHome}
          />
        )}

        {currentScreen === 'scan' && (
          <PerpusBookScanScreen
            currentScreen={currentScreen}
            detectedStudent={detectedStudent}
            activeBarcodeMode={activeBarcodeMode}
            setActiveBarcodeMode={setActiveBarcodeMode}
            handleFullResetToAttendance={handleFullResetToAttendance}
            handleBarcodeDetected={handleBookBarcodeDetected}
            isProcessingBarcode={isProcessingBookBarcode}
            barcodeScanSuccess={bookScanSuccess}
            barcodeScanError={bookScanError}
            manualBarcodeInput={manualBarcodeInput}
            setManualBarcodeInput={setManualBarcodeInput}
            handleAddManualBarcode={handleAddManualBarcode}
            presetBarcodes={PRESET_DB_BARCODES}
            handleConfirmTransaction={handleConfirmTransaction}
            scannedBooks={scannedBooks}
            handleRemoveBook={handleRemoveBook}
          />
        )}

        {currentScreen === 'success' && (
          <PerpusReceiptScreen
            lastTransaction={lastTransaction}
            countdown={countdown}
            handleFullResetToAttendance={handleFullResetToAttendance}
          />
        )}
      </main>

      {/* Footer */}
      <PerpusFooter currentTimeStr={currentTimeStr} />

      {/* Single Book Confirmation Modal */}
      <PerpusBookModal
        pendingBookModal={pendingBookModal}
        setPendingBookModal={setPendingBookModal}
        detectedStudent={detectedStudent}
        isSubmittingAction={isSubmittingAction}
        handleExecuteSingleAction={handleExecuteSingleAction}
      />
    </div>
  );
}
