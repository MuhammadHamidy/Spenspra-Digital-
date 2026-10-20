import { httpClient } from '@/lib/common/httpClient';

export const berandaApi = {
  /**
   * Mengambil data sesi pengguna login SSO yang valid
   */
  getSession: async () => {
    const res = await httpClient.get('/session');
    return res?.data || null;
  },

  /**
   * Mengambil ringkasan beranda pribadi (pinjaman aktif, tenggat, buku terakhir)
   */
  getBeranda: async () => {
    const res = await httpClient.get('/beranda');
    return res?.data || null;
  },

  /**
   * Mengambil katalog buku publik dengan filter pencarian
   */
  getBuku: async (q = '', limit = 10, offset = 0) => {
    const queryParams = new URLSearchParams();
    if (q) queryParams.set('q', q);
    if (limit) queryParams.set('limit', String(limit));
    if (offset) queryParams.set('offset', String(offset));
    
    const res = await httpClient.get(`/buku?${queryParams.toString()}`);
    return res?.data || [];
  },

  /**
   * Mengambil info jam layanan & deskripsi perpustakaan
   */
  getInfo: async () => {
    const res = await httpClient.get('/info');
    return res?.data || null;
  },

  /**
   * Mencatat presensi/keperluan kunjungan (Meminjam, Membaca, Pembelajaran, Tamu)
   */
  catatKunjungan: async (payload) => {
    const res = await httpClient.post('/kunjungan', payload);
    return res?.data || null;
  },
};
