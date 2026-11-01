import { httpClient } from '@/lib/common/httpClient';

export const berandaApi = {
  /**
   * Mengambil data sesi pengguna login SSO yang valid
   */
  getSession: async (options = {}) => {
    const res = await httpClient.get('/session', { noRedirect: true, ...options });
    return res?.data || null;
  },

  /**
   * Mengambil ringkasan beranda pribadi (pinjaman aktif, tenggat, buku terakhir)
   */
  getBeranda: async (options = {}) => {
    try {
      const res = await httpClient.get('/beranda', { noRedirect: true, ...options });
      return res?.data || { pinjaman_aktif: [], aktivitas_baca_terakhir: null };
    } catch (e) {
      console.warn('Gagal memuat /beranda backend, menggunakan fallback data lokal:', e?.message);
      return { pinjaman_aktif: [], aktivitas_baca_terakhir: null };
    }
  },

  /**
   * Mengambil katalog buku publik dengan sinkronisasi otomatis ke katalog utama /books
   */
  getBuku: async (q = '', limit = 10, offset = 0) => {
    try {
      const params = new URLSearchParams();
      if (q) params.append('search', q);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const booksRes = await httpClient.get(`/books${qs}`);
      const rawBooks = Array.isArray(booksRes?.data) ? booksRes.data : [];
      if (rawBooks.length > 0) {
        const mapped = rawBooks.map((b) => ({
          id: b.id,
          judul: b.title || b.judul || 'Buku Perpustakaan',
          title: b.title || b.judul || 'Buku Perpustakaan',
          penulis: b.author || b.penulis || 'Penulis Spenspra',
          author: b.author || b.penulis || 'Penulis Spenspra',
          kategori: b.category || b.kategori || 'Umum',
          category: b.category || b.kategori || 'Umum',
          jenis: b.category || 'NON-FIKSI',
          isbn: b.isbn || '-',
          call_number: b.call_number || '',
          stok: b.available_copies !== undefined ? b.available_copies : b.total_copies || 1,
          total_copies: b.total_copies || 1,
          available_copies: b.available_copies !== undefined ? b.available_copies : 1,
          tersedia: (b.available_copies !== undefined ? b.available_copies : b.total_copies || 1) > 0,
          cover_url: b.cover_url || '',
          cover_image: b.cover_url || '',
          deskripsi: b.description || b.deskripsi || '',
          description: b.description || b.deskripsi || '',
          penerbit: b.publisher || '',
          publisher: b.publisher || '',
          tahun_terbit: b.publish_year || '',
          publish_year: b.publish_year || '',
          created_at: b.created_at,
        }));
        if (limit > 0) {
          return mapped.slice(offset, offset + limit);
        }
        return mapped;
      }
    } catch (e) {
      console.warn('Gagal memuat /books, mencoba fallback ke /buku:', e?.message);
    }

    const queryParams = new URLSearchParams();
    if (q) queryParams.set('q', q);
    if (limit) queryParams.set('limit', String(limit));
    if (offset) queryParams.set('offset', String(offset));

    try {
      const res = await httpClient.get(`/buku?${queryParams.toString()}`);
      return res?.data || [];
    } catch (e) {
      console.warn('Gagal memuat katalog buku:', e?.message);
      return [];
    }
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
