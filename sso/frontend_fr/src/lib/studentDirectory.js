import { schoolPeopleApi } from '@/lib/features/schoolPeopleApi';

/**
 * Direktori Siswa & Resolusi Barcode Terintegrasi
 * Menghubungkan langsung ke API backend tanpa data hardcode/mock.
 */

export const MASTER_STUDENTS = [];

/**
 * Mencari siswa/civitas berdasarkan QR token atau barcode string
 * @param {string} token - Barcode token atau string raw dari scanner
 * @returns {Promise<object|null>} Data civitas dari backend atau null jika tidak valid
 */
export async function findStudentByTokenOrNisn(token) {
  if (!token) return null;
  const clean = token.trim();
  try {
    const result = await schoolPeopleApi.resolveBarcode(clean);
    if (result && result.id) {
      return {
        id: result.id,
        nisn: result.nisn || result.nip || '-',
        name: result.full_name,
        className: result.class_name || '-',
        status: result.barcode_status || (result.is_active ? 'ACTIVE' : 'INACTIVE'),
        qrToken: result.barcode_token,
      };
    }
    return null;
  } catch (err) {
    console.warn('[studentDirectory] Gagal verifikasi barcode token via API:', err.message);
    return null;
  }
}
