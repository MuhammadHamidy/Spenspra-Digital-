import { httpClient } from '@/lib/common/httpClient';

const DEFAULT_COURSES = [
  { id: 'crs-inf', code: 'INF-01', name: 'Informatika & Komputer', sks: 3, description: 'Pembelajaran Komputer & Algoritma' },
  { id: 'crs-ipa', code: 'IPA-01', name: 'IPA (Ilmu Pengetahuan Alam)', sks: 3, description: 'Fisika, Biologi, Kimia Dasar' },
  { id: 'crs-mtk', code: 'MTK-01', name: 'Matematika Terpadu', sks: 3, description: 'Aljabar, Geometri, Statistik' },
  { id: 'crs-bin', code: 'BIN-01', name: 'Bahasa Indonesia', sks: 2, description: 'Literasi & Tata Bahasa' },
  { id: 'crs-big', code: 'BIG-01', name: 'Bahasa Inggris', sks: 2, description: 'English Communication' },
  { id: 'crs-ppk', code: 'PPKN-01', name: 'Pendidikan Pancasila', sks: 2, description: 'Kewarganegaraan & Karakter' },
];

export const courseApiAdapter = {
  getAll: async (search = '') => {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await httpClient.get(`/courses${query}`);
      return res.data || DEFAULT_COURSES;
    } catch (err) {
      console.warn('Backend /courses offline, using default course list:', err.message);
      return DEFAULT_COURSES;
    }
  },

  getById: async (id) => {
    try {
      const res = await httpClient.get(`/courses/${id}`);
      return res.data;
    } catch {
      return DEFAULT_COURSES.find((c) => c.id === id) || DEFAULT_COURSES[0];
    }
  },

  create: async (courseData) => {
    try {
      const res = await httpClient.post('/courses', courseData);
      return res.data;
    } catch {
      return { ...courseData, id: `crs-${Date.now()}` };
    }
  },

  update: async (id, courseData) => {
    try {
      const res = await httpClient.put(`/courses/${id}`, courseData);
      return res.data;
    } catch {
      return { ...courseData, id };
    }
  },

  delete: async (id) => {
    try {
      const res = await httpClient.delete(`/courses/${id}`);
      return res.data;
    } catch {
      return { success: true };
    }
  },
};

