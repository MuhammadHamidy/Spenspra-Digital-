import { httpClient } from '@/lib/common/httpClient';

/**
 * Service API untuk Manajemen Anggota Perpustakaan (Siswa & Guru)
 */
export const membersApi = {
  /**
   * Mengambil daftar seluruh anggota perpustakaan dengan filter kata kunci pencarian
   */
  getMembers: async (search = '') => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await httpClient.get(`/members${qs}`);
    return res?.data || [];
  },

  /**
   * Mengambil detail anggota berdasarkan ID (UUID)
   */
  getMember: async (id) => {
    const res = await httpClient.get(`/members/${id}`);
    return res?.data;
  },

  /**
   * Mengambil detail anggota berdasarkan kode barcode kartu perpustakaan
   */
  getMemberByCode: async (code) => {
    const res = await httpClient.get(`/members/code/${encodeURIComponent(code)}`);
    return res?.data;
  },

  /**
   * Mendaftarkan anggota baru ke server
   * Payload: { full_name, identity_number, email, phone, address, max_borrow_limit, user_id }
   */
  createMember: async (data) => {
    const res = await httpClient.post('/members', data);
    return res?.data;
  },

  /**
   * Memperbarui profil data anggota berdasarkan ID
   */
  updateMember: async (id, data) => {
    const res = await httpClient.put(`/members/${id}`, data);
    return res?.data;
  },

  /**
   * Menghapus data anggota dari sistem perpustakaan
   */
  deleteMember: async (id) => {
    const res = await httpClient.delete(`/members/${id}`);
    return res?.data;
  },

  /**
   * Menyelaraskan seluruh data anggota (guru & siswa) dari Master SSO
   */
  syncFromSSO: async () => {
    const res = await httpClient.post('/members/sync-sso');
    return res?.data;
  },
};

