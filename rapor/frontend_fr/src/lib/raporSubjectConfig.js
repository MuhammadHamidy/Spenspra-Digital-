'use client';

/**
 * ============================================================================
 * SPENSPRA e-Rapor: Konfigurasi Urutan Mata Pelajaran Resmi & Cetak Rapor
 * ============================================================================
 * Mengatur tata urutan mata pelajaran untuk:
 * 1. Tampilan Pengelolaan Mata Pelajaran Admin
 * 2. Rekap Nilai Wali Kelas
 * 3. Pratinjau Rapor Sisipan Siswa
 * 4. Lembar Dokumen Resmi Cetak Rapor (PDF & Cetak Massal)
 */

export const STORAGE_KEY_SUBJECT_ORDER = 'spenspra_rapor_subject_order';

export const DEFAULT_OFFICIAL_RAPOR_SUBJECTS = [
  { no: '1', code: 'PAI', name: 'Pendidikan Agama Islam dan Budi Pekerti', sks: 3, isMulok: false },
  { no: '2', code: 'PP', name: 'Pendidikan Pancasila', sks: 3, isMulok: false },
  { no: '3', code: 'BI', name: 'Bahasa Indonesia', sks: 4, isMulok: false },
  { no: '4', code: 'MAT', name: 'Matematika', sks: 4, isMulok: false },
  { no: '5', code: 'IPA', name: 'Ilmu Pengetahuan Alam', sks: 4, isMulok: false },
  { no: '6', code: 'IPS', name: 'Ilmu Pengetahuan Sosial', sks: 4, isMulok: false },
  { no: '7', code: 'BIG', name: 'Bahasa Inggris', sks: 3, isMulok: false },
  { no: '8', code: 'PJOK', name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', sks: 3, isMulok: false },
  { no: '9', code: 'INF', name: 'Informatika', sks: 2, isMulok: false },
  { no: '10', code: 'SBP', name: 'Seni, Budaya, dan Prakarya', sks: 2, isMulok: false },
  { no: '11', code: 'BJ', name: 'Bahasa Jawa', sks: 2, isMulok: true },
  { no: '12', code: 'BTQ', name: 'Baca Tulis Al Qur’an', sks: 2, isMulok: true },
];

/**
 * Mengambil daftar urutan mentah tersimpan dari localStorage atau default
 */
export function getRawOrderedSubjects() {
  if (typeof window === 'undefined') {
    return DEFAULT_OFFICIAL_RAPOR_SUBJECTS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBJECT_ORDER);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca urutan mata pelajaran tersimpan:', err);
  }

  return DEFAULT_OFFICIAL_RAPOR_SUBJECTS;
}

/**
 * Mengonversi daftar urutan menjadi format resmi yang siap dicetak pada lembar rapor.
 * Menghasilkan penomoran sekuensial (1, 2, 3...) untuk mapel utama,
 * serta blok header dan sub-item (a, b, c...) untuk Muatan Lokal.
 */
export function getOrderedRaporSubjects(customRawList = null) {
  const rawList = customRawList || getRawOrderedSubjects();

  // Pisahkan mata pelajaran umum dan muatan lokal
  const generalSubjects = [];
  const mulokSubjects = [];

  rawList.forEach((item) => {
    // Normalisasi properti
    const isMulok = Boolean(
      item.isMulok ||
      item.isMulokItem ||
      item.code === 'BJ' ||
      item.code === 'BTQ' ||
      (item.name || '').toLowerCase().includes('muatan lokal')
    );

    // Hilangkan prefix penomoran lama dari nama jika ada
    const cleanName = (item.name || '')
      .replace(/^[a-z0-9]+[.)]\s*/i, '')
      .trim();

    if (isMulok) {
      mulokSubjects.push({
        ...item,
        name: cleanName,
        isMulok: true,
      });
    } else {
      generalSubjects.push({
        ...item,
        name: cleanName,
        isMulok: false,
      });
    }
  });

  const printableRows = [];

  // 1. Tambahkan mata pelajaran utama dengan nomor 1, 2, 3...
  generalSubjects.forEach((item, index) => {
    printableRows.push({
      ...item,
      no: String(index + 1),
      isMulokHeader: false,
      isMulokItem: false,
    });
  });

  // 2. Tambahkan header Muatan Lokal jika ada mulok
  if (mulokSubjects.length > 0) {
    const mulokHeaderNo = String(generalSubjects.length + 1);
    printableRows.push({
      no: mulokHeaderNo,
      code: 'MULOK',
      name: 'Muatan Lokal:',
      isMulokHeader: true,
      isMulokItem: false,
    });

    // 3. Tambahkan sub-item mulok: a. Bahasa Jawa, b. BTQ, dst.
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    mulokSubjects.forEach((item, index) => {
      const subLetter = alphabet[index] || String(index + 1);
      printableRows.push({
        ...item,
        no: '',
        sub: subLetter,
        name: `${subLetter}. ${item.name}`,
        isMulokHeader: false,
        isMulokItem: true,
      });
    });
  }

  return printableRows;
}

/**
 * Menyimpan urutan mata pelajaran baru ke localStorage dan cookie
 */
export function saveOrderedRaporSubjects(subjectsList) {
  if (typeof window === 'undefined') return;

  try {
    const cleanList = subjectsList.map((item, idx) => ({
      no: String(idx + 1),
      code: (item.code || '').toUpperCase().trim(),
      name: (item.name || '').replace(/^[a-z0-9]+[.)]\s*/i, '').trim(),
      sks: Number(item.sks) || 2,
      description: item.description || '',
      isMulok: Boolean(
        item.isMulok ||
        item.isMulokItem ||
        item.code === 'BJ' ||
        item.code === 'BTQ' ||
        (item.name || '').toLowerCase().includes('muatan lokal')
      ),
    }));

    const jsonStr = JSON.stringify(cleanList);
    localStorage.setItem(STORAGE_KEY_SUBJECT_ORDER, jsonStr);

    // Simpan juga ke cookie agar sinkron lintas sub-aplikasi
    try {
      document.cookie = `${STORAGE_KEY_SUBJECT_ORDER}=${encodeURIComponent(
        JSON.stringify(cleanList.map((c) => ({ code: c.code, isMulok: c.isMulok })))
      )}; path=/; domain=localhost; SameSite=Lax`;
    } catch {}

    // Picu event kustom agar komponen lain (misal modal rapor aktif) langsung update
    window.dispatchEvent(new CustomEvent('rapor-subject-order-changed', { detail: cleanList }));
    return true;
  } catch (err) {
    console.error('Gagal menyimpan urutan mata pelajaran:', err);
    return false;
  }
}

/**
 * Mengembalikan urutan mata pelajaran ke bawaan resmi SMPN 1 Prambon
 */
export function resetOrderedRaporSubjects() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_SUBJECT_ORDER);
    document.cookie = `${STORAGE_KEY_SUBJECT_ORDER}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    window.dispatchEvent(new Event('rapor-subject-order-changed'));
  } catch {}
}
