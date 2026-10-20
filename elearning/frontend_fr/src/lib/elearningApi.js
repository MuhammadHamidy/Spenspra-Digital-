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

// Fallback initial seeds for preview / initial state
const INITIAL_MATERIALS = [
  {
    id: 'mat-001',
    title: 'Bab 1: Bilangan Bulat dan Pecahan',
    subject: 'Matematika',
    subjectCode: 'MTK',
    className: '7A',
    teacherName: 'Budi Santoso, S.Pd.',
    type: 'PDF',
    description: 'Modul komprehensif operasi hitung bilangan bulat positif, negatif, dan pecahan serta sifat-sifat komutatif dan distributif.',
    fileUrl: '/docs/modul-matematika-bab1.pdf',
    fileName: 'Modul_Bilangan_Bulat_7A.pdf',
    fileSize: '2.4 MB',
    createdAt: '2026-10-15T08:00:00Z',
    viewsCount: 42,
  },
  {
    id: 'mat-002',
    title: 'Teks Deskripsi dan Kaidah Kebahasaan',
    subject: 'Bahasa Indonesia',
    subjectCode: 'BIN',
    className: '7A',
    teacherName: 'Siti Rahmawati, M.Pd.',
    type: 'VIDEO',
    description: 'Video penjelasan struktur teks deskripsi, identifikasi objek, majas personifikasi, dan contoh penulisan deskripsi alam.',
    fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    createdAt: '2026-10-16T09:30:00Z',
    viewsCount: 38,
  },
  {
    id: 'mat-003',
    title: 'Sistem Klasifikasi Makhluk Hidup 5 Kingdom',
    subject: 'Ilmu Pengetahuan Alam',
    subjectCode: 'IPA',
    className: '7A',
    teacherName: 'Dra. Endang Wulandari',
    type: 'SLIDE',
    description: 'Slide presentasi pengelompokan Monera, Protista, Fungi, Plantae, dan Animalia beserta ciri khas mikroskopisnya.',
    fileUrl: '/docs/ipa-klasifikasi-makhluk-hidup.pptx',
    fileName: 'Slide_Klasifikasi_Makhluk_Hidup.pptx',
    fileSize: '5.1 MB',
    createdAt: '2026-10-18T10:15:00Z',
    viewsCount: 29,
  },
  {
    id: 'mat-004',
    title: 'Grammar Focus: Simple Present Tense & Daily Routine',
    subject: 'Bahasa Inggris',
    subjectCode: 'BIG',
    className: '7A',
    teacherName: 'Ahmad Fauzi, S.Pd.',
    type: 'PDF',
    description: 'Rangkuman pola kalimat verbal dan nominal, time signals, latihan soal dialog deskripsi rutinitas sehari-hari.',
    fileUrl: '/docs/english-simple-present.pdf',
    fileName: 'English_Simple_Present_Tense.pdf',
    fileSize: '1.8 MB',
    createdAt: '2026-10-19T07:45:00Z',
    viewsCount: 51,
  },
];

const INITIAL_ASSIGNMENTS = [
  {
    id: 'tug-001',
    title: 'Latihan Operasi Campuran Bilangan Bulat',
    subject: 'Matematika',
    subjectCode: 'MTK',
    className: '7A',
    teacherName: 'Budi Santoso, S.Pd.',
    dueDate: '2026-10-25T23:59:00Z',
    maxScore: 100,
    description: 'Kerjakan 10 soal uraian pada lembar kerja terlampir. Tuliskan langkah pengerjaan dengan rapi, foto/scan ke format PDF, lalu unggah ke sistem.',
    attachmentUrl: '/docs/tugas-matematika-bilangan.pdf',
    attachmentName: 'Lembar_Kerja_Operasi_Bilangan.pdf',
    totalStudents: 32,
    submittedCount: 24,
    status: 'ACTIVE',
  },
  {
    id: 'tug-002',
    title: 'Menulis Teks Deskripsi Objek Wisata Lokal',
    subject: 'Bahasa Indonesia',
    subjectCode: 'BIN',
    className: '7A',
    teacherName: 'Siti Rahmawati, M.Pd.',
    dueDate: '2026-10-23T15:00:00Z',
    maxScore: 100,
    description: 'Tuliskan teks deskripsi minimal 3 paragraf mengenai tempat wisata atau tempat bersejarah di sekitar wilayah Prambon/Nganjuk/Jawa Timur.',
    attachmentUrl: null,
    totalStudents: 32,
    submittedCount: 28,
    status: 'ACTIVE',
  },
  {
    id: 'tug-003',
    title: 'Laporan Pengamatan Struktur Daun & Sel',
    subject: 'Ilmu Pengetahuan Alam',
    subjectCode: 'IPA',
    className: '7A',
    teacherName: 'Dra. Endang Wulandari',
    dueDate: '2026-10-18T23:59:00Z',
    maxScore: 100,
    description: 'Unggah hasil foto mikroskop dan analisis perbedaan sel stomata pada daun monokotil dan dikotil.',
    attachmentUrl: null,
    totalStudents: 32,
    submittedCount: 31,
    status: 'COMPLETED',
  },
];

const INITIAL_EXAMS = [
  {
    id: 'cbt-001',
    title: 'Penilaian Tengah Semester (PTS) Matematika 7',
    subject: 'Matematika',
    subjectCode: 'MTK',
    className: '7A',
    teacherName: 'Budi Santoso, S.Pd.',
    token: 'MAT7A1',
    durationMinutes: 60,
    totalQuestions: 15,
    maxViolations: 3,
    startTime: '2026-10-20T07:30:00Z',
    endTime: '2026-10-25T16:00:00Z',
    isActive: true,
    status: 'ACTIVE',
    description: 'Ujian e-Learning berbasis CBT dengan pengawasan Anti-Cheat proctoring terintegrasi. Buka tab baru atau keluar jendela browser akan dicatat otomatis sebagai pelanggaran!',
  },
  {
    id: 'cbt-002',
    title: 'Kuis Terjadwal: Klasifikasi Makhluk Hidup',
    subject: 'Ilmu Pengetahuan Alam',
    subjectCode: 'IPA',
    className: '7A',
    teacherName: 'Dra. Endang Wulandari',
    token: 'IPA7A2',
    durationMinutes: 45,
    totalQuestions: 10,
    maxViolations: 2,
    startTime: '2026-10-21T08:00:00Z',
    endTime: '2026-10-26T17:00:00Z',
    isActive: true,
    status: 'ACTIVE',
    description: 'Kuis pemahaman materi ciri dan taksonomi makhluk hidup. Dilarang berpindah aplikasi saat pengerjaan berlangsung.',
  },
  {
    id: 'cbt-003',
    title: 'Simulasi CBT Ujian Sekolah Bahasa Inggris',
    subject: 'Bahasa Inggris',
    subjectCode: 'BIG',
    className: '7A',
    teacherName: 'Ahmad Fauzi, S.Pd.',
    token: 'BIGSIM',
    durationMinutes: 30,
    totalQuestions: 10,
    maxViolations: 3,
    startTime: '2026-10-22T08:00:00Z',
    endTime: '2026-10-28T18:00:00Z',
    isActive: true,
    status: 'UPCOMING',
    description: 'Simulasi ujian digital untuk latihan navigasi soal, ragu-ragu, dan ketahanan sistem proteksi layar ujian.',
  },
];

const INITIAL_QUESTIONS = {
  'cbt-001': [
    {
      id: 'q-101',
      questionNumber: 1,
      type: 'MCQ',
      questionText: 'Hasil dari operasi hitung (-12) + 25 - (-8) adalah ...',
      options: [
        { key: 'A', text: '5' },
        { key: 'B', text: '21' },
        { key: 'C', text: '29' },
        { key: 'D', text: '45' },
      ],
      correctOption: 'C',
    },
    {
      id: 'q-102',
      questionNumber: 2,
      type: 'MCQ',
      questionText: 'Suhu di dalam lemari es mula-mula adalah -4°C. Ketika listrik padam selama 3 jam, suhu naik sebesar 2°C setiap 30 menit. Suhu lemari es saat listrik menyala kembali adalah ...',
      options: [
        { key: 'A', text: '8°C' },
        { key: 'B', text: '6°C' },
        { key: 'C', text: '12°C' },
        { key: 'D', text: '-2°C' },
      ],
      correctOption: 'A',
    },
    {
      id: 'q-103',
      questionNumber: 3,
      type: 'MCQ',
      questionText: 'Bentuk paling sederhana dari pecahan 72 / 108 adalah ...',
      options: [
        { key: 'A', text: '1 / 2' },
        { key: 'B', text: '2 / 3' },
        { key: 'C', text: '3 / 4' },
        { key: 'D', text: '4 / 5' },
      ],
      correctOption: 'B',
    },
    {
      id: 'q-104',
      questionNumber: 4,
      type: 'MCQ',
      questionText: 'FPB dan KPK dari bilangan 24, 36, dan 48 berturut-turut adalah ...',
      options: [
        { key: 'A', text: '12 dan 144' },
        { key: 'B', text: '6 dan 144' },
        { key: 'C', text: '12 dan 72' },
        { key: 'D', text: '24 dan 288' },
      ],
      correctOption: 'A',
    },
    {
      id: 'q-105',
      questionNumber: 5,
      type: 'MCQ',
      questionText: 'Jika x = -3 dan y = 5, maka nilai dari 2x² - 3y + 4 adalah ...',
      options: [
        { key: 'A', text: '7' },
        { key: 'B', text: '11' },
        { key: 'C', text: '15' },
        { key: 'D', text: '-11' },
      ],
      correctOption: 'A',
    },
    {
      id: 'q-106',
      questionNumber: 6,
      type: 'ESSAY',
      questionText: 'Sebuah taman berbentuk persegi panjang memiliki panjang (3x + 4) meter dan lebar (2x - 1) meter. Tuliskan rumus keliling taman tersebut dalam bentuk aljabar dan hitung kelilingnya jika x = 6!',
      options: [],
      correctOption: '',
    },
  ],
  'cbt-002': [
    {
      id: 'q-201',
      questionNumber: 1,
      type: 'MCQ',
      questionText: 'Organisme yang memiliki dinding sel berupa zat kitin dan tidak berklorofil dikelompokkan ke dalam kingdom ...',
      options: [
        { key: 'A', text: 'Monera' },
        { key: 'B', text: 'Protista' },
        { key: 'C', text: 'Fungi (Jamur)' },
        { key: 'D', text: 'Plantae' },
      ],
      correctOption: 'C',
    },
    {
      id: 'q-202',
      questionNumber: 2,
      type: 'MCQ',
      questionText: 'Urutan takson tumbuhan dari tingkat tertinggi ke terendah yang benar adalah ...',
      options: [
        { key: 'A', text: 'Kingdom - Divisio - Classis - Ordo - Familia - Genus - Species' },
        { key: 'B', text: 'Kingdom - Phylum - Ordo - Classis - Familia - Genus - Species' },
        { key: 'C', text: 'Kingdom - Divisio - Ordo - Classis - Genus - Familia - Species' },
        { key: 'D', text: 'Divisio - Kingdom - Classis - Ordo - Familia - Genus - Species' },
      ],
      correctOption: 'A',
    },
  ],
};

// Local storage key helpers for seamless client offline/preview
function getLocal(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(`spenspra_elearning_${key}`);
    return data ? JSON.parse(data) : fallback;
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
    return allQuestions[examId] || INITIAL_QUESTIONS['cbt-001'] || [];
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
    let list = getLocal(monitorKey, []);

    // If empty, generate a realistic active roster for demo
    if (list.length === 0) {
      list = [
        {
          sessionId: 'ses-101',
          studentId: 'std-001',
          studentName: 'Ahmad Raihan Pratama',
          className: '7A',
          status: 'IN_PROGRESS',
          remainingSeconds: 2450,
          violationsCount: 1,
          violations: [
            {
              type: 'WINDOW_BLUR',
              description: 'Membuka aplikasi lain di luar browser (jendela kehilangan fokus).',
              timestamp: new Date(Date.now() - 1000 * 180).toISOString(),
            },
          ],
          answers: { 'q-101': { selectedOption: 'C' }, 'q-102': { selectedOption: 'A' } },
        },
        {
          sessionId: 'ses-102',
          studentId: 'std-002',
          studentName: 'Anindya Putri Kirana',
          className: '7A',
          status: 'IN_PROGRESS',
          remainingSeconds: 2890,
          violationsCount: 0,
          violations: [],
          answers: { 'q-101': { selectedOption: 'C' } },
        },
        {
          sessionId: 'ses-103',
          studentId: 'std-003',
          studentName: 'Bayu Aditya Nugroho',
          className: '7A',
          status: 'LOCKED',
          remainingSeconds: 2100,
          violationsCount: 3,
          violations: [
            { type: 'TAB_SWITCH', description: 'Membuka tab peramban baru saat ujian.', timestamp: new Date(Date.now() - 1000 * 600).toISOString() },
            { type: 'FULLSCREEN_EXIT', description: 'Keluar dari mode layar penuh (fullscreen).', timestamp: new Date(Date.now() - 1000 * 420).toISOString() },
            { type: 'TAB_SWITCH', description: 'Mencoba beralih tab peramban lagi.', timestamp: new Date(Date.now() - 1000 * 120).toISOString() },
          ],
          answers: { 'q-101': { selectedOption: 'B' } },
        },
        {
          sessionId: 'ses-104',
          studentId: 'std-004',
          studentName: 'Citra Dewi Anggraini',
          className: '7A',
          status: 'SUBMITTED',
          remainingSeconds: 0,
          score: 85,
          violationsCount: 0,
          violations: [],
          answers: {},
        },
      ];
      setLocal(monitorKey, list);
    }

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
