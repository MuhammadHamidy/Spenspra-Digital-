import { httpClient } from '@/lib/common/httpClient';

/**
 * Service API untuk Transaksi Sirkulasi Peminjaman, Pengembalian, dan Denda
 */
export const loansApi = {
  /**
   * Mengambil daftar transaksi peminjaman buku dengan filter status, member_id, atau keyword pencarian
   */
  getLoans: async (filter = {}) => {
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.member_id) params.append('member_id', filter.member_id);
    if (filter.search) params.append('search', filter.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await httpClient.get(`/loans${qs}`);
    return res?.data || [];
  },

  /**
   * Mengambil data ringkasan statistik sirkulasi perpustakaan (total dipinjam, overdue, total denda)
   */
  getLoanStats: async () => {
    const res = await httpClient.get('/loans/stats');
    return (
      res?.data || {
        total_active_loans: 0,
        total_overdue_loans: 0,
        total_returned: 0,
        total_unpaid_fines: 0,
      }
    );
  },

  /**
   * Mencatat transaksi peminjaman buku baru
   * Payload: { member_code, item_barcode, duration_days }
   */
  borrowBook: async (data) => {
    const res = await httpClient.post('/loans/borrow', data);
    return res?.data;
  },

  /**
   * Mencatat pengembalian buku dan auto kalkulasi denda jika terlambat
   * Payload: { item_barcode }
   */
  returnBook: async (data) => {
    const res = await httpClient.post('/loans/return', data);
    return res?.data;
  },

  /**
   * Mengonfirmasi pelunasan denda keterlambatan buku
   */
  payFine: async (loanId) => {
    const res = await httpClient.post(`/loans/${loanId}/pay-fine`, {});
    return res?.data;
  },
};
