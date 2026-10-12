import { httpClient } from '@/lib/common/httpClient';

const MALE_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%231A3D63"/><circle cx="50" cy="38" r="20" fill="%23B3CFE5"/><path d="M20,85 C20,62 33,55 50,55 C67,55 80,62 80,85 Z" fill="%23B3CFE5"/></svg>`;
const FEMALE_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%234A7FA7"/><circle cx="50" cy="38" r="18" fill="%23F6FAFD"/><path d="M15,85 C15,60 30,52 50,52 C70,52 85,60 85,85 Z" fill="%23F6FAFD"/></svg>`;

const DEFAULT_TEACHERS = [];
const DEFAULT_STUDENTS = [];

function getLocalStudents() {
  if (typeof window === 'undefined') return DEFAULT_STUDENTS;
  try {
    const data = localStorage.getItem('perpusdig_local_students');
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_STUDENTS;
}

function saveLocalStudents(students) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('perpusdig_local_students', JSON.stringify(students));
  } catch (e) {}
}

function getLocalTeachers() {
  if (typeof window === 'undefined') return DEFAULT_TEACHERS;
  try {
    const data = localStorage.getItem('perpusdig_local_teachers');
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_TEACHERS;
}

function saveLocalTeachers(teachers) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('perpusdig_local_teachers', JSON.stringify(teachers));
  } catch (e) {}
}

export const accountApiAdapter = {
  getAll: async (role = '') => {
    try {
      const query = role ? `?role=${encodeURIComponent(role)}` : '';
      const res = await httpClient.get(`/accounts${query}`);
      return res.data || [];
    } catch {
      return role === 'GURU' ? getLocalTeachers() : getLocalStudents();
    }
  },

  getTeachers: async () => {
    try {
      const res = await httpClient.get('/school/teachers');
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.teachers)) return res.data.teachers;
      return [];
    } catch (err) {
      console.warn('Backend akun guru tidak dapat diakses:', err.message);
      return [];
    }
  },

  getStudents: async (className = '') => {
    try {
      const query = className ? `?class_name=${encodeURIComponent(className)}` : '';
      const res = await httpClient.get(`/school/students${query}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch (err) {
      console.warn('Endpoint /school/students tidak dapat diakses:', err.message);
    }

    // Fallback: ambil data master siswa dari SSO jika rapor belum disinkronkan
    try {
      const resp = await fetch('http://sso.localhost/api/master/people?person_type=SISWA');
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          return json.data.map((p) => ({
            id: p.id,
            full_name: p.full_name,
            nisn: p.nisn,
            class_name: p.class_name,
            phone: p.phone,
            email: p.email,
          }));
        }
      }
    } catch (errFallback) {
      console.warn('Fallback SSO master people tidak dapat diakses:', errFallback.message);
    }

    return getLocalStudents();
  },

  create: async (accountData) => {
    const payload = {
      ...accountData,
      id: accountData.id || `acc-${Date.now()}`,
      full_name: accountData.full_name || accountData.fullName,
      nim_nip: accountData.nim_nip || accountData.nip,
      class_name: accountData.class_name || accountData.className || '',
      course_ids: accountData.course_ids || accountData.selectedCourses || [],
      class_ids: accountData.class_ids || accountData.selectedClasses || [],
      email: accountData.email || '',
      phone: accountData.phone || '',
    };

    try {
      const res = await httpClient.post('/school/teachers', payload);
      return res.data || payload;
    } catch (error) {
      throw new Error(error?.response?.data?.message || error?.message || 'Akun tidak dapat dibuat di backend');
    }
  },

  update: async (id, accountData) => {
    const payload = {
      ...accountData,
      id,
      full_name: accountData.full_name || accountData.fullName,
      nim_nip: accountData.nim_nip || accountData.nip,
      class_name: accountData.class_name || accountData.className || '',
      course_ids: accountData.course_ids || accountData.selectedCourses || [],
      class_ids: accountData.class_ids || accountData.selectedClasses || [],
      email: accountData.email || '',
      phone: accountData.phone || '',
    };

    try {
      const res = await httpClient.put(`/school/teachers/${id}`, payload);
      return res.data || { ...payload, id };
    } catch (error) {
      throw new Error(error?.message || 'Akun tidak dapat diperbarui di backend');
    }
  },

  delete: async (id) => {
    try {
      const res = await httpClient.delete(`/school/teachers/${id}`);
      return res.data;
    } catch (error) {
      throw new Error(error?.message || 'Akun tidak dapat dihapus dari backend');
    }
  },

  resetPassword: async (teacherOrId, { newPassword = '', sendEmail = true } = {}) => {
    let t = teacherOrId;
    if (typeof teacherOrId === 'string') {
      const teachers = await accountApiAdapter.getTeachers();
      t = teachers.find((item) => item.id === teacherOrId) || {};
    }

    const generated = newPassword || t.nim_nip || t.nip || t.username || 'Spenspra2026';

    // 1. Try Go backend if available
    try {
      const res = await httpClient.post(`/accounts/${t.id || teacherOrId}/reset-password`, {
        new_password: generated,
        send_email: sendEmail,
      });
      if (res?.data) return res.data;
    } catch (e) {
      // Proceed with direct Next.js mailer
    }

    // 2. If sendEmail is true, send via Next.js internal mailer
    let emailSent = false;
    if (sendEmail && t.email) {
      try {
        const resp = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: t.email,
            teacherName: t.full_name || t.fullName,
            username: t.username,
            newPassword: generated,
            type: 'reset_password',
          }),
        });
        const result = await resp.json();
        if (result.success) {
          emailSent = true;
        } else {
          throw new Error(result.error);
        }
      } catch (errMail) {
        console.warn('Next.js reset email error:', errMail);
        throw new Error('Password berhasil direset, namun pengiriman email gagal: ' + errMail.message);
      }
    }

    return {
      new_password: generated,
      email_sent: emailSent,
      message: 'Password berhasil direset',
    };
  },

  sendAccessEmail: async (teacherOrId, password = '') => {
    let t = teacherOrId;
    if (typeof teacherOrId === 'string') {
      const teachers = await accountApiAdapter.getTeachers();
      t = teachers.find((item) => item.id === teacherOrId) || {};
    }

    if (!t || !t.email) {
      throw new Error('Alamat email guru tidak ditemukan.');
    }

    // 1. Try Go backend if available
    try {
      const res = await httpClient.post(`/accounts/${t.id || teacherOrId}/send-access-email`, {
        password,
      });
      if (res?.data) return res.data;
    } catch (e) {
      // Proceed to Next.js mailer
    }

    // 2. Call Next.js internal /api/email/send
    const resp = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: t.email,
        teacherName: t.full_name || t.fullName,
        username: t.username,
        password: password || 'Silakan hubungi Admin atau gunakan fitur lupa password',
        courseNames: t.course_names || t.courseNames || [],
        classCodes: t.class_codes || t.classCodes || [],
      }),
    });

    const result = await resp.json();
    if (!resp.ok || !result.success) {
      throw new Error(result.error || 'Gagal mengirim email melalui server SMTP.');
    }
    return result;
  },

  updateProfile: async (id, profileData) => {
    const payload = {
      username: profileData.username,
      old_password: profileData.old_password || profileData.oldPassword,
      new_password: profileData.new_password || profileData.newPassword,
      full_name: profileData.full_name || profileData.fullName,
      email: profileData.email,
      phone: profileData.phone,
      photo_url: profileData.photo_url || profileData.photoUrl,
    };

    try {
      const res = await httpClient.put(`/accounts/${id}/profile`, payload);
      return res.data;
    } catch (err) {
      return { ...payload, id };
    }
  },

  syncFromSSO: async () => {
    const res = await httpClient.post('/school/sync-sso');
    return res?.data || res;
  },
};
