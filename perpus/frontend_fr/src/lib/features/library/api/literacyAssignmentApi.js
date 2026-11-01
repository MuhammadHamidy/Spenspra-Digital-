/**
 * Service API & State Management untuk Tugas Kegiatan Literasi Siswa (Tersambung SSO)
 */

const STORAGE_ASSIGNMENTS_KEY = 'spenspra_literacy_assignments';
const STORAGE_SUBMISSIONS_KEY = 'spenspra_literacy_submissions';

// Data bawaan awal (Seed realistis jika storage masih kosong)
const DEFAULT_ASSIGNMENTS = [
  {
    id: 'lit-task-001',
    title: 'Kegiatan Literasi Bersama: Resensi Novel Sejarah & Tokoh Inspiratif',
    description: 'Pilihlah satu buku fiksi sejarah, novel biografi, atau tokoh nasional di perpustakaan. Tuliskan ringkasan alur cerita serta 3 nilai keteladanan yang dapat diterapkan dalam kehidupan sehari-hari.',
    target_type: 'ALL', // 'ALL' | 'GRADE' | 'SPECIFIC'
    target_classes: ['Semua Kelas'],
    book_requirement: 'ANY_BOOK',
    book_title: '',
    due_date: '2026-11-15T23:59:00',
    created_by: 'Admin Perpustakaan SMPN 1 Prambon',
    status: 'ACTIVE',
    created_at: '2026-10-28T08:00:00Z',
  },
  {
    id: 'lit-task-002',
    title: 'Pekan Literasi Sains & Lingkungan Hidup Kelas 7',
    description: 'Bacalah buku tentang pelestarian alam, sains populer, atau pemanasan global. Uraikan intisari masalah lingkungan yang dibahas dan aksi nyata yang bisa dilakukan di lingkungan sekolah.',
    target_type: 'SPECIFIC',
    target_classes: ['Kelas 7A', 'Kelas 7B', 'Kelas 7C', 'Kelas 7D', 'Kelas 7E', 'Kelas 7F'],
    book_requirement: 'ANY_BOOK',
    book_title: '',
    due_date: '2026-11-10T15:00:00',
    created_by: 'Budi Santoso, S.Pd. (Pustakawan)',
    status: 'ACTIVE',
    created_at: '2026-10-30T09:30:00Z',
  },
];

const DEFAULT_SUBMISSIONS = [
  {
    id: 'sub-001',
    assignment_id: 'lit-task-001',
    student_id: 'std-001',
    student_name: 'Ahmad Fauzi',
    student_nisn: '202607011',
    student_class: 'Kelas 7A',
    book_title: 'Bumi Manusia',
    book_author: 'Pramoedya Ananta Toer',
    pages_read: 45,
    summary: 'Minke seorang pemuda pribumi yang gigih belajar dan mempertahankan prinsip keadilan di tengah diskriminasi zaman kolonial. Dia mencintai tulisan dan ilmu pengetahuan modern.',
    moral_value: 'Pendidikan harus melahirkan keberanian untuk bersikap adil sejak dalam pikiran, serta pantang menyerah dalam membela kebenaran.',
    submitted_at: '2026-11-01T08:15:00Z',
    score: null,
    grader_name: null,
    teacher_notes: null,
    status: 'MENUNGGU_KOREKSI',
  },
  {
    id: 'sub-002',
    assignment_id: 'lit-task-001',
    student_id: 'std-002',
    student_name: 'Siti Nurhaliza',
    student_nisn: '202607012',
    student_class: 'Kelas 7B',
    book_title: 'Laskar Pelangi',
    book_author: 'Andrea Hirata',
    pages_read: 60,
    summary: 'Kisah 10 anak di Belitung yang memiliki semangat membara menuntut ilmu di SD Muhammadiyah Gantong walau dengan kondisi fasilitas yang serba kekurangan.',
    moral_value: 'Keterbatasan ekonomi bukan penghalang untuk meraih impian dan cita-cita yang tinggi.',
    submitted_at: '2026-10-31T13:40:00Z',
    score: 92,
    grader_name: 'Ibu Conie, S.Pd. (Wali Kelas 7B)',
    teacher_notes: 'Rangkuman sangat rapi dan refleksi nilai moral sangat menginspirasi. Pertahankan!',
    status: 'DINILAI',
  },
  {
    id: 'sub-003',
    assignment_id: 'lit-task-002',
    student_id: 'std-003',
    student_name: 'Rizky Ramadhan',
    student_nisn: '202607018',
    student_class: 'Kelas 7B',
    book_title: 'Menyelamatkan Bumi dari Sampah Plastik',
    book_author: 'Dr. Ir. Hendra Kusuma',
    pages_read: 30,
    summary: 'Buku ini menguraikan dampak limbah mikroplastik bagi ekosistem laut dan kesehatan manusia, serta solusi 3R (Reduce, Reuse, Recycle) yang bisa dimulai dari kantin sekolah.',
    moral_value: 'Membawa tumbler dan wadah makanan sendiri dari rumah adalah langkah kecil yang berdampak besar bagi kelestarian lingkungan.',
    submitted_at: '2026-11-01T07:20:00Z',
    score: 88,
    grader_name: 'Ibu Conie, S.Pd. (Wali Kelas 7B)',
    teacher_notes: 'Contoh aksi nyata sangat aplikatif untuk program Adiwiyata Spenspra.',
    status: 'DINILAI',
  },
];

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
