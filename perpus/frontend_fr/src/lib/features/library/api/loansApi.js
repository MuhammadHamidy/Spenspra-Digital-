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
   * Mendukung alias createLoan dan fleksibilitas format payload (member_barcode / member_code)
   */
  borrowBook: async (data) => {
    const payload = {
      member_barcode: data.member_barcode || data.member_code || data.memberBarcode || '',
      book_barcode: data.book_barcode || data.item_barcode || data.barcode || data.bookBarcode || '',
      duration_days: Number(data.duration_days || data.durationDays || 7),
      notes: data.notes || '',
    };
    const res = await httpClient.post('/loans/borrow', payload);
    return res?.data;
  },

  createLoan: async (data) => {
    return loansApi.borrowBook(data);
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
   * Mengambil detail transaksi peminjaman berdasarkan ID
   */
  getLoanById: async (id) => {
    const res = await httpClient.get(`/loans/${id}`);
    return res?.data;
  },

  /**
   * Mengirim feedback/ulasan bacaan buku setelah peminjaman selesai
   */
  submitFeedback: async (data) => {
    try {
      const res = await httpClient.post('/reading-resumes', {
        loan_id: data.loan_id || data.loanId,
        book_id: data.book_id || data.bookId,
        member_id: data.member_id || data.memberId,
        title: data.title || 'Feedback Bacaan',
        summary: data.feedback || data.summary || '',
        key_insights: data.key_insights || 'Ulasan Pembaca Spenspra',
        rating: data.rating || 5,
      });
      return res?.data;
    } catch (e) {
      // Simpan di local storage sebagai fallback persistensi
      const stored = localStorage.getItem('spenspra_feedbacks') || '[]';
      const list = JSON.parse(stored);
      list.push({ ...data, created_at: new Date().toISOString() });
      localStorage.setItem('spenspra_feedbacks', JSON.stringify(list));
      return { success: true, message: 'Feedback berhasil disimpan' };
    }
  },

  /**
   * Mengirim jawaban kuis pemahaman buku
   */
  submitQuiz: async (data) => {
    try {
      const res = await httpClient.post(`/loans/${data.loan_id || data.loanId}/quiz`, data);
      return res?.data;
    } catch (e) {
      const stored = localStorage.getItem('spenspra_quizzes') || '[]';
      const list = JSON.parse(stored);
      list.push({ ...data, created_at: new Date().toISOString() });
      localStorage.setItem('spenspra_quizzes', JSON.stringify(list));
      return { success: true, message: 'Jawaban kuis berhasil dikirim' };
    }
  },
};
