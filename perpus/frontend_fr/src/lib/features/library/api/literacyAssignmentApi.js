/**
 * Service API & State Management untuk Tugas Kegiatan Literasi Siswa (Tersambung SSO)
 */

const STORAGE_ASSIGNMENTS_KEY = 'spenspra_literacy_assignments';
const STORAGE_SUBMISSIONS_KEY = 'spenspra_literacy_submissions';

// Data awal kosong - terisi dari kegiatan literasi dan submit siswa riil
const DEFAULT_ASSIGNMENTS = [];
const DEFAULT_SUBMISSIONS = [];

export const literacyAssignmentApi = {
  /**
   * Mengambil semua daftar tugas kegiatan literasi
   */
  getAssignments: () => {
    if (typeof window === 'undefined') return DEFAULT_ASSIGNMENTS;
    try {
      const stored = localStorage.getItem(STORAGE_ASSIGNMENTS_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_ASSIGNMENTS_KEY, JSON.stringify(DEFAULT_ASSIGNMENTS));
        return DEFAULT_ASSIGNMENTS;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.warn('Gagal membaca assignments:', e);
      return DEFAULT_ASSIGNMENTS;
    }
  },

  /**
   * Membuat tugas kegiatan literasi baru oleh Admin Perpus / Guru
   */
  createAssignment: (data) => {
    if (typeof window === 'undefined') return null;
    const list = literacyAssignmentApi.getAssignments();
    const newId = `lit-task-${Date.now()}`;
    const newAssignment = {
      id: newId,
      title: data.title || 'Kegiatan Literasi Baru',
      description: data.description || '',
      target_type: data.target_type || 'ALL',
      target_classes: data.target_classes || ['Semua Kelas'],
      book_requirement: data.book_requirement || 'ANY_BOOK',
      book_title: data.book_title || '',
      due_date: data.due_date || new Date(Date.now() + 7 * 86400000).toISOString(),
      created_by: data.created_by || 'Admin Perpustakaan',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    list.unshift(newAssignment);
    localStorage.setItem(STORAGE_ASSIGNMENTS_KEY, JSON.stringify(list));
    return newAssignment;
  },

  /**
   * Menghapus tugas kegiatan literasi
   */
  deleteAssignment: (id) => {
    if (typeof window === 'undefined') return false;
    const list = literacyAssignmentApi.getAssignments().filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_ASSIGNMENTS_KEY, JSON.stringify(list));
    return true;
  },

  /**
   * Mengambil semua submission (pengumpulan tugas)
   */
  getSubmissions: (assignmentId = '', classFilter = 'ALL') => {
    if (typeof window === 'undefined') return DEFAULT_SUBMISSIONS;
    try {
      const stored = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
      let list = stored ? JSON.parse(stored) : null;
      if (!list || list.length === 0) {
        localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(DEFAULT_SUBMISSIONS));
        list = DEFAULT_SUBMISSIONS;
      }

      if (assignmentId) {
        list = list.filter((s) => s.assignment_id === assignmentId);
      }

      if (classFilter && classFilter !== 'ALL') {
        const normalizedTarget = classFilter.toLowerCase().replace(/[^a-z0-9]/g, '');
        list = list.filter((s) => {
          const sClass = (s.student_class || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return sClass.includes(normalizedTarget) || normalizedTarget.includes(sClass);
        });
      }

      return list;
    } catch (e) {
      console.warn('Gagal membaca submissions:', e);
      return DEFAULT_SUBMISSIONS;
    }
  },

  /**
   * Siswa mengirimkan tugas literasi (Tersambung Profil SSO)
   */
  submitAssignment: (submissionData) => {
    if (typeof window === 'undefined') return null;
    const list = literacyAssignmentApi.getSubmissions();
    const newSubmission = {
      id: `sub-${Date.now()}`,
      assignment_id: submissionData.assignment_id,
      student_id: submissionData.student_id || 'siswa-sso',
      student_name: submissionData.student_name || 'Siswa Spenspra',
      student_nisn: submissionData.student_nisn || '-',
      student_class: submissionData.student_class || 'Kelas 7A',
      book_title: submissionData.book_title || '',
      book_author: submissionData.book_author || '',
      pages_read: parseInt(submissionData.pages_read || '1', 10),
      summary: submissionData.summary || '',
      moral_value: submissionData.moral_value || '',
      submitted_at: new Date().toISOString(),
      score: null,
      grader_name: null,
      teacher_notes: null,
      status: 'MENUNGGU_KOREKSI',
    };

    // Cek apakah siswa sudah pernah mengumpulkan tugas ini sebelumnya -> replace/update
    const existingIndex = list.findIndex(
      (s) =>
        s.assignment_id === submissionData.assignment_id &&
        (s.student_id === submissionData.student_id || s.student_nisn === submissionData.student_nisn)
    );

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newSubmission, id: list[existingIndex].id };
    } else {
      list.unshift(newSubmission);
    }

    localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(list));
    return newSubmission;
  },

  /**
   * Guru / Admin menilai tugas pengumpulan siswa
   */
  gradeSubmission: (submissionId, gradeData) => {
    if (typeof window === 'undefined') return false;
    const list = literacyAssignmentApi.getSubmissions();
    const idx = list.findIndex((s) => s.id === submissionId);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        score: parseInt(gradeData.score, 10),
        grader_name: gradeData.grader_name || 'Guru / Pustakawan',
        teacher_notes: gradeData.teacher_notes || '',
        status: 'DINILAI',
        graded_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(list));
      return list[idx];
    }
    return null;
  },

  /**
   * Helper untuk memeriksa apakah tugas cocok dengan kelas siswa dari SSO
   */
  isTaskTargetingStudent: (assignment, studentClass) => {
    if (!assignment) return false;
    if (assignment.target_type === 'ALL') return true;

    if (!studentClass) return false;
    const normalizedStudent = studentClass.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Cek apakah target mengandung 'Semua Kelas'
    if (assignment.target_classes.some((c) => c.toLowerCase().includes('semua'))) {
      return true;
    }

    // Cek jenjang (contoh: 7, 8, 9)
    if (assignment.target_type === 'GRADE') {
      return assignment.target_classes.some((c) => {
        const norm = c.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedStudent.startsWith(norm) || norm.startsWith(normalizedStudent);
      });
    }

    // Cek kelas spesifik (misal: 7A, 7B)
    return assignment.target_classes.some((c) => {
      const norm = c.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedStudent.includes(norm) || norm.includes(normalizedStudent);
    });
  },
};
