import { tokenStorage } from './common/tokenStorage';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const token = tokenStorage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  try {
    const res = await fetch(url, { ...options, headers });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getLocal(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export const cbtAdapter = {
  // Ambil seluruh daftar ujian CBT (dari server backend + cache browser)
  getExams: async () => {
    const localExams = getLocal('spenspra_exams', []);
    try {
      const res = await fetchJson('/exams');
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const map = new Map();
        localExams.forEach((e) => map.set(e.id, e));
        res.data.forEach((e) => map.set(e.id, { ...(map.get(e.id) || {}), ...e }));
        return Array.from(map.values());
      }
    } catch (_) {}
    return localExams;
  },

  // Ambil sesi ujian CBT untuk mendapatkan skor siswa
  getExamSessions: async (examId) => {
    if (!examId) return [];
    const monitorKey = `proctoring_${examId}`;
    const localSessions = getLocal(monitorKey, []);

    let serverSessions = [];
    try {
      const res = await fetchJson(`/exams/${examId}/monitoring`);
      if (res?.success && res?.data) {
        if (Array.isArray(res.data)) serverSessions = res.data;
        else if (Array.isArray(res.data.sessions)) serverSessions = res.data.sessions;
      }
    } catch (_) {}

    const map = new Map();
    localSessions.forEach((s) => {
      const key = String(s.sessionId || s.studentId || s.id || '');
      if (key) map.set(key, s);
    });
    serverSessions.forEach((s) => {
      const key = String(s.sessionId || s.studentId || s.id || '');
      if (key) map.set(key, { ...(map.get(key) || {}), ...s });
    });

    // Check individual student storage keys exam_session_${examId}_*
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`exam_session_${examId}_`)) {
          try {
            const sess = JSON.parse(localStorage.getItem(k));
            if (sess) {
              const sKey = String(sess.studentId || sess.student_id || sess.sessionId || '');
              if (sKey && !map.has(sKey)) {
                map.set(sKey, sess);
              }
            }
          } catch (_) {}
        }
      }
    }

    return Array.from(map.values());
  },
};
