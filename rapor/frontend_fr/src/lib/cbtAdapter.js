import { tokenStorage } from './common/tokenStorage';

function getCbtApiBases() {
  const bases = [];
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const host = window.location.hostname;

    // 1. Lewat reverse proxy Nginx pada domain e-Rapor saat ini
    bases.push(`${origin}/api/cbt`);

    // 2. Domain publik produksi LMS/CBT Belajar
    if (host.includes('spenspra.com')) {
      bases.push('https://belajar.spenspra.com/api');
    } else if (host.includes('spenspra.sch.id')) {
      bases.push('https://belajar.spenspra.sch.id/api');
    }

    // 3. Lingkungan pengembangan localhost
    if (host.includes('localhost') || host === '127.0.0.1') {
      bases.push('http://localhost:8084/api');
      bases.push('http://localhost:8080/api');
      bases.push('http://belajar.localhost/api');
      bases.push(`${origin}/api`);
    }
  }

  if (process.env.NEXT_PUBLIC_ELEARNING_API_URL) {
    bases.push(process.env.NEXT_PUBLIC_ELEARNING_API_URL);
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    bases.push(process.env.NEXT_PUBLIC_API_URL);
  }

  bases.push('http://localhost:8084/api');
  bases.push('http://localhost:8080/api');

  return [...new Set(bases.filter(Boolean))];
}

async function fetchCbtJson(endpoint, options = {}) {
  const currentUser = tokenStorage.getUser();
  const userId = currentUser?.id || currentUser?.nimNip || currentUser?.nip || currentUser?.username || '';
  const userRole = (currentUser?.role || currentUser?.roleName || currentUser?.role_name || 'GURU').toUpperCase();
  const userName = currentUser?.fullName || currentUser?.full_name || currentUser?.name || '';
  const token = tokenStorage.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(userId ? { 'X-User-Id': userId } : {}),
    ...(userRole ? { 'X-User-Role': userRole } : {}),
    ...(userName ? { 'X-User-Name': userName } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const candidateBases = getCbtApiBases();

  for (const base of candidateBases) {
    const url = `${base}${cleanEndpoint}`;
    try {
      const res = await fetch(url, { ...options, headers });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch (_) {
      // Coba base URL berikutnya
    }
  }

  return { success: false, error: 'Tidak dapat terhubung ke server CBT' };
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

function normalizeExamItem(e) {
  if (!e) return null;
  const rawDesc = String(e.rawDescription || e.description || '');
  const catTag = (rawDesc.match(/\[CAT:(SEMESTER_UAS|SEMESTER_UTS|TKA|REGULAR)\]/i) || [])[1];
  const explicitCat = String(catTag || e.examCategory || e.exam_category || '').toUpperCase();
  const isParallel = ['SEMESTER_UAS', 'SEMESTER_UTS', 'TKA'].includes(explicitCat) || Boolean(e.isCoordinatorExam) || Boolean(e.is_coordinator_exam) || Boolean(e.targetGradeLevel || e.target_grade_level);
  const resolvedCat = ['SEMESTER_UAS', 'SEMESTER_UTS', 'TKA', 'REGULAR'].includes(explicitCat)
    ? explicitCat
    : (isParallel ? 'SEMESTER_UAS' : 'REGULAR');
  return {
    ...e,
    id: String(e.id || ''),
    title: e.title || '',
    subject: e.subject || e.course_name || '',
    course_name: e.course_name || e.subject || '',
    subjectCode: e.subjectCode || e.course_id || 'MAPEL',
    course_id: e.course_id || e.subjectCode || 'MAPEL',
    className: e.className || e.class_code || '',
    class_code: e.class_code || e.className || '',
    examCategory: resolvedCat,
    exam_category: resolvedCat,
    isCoordinatorExam: isParallel,
    is_coordinator_exam: isParallel,
    targetGradeLevel: e.targetGradeLevel || e.target_grade_level || '',
    target_grade_level: e.target_grade_level || e.targetGradeLevel || '',
    targetClasses: Array.isArray(e.targetClasses) ? e.targetClasses : (Array.isArray(e.target_classes) ? e.target_classes : []),
    token: e.token || '',
    teacherName: e.teacherName || e.teacher_name || '',
  };
}

export const cbtAdapter = {
  // Ambil seluruh daftar ujian CBT (dari server backend + cache browser)
  getExams: async () => {
    const local1 = getLocal('spenspra_exams', []);
    const local2 = getLocal('spenspra_elearning_exams', []);
    const local3 = getLocal('exams', []);
    const localExams = [
      ...(Array.isArray(local1) ? local1 : []),
      ...(Array.isArray(local2) ? local2 : []),
      ...(Array.isArray(local3) ? local3 : []),
    ];

    try {
      const res = await fetchCbtJson('/exams?for_rapor=true');
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const map = new Map();
        localExams.forEach((e) => {
          const norm = normalizeExamItem(e);
          if (norm?.id) map.set(norm.id, norm);
        });
        res.data.forEach((e) => {
          const norm = normalizeExamItem(e);
          if (norm?.id) map.set(norm.id, { ...(map.get(norm.id) || {}), ...norm });
        });
        return Array.from(map.values());
      }
    } catch (_) {}

    return localExams.map(normalizeExamItem).filter(Boolean);
  },

  // Ambil sesi ujian CBT untuk mendapatkan skor siswa
  getExamSessions: async (examId) => {
    if (!examId) return [];
    const monitorKey = `proctoring_${examId}`;
    const local1 = getLocal(monitorKey, []);
    const local2 = getLocal(`spenspra_elearning_${monitorKey}`, []);
    const localSessions = [
      ...(Array.isArray(local1) ? local1 : []),
      ...(Array.isArray(local2) ? local2 : []),
    ];

    let serverSessions = [];
    try {
      const res = await fetchCbtJson(`/exams/${examId}/monitoring?for_rapor=true`);
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
        if (k && (k.startsWith(`exam_session_${examId}_`) || k.startsWith(`spenspra_elearning_exam_session_${examId}_`))) {
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
