import { httpClient } from '@/lib/common/httpClient';
import { tokenStorage } from '@/lib/common/tokenStorage';

export const classApiAdapter = {
  getAll: async ({ dosenId = '', studentId = '', search = '' } = {}) => {
    try {
      let targetDosenId = dosenId;
      const currentUser = tokenStorage.getUser();

      // If user is a GURU/DOSEN and no specific dosenId filter was passed, filter by this teacher
      if (!targetDosenId && currentUser && (currentUser.roleName === 'GURU' || currentUser.roleName === 'DOSEN')) {
        targetDosenId = currentUser.id;
      }

      const params = new URLSearchParams();
      if (targetDosenId) params.append('dosen_id', targetDosenId);
      if (studentId) params.append('student_id', studentId);
      if (search) params.append('search', search);

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await httpClient.get(`/school/classes${query}`);
      let list = Array.isArray(res.data) ? res.data : (res.data?.classes || []);

      // Client-side strict filter: If logged-in user is a GURU, ensure they only see their assigned classes!
      if (currentUser && (currentUser.roleName === 'GURU' || currentUser.roleName === 'DOSEN') && !dosenId) {
        const myId = currentUser.id || '';
        const myPersonId = currentUser.person_id || '';
        const myNip = currentUser.nimNip || currentUser.nip || '';
        const myName = (currentUser.fullName || currentUser.full_name || '').toLowerCase();
        const allowedCodes = currentUser.class_codes || currentUser.classCodes || [];
        const allowedIds = currentUser.class_ids || currentUser.classIds || [];

        list = list.filter((c) => {
          if (c.dosen_id && (c.dosen_id === myId || c.dosen_id === myPersonId || (myNip && c.dosen_id === myNip))) return true;
          if (c.teacher_id && (c.teacher_id === myId || c.teacher_id === myPersonId || (myNip && c.teacher_id === myNip))) return true;
          if (myName && c.teacher_name && c.teacher_name.toLowerCase() === myName) return true;
          if (allowedCodes.includes(c.class_code)) return true;
          if (allowedIds.includes(c.id)) return true;
          return false;
        });
      }

      return list;
    } catch (err) {
      console.warn('Failed to fetch classes:', err.message);
      return [];
    }
  },

  getById: async (id) => {
    try {
      const res = await httpClient.get(`/school/classes/${id}`);
      return res.data || null;
    } catch (err) {
      console.warn('Failed to fetch class by ID:', err.message);
      return null;
    }
  },

  create: async (classData) => {
    const res = await httpClient.post('/school/classes', classData);
    return res.data;
  },

  update: async (id, classData) => {
    const res = await httpClient.put(`/school/classes/${id}`, classData);
    return res.data;
  },

  delete: async (id) => {
    const res = await httpClient.delete(`/school/classes/${id}`);
    return res.data;
  },

  getStudents: async (classId) => {
    try {
      const res = await httpClient.get(`/classes/${classId}/students`);
      return Array.isArray(res.data) ? res.data : (res.data?.students || []);
    } catch (err) {
      console.warn('Failed to fetch class students:', err.message);
      return [];
    }
  },

  enrollStudent: async (classId, studentId) => {
    const res = await httpClient.post(`/classes/${classId}/enroll`, { student_id: studentId });
    return res.data;
  },

  unenrollStudent: async (classId, studentId) => {
    const res = await httpClient.delete(`/classes/${classId}/unenroll/${studentId}`);
    return res.data;
  },

  getMasterRombel: async () => {
    const found = new Set();

    // 1. Coba ambil dari endpoint backend /school/rombel jika ada
    try {
      const res = await httpClient.get('/school/rombel');
      const list = Array.isArray(res.data) ? res.data : (res.data?.rombel || []);
      if (Array.isArray(list) && list.length > 0) {
        list.forEach((r) => {
          const clean = (typeof r === 'string' ? r : (r.class_code || r.name || '')).replace(/^Kelas\s*/i, '').trim();
          if (clean) found.add(clean);
        });
      }
    } catch {
      // ignore
    }

    // 2. Ambil dari SSO API master classes / rombel secara langsung
    try {
      const ssoApiBase = typeof window !== 'undefined' && window.location.hostname.includes('spenspra.com')
        ? 'https://sso.spenspra.com/api'
        : typeof window !== 'undefined' && window.location.hostname.includes('spenspra.sch.id')
        ? 'https://sso.spenspra.sch.id/api'
        : (process.env.NEXT_PUBLIC_SSO_API_URL || 'http://sso.localhost/api');

      const res = await fetch(`${ssoApiBase}/school/classes`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : (json.data?.classes || []);
        list.forEach((c) => {
          const code = (c.class_code || c.name || '').replace(/^Kelas\s*/i, '').trim();
          if (code) found.add(code);
        });
      }
    } catch {
      // ignore
    }

    // 3. Ambil dari data siswa (/school/students atau fallback SSO master people)
    try {
      const { accountApiAdapter } = await import('@/lib/features/auth/infrastructure/accountApiAdapter');
      const students = await accountApiAdapter.getStudents();
      if (Array.isArray(students)) {
        students.forEach((s) => {
          const code = (s.class_name || '').replace(/^Kelas\s*/i, '').trim();
          if (code) found.add(code);
        });
      }
    } catch {
      // ignore
    }

    // 4. Ambil dari data guru (wali kelas)
    try {
      const { accountApiAdapter } = await import('@/lib/features/auth/infrastructure/accountApiAdapter');
      const teachers = await accountApiAdapter.getTeachers();
      if (Array.isArray(teachers)) {
        teachers.forEach((t) => {
          const code = (t.class_name || '').replace(/^Kelas\s*/i, '').trim();
          if (code) found.add(code);
        });
      }
    } catch {
      // ignore
    }

    // 5. Ambil dari kelas pengampu eksisting (/school/classes)
    try {
      const existing = await classApiAdapter.getAll();
      if (Array.isArray(existing)) {
        existing.forEach((c) => {
          const code = (c.class_code || '').replace(/^Kelas\s*/i, '').trim();
          if (code) found.add(code);
        });
      }
    } catch {
      // ignore
    }

    // Fallback jika database masih kosong sama sekali
    if (found.size === 0) {
      return [
        '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I', '7J',
        '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '8I', '8J',
        '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H', '9I', '9J'
      ];
    }

    return Array.from(found).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  },
};
