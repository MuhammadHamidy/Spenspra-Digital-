import { tokenStorage } from './common/tokenStorage';

export function getElearningApiBase() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('spenspra.com')) return 'https://belajar.spenspra.com/api';
    if (host.includes('spenspra.sch.id')) return 'https://belajar.spenspra.sch.id/api';
    if (!host.includes('localhost') && host !== '127.0.0.1') {
      return `${window.location.origin}/api`;
    }
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('belajar.localhost')) {
      return envUrl;
    }
    return `${window.location.origin}/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
}

async function fetchJson(endpoint, options = {}) {
  const baseUrl = getElearningApiBase();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;
  const currentUser = tokenStorage.getUser();
  const userId = currentUser?.id || currentUser?.nimNip || currentUser?.nip || currentUser?.username || 'user-elearning-default';
  const userRole = (currentUser?.role || currentUser?.roleName || currentUser?.role_name || 'GURU').toUpperCase();
  const userName = currentUser?.fullName || currentUser?.full_name || currentUser?.name || 'Bapak/Ibu Guru';
  const token = tokenStorage.getToken();

  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
    'X-User-Role': userRole,
    'X-User-Name': userName,
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

export function getSsoApiBase() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('spenspra.com')) return 'https://sso.spenspra.com/api';
    if (host.includes('spenspra.sch.id')) return 'https://sso.spenspra.sch.id/api';
    if (host.includes('localhost') || host === '127.0.0.1') return 'http://localhost:8080/api';
  }
  return process.env.NEXT_PUBLIC_SSO_API_URL || 'https://sso.spenspra.com/api';
}

export function getRaporApiBase() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('spenspra.com')) return 'https://rapor.spenspra.com/api';
    if (host.includes('spenspra.sch.id')) return 'https://rapor.spenspra.sch.id/api';
    if (host.includes('localhost') || host === '127.0.0.1') return 'http://localhost:8080/api';
  }
  return process.env.NEXT_PUBLIC_RAPOR_API_URL || 'https://rapor.spenspra.com/api';
}

async function fetchPublicJson(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || json;
  } catch (err) {
    return null;
  }
}

async function fetchSsoJson(endpoint, options = {}) {
  const ssoBase = getSsoApiBase();
  const url = `${ssoBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
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
      return { success: false, status: res.status };
    }
    const json = await res.json();
    return json;
  } catch (err) {
    console.warn(`[SSO Client] Endpoint ${url} fallback:`, err.message);
    return { success: false, error: err.message };
  }
}

const INITIAL_MATERIALS = [];

const INITIAL_ASSIGNMENTS = [];

const INITIAL_EXAMS = [];

const INITIAL_QUESTIONS = {};

export const DEFAULT_CLASSES = [
  { id: 'cls-7a', name: '7A', level: 7, academicYear: '2026/2027' },
  { id: 'cls-7b', name: '7B', level: 7, academicYear: '2026/2027' },
  { id: 'cls-7c', name: '7C', level: 7, academicYear: '2026/2027' },
  { id: 'cls-7d', name: '7D', level: 7, academicYear: '2026/2027' },
  { id: 'cls-7e', name: '7E', level: 7, academicYear: '2026/2027' },
  { id: 'cls-7f', name: '7F', level: 7, academicYear: '2026/2027' },
  { id: 'cls-7g', name: '7G', level: 7, academicYear: '2026/2027' },
  { id: 'cls-7h', name: '7H', level: 7, academicYear: '2026/2027' },
  { id: 'cls-8a', name: '8A', level: 8, academicYear: '2026/2027' },
  { id: 'cls-8b', name: '8B', level: 8, academicYear: '2026/2027' },
  { id: 'cls-8c', name: '8C', level: 8, academicYear: '2026/2027' },
  { id: 'cls-8d', name: '8D', level: 8, academicYear: '2026/2027' },
  { id: 'cls-8e', name: '8E', level: 8, academicYear: '2026/2027' },
  { id: 'cls-8f', name: '8F', level: 8, academicYear: '2026/2027' },
  { id: 'cls-8g', name: '8G', level: 8, academicYear: '2026/2027' },
  { id: 'cls-8h', name: '8H', level: 8, academicYear: '2026/2027' },
  { id: 'cls-9a', name: '9A', level: 9, academicYear: '2026/2027' },
  { id: 'cls-9b', name: '9B', level: 9, academicYear: '2026/2027' },
  { id: 'cls-9c', name: '9C', level: 9, academicYear: '2026/2027' },
  { id: 'cls-9d', name: '9D', level: 9, academicYear: '2026/2027' },
  { id: 'cls-9e', name: '9E', level: 9, academicYear: '2026/2027' },
  { id: 'cls-9f', name: '9F', level: 9, academicYear: '2026/2027' },
  { id: 'cls-9g', name: '9G', level: 9, academicYear: '2026/2027' },
  { id: 'cls-9h', name: '9H', level: 9, academicYear: '2026/2027' },
];

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
export function generateRandomPin(length = 6) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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

export function normalizeClassCode(c) {
  if (!c) return '';
  let s = String(c)
    .toLowerCase()
    .trim()
    .replace(/^kelas\s*/i, '')
    .replace(/^rombel\s*/i, '')
    .replace(/[^a-z0-9]/g, '');
  if (s.startsWith('viii')) s = '8' + s.slice(4);
  else if (s.startsWith('vii')) s = '7' + s.slice(3);
  else if (s.startsWith('ix')) s = '9' + s.slice(2);
  return s;
}

export function extractGradeLevelDigit(c) {
  if (!c) return '';
  const str = String(c).toUpperCase();
  if (/(?:TINGKAT|TK\.?|KELAS)\s*(?:VIII|8)\b|\bVIII[-A-Z]|\b8[A-H]\b|\[ASAS:8\]/.test(str)) return '8';
  if (/(?:TINGKAT|TK\.?|KELAS)\s*(?:VII|7)\b|\bVII[-A-Z]|\b7[A-H]\b|\[ASAS:7\]/.test(str)) return '7';
  if (/(?:TINGKAT|TK\.?|KELAS)\s*(?:IX|9)\b|\bIX[-A-Z]|\b9[A-H]\b|\[ASAS:9\]/.test(str)) return '9';
  if (/^(?:8|VIII)$/.test(str.trim())) return '8';
  if (/^(?:7|VII)$/.test(str.trim())) return '7';
  if (/^(?:9|IX)$/.test(str.trim())) return '9';
  const norm = normalizeClassCode(c);
  const m = norm.match(/^([789])/);
  return m ? m[1] : '';
}

function cleanTeacherNameStr(n) {
  return String(n || '')
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isItemForStudent(item, user) {
  if (!item || !user) return false;
  const rawStudentClass =
    user.className ||
    user.class_name ||
    user.kelas ||
    user.rombel ||
    (Array.isArray(user.classCodes) && user.classCodes.length > 0 ? user.classCodes[0] : '') ||
    '';
  const studentClassNorm = normalizeClassCode(rawStudentClass);
  const studentLevel = extractGradeLevelDigit(rawStudentClass);

  if (!studentClassNorm && !studentLevel) return false;

  if (Array.isArray(item.targetClasses) && item.targetClasses.length > 0) {
    return item.targetClasses.some((tc) => normalizeClassCode(tc) === studentClassNorm);
  }

  const itemClassRaw = String(item.className || item.class_code || item.classCode || '');
  const isGradeLevelItem =
    item.examCategory === 'SEMESTER_UAS' ||
    item.isCoordinatorExam ||
    Boolean(item.targetGradeLevel) ||
    /tingkat|semua rombel|semua kelas/i.test(itemClassRaw);

  if (isGradeLevelItem) {
    const itemLevel =
      extractGradeLevelDigit(item.targetGradeLevel) ||
      extractGradeLevelDigit(itemClassRaw) ||
      extractGradeLevelDigit(item.rawDescription) ||
      extractGradeLevelDigit(item.title);
    if (!itemLevel || !studentLevel) return false;
    return itemLevel === studentLevel;
  }

  const itemClassNorm = normalizeClassCode(itemClassRaw);
  if (!itemClassNorm) return false;
  return itemClassNorm === studentClassNorm;
}

export function isItemOwnedByTeacher(item, user) {
  if (!item || !user) return false;
  const myIds = [user.id, user.person_id, user.personId, user.nimNip, user.nip, user.username]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase());
  const myName = cleanTeacherNameStr(user.fullName || user.full_name || user.name || '');

  const itemTeacherId = String(item.teacherId || item.teacher_id || '')
    .trim()
    .toLowerCase();
  const itemTeacherName = cleanTeacherNameStr(item.teacherName || item.teacher_name || '');

  if (itemTeacherId && itemTeacherId !== 'user-elearning-default') {
    if (myIds.includes(itemTeacherId)) return true;
    if (myName && itemTeacherName && itemTeacherName !== 'bapak/ibu guru' && itemTeacherName === myName) {
      return true;
    }
    return false;
  }

  if (itemTeacherName && itemTeacherName !== 'bapak/ibu guru') {
    return Boolean(myName && itemTeacherName === myName);
  }

  return false;
}

function filterItemsByCurrentUserScope(items, params = {}) {
  if (!Array.isArray(items)) return [];
  if (params?.skipScopeFilter) return items;

  const currentUser = tokenStorage.getUser();
  if (!currentUser) return items;

  const role = String(currentUser.roleName || currentUser.role || currentUser.role_name || '').toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN_ELEARNING' || role.includes('KEPALA');
  if (isAdmin) return items;

  const isSiswa = role.includes('SISWA') || role.includes('STUDENT');
  if (isSiswa) {
    return items.filter((item) => isItemForStudent(item, currentUser));
  }

  // Guru / Pendidik: hanya melihat dan mengelola soal/ujian/materi/tugas yang dibuatnya sendiri
  return items.filter((item) => isItemOwnedByTeacher(item, currentUser));
}

export function mapExamItem(e) {
  if (!e) return null;
  const className = e.className || e.class_code || e.classCode || '';
  const startDT = e.startDateTime || e.start_time || '';
  const endDT = e.endDateTime || e.end_time || '';
  let sDate = e.scheduledDate || '';
  let sTime = e.startTime || '';
  let eTime = e.endTime || '';
  if (!sDate && startDT) sDate = startDT.split('T')[0];
  if (!sTime && startDT && startDT.includes('T')) sTime = startDT.split('T')[1].slice(0, 5);
  if (!eTime && endDT && endDT.includes('T')) eTime = endDT.split('T')[1].slice(0, 5);

  const token = (e.token || '').toUpperCase();
  const rawDesc = String(e.description || e.rawDescription || '');
  const title = String(e.title || '');

  // Check description tags [ASAS:x], [PIN:xxxx], [SCORE:0/1], [ANSWERS:0/1]
  const asasTagMatch = rawDesc.match(/\[ASAS:(\d+)\]/i);
  const pinTagMatch = rawDesc.match(/\[PIN:([A-Z0-9]+)\]/i);
  const scoreTagMatch = rawDesc.match(/\[SCORE:([01])\]/i);
  const answersTagMatch = rawDesc.match(/\[ANSWERS:([01])\]/i);

  // Detect whether it's UAS / ASAS Semester
  const isAsasByToken = token.startsWith('ASAS');
  const isAsasByClass = /tingkat|semua rombel|semua kelas/i.test(className);
  const isAsasByTitle = /asas|asesmen akhir|sumatif akhir|semester/i.test(title);
  const isUas = Boolean(
    asasTagMatch ||
    e.examCategory === 'SEMESTER_UAS' ||
    e.exam_category === 'SEMESTER_UAS' ||
    e.isUAS ||
    e.targetGradeLevel ||
    e.target_grade_level ||
    isAsasByToken ||
    isAsasByClass ||
    (isAsasByTitle && !className.match(/^[789][A-H]$/i))
  );

  // Determine targetGradeLevel (7, 8, or 9)
  let gradeLevel = '';
  if (asasTagMatch) {
    gradeLevel = asasTagMatch[1];
  } else if (e.targetGradeLevel || e.target_grade_level) {
    gradeLevel = extractGradeLevelDigit(e.targetGradeLevel || e.target_grade_level) || String(e.targetGradeLevel || e.target_grade_level);
  } else {
    const extracted = extractGradeLevelDigit(className) || extractGradeLevelDigit(title);
    if (extracted) {
      gradeLevel = extracted;
    } else if (isUas) {
      gradeLevel = '7';
    }
  }

  // Determine supervisor PIN
  let pin = (e.supervisorPin || e.supervisor_pin || '').toUpperCase();
  if (!pin && pinTagMatch) {
    pin = pinTagMatch[1].toUpperCase();
  }

  // Determine publication settings
  const showScoreToStudent = scoreTagMatch
    ? scoreTagMatch[1] === '1'
    : (e.showScoreToStudent !== undefined ? Boolean(e.showScoreToStudent) : true);

  const showAnswersToStudent = answersTagMatch
    ? answersTagMatch[1] === '1'
    : (e.showAnswersToStudent !== undefined ? Boolean(e.showAnswersToStudent) : false);

  // Clean description without tags for display
  const cleanDesc = rawDesc
    .replace(/\[ASAS:\d+\]/gi, '')
    .replace(/\[PIN:[A-Z0-9]+\]/gi, '')
    .replace(/\[SCORE:[01]\]/gi, '')
    .replace(/\[ANSWERS:[01]\]/gi, '')
    .trim();

  return {
    ...e,
    className,
    class_code: className,
    subject: e.subject || e.course_name || e.courseName || '',
    subjectCode: e.subjectCode || e.course_id || e.courseId || 'MAPEL',
    durationMinutes: Number(e.durationMinutes || e.duration_minutes || 60),
    teacherId: e.teacherId || e.teacher_id || '',
    teacher_id: e.teacher_id || e.teacherId || '',
    teacherName: e.teacherName || e.teacher_name || 'Bapak/Ibu Guru',
    token,
    startDateTime: startDT,
    endDateTime: endDT,
    scheduledDate: sDate || new Date().toISOString().split('T')[0],
    startTime: sTime || '08:00',
    endTime: eTime || '09:30',
    maxViolations: Number(e.maxViolations || e.max_violations || 3),
    status: e.status || 'UPCOMING',
    description: cleanDesc || rawDesc,
    rawDescription: rawDesc,
    examCategory: isUas ? 'SEMESTER_UAS' : 'REGULAR',
    targetGradeLevel: isUas ? (gradeLevel || '7') : '',
    targetClasses: Array.isArray(e.targetClasses) ? e.targetClasses : (Array.isArray(e.target_classes) ? e.target_classes : []),
    isCoordinatorExam: isUas,
    supervisorPin: pin,
    showScoreToStudent,
    show_score_to_student: showScoreToStudent,
    showAnswersToStudent,
    show_answers_to_student: showAnswersToStudent,
  };
}

export const elearningApi = {
  // =================== MATERI ===================
  getMaterials: async (params = {}) => {
    const res = await fetchJson('/materials');
    let rawList = [];
    if (res.success && Array.isArray(res.data)) {
      rawList = res.data;
    } else {
      rawList = getLocal('materials', INITIAL_MATERIALS);
    }
    const scoped = filterItemsByCurrentUserScope(rawList, params);
    if (params.className) {
      return scoped.filter((m) => !m.className || normalizeClassCode(m.className || m.class_code) === normalizeClassCode(params.className));
    }
    return scoped;
  },

  getMaterialById: async (id) => {
    const res = await fetchJson(`/materials/${id}`);
    if (res.success && res.data) return res.data;
    const local = getLocal('materials', INITIAL_MATERIALS);
    return local.find((m) => m.id === id) || null;
  },

  createMaterial: async (payload) => {
    const currentUser = tokenStorage.getUser();
    const tId = payload.teacherId || payload.teacher_id || currentUser?.id || currentUser?.nimNip || currentUser?.nip || currentUser?.username || '';
    const tName = payload.teacherName || payload.teacher_name || currentUser?.fullName || currentUser?.full_name || currentUser?.name || 'Bapak/Ibu Guru';
    const fullPayload = {
      ...payload,
      teacherId: tId,
      teacher_id: tId,
      teacherName: tName,
      teacher_name: tName,
    };
    const res = await fetchJson('/materials', {
      method: 'POST',
      body: JSON.stringify(fullPayload),
    });
    const local = getLocal('materials', INITIAL_MATERIALS);
    const newMaterial = {
      id: `mat-${Date.now()}`,
      createdAt: new Date().toISOString(),
      viewsCount: 0,
      ...fullPayload,
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
    let rawList = [];
    if (res.success && Array.isArray(res.data)) {
      rawList = res.data;
    } else {
      rawList = getLocal('assignments', INITIAL_ASSIGNMENTS);
    }

    const normalized = rawList.map((t) => ({
      id: t.id,
      title: t.title || t.name || 'Tugas Tanpa Judul',
      subject: t.subject || t.subject_name || t.course_name || t.courseName || 'Mata Pelajaran',
      subjectCode: t.subjectCode || t.subject_code || t.course_code || 'MAPEL',
      className: t.className || t.class_name || t.class_code || t.classCode || '',
      teacherId: t.teacherId || t.teacher_id || '',
      teacher_id: t.teacher_id || t.teacherId || '',
      teacherName: t.teacherName || t.teacher_name || 'Bapak/Ibu Guru',
      teacher_name: t.teacher_name || t.teacherName || 'Bapak/Ibu Guru',
      dueDate: t.dueDate || t.due_date || t.deadline || t.endDateTime || t.end_time || '',
      maxScore: Number(t.maxScore || t.max_score || 100),
      description: t.description || t.instruction || '',
      attachmentUrl: t.attachmentUrl || t.attachment_url || t.file_url || null,
      attachmentName: t.attachmentName || t.attachment_name || null,
      attachmentSize: t.attachmentSize || t.attachment_size || null,
      submittedCount: Number(t.submittedCount || t.submitted_count || 0),
      totalStudents: Number(t.totalStudents || t.total_students || 32),
      status: t.status || (t.is_active === false ? 'COMPLETED' : 'ACTIVE'),
      createdAt: t.createdAt || t.created_at || new Date().toISOString(),
    }));

    const scoped = filterItemsByCurrentUserScope(normalized, params);
    if (params.className) {
      return scoped.filter((t) => !t.className || normalizeClassCode(t.className) === normalizeClassCode(params.className));
    }
    return scoped;
  },

  getAssignmentById: async (id) => {
    const res = await fetchJson(`/assignments/${id}`);
    if (res.success && res.data) return res.data;
    const local = getLocal('assignments', INITIAL_ASSIGNMENTS);
    return local.find((t) => t.id === id) || null;
  },

  createAssignment: async (payload) => {
    const currentUser = tokenStorage.getUser();
    const tId = payload.teacherId || payload.teacher_id || currentUser?.id || currentUser?.nimNip || currentUser?.nip || currentUser?.username || '';
    const tName = payload.teacherName || payload.teacher_name || currentUser?.fullName || currentUser?.full_name || currentUser?.name || 'Bapak/Ibu Guru';
    const fullPayload = {
      ...payload,
      teacherId: tId,
      teacher_id: tId,
      teacherName: tName,
      teacher_name: tName,
    };
    const res = await fetchJson('/assignments', {
      method: 'POST',
      body: JSON.stringify(fullPayload),
    });
    const local = getLocal('assignments', INITIAL_ASSIGNMENTS);
    const newAssignment = {
      id: `tug-${Date.now()}`,
      createdAt: new Date().toISOString(),
      submittedCount: 0,
      status: 'ACTIVE',
      ...fullPayload,
    };
    setLocal('assignments', [newAssignment, ...local]);
    return res.success ? res.data : newAssignment;
  },

  updateAssignment: async (id, payload) => {
    const res = await fetchJson(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const local = getLocal('assignments', INITIAL_ASSIGNMENTS);
    const updated = local.map((item) => (item.id === id ? { ...item, ...payload } : item));
    setLocal('assignments', updated);
    return res.success ? res.data : payload;
  },

  deleteAssignment: async (id) => {
    const res = await fetchJson(`/assignments/${id}`, {
      method: 'DELETE',
    });
    const local = getLocal('assignments', INITIAL_ASSIGNMENTS);
    const filtered = local.filter((item) => item.id !== id);
    setLocal('assignments', filtered);
    if (!res.success && res.error && res.error.code !== 404) {
      throw new Error(res.error.message || 'Gagal menghapus tugas di server');
    }
    return true;
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
    const query = params.className ? `?class_name=${encodeURIComponent(params.className)}` : '';
    const res = await fetchJson(`/exams${query}`);

    let mapped = [];
    if (res.success && Array.isArray(res.data)) {
      mapped = res.data.map(mapExamItem).filter(Boolean);
    } else {
      const local = getLocal('exams', INITIAL_EXAMS);
      mapped = local.map(mapExamItem).filter(Boolean);
    }

    const scoped = filterItemsByCurrentUserScope(mapped, params);
    if (params.className) {
      return scoped.filter((e) => normalizeClassCode(e.className) === normalizeClassCode(params.className));
    }
    return scoped;
  },

  getExamById: async (id) => {
    const res = await fetchJson(`/exams/${id}`);
    const local = getLocal('exams', INITIAL_EXAMS);
    const rawExam = (res.success && res.data) ? res.data : local.find((e) => e.id === id);
    if (!rawExam) return null;
    return mapExamItem(rawExam);
  },

  createExam: async (payload) => {
    const currentUser = tokenStorage.getUser();
    const currentTeacherId = payload.teacherId || payload.teacher_id || currentUser?.id || currentUser?.nimNip || currentUser?.nip || currentUser?.username || '';
    const currentTeacherName = payload.teacherName || payload.teacher_name || currentUser?.fullName || currentUser?.full_name || currentUser?.name || 'Bapak/Ibu Guru';
    const isUas = payload.examCategory === 'SEMESTER_UAS' || Boolean(payload.targetGradeLevel) || Boolean(payload.isCoordinatorExam);
    const generatedPin = payload.supervisorPin || (isUas ? generateRandomPin(6) : '');
    const showScore = payload.showScoreToStudent !== false ? 1 : 0;
    const showAnswers = payload.showAnswersToStudent ? 1 : 0;

    let desc = payload.description || '';
    desc = desc
      .replace(/\[ASAS:\d+\]/gi, '')
      .replace(/\[PIN:[A-Z0-9]+\]/gi, '')
      .replace(/\[SCORE:[01]\]/gi, '')
      .replace(/\[ANSWERS:[01]\]/gi, '')
      .trim();

    let tags = `[SCORE:${showScore}][ANSWERS:${showAnswers}]`;
    if (isUas) {
      const lvl = payload.targetGradeLevel || '7';
      tags = `[ASAS:${lvl}]${generatedPin ? `[PIN:${generatedPin}]` : ''}${tags}`;
    }
    desc = `${tags} ${desc}`.trim();

    const enhancedPayload = {
      ...payload,
      description: desc,
      class_code: payload.className || payload.class_code,
      course_name: payload.subject || payload.course_name,
      course_id: payload.subjectCode || payload.course_id || 'MAPEL',
      duration_minutes: Number(payload.durationMinutes || payload.duration_minutes || 60),
      teacherId: currentTeacherId,
      teacher_id: currentTeacherId,
      teacherName: currentTeacherName,
      teacher_name: currentTeacherName,
      token: (payload.token || '').toUpperCase(),
      exam_category: isUas ? 'SEMESTER_UAS' : 'REGULAR',
      target_grade_level: isUas ? (payload.targetGradeLevel || '7') : '',
      target_classes: payload.targetClasses || [],
      is_coordinator_exam: isUas,
      supervisor_pin: generatedPin.toUpperCase(),
      supervisorPin: generatedPin.toUpperCase(),
      showScoreToStudent: showScore === 1,
      show_score_to_student: showScore === 1,
      showAnswersToStudent: showAnswers === 1,
      show_answers_to_student: showAnswers === 1,
    };
    const res = await fetchJson('/exams', {
      method: 'POST',
      body: JSON.stringify(enhancedPayload),
    });
    const local = getLocal('exams', INITIAL_EXAMS);
    const newExam = {
      id: res.data?.id || `cbt-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: payload.status || 'UPCOMING',
      isActive: true,
      ...enhancedPayload,
      className: enhancedPayload.class_code,
      subject: enhancedPayload.course_name,
      durationMinutes: enhancedPayload.duration_minutes,
      teacherName: enhancedPayload.teacher_name,
      supervisorPin: enhancedPayload.supervisor_pin,
    };
    setLocal('exams', [newExam, ...local]);
    return res.success && res.data ? mapExamItem(res.data) : mapExamItem(newExam);
  },

  updateExam: async (id, payload) => {
    const isUas = payload.examCategory === 'SEMESTER_UAS' || Boolean(payload.targetGradeLevel) || Boolean(payload.isCoordinatorExam);
    const showScore = payload.showScoreToStudent !== undefined ? (payload.showScoreToStudent ? 1 : 0) : 1;
    const showAnswers = payload.showAnswersToStudent !== undefined ? (payload.showAnswersToStudent ? 1 : 0) : 0;

    let desc = payload.description || '';
    desc = desc
      .replace(/\[ASAS:\d+\]/gi, '')
      .replace(/\[PIN:[A-Z0-9]+\]/gi, '')
      .replace(/\[SCORE:[01]\]/gi, '')
      .replace(/\[ANSWERS:[01]\]/gi, '')
      .trim();

    let tags = `[SCORE:${showScore}][ANSWERS:${showAnswers}]`;
    if (isUas) {
      const lvl = payload.targetGradeLevel || '7';
      const pin = payload.supervisorPin || '';
      tags = `[ASAS:${lvl}]${pin ? `[PIN:${pin}]` : ''}${tags}`;
    }
    desc = `${tags} ${desc}`.trim();

    const enhancedPayload = {
      ...payload,
      id,
      description: desc,
      showScoreToStudent: showScore === 1,
      show_score_to_student: showScore === 1,
      showAnswersToStudent: showAnswers === 1,
      show_answers_to_student: showAnswers === 1,
      ...(payload.className ? { class_code: payload.className } : {}),
      ...(payload.subject ? { course_name: payload.subject } : {}),
      ...(payload.subjectCode ? { course_id: payload.subjectCode } : {}),
      ...(payload.durationMinutes ? { duration_minutes: Number(payload.durationMinutes) } : {}),
      ...(payload.teacherName ? { teacher_name: payload.teacherName } : {}),
      ...(payload.teacherId ? { teacher_id: payload.teacherId } : {}),
      ...(payload.token ? { token: payload.token.toUpperCase() } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.startDateTime ? { startDateTime: payload.startDateTime, start_time: payload.startDateTime } : {}),
      ...(payload.endDateTime ? { endDateTime: payload.endDateTime, end_time: payload.endDateTime } : {}),
      ...(payload.scheduledDate ? { scheduledDate: payload.scheduledDate } : {}),
      ...(payload.startTime ? { startTime: payload.startTime } : {}),
      ...(payload.endTime ? { endTime: payload.endTime } : {}),
    };

    const res = await fetchJson(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(enhancedPayload),
    });

    const local = getLocal('exams', INITIAL_EXAMS);
    const updated = local.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          ...enhancedPayload,
          status: payload.status || e.status,
          className: enhancedPayload.class_code || payload.className || e.className,
          subject: enhancedPayload.course_name || payload.subject || e.subject,
          subjectCode: enhancedPayload.course_id || payload.subjectCode || e.subjectCode,
          teacherName: enhancedPayload.teacher_name || payload.teacherName || e.teacherName,
          token: (enhancedPayload.token || e.token || '').toUpperCase(),
          examCategory: isUas ? 'SEMESTER_UAS' : (payload.examCategory || e.examCategory),
          targetGradeLevel: payload.targetGradeLevel || e.targetGradeLevel,
          supervisorPin: payload.supervisorPin || e.supervisorPin,
          showScoreToStudent: showScore === 1,
          show_score_to_student: showScore === 1,
          showAnswersToStudent: showAnswers === 1,
          show_answers_to_student: showAnswers === 1,
        };
      }
      return e;
    });
    setLocal('exams', updated);

    if (!res.success && res.error) {
      console.warn(`[updateExam] PUT /exams/${id} error:`, res.error);
    }
    const finalResult = res?.data || updated.find((e) => e.id === id) || null;
    return mapExamItem(finalResult);
  },

  deleteExam: async (id) => {
    await fetchJson(`/exams/${id}`, { method: 'DELETE' }).catch(() => {});
    const local = getLocal('exams', INITIAL_EXAMS);
    const filtered = local.filter((e) => e.id !== id);
    setLocal('exams', filtered);
    const allQuestions = getLocal('questions', INITIAL_QUESTIONS);
    delete allQuestions[id];
    setLocal('questions', allQuestions);
    return true;
  },

  getStudentsByClass: async (className = '') => {
    try {
      const { accountApiAdapter } = await import('@/lib/features/auth/infrastructure/accountApiAdapter');
      const list = await accountApiAdapter.getStudents(className);
      if (Array.isArray(list) && list.length > 0) {
        if (!className) return list;

        const normalize = (c) =>
          String(c || '')
            .toLowerCase()
            .trim()
            .replace(/^kelas\s*/, '')
            .replace(/^rombel\s*/, '')
            .replace(/[^a-z0-9]/g, '')
            .replace(/^viii/, '8')
            .replace(/^vii/, '7')
            .replace(/^ix/, '9');

        const targetNorm = normalize(className);

        return list.filter((s) => {
          const sClassNorm = normalize(s.className || s.class_name || s.rombel || '');
          return (
            sClassNorm === targetNorm ||
            (sClassNorm && targetNorm && (sClassNorm.includes(targetNorm) || targetNorm.includes(sClassNorm)))
          );
        });
      }
      return [];
    } catch {
      return [];
    }
  },

  getExamQuestions: async (examId) => {
    const allQuestions = getLocal('questions', INITIAL_QUESTIONS);
    const localList = allQuestions[examId] || [];

    const res = await fetchJson(`/exams/${examId}/questions`);
    let rawList = [];
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      rawList = res.data;
    } else {
      rawList = localList;
    }

    const extractSpenspraMeta = (text) => {
      if (!text || typeof text !== 'string') return { cleanText: text || '', meta: null };
      const match = text.match(/<!--SPENSPRA_META:([\s\S]*?)-->/);
      if (!match) return { cleanText: text, meta: null };
      try {
        const meta = JSON.parse(match[1]);
        const cleanText = text.replace(/<!--SPENSPRA_META:[\s\S]*?-->/, '').trim();
        return { cleanText, meta };
      } catch {
        return { cleanText: text, meta: null };
      }
    };

    return rawList.map((q, idx) => {
      const localQ = localList.find((lq) => String(lq.id) === String(q.id)) || {};
      const rawText = q.questionText || q.question_text || '';
      const { cleanText, meta } = extractSpenspraMeta(rawText);

      const qType = meta?.type || q.type || (q.question_type === 'PILIHAN_GANDA' ? 'MCQ' : q.question_type) || localQ.type || 'MCQ';

      let options = q.options;
      if (!Array.isArray(options) || options.length === 0) {
        options = [];
        if (q.option_a) options.push({ key: 'A', text: q.option_a });
        if (q.option_b) options.push({ key: 'B', text: q.option_b });
        if (q.option_c) options.push({ key: 'C', text: q.option_c });
        if (q.option_d) options.push({ key: 'D', text: q.option_d });
        if (q.option_e) options.push({ key: 'E', text: q.option_e });
      }
      if (options.length === 0 && Array.isArray(localQ.options)) {
        options = localQ.options;
      }

      const rawPairs = (meta?.matchingPairs && meta.matchingPairs.length > 0)
        ? meta.matchingPairs
        : ((Array.isArray(q.matchingPairs) && q.matchingPairs.length > 0)
            ? q.matchingPairs
            : (Array.isArray(localQ.matchingPairs) ? localQ.matchingPairs : []));
      const matchingPairs = rawPairs.map((p, pIdx) => ({
        ...p,
        id: p.id !== undefined && p.id !== null && p.id !== '' ? p.id : pIdx + 1,
        left: (p.left || '').trim(),
        right: (p.right || '').trim(),
      }));

      const rawCorrectStr = String(q.correctOption || q.correct_answer || localQ.correctOption || '').trim();

      let correctOptions = (meta?.correctOptions && meta.correctOptions.length > 0)
        ? meta.correctOptions
        : ((Array.isArray(q.correctOptions) && q.correctOptions.length > 0)
            ? q.correctOptions
            : (Array.isArray(localQ.correctOptions) && localQ.correctOptions.length > 0
                ? localQ.correctOptions
                : []));
      if (qType === 'COMPLEX_MCQ' && rawCorrectStr && rawCorrectStr !== '-') {
        const splitFromStr = rawCorrectStr.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
        if (splitFromStr.length > correctOptions.length) {
          correctOptions = splitFromStr;
        }
      }

      const trueFalseAnswer = typeof meta?.trueFalseAnswer === 'boolean'
        ? meta.trueFalseAnswer
        : (typeof q.trueFalseAnswer === 'boolean'
            ? q.trueFalseAnswer
            : (typeof localQ.trueFalseAnswer === 'boolean'
                ? localQ.trueFalseAnswer
                : (rawCorrectStr.toUpperCase() !== 'FALSE' && rawCorrectStr.toUpperCase() !== 'SALAH' && rawCorrectStr.toUpperCase() !== 'F')));

      const correctOption = qType === 'COMPLEX_MCQ' && correctOptions.length > 0
        ? correctOptions.join(',')
        : (qType === 'TRUE_FALSE'
            ? (trueFalseAnswer ? 'TRUE' : 'FALSE')
            : (rawCorrectStr || 'A'));
      const stimulusText = meta?.stimulusText || q.stimulusText || localQ.stimulusText || '';
      const essayRubric = meta?.essayRubric || q.essayRubric || q.essay_rubric || localQ.essayRubric || '';

      return {
        id: q.id || localQ.id || `q-${idx + 1}`,
        examId: q.examId || q.exam_id || examId,
        questionNumber: q.questionNumber || q.question_number || idx + 1,
        type: qType,
        questionText: cleanText || localQ.questionText || '',
        stimulusText,
        imageUrl: q.imageUrl || q.image_url || localQ.imageUrl || '',
        options,
        correctOption,
        correctOptions,
        trueFalseAnswer,
        matchingPairs,
        essayRubric,
        points: Number(q.points || q.score_weight || localQ.points || 10),
      };
    });
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

    try {
      const res = await fetchJson(`/exams/${examId}/questions`, {
        method: 'PUT',
        body: JSON.stringify({ questions }),
      });
      if (res?.success && Array.isArray(res?.data)) {
        // Merge server IDs without discarding client rich question structure
        const merged = questions.map((origQ, i) => {
          const srvQ = res.data[i] || res.data.find((sq) => sq.id === origQ.id) || {};
          return {
            ...origQ,
            id: srvQ.id || origQ.id,
            questionNumber: origQ.questionNumber || i + 1,
          };
        });
        allQuestions[examId] = merged;
        setLocal('questions', allQuestions);
      }
    } catch (err) {
      console.warn('Gagal sync butir soal ke backend:', err);
    }

    return questions;
  },

  // =================== MATA PELAJARAN (COURSES / SUBJECTS) ===================
  getSubjects: async () => {
    // 1. Ambil dari SSO master courses & backend
    const [ssoRes, beRes] = await Promise.all([
      fetchSsoJson('/school/courses').catch(() => null),
      fetchJson('/school/courses').catch(() => null),
    ]);

    const rawCourses = [];
    if (ssoRes?.success && Array.isArray(ssoRes.data)) rawCourses.push(...ssoRes.data);
    else if (Array.isArray(ssoRes)) rawCourses.push(...ssoRes);
    else if (Array.isArray(ssoRes?.data?.courses)) rawCourses.push(...ssoRes.data.courses);

    if (beRes?.success && Array.isArray(beRes.data)) rawCourses.push(...beRes.data);

    const customSubjects = getLocal('custom_subjects', []);
    const mergedMap = new Map();

    // Official 12 Spenspra standard subjects as baseline
    OFFICIAL_SUBJECTS.forEach((s) => mergedMap.set(s.code.toUpperCase(), { ...s }));

    // Merge SSO subjects & custom subjects
    [...rawCourses, ...customSubjects].forEach((c) => {
      if (!c) return;
      const code = (c.code || c.course_code || c.id || '').toUpperCase();
      const name = c.name || c.course_name || c.title || code;
      if (!code && !name) return;

      const effectiveCode = code || name.slice(0, 3).toUpperCase();
      const existing = mergedMap.get(effectiveCode) || {};

      mergedMap.set(effectiveCode, {
        id: c.id || `crs-${effectiveCode.toLowerCase()}`,
        code: effectiveCode,
        name: name,
        category: c.category || existing.category || 'Umum',
        color: c.color || existing.color || 'indigo',
        icon: c.icon || existing.icon || '📚',
        description: c.description || existing.description || `Mata Pelajaran ${name}`,
      });
    });

    const result = Array.from(mergedMap.values());
    setLocal('subjects', result);
    return result;
  },

  createSubject: async (payload) => {
    await fetchSsoJson('/school/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(() => {});

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

  // =================== KELAS / ROMBEL (CLASSES) ===================
  getClasses: async () => {
    // 1. Ambil dari SSO master classes & backend
    const [ssoRes, beRes] = await Promise.all([
      fetchSsoJson('/school/classes').catch(() => null),
      fetchJson('/school/classes').catch(() => null),
    ]);

    const rawList = [];
    if (ssoRes?.success && Array.isArray(ssoRes.data)) rawList.push(...ssoRes.data);
    else if (Array.isArray(ssoRes?.data?.classes)) rawList.push(...ssoRes.data.classes);
    else if (Array.isArray(ssoRes)) rawList.push(...ssoRes);

    if (beRes?.success && Array.isArray(beRes.data)) rawList.push(...beRes.data);

    const customClasses = getLocal('custom_classes', []);
    const mergedMap = new Map();

    // Default Spenspra classes (7A-7H, 8A-8H, 9A-9H) as foundation
    DEFAULT_CLASSES.forEach((c) => mergedMap.set(c.name.toUpperCase(), { ...c }));

    // Merge SSO classes
    [...rawList, ...customClasses].forEach((c) => {
      if (!c) return;
      const rawName = typeof c === 'string' ? c : (c.name || c.class_name || c.class_code || '');
      const cleanName = rawName.replace(/^Kelas\s*/i, '').trim().toUpperCase();
      if (!cleanName) return;

      const levelNum = Number(c.level) || (cleanName.startsWith('7') ? 7 : cleanName.startsWith('8') ? 8 : cleanName.startsWith('9') ? 9 : 7);

      mergedMap.set(cleanName, {
        id: c.id || `cls-${cleanName.toLowerCase()}`,
        name: cleanName,
        level: levelNum,
        academicYear: c.academic_year || c.academicYear || '2026/2027',
        teacherId: c.teacher_id || c.dosen_id || null,
        teacherName: c.teacher_name || null,
        courseId: c.course_id || null,
        courseName: c.course_name || null,
        courseCode: c.course_code || null,
      });
    });

    const result = Array.from(mergedMap.values()).sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    setLocal('classes', result);
    return result;
  },

  createClass: async (payload) => {
    await fetchSsoJson('/school/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(() => {});

    const list = getLocal('custom_classes', []);
    const cleanName = (payload.name || payload.className || '7A').replace(/^Kelas\s*/i, '').trim().toUpperCase();
    const newClass = {
      id: `cls-${Date.now()}`,
      name: cleanName,
      level: Number(payload.level) || 7,
      academicYear: payload.academicYear || '2026/2027',
      ...payload,
    };
    setLocal('custom_classes', [...list, newClass]);
    return newClass;
  },

  getClassAssignments: async () => {
    try {
      const ssoBase = getSsoApiBase();
      const raporBase = getRaporApiBase();
      const [ssoRes, raporRes, beRes] = await Promise.all([
        fetchPublicJson(`${ssoBase}/school/classes`),
        fetchPublicJson(`${raporBase}/school/classes`),
        fetchJson('/school/classes').then((r) => r?.data || r).catch(() => null),
      ]);
      const list = [];
      const appendList = (res) => {
        if (!res) return;
        if (Array.isArray(res)) list.push(...res);
        else if (Array.isArray(res?.data)) list.push(...res.data);
        else if (Array.isArray(res?.classes)) list.push(...res.classes);
      };
      appendList(ssoRes);
      appendList(raporRes);
      appendList(beRes);
      return list;
    } catch {
      return [];
    }
  },

  getTeacherScope: async (customUser = null) => {
    const currentUser = customUser || tokenStorage.getUser();
    const roleUpper = String(currentUser?.roleName || currentUser?.role || currentUser?.peran || '').toUpperCase();
    const isGuru = roleUpper === 'GURU' || roleUpper.includes('GURU') || roleUpper.includes('TEACHER') || roleUpper.includes('WALI');

    const ssoBase = getSsoApiBase();
    const raporBase = getRaporApiBase();

    const [subjData, clsData, rawAssignments, ssoAccountsRes, raporTeachersRes] = await Promise.all([
      elearningApi.getSubjects(),
      elearningApi.getClasses(),
      elearningApi.getClassAssignments(),
      fetchPublicJson(`${ssoBase}/accounts?role=GURU`),
      fetchPublicJson(`${raporBase}/school/teachers`),
    ]);

    // Jika bukan guru (Super Admin / Admin), akses semua master data
    if (!isGuru) {
      return {
        isGuru: false,
        subjects: subjData || [],
        classes: clsData || [],
        assignments: rawAssignments || [],
      };
    }

    const myId = String(currentUser?.id || currentUser?.person_id || '').toLowerCase().trim();
    const myNip = String(currentUser?.nimNip || currentUser?.nip || '').toLowerCase().trim();
    const myUsername = String(currentUser?.username || '').toLowerCase().trim();
    const myName = String(currentUser?.fullName || currentUser?.full_name || '').toLowerCase().trim();

    // Kumpulkan seluruh data guru terdaftar dari SSO & e-Rapor untuk mencari profil aktif
    const teacherProfiles = [];
    const appendProfiles = (res) => {
      if (!res) return;
      if (Array.isArray(res)) teacherProfiles.push(...res);
      else if (Array.isArray(res?.data)) teacherProfiles.push(...res.data);
      else if (Array.isArray(res?.teachers)) teacherProfiles.push(...res.teachers);
    };
    appendProfiles(ssoAccountsRes);
    appendProfiles(raporTeachersRes);

    const matchedProfile = teacherProfiles.find((t) => {
      if (!t) return false;
      const tId = String(t.id || t.person_id || '').toLowerCase().trim();
      const tNip = String(t.nim_nip || t.nimNip || t.nip || '').toLowerCase().trim();
      const tUsername = String(t.username || '').toLowerCase().trim();
      const tName = String(t.full_name || t.fullName || t.name || '').toLowerCase().trim();

      if (myId && tId && (tId === myId || myId.includes(tId) || tId.includes(myId))) return true;
      if (myNip && tNip && (tNip === myNip || tId === myNip)) return true;
      if (myUsername && tUsername && tUsername === myUsername) return true;
      if (myName && tName && (tName === myName || tName.includes(myName) || myName.includes(tName))) return true;
      return false;
    });

    const teacherCourseNames = new Set();
    const teacherCourseCodes = new Set();
    const teacherClassCodes = new Set();

    // A. Ambil dari matchedProfile (profil SSO / e-Rapor)
    if (matchedProfile) {
      const pCourses = matchedProfile.course_names || matchedProfile.courseNames || [];
      if (Array.isArray(pCourses)) {
        pCourses.forEach((c) => {
          const cName = typeof c === 'string' ? c.trim().toLowerCase() : (c.name || '').trim().toLowerCase();
          const cCode = typeof c === 'string' ? c.trim().toUpperCase() : (c.code || '').trim().toUpperCase();
          if (cName) teacherCourseNames.add(cName);
          if (cCode) teacherCourseCodes.add(cCode);
        });
      }
      const pClasses = matchedProfile.class_codes || matchedProfile.classCodes || [];
      if (Array.isArray(pClasses)) {
        pClasses.forEach((cc) => {
          const clean = String(typeof cc === 'string' ? cc : cc.name || cc.code || '').replace(/^Kelas\s*/i, '').trim().toUpperCase();
          if (clean) teacherClassCodes.add(clean);
        });
      }
      if (matchedProfile.class_name) {
        const cleanWalas = String(matchedProfile.class_name).replace(/^Kelas\s*/i, '').trim().toUpperCase();
        if (cleanWalas) teacherClassCodes.add(cleanWalas);
      }

      // Self-heal local session agar tidak perlu logout/login ulang
      try {
        const updatedUser = {
          ...currentUser,
          courseNames: Array.from(teacherCourseNames),
          course_names: Array.from(teacherCourseNames),
          classCodes: Array.from(teacherClassCodes),
          class_codes: Array.from(teacherClassCodes),
        };
        tokenStorage.setUser(updatedUser);
      } catch (e) {}
    }

    // B. Ambil dari session tokenStorage (jika ada)
    const ssoCourses = currentUser?.courseNames || currentUser?.course_names || currentUser?.courses || [];
    if (Array.isArray(ssoCourses)) {
      ssoCourses.forEach((c) => {
        const cName = typeof c === 'string' ? c.trim().toLowerCase() : (c.name || '').trim().toLowerCase();
        const cCode = typeof c === 'string' ? c.trim().toUpperCase() : (c.code || '').trim().toUpperCase();
        if (cName) teacherCourseNames.add(cName);
        if (cCode) teacherCourseCodes.add(cCode);
      });
    }

    const ssoClasses = currentUser?.classCodes || currentUser?.class_codes || currentUser?.classes || [];
    if (Array.isArray(ssoClasses)) {
      ssoClasses.forEach((cls) => {
        const clean = String(typeof cls === 'string' ? cls : cls.name || cls.code || '').replace(/^Kelas\s*/i, '').trim().toUpperCase();
        if (clean) teacherClassCodes.add(clean);
      });
    }

    // C. Ambil dari tabel penugasan /school/classes (e-Rapor schedule / SSO classes)
    const myAssignments = (rawAssignments || []).filter((a) => {
      if (!a) return false;
      const tId = String(a.teacher_id || a.dosen_id || '').toLowerCase().trim();
      const tNip = String(a.teacher_nip || a.dosen_nip || '').toLowerCase().trim();
      const tName = String(a.teacher_name || a.dosen_name || '').toLowerCase().trim();

      if (myId && tId && (tId === myId || tId.includes(myId) || myId.includes(tId))) return true;
      if (myNip && (tNip === myNip || tId === myNip)) return true;
      if (myName && tName && (tName === myName || tName.includes(myName) || myName.includes(tName))) return true;
      return false;
    });

    myAssignments.forEach((a) => {
      if (a.course_name) teacherCourseNames.add(a.course_name.trim().toLowerCase());
      if (a.course_code) teacherCourseCodes.add(a.course_code.trim().toUpperCase());
      if (a.class_code) {
        const clean = a.class_code.replace(/^Kelas\s*/i, '').trim().toUpperCase();
        if (clean) teacherClassCodes.add(clean);
      }
    });

    // Filter daftar mata pelajaran yang diampu
    let filteredSubjects = [];
    if (teacherCourseNames.size > 0 || teacherCourseCodes.size > 0) {
      filteredSubjects = (subjData || []).filter((s) => {
        const sName = (s.name || '').trim().toLowerCase();
        const sCode = (s.code || '').trim().toUpperCase();
        return (
          teacherCourseNames.has(sName) ||
          teacherCourseCodes.has(sCode) ||
          Array.from(teacherCourseNames).some((tc) => tc.includes(sName) || sName.includes(tc))
        );
      });

      // Tambahkan subject yang ada di penugasan guru tapi belum ada di master subjData
      teacherCourseNames.forEach((nameLower) => {
        const exists = filteredSubjects.some((s) => (s.name || '').toLowerCase() === nameLower || (s.name || '').toLowerCase().includes(nameLower));
        if (!exists) {
          const matchingCode = Array.from(teacherCourseCodes)[0] || nameLower.slice(0, 3).toUpperCase();
          filteredSubjects.push({
            id: `crs-${matchingCode.toLowerCase()}`,
            code: matchingCode,
            name: nameLower.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          });
        }
      });
    }

    // Filter daftar rombel kelas yang diampu
    let filteredClasses = [];
    if (teacherClassCodes.size > 0) {
      filteredClasses = (clsData || []).filter((cls) => {
        const cleanName = (cls.name || '').replace(/^Kelas\s*/i, '').trim().toUpperCase();
        return (
          teacherClassCodes.has(cleanName) ||
          Array.from(teacherClassCodes).some((tc) => tc.includes(cleanName) || cleanName.includes(tc))
        );
      });

      teacherClassCodes.forEach((cName) => {
        const exists = filteredClasses.some((c) => (c.name || '').toUpperCase() === cName);
        if (!exists) {
          filteredClasses.push({
            id: `cls-${cName.toLowerCase()}`,
            name: cName,
          });
        }
      });
    }

    return {
      isGuru: true,
      subjects: filteredSubjects,
      classes: filteredClasses,
      assignments: myAssignments,
    };
  },

  getStudentExamSession: async (examId, studentId) => {
    const sessionKey = `exam_session_${examId}_${studentId || 'demo'}`;
    const localSess = getLocal(sessionKey, null);

    // Prioritaskan data sesi dan nilai resmi langsung dari database PostgreSQL server
    try {
      const res = await fetchJson(`/exams/${examId}/session?student_id=${encodeURIComponent(studentId || '')}`);
      if (res?.success && res?.data) {
        const serverSess = res.data;
        const merged = {
          ...(localSess || {}),
          ...serverSess,
          id: serverSess.sessionId || serverSess.id || localSess?.id,
          sessionId: serverSess.sessionId || serverSess.id || localSess?.sessionId,
          status: serverSess.status || localSess?.status,
          score: serverSess.score !== undefined && serverSess.score !== null ? serverSess.score : localSess?.score,
          submittedAt: serverSess.submittedAt || serverSess.submitted_at || localSess?.submittedAt,
        };
        setLocal(sessionKey, merged);
        return merged;
      }
    } catch (_) {}

    return localSess;
  },

  startExamSession: async (examId, token, student) => {
    const exam = await elearningApi.getExamById(examId);
    if (!exam) throw new Error('Ujian tidak ditemukan!');
    if (exam.token && exam.token.toUpperCase() !== token.trim().toUpperCase()) {
      throw new Error('Token ujian tidak valid! Periksa token yang diberikan pengawas.');
    }

    const studentId = String(student?.id || student?.nisn || 'std-demo');
    const studentName = student?.fullName || student?.full_name || student?.name || 'Siswa Spenspra';
    const className = student?.className || student?.class_name || exam.className || '7A';

    // 1. Daftarkan dan aktifkan sesi secara resmi di server PostgreSQL
    let serverSessionId = null;
    try {
      const res = await fetchJson(`/exams/${examId}/start`, {
        method: 'POST',
        body: JSON.stringify({
          token: token.trim().toUpperCase(),
          student_id: studentId,
          studentId: studentId,
          student_name: studentName,
          studentName: studentName,
          class_code: className,
          className: className,
        }),
      });
      if (res?.success && res?.data) {
        serverSessionId = res.data.id || res.data.sessionId;
      }
    } catch (e) {
      console.warn('Sync sesi ujian ke backend:', e);
    }

    const sessionKey = `exam_session_${examId}_${studentId}`;
    let existing = getLocal(sessionKey, null);
    if (existing && existing.status !== 'SUBMITTED') {
      if (serverSessionId && existing.sessionId !== serverSessionId) {
        existing.sessionId = serverSessionId;
        setLocal(sessionKey, existing);
      }
      return existing;
    }

    const newSession = {
      sessionId: serverSessionId || `ses-${Date.now()}`,
      examId,
      studentId,
      studentName,
      className,
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

    // Sync juga ke live monitoring store lokal agar guru langsung melihat
    const monitorKey = `proctoring_${examId}`;
    const liveSessions = getLocal(monitorKey, []);
    const idx = liveSessions.findIndex((s) => s.studentId === studentId);
    if (idx >= 0) {
      liveSessions[idx] = newSession;
    } else {
      liveSessions.push(newSession);
    }
    setLocal(monitorKey, liveSessions);

    return newSession;
  },

  saveAnswer: async (sessionId, examId, studentId, questionId, selectedOption, essayAnswer = '', isDoubtful = false) => {
    const sId = String(studentId || 'demo');
    const effId = sessionId;

    // Save locally under multiple possible session keys for fallback resiliency
    const possibleKeys = [
      `exam_session_${examId}_${sId}`,
      effId ? `exam_session_${effId}` : null,
    ].filter(Boolean);

    let session = null;
    let targetKey = possibleKeys[0];

    for (const key of possibleKeys) {
      const found = getLocal(key, null);
      if (found) {
        session = found;
        targetKey = key;
        break;
      }
    }

    if (!session && typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`exam_session_${examId}_`)) {
            const found = getLocal(k, null);
            if (found) {
              session = found;
              targetKey = k;
              break;
            }
          }
        }
      } catch (_) {}
    }

    if (session) {
      if (!session.answers) session.answers = {};
      const prevAns = session.answers[questionId] || {};
      let parsedMatching = prevAns.matchingAnswers;
      let parsedOptions = prevAns.selectedOptions;
      if (typeof selectedOption === 'string' && selectedOption.trim().startsWith('{')) {
        try {
          parsedMatching = JSON.parse(selectedOption);
        } catch (_) {}
      } else if (typeof selectedOption === 'string' && selectedOption.includes(',')) {
        parsedOptions = selectedOption.split(',').map((s) => s.trim()).filter(Boolean);
      }
      session.answers[questionId] = {
        ...prevAns,
        questionId,
        selectedOption,
        ...(parsedOptions ? { selectedOptions: parsedOptions } : {}),
        ...(parsedMatching ? { matchingAnswers: parsedMatching } : {}),
        essayAnswer,
        isDoubtful,
        updatedAt: new Date().toISOString(),
      };
      if (!session.doubtfuls) session.doubtfuls = {};
      session.doubtfuls[questionId] = isDoubtful;
      setLocal(targetKey, session);

      // Sync to teacher live monitoring store
      const monitorKey = `proctoring_${examId}`;
      const liveSessions = getLocal(monitorKey, []);
      const effSessionId = effId || session.sessionId;
      const idx = liveSessions.findIndex((s) => s.sessionId === effSessionId || s.studentId === sId);
      if (idx >= 0) {
        liveSessions[idx] = { ...liveSessions[idx], ...session };
      } else {
        liveSessions.push(session);
      }
      setLocal(monitorKey, liveSessions);
    }

    // ALWAYS SEND TO BACKEND DATABASE REGARDLESS OF LOCAL STORAGE
    const finalSessionId = effId || session?.sessionId;
    if (finalSessionId) {
      fetchJson(`/sessions/${finalSessionId}/answers`, {
        method: 'POST',
        body: JSON.stringify({
          questionId,
          question_id: questionId,
          selectedOption,
          selected_option: selectedOption,
          essayAnswer,
          essay_answer: essayAnswer,
          isDoubtful,
          is_doubtful: isDoubtful,
        }),
      }).catch((e) => {
        console.warn('Gagal sync answer ke backend:', e);
      });
    }
  },

  recordViolationLog: async (sessionId, examId, studentId, violation) => {
    const sId = studentId || 'demo';
    const sessionKey = `exam_session_${examId}_${sId}`;
    const session = getLocal(sessionKey, null);
    if (!session) return;

    const vType = violation.type || violation.violation_type || 'WINDOW_BLUR';
    let vDesc = violation.description || violation.message || '';
    if (!vDesc || (typeof vDesc === 'string' && (vDesc.trim().startsWith('{') || vDesc.includes('visibilityState')))) {
      if (vType === 'WINDOW_BLUR') vDesc = 'Layar ujian tertutup sementara karena muncul notifikasi lain, menarik bilah atas HP, atau berpindah aplikasi.';
      else if (vType === 'TAB_SWITCH') vDesc = 'Membuka tab baru di browser atau beralih ke jendela browser lain.';
      else if (vType === 'FULLSCREEN_EXIT') vDesc = 'Keluar dari mode layar penuh (fullscreen) ujian.';
      else if (vType === 'PAGE_HIDE') vDesc = 'Aplikasi ujian disembunyikan atau diminimalkan ke latar belakang.';
      else if (vType === 'INSPECT_ATTEMPT') vDesc = 'Mencoba membuka inspect element atau menu pengembang peramban.';
      else if (vType === 'SUPERVISOR_UNLOCK') vDesc = 'Kunci ujian berhasil dibuka kembali oleh pengawas dengan token / PIN resmi.';
      else if (vType === 'MAX_VIOLATIONS_REACHED') vDesc = 'Layar ujian terkunci otomatis karena terdeteksi keluar dari layar ujian.';
      else vDesc = 'Terdeteksi keluar dari layar ujian CBT.';
    }
    const timestamp = violation.timestamp || new Date().toISOString();

    const isActualCheatingViolation = ['WINDOW_BLUR', 'TAB_SWITCH', 'FULLSCREEN_EXIT', 'INSPECT_ATTEMPT', 'PAGE_HIDE'].includes(vType);

    // HANYA tambah hitungan pelanggaran jika benar-benar pelanggaran kecurangan siswa (Bukan Buka Kunci Pengawas / Auto-Lock sistem)
    if (isActualCheatingViolation) {
      session.violationsCount = (session.violationsCount || 0) + 1;
    }

    // Jika buka kunci pengawas, pastikan status sesi kembali aktif (IN_PROGRESS)
    if (vType === 'SUPERVISOR_UNLOCK') {
      session.status = 'IN_PROGRESS';
    }

    session.violations = session.violations || [];

    // Hindari duplikasi jika event MAX_VIOLATIONS_REACHED dipicu berbarengan dengan event pelanggaran terakhir
    const isRedundantMaxViolation = vType === 'MAX_VIOLATIONS_REACHED' && session.violations.some((v) => v.type === 'MAX_VIOLATIONS_REACHED');
    if (!isRedundantMaxViolation) {
      session.violations.push({
        id: `viol-${Date.now()}`,
        type: vType,
        violation_type: vType,
        category: isActualCheatingViolation ? 'VIOLATION' : (vType === 'SUPERVISOR_UNLOCK' ? 'SUPERVISOR_ACTION' : 'SYSTEM_LOG'),
        description: vDesc,
        details: violation.details || vDesc,
        timestamp,
      });
    }

    if (session.violationsCount >= (session.maxViolations || 3) && vType !== 'SUPERVISOR_UNLOCK') {
      session.status = 'LOCKED';
    }

    setLocal(sessionKey, session);

    // Sync to teacher live monitoring store
    const monitorKey = `proctoring_${examId}`;
    const liveSessions = getLocal(monitorKey, []);
    const effSessionId = sessionId || session.sessionId;
    const idx = liveSessions.findIndex((s) => s.sessionId === effSessionId || s.studentId === sId);
    if (idx >= 0) {
      liveSessions[idx] = { ...liveSessions[idx], ...session };
    } else {
      liveSessions.push(session);
    }
    setLocal(monitorKey, liveSessions);

    // Call backend async
    if (effSessionId) {
      fetchJson(`/sessions/${effSessionId}/violations`, {
        method: 'POST',
        body: JSON.stringify({
          type: vType,
          violation_type: vType,
          description: vDesc,
          details: vDesc,
          student_id: sId,
          studentId: sId,
        }),
      }).catch((e) => {
        console.warn('Gagal sync violation ke backend:', e);
      });
    }

    return session;
  },

  finishExamSession: async (sessionId, examId, studentId, inMemoryAnswers = null) => {
    const sId = String(studentId || 'demo');
    const effSessionId = sessionId;

    let session = getLocal(`exam_session_${examId}_${sId}`, null);
    if (!session && typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`exam_session_${examId}_`)) {
            const found = getLocal(k, null);
            if (found) {
              session = found;
              break;
            }
          }
        }
      } catch (_) {}
    }

    const mergedAnswers = {
      ...(session?.answers || {}),
      ...(inMemoryAnswers || {}),
    };

    // Hitung skor otomatis untuk seluruh butir soal ujian
    const questions = await elearningApi.getExamQuestions(examId);
    let correctCount = 0;
    let totalAutoGraded = 0;
    let totalEssay = 0;
    let totalAutoPoints = 0;
    let totalExamPoints = 0;
    let earnedAutoPoints = 0;

    const reviewItems = questions.map((q, idx) => {
      const qPoints = Number(q.points) > 0 ? Number(q.points) : 10;
      totalExamPoints += qPoints;
      const ans = mergedAnswers[q.id] || {};
      let isCorrect = false;
      let studentAnswerDisplay = '-';
      let correctAnswerDisplay = '-';

      if (q.type === 'MCQ') {
        totalAutoGraded += 1;
        totalAutoPoints += qPoints;
        const studentOptKey = (ans.selectedOption || '').trim().toUpperCase();
        const correctOptKey = (q.correctOption || '').trim().toUpperCase();
        isCorrect = Boolean(studentOptKey && studentOptKey === correctOptKey);
        if (isCorrect) {
          correctCount += 1;
          earnedAutoPoints += qPoints;
        }
        const sOpt = (q.options || []).find((o) => o.key === studentOptKey);
        const cOpt = (q.options || []).find((o) => o.key === correctOptKey);
        studentAnswerDisplay = studentOptKey ? `${studentOptKey}. ${sOpt?.text || ''}` : 'Tidak dijawab';
        correctAnswerDisplay = correctOptKey ? `${correctOptKey}. ${cOpt?.text || ''}` : '-';
      } else if (q.type === 'COMPLEX_MCQ') {
        totalAutoGraded += 1;
        totalAutoPoints += qPoints;
        const studentOpts = Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0
          ? ans.selectedOptions
          : (typeof ans.selectedOption === 'string' && ans.selectedOption && !ans.selectedOption.startsWith('{')
              ? ans.selectedOption.split(',').map((s) => s.trim()).filter(Boolean)
              : []);
        const correctOpts = Array.isArray(q.correctOptions) && q.correctOptions.length > 0
          ? q.correctOptions
          : (q.correctOption ? [q.correctOption] : []);
        const sortedStudent = [...studentOpts].map((s) => s.toUpperCase()).sort().join(',');
        const sortedCorrect = [...correctOpts].map((s) => s.toUpperCase()).sort().join(',');
        isCorrect = Boolean(sortedStudent && sortedStudent === sortedCorrect);
        if (isCorrect) {
          correctCount += 1;
          earnedAutoPoints += qPoints;
        }
        studentAnswerDisplay = studentOpts.length > 0 ? studentOpts.join(', ') : 'Tidak dijawab';
        correctAnswerDisplay = correctOpts.length > 0 ? correctOpts.join(', ') : '-';
      } else if (q.type === 'TRUE_FALSE') {
        totalAutoGraded += 1;
        totalAutoPoints += qPoints;
        const studentAns = String(ans.selectedOption || (ans.trueFalseAnswer !== undefined ? (ans.trueFalseAnswer ? 'TRUE' : 'FALSE') : '')).toUpperCase();
        const expected = String(q.trueFalseAnswer !== undefined ? (q.trueFalseAnswer ? 'TRUE' : 'FALSE') : (q.correctOption || 'TRUE')).toUpperCase();
        isCorrect = Boolean(studentAns && (studentAns === expected || (studentAns === 'TRUE' && expected === 'BENAR') || (studentAns === 'FALSE' && expected === 'SALAH')));
        if (isCorrect) {
          correctCount += 1;
          earnedAutoPoints += qPoints;
        }
        studentAnswerDisplay = (studentAns === 'TRUE' || studentAns === 'BENAR') ? 'Benar' : (studentAns === 'FALSE' || studentAns === 'SALAH') ? 'Salah' : 'Tidak dijawab';
        correctAnswerDisplay = (expected === 'TRUE' || expected === 'BENAR') ? 'Benar' : 'Salah';
      } else if (q.type === 'MATCHING') {
        totalAutoGraded += 1;
        totalAutoPoints += qPoints;
        let matchingAns = ans.matchingAnswers;
        if (!matchingAns && typeof ans.selectedOption === 'string' && ans.selectedOption.startsWith('{')) {
          try {
            matchingAns = JSON.parse(ans.selectedOption);
          } catch (_) {}
        }
        matchingAns = matchingAns || {};
        const pairs = Array.isArray(q.matchingPairs) ? q.matchingPairs : [];
        let matchedCorrect = 0;
        const pairDetails = pairs.map((p, pIdx) => {
          const studentVal =
            matchingAns[p.id] ??
            matchingAns[String(p.id)] ??
            matchingAns[`idx_${pIdx}`] ??
            matchingAns[(p.left || '').trim()] ??
            matchingAns[pIdx + 1] ??
            matchingAns[String(pIdx + 1)] ??
            '';
          const matchOk = Boolean(studentVal && studentVal.trim().toLowerCase() === (p.right || '').trim().toLowerCase());
          if (matchOk) matchedCorrect++;
          return `${p.left} ➔ ${studentVal || '(Kosong)'}${matchOk ? ' (✓)' : ' (✗)'}`;
        });
        const ratio = pairs.length > 0 ? matchedCorrect / pairs.length : 0;
        earnedAutoPoints += Math.round(ratio * qPoints);
        if (ratio === 1) {
          correctCount += 1;
          isCorrect = true;
        } else {
          isCorrect = false;
        }
        studentAnswerDisplay = pairDetails.length > 0 ? pairDetails.join('\n') : 'Tidak dijawab';
        correctAnswerDisplay = pairs.map((p) => `${p.left} ➔ ${p.right}`).join('\n');
      } else if (q.type === 'ESSAY') {
        totalEssay += 1;
        studentAnswerDisplay = ans.essayAnswer || 'Tidak dijawab';
        correctAnswerDisplay = q.essayRubric ? `Rubrik: ${q.essayRubric}` : 'Menunggu koreksi guru';
        isCorrect = null;
      }

      return {
        questionId: q.id,
        questionNumber: q.questionNumber || (idx + 1),
        type: q.type,
        questionText: q.questionText,
        stimulusText: q.stimulusText,
        imageUrl: q.imageUrl,
        options: q.options,
        isCorrect,
        studentAnswerDisplay,
        correctAnswerDisplay,
        points: qPoints,
      };
    });

    const totalQuestionsCount = questions.length;
    const score = totalAutoGraded > 0
      ? (totalExamPoints > 0
          ? Math.round((earnedAutoPoints / totalExamPoints) * 100)
          : Math.round((correctCount / Math.max(1, totalQuestionsCount)) * 100))
      : null;

    if (session) {
      session.status = 'SUBMITTED';
      session.submittedAt = new Date().toISOString();
      session.score = score;
      session.correctCount = correctCount;
      session.totalMcq = totalAutoGraded;
      session.totalEssay = totalEssay;
      session.totalMcqPoints = totalAutoPoints;
      session.earnedMcqPoints = earnedAutoPoints;
      session.isEssayOnly = totalAutoGraded === 0 && totalEssay > 0;
      session.answers = mergedAnswers;
      session.reviewItems = reviewItems;
      setLocal(`exam_session_${examId}_${sId}`, session);

      // Update teacher monitor
      const monitorKey = `proctoring_${examId}`;
      const liveSessions = getLocal(monitorKey, []);
      const activeSessId = effSessionId || session.sessionId;
      const idx = liveSessions.findIndex((s) => s.sessionId === activeSessId || s.studentId === sId);
      if (idx >= 0) {
        liveSessions[idx] = session;
        setLocal(monitorKey, liveSessions);
      }
    }

    // Call backend async and synchronize authoritative score
    const finalSessId = effSessionId || session?.sessionId;
    if (finalSessId) {
      try {
        const res = await fetchJson(`/sessions/${finalSessId}/finish`, {
          method: 'POST',
          body: JSON.stringify({
            score: score !== null ? score : 0,
            answers: mergedAnswers,
          }),
        });
        if (res?.success && res?.data?.score !== undefined && res?.data?.score !== null) {
          if (session) {
            session.score = res.data.score;
            setLocal(`exam_session_${examId}_${sId}`, session);
          }
        }
      } catch (e) {
        console.warn('Gagal finish session ke backend:', e);
      }
    }

    return session || { status: 'SUBMITTED', score, answers: mergedAnswers, reviewItems, correctCount, totalMcq: totalAutoGraded, totalEssay };
  },

  getSessionAnswers: async (sessionId) => {
    if (!sessionId) return {};
    try {
      const res = await fetchJson(`/sessions/${sessionId}/answers`);
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (_) {}
    return {};
  },

  updateSessionScore: async (sessionId, score) => {
    if (!sessionId) return false;
    try {
      const res = await fetchJson(`/sessions/${sessionId}/finish`, {
        method: 'POST',
        body: JSON.stringify({ score: Number(score) || 0 }),
      });
      return Boolean(res?.success);
    } catch (_) {
      return false;
    }
  },


  // =================== PROCTORING MONITOR (GURU) ===================
  getLiveProctoringData: async (examId) => {
    const normalizeSession = (s) => ({
      ...s,
      sessionId: s.sessionId || s.id,
      id: s.id || s.sessionId,
      studentId: String(s.studentId || s.student_id || ''),
      student_id: String(s.student_id || s.studentId || ''),
      studentName: s.studentName || s.student_name || 'Siswa',
      student_name: s.student_name || s.studentName || 'Siswa',
      nisn: s.nisn || s.student_nisn || '-',
      student_nisn: s.student_nisn || s.nisn || '-',
      className: s.className || s.class_code || '-',
      class_code: s.class_code || s.className || '-',
      violationsCount: Number(s.violationsCount ?? s.violation_count ?? 0),
      violation_count: Number(s.violation_count ?? s.violationsCount ?? 0),
      status: s.status || 'IN_PROGRESS',
      violations: Array.isArray(s.violations) ? s.violations : [],
      answers: s.answers || {},
    });

    const res = await fetchJson(`/exams/${examId}/monitoring`);
    let serverSessions = [];
    if (res?.success && res?.data) {
      if (Array.isArray(res.data)) serverSessions = res.data;
      else if (Array.isArray(res.data.sessions)) serverSessions = res.data.sessions;
    }

    const monitorKey = `proctoring_${examId}`;
    const localList = getLocal(monitorKey, []);

    // Gabungkan sesi dari server backend dan cache lokal (deduplikasi by studentId / sessionId)
    const combinedMap = new Map();
    (Array.isArray(localList) ? localList : []).forEach((s) => {
      const key = String(s.sessionId || s.studentId || s.id || '');
      if (key) combinedMap.set(key, s);
    });
    serverSessions.forEach((s) => {
      const key = String(s.sessionId || s.studentId || s.id || '');
      const existing = combinedMap.get(key) || {};
      const mergedAnswers = { ...(existing.answers || {}), ...(s.answers || {}) };
      if (key) combinedMap.set(key, { ...existing, ...s, answers: mergedAnswers });
    });

    const allSessions = Array.from(combinedMap.values());
    return allSessions.map(normalizeSession);
  },


  unlockStudentSession: async (examId, sessionId) => {
    const monitorKey = `proctoring_${examId}`;
    const liveSessions = getLocal(monitorKey, []);
    const idx = liveSessions.findIndex((s) => s.sessionId === sessionId || s.id === sessionId);
    if (idx >= 0) {
      liveSessions[idx].status = 'IN_PROGRESS';
      liveSessions[idx].violationsCount = Math.max(0, (liveSessions[idx].violationsCount || 3) - 1);
      setLocal(monitorKey, liveSessions);

      const studentId = liveSessions[idx].studentId || liveSessions[idx].student_id;
      const sessionKey = `exam_session_${examId}_${studentId}`;
      const session = getLocal(sessionKey, null);
      if (session) {
        session.status = 'IN_PROGRESS';
        session.status = 'IN_PROGRESS';
        session.violationsCount = liveSessions[idx].violationsCount;
        setLocal(sessionKey, session);
      }
    }

    if (sessionId) {
      await fetchJson(`/sessions/${sessionId}/unlock`, { method: 'POST' }).catch(() => {});
    }
    return true;
  },

  getUASClassRecap: async (className) => {
    // 1. Ambil daftar siswa riil di kelas dari SSO (Zero Dummy)
    const rawStudents = await elearningApi.getStudentsByClass(className);
    const students = Array.isArray(rawStudents) ? rawStudents : [];
    if (students.length === 0) {
      return { className, students: [], subjects: [], uasExams: [], matrix: [], subjectStats: {} };
    }

    // 2. Ambil daftar mapel resmi dari SSO
    const rawSubjects = await elearningApi.getSubjects();
    const subjects = Array.isArray(rawSubjects) ? rawSubjects : [];

    // 3. Ambil seluruh ujian CBT bertipe SEMESTER_UAS yang berlaku untuk kelas ini
    const allExams = await elearningApi.getExams();
    const normalize = (c) => String(c || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const cNorm = normalize(className);

    const uasExams = (allExams || []).filter((ex) => {
      const isUasType = ex.examCategory === 'SEMESTER_UAS' || ex.isCoordinatorExam || Boolean(ex.targetGradeLevel);
      if (!isUasType) return false;

      if (ex.targetClasses && Array.isArray(ex.targetClasses) && ex.targetClasses.length > 0) {
        return ex.targetClasses.some((tc) => normalize(tc) === cNorm);
      }
      if (ex.targetGradeLevel) {
        return cNorm.startsWith(String(ex.targetGradeLevel));
      }
      return normalize(ex.className) === cNorm;
    });

    // 4. Kumpulkan seluruh hasil/sesi ujian untuk ujian-ujian tersebut
    const examResultsMap = new Map();
    for (const ex of uasExams) {
      try {
        const sessions = await elearningApi.getExamMonitorSessions(ex.id);
        (sessions || []).forEach((sess) => {
          const sId = String(sess.studentId || sess.student_id || sess.id || '');
          if (sId) {
            const score = typeof sess.score === 'number' ? sess.score : (Number(sess.score) || 0);
            examResultsMap.set(`${ex.id}_${sId}`, { score, status: sess.status });
          }
        });
      } catch (_) {}
    }

    // 5. Susun matriks nilai per siswa untuk setiap mata pelajaran resmi SSO
    const matrix = students.map((std, idx) => {
      const sId = String(std.id || std.nisn || std.username || '');
      const studentName = std.name || std.fullName || std.full_name || `Siswa ${idx + 1}`;
      const nisn = std.nisn || std.nis || std.username || '-';

      const subjectScores = {};
      let totalScore = 0;
      let countWithScore = 0;

      subjects.forEach((sb) => {
        const matchedExam = uasExams.find((ex) =>
          (ex.subjectCode && sb.code && ex.subjectCode === sb.code) ||
          (ex.subject && sb.name && ex.subject.toLowerCase() === sb.name.toLowerCase())
        );

        if (matchedExam) {
          const res = examResultsMap.get(`${matchedExam.id}_${sId}`);
          if (res !== undefined) {
            subjectScores[sb.code || sb.name] = res.score;
            totalScore += res.score;
            countWithScore += 1;
          } else {
            subjectScores[sb.code || sb.name] = null;
          }
        } else {
          subjectScores[sb.code || sb.name] = null;
        }
      });

      const average = countWithScore > 0 ? Number((totalScore / countWithScore).toFixed(1)) : null;

      return {
        studentId: sId,
        nisn,
        name: studentName,
        scores: subjectScores,
        totalScore,
        average,
        completedCount: countWithScore,
        totalUasExams: uasExams.length,
      };
    });

    // Hitung Peringkat / Rank Kelas
    const sorted = [...matrix].sort((a, b) => (b.average || 0) - (a.average || 0));
    sorted.forEach((item, rIdx) => {
      const original = matrix.find((m) => m.studentId === item.studentId);
      if (original) original.rank = item.average !== null ? rIdx + 1 : '-';
    });

    // Hitung Statistik Nilai per Mapel
    const subjectStats = {};
    subjects.forEach((sb) => {
      const key = sb.code || sb.name;
      const validScores = matrix.map((m) => m.scores[key]).filter((s) => s !== null && typeof s === 'number');
      if (validScores.length > 0) {
        const sum = validScores.reduce((acc, v) => acc + v, 0);
        subjectStats[key] = {
          average: Number((sum / validScores.length).toFixed(1)),
          highest: Math.max(...validScores),
          lowest: Math.min(...validScores),
          count: validScores.length,
        };
      } else {
        subjectStats[key] = { average: null, highest: null, lowest: null, count: 0 };
      }
    });

    return {
      className,
      students,
      subjects,
      uasExams,
      matrix,
      subjectStats,
    };
  },
};
