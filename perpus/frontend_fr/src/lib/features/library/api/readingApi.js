import { httpClient } from '@/lib/common/httpClient';

/**
 * Service API untuk Resume Bacaan, Refleksi Literasi, dan Analitik Membaca
 */
export const readingApi = {
  /**
   * Mengambil daftar resume bacaan siswa dengan filter member_id, book_id, atau kata kunci
   */
  getReadingResumes: async (memberId = '', bookId = '', search = '') => {
    const params = new URLSearchParams();
    if (memberId) params.append('member_id', memberId);
    if (bookId) params.append('book_id', bookId);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await httpClient.get(`/reading-resumes${qs}`);
    return res?.data || [];
  },

  /**
   * Menambahkan entri resume bacaan dan rating baru dari anggota
   */
  createReadingResume: async (data) => {
    const res = await httpClient.post('/reading-resumes', data);
    return res?.data;
  },

  /**
   * Mengambil data agregat analitik literasi membaca dan leaderboard pembaca teraktif
   */
  getReadingInsights: async () => {
    const res = await httpClient.get('/reading-resumes/insights');
    return (
      res?.data || {
        total_resumes_submitted: 0,
        average_rating: 0,
        top_categories: [],
        leaderboard: [],
      }
    );
  },
};
