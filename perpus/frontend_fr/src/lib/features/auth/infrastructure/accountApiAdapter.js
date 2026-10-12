import { httpClient } from '@/lib/common/httpClient';

const MALE_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%231A3D63"/><circle cx="50" cy="38" r="20" fill="%23B3CFE5"/><path d="M20,85 C20,62 33,55 50,55 C67,55 80,62 80,85 Z" fill="%23B3CFE5"/></svg>`;
const FEMALE_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%234A7FA7"/><circle cx="50" cy="38" r="18" fill="%23F6FAFD"/><path d="M15,85 C15,60 30,52 50,52 C70,52 85,60 85,85 Z" fill="%23F6FAFD"/></svg>`;

const DEFAULT_TEACHERS = [
  {
    id: 'tch-01',
    full_name: 'Dra. Siti Aminah, M.Pd',
    nim_nip: '198203152008012004',
    username: 'guru_aminah',
    email: 'aminah@smpn1prambon.sch.id',
    phone: '081234567891',
    photo_url: FEMALE_AVATAR,
    course_ids: ['crs-inf', 'crs-ipa'],
    course_names: ['Informatika & Komputer', 'IPA (Ilmu Pengetahuan Alam)'],
    class_ids: ['class-7a', 'class-7b'],
    class_codes: ['VII-A', 'VII-B'],
  },
  {
    id: 'tch-02',
    full_name: 'Budi Santoso, S.Pd',
    nim_nip: '198503122010121001',
    username: 'guru_budi',
    email: 'budi@smpn1prambon.sch.id',
    phone: '081234567892',
    photo_url: MALE_AVATAR,
    course_ids: ['crs-mtk'],
    course_names: ['Matematika Terpadu'],
    class_ids: ['class-8a'],
    class_codes: ['VIII-A'],
  },
];

const DEFAULT_STUDENTS = [
  {
    id: 'std-01',
    full_name: 'Ahmad Rizky Pratama',
    nisn: '0081234567',
    parent_phone: '0812987654321',
    address: 'Jl. Raya Prambon No. 12, Sidoarjo',
    photo_url: MALE_AVATAR,
    has_face: true,
  },
  {
    id: 'std-02',
    full_name: 'Siti Nurhaliza',
    nisn: '0081234568',
    parent_phone: '0812987654322',
    address: 'Krian, Sidoarjo',
    photo_url: FEMALE_AVATAR,
    has_face: true,
  },
];

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
      const res = await httpClient.get('/accounts?role=GURU');
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
      const resDosen = await httpClient.get('/accounts?role=DOSEN');
      if (Array.isArray(resDosen.data) && resDosen.data.length > 0) {
        return resDosen.data;
      }
    } catch {}
    return getLocalTeachers();
  },

  getStudents: async () => {
    try {
      const res = await httpClient.get('/accounts?role=SISWA');
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
      const resMhs = await httpClient.get('/accounts?role=MAHASISWA');
      if (Array.isArray(resMhs.data) && resMhs.data.length > 0) {
        return resMhs.data;
      }
    } catch {}
    return getLocalStudents();
  },

  create: async (accountData) => {
    const isTeacher = accountData.role_id === 'role-guru' || accountData.role_id === 'GURU';

    const payload = {
      ...accountData,
      id: accountData.id || (isTeacher ? `tch-${Date.now()}` : `std-${Date.now()}`),
      full_name: accountData.full_name || accountData.fullName,
      nim_nip: accountData.nim_nip || accountData.nip,
      class_name: accountData.class_name || accountData.className || '',
      course_ids: accountData.course_ids || accountData.selectedCourses || [],
      class_ids: accountData.class_ids || accountData.selectedClasses || [],
      course_names: accountData.course_names || [],
      class_codes: accountData.class_codes || [],
      photo_url: accountData.photo_url || accountData.photoUrl || (isTeacher ? MALE_AVATAR : MALE_AVATAR),
    };

    if (isTeacher) {
      const currentTeachers = getLocalTeachers();
      const updated = [payload, ...currentTeachers.filter((t) => t.id !== payload.id)];
      saveLocalTeachers(updated);
    } else {
      const currentStudents = getLocalStudents();
      const updated = [payload, ...currentStudents.filter((s) => s.id !== payload.id)];
      saveLocalStudents(updated);
    }

    try {
      const res = await httpClient.post('/accounts', payload);
      return res.data || payload;
    } catch {
      return payload;
    }
  },

  update: async (id, accountData) => {
    const isTeacher = accountData.role_id === 'role-guru' || accountData.role_id === 'GURU';

    const payload = {
      ...accountData,
      id,
      full_name: accountData.full_name || accountData.fullName,
      nim_nip: accountData.nim_nip || accountData.nip,
      class_name: accountData.class_name || accountData.className || '',
      course_ids: accountData.course_ids || accountData.selectedCourses || [],
      class_ids: accountData.class_ids || accountData.selectedClasses || [],
    };

    // Update in local teachers
    const currentTeachers = getLocalTeachers();
    const updatedTeachers = currentTeachers.map((t) =>
      t.id === id ? { ...t, ...payload } : t
    );
    saveLocalTeachers(updatedTeachers);

    // Update in local students
    const currentStudents = getLocalStudents();
    const updatedStudents = currentStudents.map((s) =>
      s.id === id ? { ...s, ...payload } : s
    );
    saveLocalStudents(updatedStudents);

    try {
      const res = await httpClient.put(`/accounts/${id}`, payload);
      return res.data || { ...payload, id };
    } catch {
      return { ...payload, id };
    }
  },

  delete: async (id) => {
    const currentTeachers = getLocalTeachers();
    saveLocalTeachers(currentTeachers.filter((t) => t.id !== id));

    const currentStudents = getLocalStudents();
    saveLocalStudents(currentStudents.filter((s) => s.id !== id));

    try {
      const res = await httpClient.delete(`/accounts/${id}`);
      return res.data;
    } catch {
      return { success: true };
    }
  },

  resetPassword: async (teacherOrId, { newPassword = '', sendEmail = true } = {}) => {
    let t = teacherOrId;
    if (typeof teacherOrId === 'string') {
      const teachers = await accountApiAdapter.getTeachers();
      t = teachers.find((item) => item.id === teacherOrId) || {};
    }

    const generated = newPassword || `Guru#${Math.random().toString(36).substring(2, 8)}`;

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
};
