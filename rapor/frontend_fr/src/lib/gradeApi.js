import { tokenStorage } from './common/tokenStorage';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const currentUser = tokenStorage.getUser();
  const userId = currentUser?.id || 'acc-1791387328545';
  const token = tokenStorage.getToken();

  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json();
    if (!res.ok) {
      console.warn(`[Grade API] ${options.method || 'GET'} ${url} returned status ${res.status}:`, json?.error?.message || json?.error || json);
    }
    return json;
  } catch (err) {
    console.warn(`[Grade API] Endpoint ${url} offline / unreachable:`, err.message);
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: err.message },
    };
  }
}

export const gradeApi = {
  getGrades: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.className) query.set('class_name', params.className);
    if (params.subjectCode) query.set('subject_code', params.subjectCode);
    if (params.assessmentType) query.set('assessment_type', params.assessmentType);
    if (params.academicYear) query.set('academic_year', params.academicYear);
    if (params.semester) query.set('semester', params.semester);
    const qs = query.toString();
    return fetchJson(`/grades${qs ? `?${qs}` : ''}`);
  },

  saveBulkGrades: async (payload) => {
    return fetchJson('/grades/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMonitoringSummary: async (kkm) => {
    const qs = kkm ? `?kkm=${encodeURIComponent(kkm)}` : '';
    return fetchJson(`/monitoring/summary${qs}`);
  },

  // Kunci Nilai
  getGradeLocks: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.className) query.set('class_name', params.className);
    if (params.subjectCode) query.set('subject_code', params.subjectCode);
    if (params.assessmentType) query.set('assessment_type', params.assessmentType);
    if (params.academicYear) query.set('academic_year', params.academicYear);
    if (params.semester) query.set('semester', params.semester);
    const qs = query.toString();
    return fetchJson(`/grades/locks${qs ? `?${qs}` : ''}`);
  },

  setGradeLock: async (payload) => {
    return fetchJson('/grades/locks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Log Perubahan Nilai
  getGradeLogs: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.studentId) query.set('student_id', params.studentId);
    if (params.className) query.set('class_name', params.className);
    if (params.subjectCode) query.set('subject_code', params.subjectCode);
    if (params.assessmentType) query.set('assessment_type', params.assessmentType);
    if (params.academicYear) query.set('academic_year', params.academicYear);
    if (params.semester) query.set('semester', params.semester);
    const qs = query.toString();
    return fetchJson(`/grades/logs${qs ? `?${qs}` : ''}`);
  },

  // Pengesahan Rapor Kepala Sekolah
  getEndorsements: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.academicYear) query.set('academic_year', params.academicYear);
    if (params.semester) query.set('semester', params.semester);
    const qs = query.toString();
    return fetchJson(`/endorsements${qs ? `?${qs}` : ''}`);
  },

  saveEndorsement: async (payload) => {
    return fetchJson('/endorsements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Rekap Kehadiran Rapor
  getRaporAttendances: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.className) query.set('class_name', params.className);
    if (params.academicYear) query.set('academic_year', params.academicYear);
    if (params.semester) query.set('semester', params.semester);
    const qs = query.toString();
    return fetchJson(`/grades/attendance${qs ? `?${qs}` : ''}`);
  },

  saveRaporAttendances: async (payload) => {
    return fetchJson('/grades/attendance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },


  // Backup & Restore
  exportBackup: async () => {
    return fetchJson('/backup');
  },

  restoreBackup: async (payload) => {
    return fetchJson('/restore', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteGrades: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.className) query.set('class_name', params.className);
    if (params.subjectCode) query.set('subject_code', params.subjectCode);
    if (params.teacherId) query.set('teacher_id', params.teacherId);
    if (params.assessmentType) query.set('assessment_type', params.assessmentType);
    if (params.academicYear) query.set('academic_year', params.academicYear);
    if (params.semester) query.set('semester', params.semester);
    if (params.all) query.set('all', 'true');
    const qs = query.toString();
    return fetchJson(`/grades${qs ? `?${qs}` : ''}`, {
      method: 'DELETE',
    });
  },
};
