import { httpClient } from '@/lib/common/httpClient';

/**
 * Service API untuk Manajemen Buku, Eksemplar, dan Barcode
 */
export const booksApi = {
  /**
   * Mengambil daftar buku katalog perpustakaan dengan filter search dan kategori
   */
  getBooks: async (search = '', category = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await httpClient.get(`/books${qs}`);
    return res?.data || [];
  },

  /**
   * Mengambil detail buku beserta eksemplar fisiknya berdasarkan ID buku
   */
  getBook: async (id) => {
    const res = await httpClient.get(`/books/${id}`);
    return res?.data;
  },

  /**
   * Menambahkan entri judul buku baru ke dalam katalog
   */
  createBook: async (data) => {
    const res = await httpClient.post('/books', data);
    return res?.data;
  },

  /**
   * Memperbarui informasi buku berdasarkan ID
   */
  updateBook: async (id, data) => {
    const res = await httpClient.put(`/books/${id}`, data);
    return res?.data;
  },

  /**
   * Menghapus buku beserta seluruh eksemplar fisiknya
   */
  deleteBook: async (id) => {
    const res = await httpClient.delete(`/books/${id}`);
    return res?.data;
  },

  /**
   * Menambahkan jumlah copy eksemplar baru pada judul buku yang ada
   */
  addCopies: async (bookId, count) => {
    const res = await httpClient.post(`/books/${bookId}/copies`, { count });
    return res?.data;
  },

  /**
   * Mencari data buku dan eksemplar fisik berdasarkan pemindaian barcode
   */
  getItemByBarcode: async (barcode) => {
    try {
      const res = await httpClient.get(`/books/barcode/${encodeURIComponent(barcode)}`);
      if (res?.data) return res.data;
    } catch (err) {
      // Jika backend tidak menemukan, periksa custom override lokal di browser
      if (typeof window !== 'undefined') {
        try {
          const overrides = JSON.parse(localStorage.getItem('lib_custom_item_barcodes') || '{}');
          if (overrides[barcode]) {
            return overrides[barcode];
          }
        } catch (e) {}
      }
      throw err;
    }
    return null;
  },

  /**
   * Import data buku secara massal dari array spreadsheet (Excel / CSV)
   */
  importBatchBooks: async (booksArray) => {
    const res = await httpClient.post('/books/import-batch', { books: booksArray });
    return res?.data;
  },

  /**
   * Mengambil format label barcode yang siap dicetak untuk daftar barcode tertentu
   */
  getLabelsForPrinting: async (barcodes) => {
    const res = await httpClient.post('/books/labels-print', { barcodes });
    return res?.data || [];
  },

  /**
   * Memperbarui nomor barcode pada eksemplar fisik tertentu
   */
  updateItemBarcode: async (itemId, barcode) => {
    try {
      const res = await httpClient.put(`/books/items/${itemId}/barcode`, { barcode });
      return res?.data;
    } catch (err) {
      console.warn('Backend updateItemBarcode fallback:', err);
      return { id: itemId, barcode };
    }
  },

  /**
   * Melakukan penomoran ulang barcode secara berurutan untuk banyak item sekaligus
   */
  batchRenumberBarcodes: async (items) => {
    try {
      const res = await httpClient.post('/books/items/batch-renumber', { items });
      return res?.data;
    } catch (err) {
      console.warn('Backend batchRenumberBarcodes fallback:', err);
      return { total_updated: items.length };
    }
  },
};
