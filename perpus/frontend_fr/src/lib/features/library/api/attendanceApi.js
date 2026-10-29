import { httpClient } from '@/lib/common/httpClient';

/**
 * Service API untuk Presensi Pengunjung Perpustakaan (Face Recognition & Manual)
 */
export const attendanceApi = {
  /**
   * Mengambil riwayat log kehadiran pengunjung dengan filter pencarian dan tanggal
   */
  getAttendances: async (search = '', date = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (date) params.append('date', date);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await httpClient.get(`/library-attendances${qs}`);
    return res?.data || [];
  },

  /**
   * Mengambil statistik ringkasan kehadiran pengunjung hari ini
   */
  getAttendanceStats: async () => {
    const res = await httpClient.get('/library-attendances/stats');
    return (
      res?.data || {
        today_visitors: 0,
        member_visitors: 0,
        guest_visitors: 0,
        total_visits: 0,
      }
    );
  },

  /**
   * Melakukan presensi otomatis menggunakan vektor wajah (Face Recognition di Kiosk)
   */
  recognizeVisit: async ({ faceVector, photoUrl, purpose }) => {
    const res = await httpClient.post('/library-attendances/recognize', {
      face_vector: faceVector,
      photo_url: photoUrl,
      purpose: purpose || 'MEMBACA',
    });
    return res;
  },

  /**
   * Mencatat kehadiran pengunjung secara manual / scan barcode
   */
  recordManualVisit: async (data) => {
    const payload = {
      member_code: data.member_code || data.barcode_token || data.barcode || '',
      visitor_name: data.visitor_name || data.name || data.fullName || 'Civitas Spenspra',
      visitor_type: data.visitor_type || 'MEMBER',
      method: data.method || 'BARCODE_SCAN',
      purpose: data.purpose || 'MEMBACA',
    };
    const res = await httpClient.post('/library-attendances/manual', payload);
    return res?.data;
  },
};
