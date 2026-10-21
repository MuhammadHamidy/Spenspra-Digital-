import { tokenStorage } from './common/tokenStorage';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const currentUser = tokenStorage.getUser();
  const userId = currentUser?.id || 'user-elearning-default';
  const token = tokenStorage.getToken();

  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errJson.error || { code: res.status, message: res.statusText },
      };
    }
    const json = await res.json();
    return json;
  } catch (err) {
    console.warn(`[E-Learning API] Endpoint ${url} fallback:`, err.message);
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: err.message },
    };
  }
}

const INITIAL_MATERIALS = [];

const INITIAL_ASSIGNMENTS = [];

const INITIAL_EXAMS = [];

const INITIAL_QUESTIONS = {};

export const OFFICIAL_SUBJECTS = [
  { id: 'crs-mtk', code: 'MAT', name: 'Matematika', category: 'Umum', color: 'indigo', icon: '📐', description: 'Pembelajaran Matematika Kurikulum Merdeka' },
  { id: 'crs-bin', code: 'BIN', name: 'Bahasa Indonesia', category: 'Umum', color: 'emerald', icon: '📖', description: 'Literasi dan Bahasa Indonesia' },
  { id: 'crs-ipa', code: 'IPA', name: 'Ilmu Pengetahuan Alam', category: 'Umum', color: 'teal', icon: '🔬', description: 'Eksperimen & Pengetahuan Alam Terpadu' },
  { id: 'crs-ips', code: 'IPS', name: 'Ilmu Pengetahuan Sosial', category: 'Umum', color: 'amber', icon: '🌍', description: 'Studi Sosial, Geografi, dan Sejarah' },
  { id: 'crs-big', code: 'BIG', name: 'Bahasa Inggris', category: 'Umum', color: 'purple', icon: '💬', description: 'English Communication & Literacy' },
  { id: 'crs-pp',  code: 'PP',  name: 'Pendidikan Pancasila', category: 'Umum', color: 'rose', icon: '🏛️', description: 'Pendidikan Pancasila dan Kewarganegaraan' },
  { id: 'crs-inf', code: 'INF', name: 'Informatika', category: 'Umum', color: 'sky', icon: '💻', description: 'Teknologi Informasi & Berpikir Komputasional' },
  { id: 'crs-pai', code: 'PAI', name: 'Pendidikan Agama Islam', category: 'Umum', color: 'green', icon: '🕌', description: 'Pendidikan Agama Islam dan Budi Pekerti' },
  { id: 'crs-pjok', code: 'PJOK', name: 'Pendidikan Jasmani', category: 'Umum', color: 'orange', icon: '⚽', description: 'Olahraga, Kebugaran Jasmani, dan Kesehatan' },
  { id: 'crs-sbd', code: 'SBP', name: 'Seni Budaya & Prakarya', category: 'Umum', color: 'pink', icon: '🎨', description: 'Seni Rupa, Musik, Tari, dan Kriya Prakarya' },
  { id: 'crs-bj',  code: 'BJ',  name: 'Bahasa Jawa', category: 'Muatan Lokal', color: 'yellow', icon: '📜', description: 'Muatan Lokal Bahasa dan Sastra Jawa' },
  { id: 'crs-btq', code: 'BTQ', name: 'Baca Tulis Al-Qur\'an', category: 'Muatan Lokal', color: 'cyan', icon: '✨', description: 'Muatan Lokal BTQ & Keagamaan' },
];

// Filter to completely purge any legacy dummy or demo items from client localStorage
const DUMMY_IDS = new Set([
  'mat-001', 'mat-002', 'mat-003', 'mat-004',
  'tug-001', 'tug-002', 'tug-003',
  'cbt-001', 'cbt-002', 'cbt-003',
  'q-101', 'q-102', 'q-103', 'q-104', 'q-105', 'q-106', 'q-201', 'q-202',
  'ses-101', 'ses-102', 'ses-103', 'ses-104'
]);

// Local storage key helpers for seamless client offline/preview
function getLocal(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(`spenspra_elearning_${key}`);
    if (!data) return fallback;
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter((item) => !DUMMY_IDS.has(item?.id) && !DUMMY_IDS.has(item?.sessionId));
      if (filtered.length !== parsed.length) {
        localStorage.setItem(`spenspra_elearning_${key}`, JSON.stringify(filtered));
      }
      return filtered;
    }
    if (parsed && typeof parsed === 'object') {
      let changed = false;
      const clean = { ...parsed };
      for (const k of Object.keys(clean)) {
        if (DUMMY_IDS.has(k)) {
          delete clean[k];
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(`spenspra_elearning_${key}`, JSON.stringify(clean));
      }
      return clean;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function setLocal(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`spenspra_elearning_${key}`, JSON.stringify(value));
  } catch {}
}

export const elearningApi = {
  // =================== MATERI ===================
  getMaterials: async (params = {}) => {
    const res = await fetchJson('/materials');
    if (res.success && res.data) return res.data;
    const local = getLocal('materials', INITIAL_MATERIALS);
    if (params.className) {
      return local.filter((m) => !m.className || m.className === params.className);
    }
    return local;
  },

  getMaterialById: async (id) => {
    const res = await fetchJson(`/materials/${id}`);
    if (res.success && res.data) return res.data;
    const local = getLocal('materials', INITIAL_MATERIALS);
    return local.find((m) => m.id === id) || null;
  },

  createMaterial: async (payload) => {
    const res = await fetchJson('/materials', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const local = getLocal('materials', INITIAL_MATERIALS);
    const newMaterial = {
      id: `mat-${Date.now()}`,
      createdAt: new Date().toISOString(),
      viewsCount: 0,
      ...payload,
    };
    setLocal('materials', [newMaterial, ...local]);
    return res.success ? res.data : newMaterial;
  },

  deleteMaterial: async (id) => {
    await fetchJson(`/materials/${id}`, { method: 'DELETE' });
    const local = getLocal('materials', INITIAL_MATERIALS);
    setLocal('materials', local.filter((m) => m.id !== id));
    return true;
  },

  // =================== TUGAS ===================
  getAssignments: async (params = {}) => {
    const res = await fetchJson('/assignments');
    if (res.success && res.data) return res.data;
    const local = getLocal('assignments', INITIAL_ASSIGNMENTS);
    if (params.className) {
      return local.filter((t) => !t.className || t.className === params.className);
    }
    return local;
  },

  getAssignmentById: async (id) => {
    const res = await fetchJson(`/assignments/${id}`);
    if (res.success && res.data) return res.data;
    const local = getLocal('assignments', INITIAL_ASSIGNMENTS);
    return local.find((t) => t.id === id) || null;
  },

  createAssignment: async (payload) => {
    const res = await fetchJson('/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const local = getLocal('assignments', INITIAL_ASSIGNMENTS);
    const newAssignment = {
      id: `tug-${Date.now()}`,
      createdAt: new Date().toISOString(),
      submittedCount: 0,
      status: 'ACTIVE',
      ...payload,
    };
    setLocal('assignments', [newAssignment, ...local]);
    return res.success ? res.data : newAssignment;
  },

  submitAssignment: async (assignmentId, payload) => {
    const res = await fetchJson(`/assignments/${assignmentId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const key = `submissions_${assignmentId}`;
    const localSubmissions = getLocal(key, []);
    const submission = {
      id: `sub-${Date.now()}`,
      assignmentId,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
      ...payload,
    };
    setLocal(key, [submission, ...localSubmissions]);
    return res.success ? res.data : submission;
  },

  getSubmissions: async (assignmentId) => {
    const res = await fetchJson(`/assignments/${assignmentId}/submissions`);
    if (res.success && res.data && res.data.length > 0) return res.data;
    const key = `submissions_${assignmentId}`;
    return getLocal(key, []);
  },

  gradeSubmission: async (submissionId, score, feedback) => {
    const res = await fetchJson(`/submissions/${submissionId}/grade`, {
      method: 'PUT',
      body: JSON.stringify({ score, feedback }),
    });
    return res.success;
  },

  getStudentSubmission: async (assignmentId, studentId) => {
    const key = `submissions_${assignmentId}`;
    const localSubmissions = getLocal(key, []);
    return localSubmissions.find((s) => s.studentId === studentId) || null;
  },

  // =================== CBT E-UJIAN ===================
  getExams: async (params = {}) => {
    const res = await fetchJson('/exams');
    if (res.success && res.data) return res.data;
    const local = getLocal('exams', INITIAL_EXAMS);
    if (params.className) {
      return local.filter((e) => !e.className || e.className === params.className);
    }
    return local;
  },

  getExamById: async (id) => {
    const res = await fetchJson(`/exams/${id}`);
    if (res.success && res.data) return res.data;
    const local = getLocal('exams', INITIAL_EXAMS);
    return local.find((e) => e.id === id) || null;
  },

  createExam: async (payload) => {
    const res = await fetchJson('/exams', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const local = getLocal('exams', INITIAL_EXAMS);
    const newExam = {
      id: `cbt-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      isActive: true,
      ...payload,
    };
    setLocal('exams', [newExam, ...local]);
    return res.success ? res.data : newExam;
  },

  getExamQuestions: async (examId) => {
    const res = await fetchJson(`/exams/${examId}/questions`);
    if (res.success && res.data) return res.data;
    const allQuestions = getLocal('questions', INITIAL_QUESTIONS);
    return allQuestions[examId] || [];
  },

  saveExamQuestions: async (examId, questions) => {
    const allQuestions = getLocal('questions', INITIAL_QUESTIONS);
    allQuestions[examId] = questions;
    setLocal('questions', allQuestions);

    const exams = getLocal('exams', INITIAL_EXAMS);
    const idx = exams.findIndex((e) => e.id === examId);
    if (idx >= 0) {
      exams[idx].totalQuestions = questions.length;
      setLocal('exams', exams);
    }

    fetchJson(`/exams/${examId}/questions`, {
      method: 'PUT',
      body: JSON.stringify({ questions }),
    }).catch(() => {});

    return questions;
  },

  // =================== MATA PELAJARAN (SUBJECTS) ===================
  getSubjects: async () => {
    const res = await fetchJson('/school/courses').catch(() => null);
    const backendCourses = (res && res.success && Array.isArray(res.data)) ? res.data : [];
    const customSubjects = getLocal('custom_subjects', []);

    const mergedMap = new Map();
    OFFICIAL_SUBJECTS.forEach((s) => mergedMap.set(s.code.toUpperCase(), { ...s }));

    backendCourses.forEach((c) => {
      const code = (c.code || c.id || '').toUpperCase();
      if (code) {
        mergedMap.set(code, {
          id: c.id || `crs-${code.toLowerCase()}`,
          code: c.code || code,
          name: c.name || c.title || code,
          category: c.category || 'Umum',
          color: c.color || 'indigo',
          icon: c.icon || '📚',
          description: c.description || `Mata Pelajaran ${c.name || code}`,
        });
      }
    });

    customSubjects.forEach((c) => {
      const code = (c.code || c.id || '').toUpperCase();
      if (code) {
        mergedMap.set(code, {
          ...c,
          code,
        });
      }
    });

    return Array.from(mergedMap.values());
  },

  createSubject: async (payload) => {
    const list = getLocal('custom_subjects', []);
    const newSubject = {
      id: `crs-${Date.now()}`,
      code: (payload.code || 'MAPEL').toUpperCase(),
      name: payload.name || 'Mata Pelajaran Baru',
      category: payload.category || 'Umum',
      color: payload.color || 'indigo',
      icon: payload.icon || '📚',
      description: payload.description || '',
      ...payload,
    };
    setLocal('custom_subjects', [...list, newSubject]);
    return newSubject;
  },

  startExamSession: async (examId, token, student) => {
    const exam = await elearningApi.getExamById(examId);
    if (!exam) throw new Error('Ujian tidak ditemukan!');
    if (exam.token && exam.token.toUpperCase() !== token.trim().toUpperCase()) {
      throw new Error('Token ujian tidak valid! Periksa token yang diberikan pengawas.');
    }

    const sessionKey = `exam_session_${examId}_${student?.id || 'demo'}`;
    let existing = getLocal(sessionKey, null);
    if (existing && existing.status !== 'SUBMITTED') {
      return existing;
    }

    const newSession = {
      sessionId: `ses-${Date.now()}`,
      examId,
      studentId: student?.id || 'std-demo',
      studentName: student?.fullName || student?.full_name || 'Siswa Spenspra',
      className: student?.className || exam.className || '7A',
      startTime: new Date().toISOString(),
      durationSeconds: (exam.durationMinutes || 60) * 60,
      remainingSeconds: (exam.durationMinutes || 60) * 60,
      maxViolations: exam.maxViolations || 3,
      violationsCount: 0,
      violations: [],
      answers: {},
      doubtfuls: {},
      status: 'IN_PROGRESS', // IN_PROGRESS | LOCKED | SUBMITTED
    };

    setLocal(sessionKey, newSession);
    return newSession;
  },

  saveAnswer: async (sessionId, examId, studentId, questionId, selectedOption, essayAnswer = '', isDoubtful = false) => {
    const sessionKey = `exam_session_${examId}_${studentId || 'demo'}`;
    const session = getLocal(sessionKey, null);
    if (!session) return;

    session.answers[questionId] = {
      selectedOption,
      essayAnswer,
      isDoubtful,
      updatedAt: new Date().toISOString(),
    };
    session.doubtfuls[questionId] = isDoubtful;
    setLocal(sessionKey, session);

    // Call backend async
    fetchJson(`/sessions/${sessionId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ questionId, selectedOption, essayAnswer, isDoubtful }),
    }).catch(() => {});
  },

  recordViolationLog: async (sessionId, examId, studentId, violation) => {
    const sessionKey = `exam_session_${examId}_${studentId || 'demo'}`;
    const session = getLocal(sessionKey, null);
    if (!session) return;

    session.violationsCount = (session.violationsCount || 0) + 1;
    session.violations.push({
      id: `viol-${Date.now()}`,
      type: violation.type,
      description: violation.description,
      timestamp: violation.timestamp || new Date().toISOString(),
    });

    if (session.violationsCount >= (session.maxViolations || 3)) {
      session.status = 'LOCKED';
    }

    setLocal(sessionKey, session);

    // Sync to teacher live monitoring store
    const monitorKey = `proctoring_${examId}`;
    const liveSessions = getLocal(monitorKey, []);
    const idx = liveSessions.findIndex((s) => s.sessionId === sessionId);
    if (idx >= 0) {
      liveSessions[idx] = session;
    } else {
      liveSessions.push(session);
    }
    setLocal(monitorKey, liveSessions);

    // Call backend async
    fetchJson(`/sessions/${sessionId}/violations`, {
      method: 'POST',
      body: JSON.stringify(violation),
    }).catch(() => {});

    return session;
  },

  finishExamSession: async (sessionId, examId, studentId) => {
    const sessionKey = `exam_session_${examId}_${studentId || 'demo'}`;
    const session = getLocal(sessionKey, null);
    if (!session) return;

    // Hitung skor otomatis untuk PG
    const questions = await elearningApi.getExamQuestions(examId);
    let correctCount = 0;
    let totalMcq = 0;

    questions.forEach((q) => {
      if (q.type === 'MCQ') {
        totalMcq += 1;
        const answer = session.answers[q.id];
        if (answer && answer.selectedOption === q.correctOption) {
          correctCount += 1;
        }
      }
    });

    const score = totalMcq > 0 ? Math.round((correctCount / totalMcq) * 100) : 100;

    session.status = 'SUBMITTED';
    session.submittedAt = new Date().toISOString();
    session.score = score;
    session.correctCount = correctCount;
    session.totalMcq = totalMcq;

    setLocal(sessionKey, session);

    // Update teacher monitor
    const monitorKey = `proctoring_${examId}`;
    const liveSessions = getLocal(monitorKey, []);
    const idx = liveSessions.findIndex((s) => s.sessionId === sessionId);
    if (idx >= 0) {
      liveSessions[idx] = session;
      setLocal(monitorKey, liveSessions);
    }

    return session;
  },

  // =================== PROCTORING MONITOR (GURU) ===================
  getLiveProctoringData: async (examId) => {
    const res = await fetchJson(`/exams/${examId}/monitoring`);
    if (res.success && res.data) return res.data;
    const monitorKey = `proctoring_${examId}`;
    const list = getLocal(monitorKey, []);
    return list;
  },

  unlockStudentSession: async (examId, sessionId) => {
    const monitorKey = `proctoring_${examId}`;
    const liveSessions = getLocal(monitorKey, []);
    const idx = liveSessions.findIndex((s) => s.sessionId === sessionId);
    if (idx >= 0) {
      liveSessions[idx].status = 'IN_PROGRESS';
      liveSessions[idx].violationsCount = Math.max(0, (liveSessions[idx].violationsCount || 3) - 1); // Berikan dispensasi 1 toleransi
      setLocal(monitorKey, liveSessions);

      // Also update student session key
      const studentId = liveSessions[idx].studentId;
      const sessionKey = `exam_session_${examId}_${studentId}`;
      const session = getLocal(sessionKey, null);
      if (session) {
        session.status = 'IN_PROGRESS';
        session.violationsCount = liveSessions[idx].violationsCount;
        setLocal(sessionKey, session);
      }
    }

    await fetchJson(`/sessions/${sessionId}/unlock`, { method: 'POST' }).catch(() => {});
    return true;
  },
};
