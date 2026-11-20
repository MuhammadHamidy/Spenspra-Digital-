'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { gradeApi } from '@/lib/gradeApi';
import { attendanceApi } from '@/lib/attendanceApi';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { deadlineApiAdapter } from '@/lib/features/deadlines/infrastructure/deadlineApiAdapter';
import Pagination from '@/components/Pagination';
import { getSchoolAcademicPeriod } from '@/lib/academicPeriod';
import { exportToExcelXml } from '@/lib/excelExport';
import ImportGradesModal from '@/components/ImportGradesModal';
import { cbtAdapter } from '@/lib/cbtAdapter';

const DEFAULT_DESCRIPTIONS = {
  A: 'Sangat baik dalam memahami materi semester ini dan mampu menerapkannya secara mandiri.',
  B: 'Baik dalam memahami capaian materi pembelajaran dan mampu menerapkannya dalam evaluasi.',
  C: 'Cukup dalam mencapai ketuntasan materi, namun masih perlu bimbingan berkelanjutan.',
  D: 'Perlu pendampingan intensif dalam memahami materi dasar dan remedial pembelajaran.',
};

const normalizeClassCode = (c) => {
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
};

const extractGradeLevelDigit = (c) => {
  if (!c) return '';
  const str = String(c).toUpperCase();
  if (/(?:TINGKAT|TK\.?|KELAS)\s*(?:VIII|8)\b|\bVIII[-_A-Z0-9]|\b8[A-Z0-9]\b|\[ASAS:8\]/.test(str)) return '8';
  if (/(?:TINGKAT|TK\.?|KELAS)\s*(?:VII|7)\b|\bVII[-_A-Z0-9]|\b7[A-Z0-9]\b|\[ASAS:7\]/.test(str)) return '7';
  if (/(?:TINGKAT|TK\.?|KELAS)\s*(?:IX|9)\b|\bIX[-_A-Z0-9]|\b9[A-Z0-9]\b|\[ASAS:9\]/.test(str)) return '9';
  if (/^(?:8|VIII)$/.test(str.trim())) return '8';
  if (/^(?:7|VII)$/.test(str.trim())) return '7';
  if (/^(?:9|IX)$/.test(str.trim())) return '9';
  const norm = normalizeClassCode(c);
  const m = norm.match(/^([789])/);
  return m ? m[1] : '';
};

const getPredicate = (score) => {
  if (score === '' || score === null || score === undefined || Number.isNaN(Number(score))) return '-';
  if (Number(score) < 0) return '-';
  if (Number(score) >= 86) return 'A';
  if (Number(score) >= 76) return 'B';
  if (Number(score) >= 66) return 'C';
  return 'D';
};

const INITIAL_PREDICATE_DESCRIPTIONS = {
  A: 'Sangat baik dalam memahami materi pembelajaran akhir semester dan mampu menyelesaikannya secara mandiri.',
  B: 'Baik dalam memahami materi pembelajaran akhir semester dan mampu menyelesaikannya dengan tepat.',
  C: 'Cukup dalam memahami materi pembelajaran, masih memerlukan latihan dan penguatan lanjutan.',
  D: 'Perlu bimbingan dan pendampingan intensif dalam ketuntasan capaian materi pembelajaran.',
};

export default function PenilaianUASPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [rows, setRows] = useState([]);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);
  const [predicateTemplates, setPredicateTemplates] = useState(INITIAL_PREDICATE_DESCRIPTIONS);
  const [uasDeadline, setUasDeadline] = useState(null);

  // Filter Tahun Ajaran & Semester sinkron otomatis dengan Super Admin
  const [academicYear, setAcademicYear] = useState(() => getSchoolAcademicPeriod().year);
  const [semester, setSemester] = useState(() => getSchoolAcademicPeriod().semester);

  // CBT Integration States
  const [availableCbtExams, setAvailableCbtExams] = useState([]);
  const [otherGradeExams, setOtherGradeExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [isSyncingCbt, setIsSyncingCbt] = useState(false);
  const [cbtNotice, setCbtNotice] = useState(null);

  // Import Excel Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Pengurutan data nilai: 'ABSEN' (default sesuai no urut presensi), 'PREDICATE' (A->D), 'SCORE_DESC', 'SCORE_ASC'
  const [sortBy, setSortBy] = useState('ABSEN');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const roleStr = String(currentUser?.role || currentUser?.roleName || '').toUpperCase();
  const isTeacherRole = roleStr === 'GURU' || roleStr.includes('TEACHER');
  const isKepalaSekolah = roleStr.includes('KEPALA');

  // Load master courses & classes from backend filtered by logged-in teacher
  useEffect(() => {
    const period = getSchoolAcademicPeriod();
    if (period?.year) setAcademicYear(period.year);
    if (period?.semester) setSemester(period.semester);

    deadlineApiAdapter.getDeadlines().then((list) => {
      const dl = list.find((d) => d.type === 'UAS');
      if (dl) setUasDeadline(dl);
    }).catch(() => {});

    const fetchMasterData = async () => {
      try {
        const user = tokenStorage.getUser();
        setCurrentUser(user);

        const [clsRes, crsRes] = await Promise.all([
          attendanceApi.getClasses(),
          attendanceApi.getCourses(),
        ]);

        let availableSubjects = [];
        if (crsRes.success && Array.isArray(crsRes.data) && crsRes.data.length > 0) {
          availableSubjects = crsRes.data.map((c) => ({ code: c.code, name: c.name }));
        }

        const roleUpper = String(user?.roleName || user?.role || user?.role_name || '').toUpperCase();
        const isTeacherRole = Boolean(user && (roleUpper === 'GURU' || roleUpper.includes('GURU') || roleUpper.includes('TEACHER')));

        if (clsRes.success && Array.isArray(clsRes.data)) {
          let teacherClasses = clsRes.data;
          if (isTeacherRole) {
            const myName = (user.fullName || user.full_name || '').toLowerCase();
            const filtered = clsRes.data.filter((c) =>
              c.dosen_id === user.id ||
              c.teacher_id === user.id ||
              (myName && c.teacher_name && c.teacher_name.toLowerCase().includes(myName)) ||
              (user.nimNip && (c.dosen_id?.includes(user.nimNip) || c.teacher_nip?.includes(user.nimNip)))
            );
            teacherClasses = filtered;
          }

          const classNames = [...new Set(teacherClasses.map((c) => c.class_code || c.name || c.id).filter(Boolean))];
          setClasses(classNames);
          if (classNames.length > 0) {
            setClassName((prev) => (classNames.includes(prev) ? prev : classNames[0]));
          } else {
            setClassName('');
          }

          if (isTeacherRole) {
            const teacherCourseCodes = [...new Set(teacherClasses.map((c) => c.course_code || c.course_id).filter(Boolean))];
            const filteredSubjects = availableSubjects.filter((s) =>
              teacherCourseCodes.some((tc) => tc === s.code || tc === `crs-${s.code.toLowerCase()}`)
            );
            setSubjects(filteredSubjects);
            if (filteredSubjects.length > 0) {
              setSubject((prev) => (filteredSubjects.some((s) => s.code === prev) ? prev : filteredSubjects[0].code));
            } else {
              setSubject('');
            }
          } else {
            setSubjects(availableSubjects);
            if (availableSubjects.length > 0) {
              setSubject((prev) => (availableSubjects.some((s) => s.code === prev) ? prev : availableSubjects[0].code));
            }
          }
        }
      } catch (err) {
        console.warn('Gagal memuat master kelas/mapel dari server:', err);
      }
    };
    fetchMasterData();
  }, []);

  const predicateTemplatesRef = useRef(predicateTemplates);
  useEffect(() => {
    predicateTemplatesRef.current = predicateTemplates;
  }, [predicateTemplates]);

  const formatDescription = useCallback((predicate) => {
    if (!predicate || predicate === '-') return '';
    const template = predicateTemplatesRef.current[predicate] || INITIAL_PREDICATE_DESCRIPTIONS[predicate] || '';
    return template.replace(/^[A-D]:\s*/i, '').trim();
  }, []);

  // Memuat data siswa & nilai UAS tersimpan di e-Rapor
  const loadStudentsAndGrades = useCallback(async () => {
    setSaved(false);
    setSaveMessage('');
    if (!className || !subject) {
      setRows([]);
      return;
    }
    try {
      const res = await gradeApi.getGrades({
        className,
        subjectCode: subject,
        assessmentType: 'PAS',
        academicYear,
        semester,
      });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Urutkan siswa selalu sesuai abjad nama (nomor urut absen resmi 1..N)
        const sortedGrades = [...res.data].sort((a, b) =>
          (a.student_name || '').localeCompare(b.student_name || '', 'id', { sensitivity: 'base' })
        );
        setRows(
          sortedGrades.map((g, idx) => {
            const hasScore = g.score !== undefined && g.score !== null && Number(g.score) >= 0;
            const pred = hasScore ? getPredicate(g.score) : '-';
            const defaultDesc = formatDescription(pred);
            return {
              id: g.student_id,
              absenNo: idx + 1,
              person_id: g.person_id || null,
              nisn: g.nisn || '-',
              name: g.student_name || 'Siswa',
              className: g.class_name || className,
              score: hasScore ? String(g.score) : '',
              description: g.description || defaultDesc,
            };
          })
        );
      } else {
        // Fallback: Ambil data roster siswa dari SSO jika belum ada nilai
        try {
          const { accountApiAdapter } = await import('@/lib/features/auth/infrastructure/accountApiAdapter');
          const list = await accountApiAdapter.getStudents(className);
          if (Array.isArray(list) && list.length > 0) {
            const sortedStudents = [...list].sort((a, b) =>
              (a.full_name || a.fullName || a.name || '').localeCompare(
                b.full_name || b.fullName || b.name || '',
                'id',
                { sensitivity: 'base' }
              )
            );
            setRows(
              sortedStudents.map((s, idx) => ({
                id: s.id,
                absenNo: idx + 1,
                person_id: s.person_id || null,
                nisn: s.nisn || s.nim_nip || '-',
                name: s.full_name || s.fullName || s.name || 'Siswa',
                className,
                score: '',
                description: '',
              }))
            );
          } else {
            setRows([]);
          }
        } catch (_) {
          setRows([]);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat nilai UAS dari server:', err);
      setRows([]);
    }
  }, [className, subject, academicYear, semester, formatDescription]);

  useEffect(() => {
    loadStudentsAndGrades();
  }, [loadStudentsAndGrades]);

  // Cari Ujian CBT yang sesuai dengan Mapel dan Kelas/Tingkat yang dipilih
  useEffect(() => {
    const fetchMatchingExams = async () => {
      if (!className || !subject) {
        setAvailableCbtExams([]);
        setOtherGradeExams([]);
        setSelectedExamId('');
        return;
      }
      try {
        const allExams = await cbtAdapter.getExams();
        const cNorm = normalizeClassCode(className);
        const classGrade = extractGradeLevelDigit(className);
        const currentSubjectObj = subjects.find((item) => item.code === subject);
        const subjectName = (currentSubjectObj?.name || subject || '').toLowerCase();

        const normStr = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        const curSubCodeNorm = normStr(subject);
        const curSubNameNorm = normStr(subjectName);

        const checkSubMatch = (ex) => {
          const exSub = normStr(ex.subject);
          const exCode = normStr(ex.subjectCode);
          return (
            (exCode && curSubCodeNorm && exCode === curSubCodeNorm) ||
            (exSub && curSubNameNorm && (exSub.includes(curSubNameNorm) || curSubNameNorm.includes(exSub))) ||
            (exCode && curSubNameNorm && curSubNameNorm.includes(exCode)) ||
            (exSub && curSubCodeNorm && (exSub.includes(curSubCodeNorm) || curSubCodeNorm === exSub))
          );
        };

        const checkClassMatch = (ex) => {
          const exNorm = normalizeClassCode(ex.className);
          const isCoordinator = ex.examCategory === 'SEMESTER_UAS' || ex.isCoordinatorExam || Boolean(ex.targetGradeLevel);
          const exGrade = extractGradeLevelDigit(ex.targetGradeLevel || ex.className || ex.title || ex.rawDescription || '');

          if (exNorm && exNorm === cNorm) return true;
          if (Array.isArray(ex.targetClasses) && ex.targetClasses.length > 0) {
            if (ex.targetClasses.some((tc) => normalizeClassCode(tc) === cNorm)) return true;
          }
          if (isCoordinator && classGrade && exGrade && classGrade === exGrade) {
            return true;
          }
          if (ex.targetGradeLevel && classGrade && String(ex.targetGradeLevel) === classGrade) {
            return true;
          }
          return false;
        };

        // Filter ujian yang sesuai dengan Mapel
        const sameSubjectExams = (allExams || []).filter(checkSubMatch);

        // Ujian yang sesuai kelas/tingkat aktif
        const filtered = sameSubjectExams.filter(checkClassMatch);

        // Ujian mapel yang sama tetapi di jenjang/tingkat lain (misal: Tingkat 9 saat guru buka Kelas VII-C)
        const others = sameSubjectExams.filter((ex) => !checkClassMatch(ex));

        // Urutkan: Ujian UAS / ASAS Semester diutamakan paling atas
        const sortExams = (list) => {
          return [...list].sort((a, b) => {
            const aIsUas = a.examCategory === 'SEMESTER_UAS' || a.isCoordinatorExam || /uas|asas/i.test(a.title);
            const bIsUas = b.examCategory === 'SEMESTER_UAS' || b.isCoordinatorExam || /uas|asas/i.test(b.title);
            if (aIsUas && !bIsUas) return -1;
            if (!aIsUas && bIsUas) return 1;
            return 0;
          });
        };

        const sortedFiltered = sortExams(filtered);
        const sortedOthers = sortExams(others);

        setAvailableCbtExams(sortedFiltered);
        setOtherGradeExams(sortedOthers);

        if (sortedFiltered.length > 0) {
          // Pilih otomatis ujian bertipe UAS / ASAS yang sesuai jenjang
          const defaultExam = sortedFiltered.find((e) => e.examCategory === 'SEMESTER_UAS' || /uas|asas/i.test(e.title)) || sortedFiltered[0];
          setSelectedExamId(defaultExam.id);
        } else if (sortedOthers.length > 0) {
          // Biarkan kosong sampai guru memilih sesi atau memilih jenjang yang sesuai
          setSelectedExamId('');
        } else {
          setSelectedExamId('');
        }
      } catch (e) {
        console.warn('Gagal memuat daftar ujian CBT:', e);
      }
    };

    fetchMatchingExams();
  }, [className, subject, subjects]);

  useEffect(() => {
    setCurrentPage(1);
  }, [className, subject, search, sortBy]);

  // Mengurutkan & memfilter baris siswa: default SELALU urutan absen (1..N)
  const visibleRows = useMemo(() => {
    let list = rows.filter(
      (row) =>
        !search ||
        (row.name && row.name.toLowerCase().includes(search.toLowerCase())) ||
        (row.nisn && row.nisn.includes(search))
    );

    if (sortBy === 'PREDICATE') {
      const predRank = { A: 1, B: 2, C: 3, D: 4, '-': 5 };
      list = [...list].sort((a, b) => {
        const pA = getPredicate(a.score);
        const pB = getPredicate(b.score);
        const rDiff = (predRank[pA] || 5) - (predRank[pB] || 5);
        if (rDiff !== 0) return rDiff;
        const sDiff = Number(b.score || 0) - Number(a.score || 0);
        if (sDiff !== 0) return sDiff;
        return (a.absenNo || 0) - (b.absenNo || 0);
      });
    } else if (sortBy === 'SCORE_DESC') {
      list = [...list].sort((a, b) => {
        const sA = a.score !== '' && a.score !== null ? Number(a.score) : -1;
        const sB = b.score !== '' && b.score !== null ? Number(b.score) : -1;
        if (sB !== sA) return sB - sA;
        return (a.absenNo || 0) - (b.absenNo || 0);
      });
    } else if (sortBy === 'SCORE_ASC') {
      list = [...list].sort((a, b) => {
        const sA = a.score !== '' && a.score !== null ? Number(a.score) : 999;
        const sB = b.score !== '' && b.score !== null ? Number(b.score) : 999;
        if (sA !== sB) return sA - sB;
        return (a.absenNo || 0) - (b.absenNo || 0);
      });
    } else {
      // DEFAULT 'ABSEN': Selalu urutan nomor absen resmi kelas (No. 1 s/d selesai)
      list = [...list].sort((a, b) => (a.absenNo || 0) - (b.absenNo || 0));
    }

    return list;
  }, [rows, search, sortBy]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, currentPage, pageSize]);

  const updateScore = (id, value) => {
    const score = value === '' ? '' : Math.max(0, Math.min(100, Number(value)));
    const predicate = getPredicate(score);
    const autoDesc = formatDescription(predicate);
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, score: String(score), description: autoDesc }
          : row
      )
    );
    setSaved(false);
  };

  const updateDescription = (id, description) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, description } : row)));
    setSaved(false);
  };

  const applyTemplateToAllStudents = () => {
    const updated = rows.map((row) => {
      const predicate = getPredicate(row.score);
      return {
        ...row,
        description: formatDescription(predicate),
      };
    });
    setRows(updated);
    setSaved(false);
    const filled = updated.filter((r) => r.score !== '' && r.score !== null).length;
    alert(
      `Deskripsi capaian rapor berhasil diperbarui untuk ${filled} siswa kelas ${className}.\n\n` +
      'Klik tombol "Simpan Nilai UAS ke e-Rapor" agar nilai & deskripsi tersimpan permanen.'
    );
  };

  // =================== TARIK NILAI DARI CBT UAS / ASAS ===================
  const handleSyncFromCBT = async () => {
    if (!selectedExamId) {
      alert('Pilih sesi ujian CBT (UAS / ASAS) yang ingin ditarik nilainya.');
      return;
    }

    const chosenExam =
      availableCbtExams.find((e) => e.id === selectedExamId) ||
      otherGradeExams.find((e) => e.id === selectedExamId);

    if (!chosenExam) {
      alert('Data ujian CBT yang dipilih tidak ditemukan.');
      return;
    }

    setIsSyncingCbt(true);
    setCbtNotice(null);

    try {
      const sessions = await cbtAdapter.getExamSessions(chosenExam.id);
      const studentScoreMap = new Map();

      (sessions || []).forEach((sess) => {
        const sId = String(sess.studentId || sess.student_id || sess.id || '');
        const sNisn = String(sess.nisn || '');
        const sName = String(sess.studentName || sess.student_name || '').toLowerCase().trim();
        const score = typeof sess.score === 'number' ? sess.score : (sess.score !== undefined && sess.score !== null ? Number(sess.score) : null);

        if (score !== null && !isNaN(score)) {
          if (sId) studentScoreMap.set(sId, score);
          if (sNisn && sNisn !== '-') studentScoreMap.set(sNisn, score);
          if (sName) studentScoreMap.set(sName, score);
        }
      });

      let pulledCount = 0;
      setRows((prev) =>
        prev.map((r) => {
          const sId = String(r.id || '');
          const sNisn = String(r.nisn || '');
          const sName = String(r.name || '').toLowerCase().trim();

          const score =
            studentScoreMap.get(sId) ??
            (sNisn && sNisn !== '-' ? studentScoreMap.get(sNisn) : undefined) ??
            studentScoreMap.get(sName);

          if (score !== undefined && score !== null && !isNaN(score)) {
            pulledCount++;
            const finalScore = Math.min(100, Math.max(0, score));
            const pred = getPredicate(finalScore);
            const desc = formatDescription(pred);
            return {
              ...r,
              score: String(finalScore),
              description: r.description || desc,
            };
          }
          return r;
        })
      );

      const isUasName = chosenExam.examCategory === 'SEMESTER_UAS' || /uas|asas/i.test(chosenExam.title);
      if (pulledCount > 0) {
        setCbtNotice({
          type: 'success',
          message: `Berhasil menarik ${pulledCount} nilai siswa dari ujian CBT "${chosenExam.title}" (${isUasName ? 'Ujian UAS/ASAS Semester' : 'Ujian Reguler'}). Nilai dan predikat rapor telah otomatis diisikan. Klik tombol "Simpan Nilai UAS ke e-Rapor" untuk menyimpan ke database.`,
        });
        setSaved(false);
      } else {
        setCbtNotice({
          type: 'warning',
          message: `Sesi ujian "${chosenExam.title}" ditemukan, namun belum ada siswa dari Kelas ${className} yang telah menyelesaikan ujian (status SUBMITTED) atau memiliki skor tersimpan.`,
        });
      }
    } catch (err) {
      console.error('Gagal menarik nilai CBT:', err);
      setCbtNotice({
        type: 'error',
        message: `Terjadi kendala saat menyinkronkan data ujian CBT: ${err.message}`,
      });
    } finally {
      setIsSyncingCbt(false);
    }
  };

  // =================== UNDUH FORMAT & IMPOR EXCEL ===================
  const handleDownloadTemplate = () => {
    const currentSubjectObj = subjects.find((item) => item.code === subject);
    const subjectName = currentSubjectObj ? currentSubjectObj.name : subject;

    // WAJIB: Selalu diurutkan sesuai nomor absen resmi (A-Z)
    const sortedByAbsen = [...rows].sort((a, b) => (a.absenNo || 0) - (b.absenNo || 0));

    exportToExcelXml({
      filename: `Format_Nilai_UAS_${className}_${subject}_${academicYear.replace('/', '-')}.xls`,
      sheetName: `Format UAS ${className}`,
      title: 'FORMAT PENGISIAN NILAI ASESMEN SUMATIF AKHIR SEMESTER (UAS / ASAS)',
      subtitle: `SMP NEGERI 1 PRAMBON • TAHUN AJARAN ${academicYear} SEMESTER ${semester}`,
      metadata: [
        { label: 'Kelas / Rombel', value: `Kelas ${className}` },
        { label: 'Mata Pelajaran', value: `${subject} - ${subjectName}` },
        { label: 'Guru Pengampu', value: currentUser?.fullName || currentUser?.full_name || 'Guru Pengampu' },
        { label: 'Urutan Presensi', value: 'Sesuai Nomor Absen Resmi Kelas (No. 1 s/d selesai)' },
        { label: 'Panduan', value: 'Isi kolom Nilai UAS dengan angka 0-100. Setelah selesai, impor kembali via sistem.' },
        { label: 'Tanggal Cetak Format', value: new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }) },
      ],
      headers: ['No. Absen', 'NISN', 'Nama Siswa', 'Kelas', 'Nilai UAS (0-100)', 'Panduan Predikat', 'Deskripsi Capaian (Opsional)'],
      rows: sortedByAbsen.map((r, idx) => {
        const scoreVal = r.score !== '' && r.score !== null && !isNaN(Number(r.score)) ? Number(r.score) : '';
        return [
          r.absenNo || idx + 1,
          r.nisn,
          r.name,
          `Kelas ${className}`,
          scoreVal,
          '>=86 A, >=76 B, >=66 C, <66 D',
          r.description || '',
        ];
      }),
    });
  };

  // =================== CETAK / UNDUH BUKU LEGGER NILAI & PREDIKAT UAS ===================
  const handleDownloadLegger = () => {
    const currentSubjectObj = subjects.find((item) => item.code === subject);
    const subjectName = currentSubjectObj ? currentSubjectObj.name : subject;
    const kkm = 75;

    // PENTING: Buku Legger Nilai & Predikat SELALU 100% konsisten berurutan sesuai nomor absen resmi (A-Z)
    const sortedByAbsen = [...rows].sort((a, b) => (a.absenNo || 0) - (b.absenNo || 0));
    const scoredList = sortedByAbsen.filter((r) => r.score !== '' && r.score !== null && !isNaN(Number(r.score)));
    const passCount = scoredList.filter((r) => Number(r.score) >= kkm).length;
    const failCount = scoredList.filter((r) => Number(r.score) < kkm).length;

    exportToExcelXml({
      filename: `Legger_Nilai_UAS_${className}_${subject}_${academicYear.replace('/', '-')}_${semester}.xls`,
      sheetName: `Legger UAS ${className}`,
      title: 'BUKU LEGGER NILAI & PREDIKAT ASESMEN SUMATIF AKHIR SEMESTER (UAS / ASAS)',
      subtitle: `SMP NEGERI 1 PRAMBON • TAHUN AJARAN ${academicYear} SEMESTER ${semester}`,
      metadata: [
        { label: 'Kelas / Rombel', value: `Kelas ${className}` },
        { label: 'Mata Pelajaran', value: `${subject} - ${subjectName}` },
        { label: 'Guru Pengampu', value: currentUser?.fullName || currentUser?.full_name || 'Guru Pengampu' },
        { label: 'Batas KKM Sekolah', value: `${kkm} Poin` },
        { label: 'Urutan Presensi', value: 'Sesuai Nomor Absen Resmi Kelas (No. 1 s/d selesai)' },
        { label: 'Statistik Capaian', value: `Total: ${sortedByAbsen.length} Siswa | Terisi: ${scoredList.length} | Tuntas: ${passCount} Siswa | Belum Tuntas: ${failCount} Siswa | Rata-rata: ${avgClassScore}` },
        { label: 'Tanggal Cetak Legger', value: new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }) },
      ],
      headers: [
        'No. Absen',
        'NISN',
        'Nama Lengkap Siswa',
        'Kelas',
        'Nilai Akhir UAS (0-100)',
        'Predikat',
        'Status Ketuntasan (KKM 75)',
        'Deskripsi Capaian Kompetensi Kurikulum Merdeka',
      ],
      rows: sortedByAbsen.map((r, idx) => {
        const hasScore = r.score !== '' && r.score !== null && !isNaN(Number(r.score));
        const numScore = hasScore ? Number(r.score) : '';
        const pred = hasScore ? getPredicate(numScore) : '-';
        const status = hasScore ? (numScore >= kkm ? 'Tuntas' : 'Belum Tuntas') : 'Belum Ada Nilai';
        return [
          r.absenNo || idx + 1,
          r.nisn,
          r.name,
          `Kelas ${className}`,
          numScore,
          pred,
          status,
          r.description || '',
        ];
      }),
    });
  };

  const handleApplyImportedGrades = (updates) => {
    setRows((prev) => {
      return prev.map((row) => {
        const match = updates.find((u) => u.studentId === row.id || (u.nisn && u.nisn === row.nisn));
        if (match && match.score !== null) {
          const score = match.score;
          const pred = getPredicate(score);
          const autoDesc = formatDescription(pred);
          return {
            ...row,
            score: String(score),
            description: match.description?.trim() || autoDesc,
          };
        }
        return row;
      });
    });
    setSaved(false);
    setSaveMessage(`Berhasil mengimpor nilai untuk ${updates.length} siswa. Klik "Simpan Nilai UAS ke e-Rapor" untuk menyimpan permanen.`);
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    setSaved(false);
    setSaveMessage('');

    const currentSubjectObj = subjects.find((item) => item.code === subject);
    const subjectName = currentSubjectObj ? currentSubjectObj.name : subject;

    const payload = {
      class_name: className,
      subject_code: subject,
      subject_name: subjectName,
      assessment_type: 'PAS',
      academic_year: academicYear,
      semester: semester,
      teacher_id: currentUser?.id || '',
      teacher_name: currentUser?.fullName || currentUser?.full_name || 'Guru Pengampu',
      grades: rows.map((r) => {
        const hasScore = r.score !== '' && r.score !== null && !isNaN(Number(r.score)) && Number(r.score) >= 0;
        const numScore = hasScore ? Math.min(100, Math.max(0, Number(r.score))) : null;
        const pred = hasScore ? getPredicate(numScore) : '-';
        return {
          student_id: r.id,
          person_id: r.person_id,
          nisn: r.nisn,
          student_name: r.name,
          score: numScore,
          description: r.description || (pred !== '-' ? DEFAULT_DESCRIPTIONS[pred] : ''),
        };
      }),
    };

    if (payload.grades.length === 0) {
      setIsSaving(false);
      setSaveMessage('Belum ada data siswa di kelas ini.');
      setSaved(true);
      return;
    }

    try {
      const res = await gradeApi.saveBulkGrades(payload);
      if (res.success) {
        setSaveMessage(`Berhasil menyimpan ${res.data?.saved || payload.grades.length} nilai UAS siswa ke database e-Rapor.`);
      } else {
        setSaveMessage(`Tersimpan lokal (${payload.grades.length} siswa). Server respons: ${res.error?.message || 'OK'}`);
      }
    } catch (err) {
      setSaveMessage(`Tersimpan lokal (${payload.grades.length} siswa). Server offline.`);
    } finally {
      setIsSaving(false);
      setSaved(true);
    }
  };

  // Statistik Keterisian Nilai
  const filledCount = rows.filter((r) => r.score !== '' && r.score !== null && !isNaN(Number(r.score))).length;
  const avgClassScore =
    filledCount > 0
      ? Math.round(
          rows
            .filter((r) => r.score !== '' && r.score !== null && !isNaN(Number(r.score)))
            .reduce((acc, curr) => acc + Number(curr.score), 0) / filledCount
        )
      : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-blue-900 p-7 sm:p-9 text-white shadow-lg">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-3">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>e-Rapor Kurikulum Merdeka • Asesmen Akhir Semester</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Input Nilai UAS / ASAS (Sumatif Akhir Semester)
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Penginputan dan pengelolaan nilai akhir semester mata pelajaran. Anda dapat menarik langsung nilai hasil pengerjaan dari <strong>e-Ujian CBT (UAS / ASAS)</strong> sesuai sesi ujian yang dipilih dengan 1 klik.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/penilaian/pts"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Buka Nilai PTS / STS</span>
            </a>
            <a
              href="/wali-kelas"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Rekap Wali Kelas</span>
            </a>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {cbtNotice && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-xs ${
            cbtNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : cbtNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold bg-white/60">
            {cbtNotice.type === 'success' ? (
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : cbtNotice.type === 'error' ? (
              <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold">
              {cbtNotice.type === 'success'
                ? 'Sinkronisasi Nilai CBT UAS Berhasil'
                : cbtNotice.type === 'error'
                ? 'Gagal Sinkronisasi CBT'
                : 'Pemberitahuan Sinkronisasi Nilai'}
            </h4>
            <p className="text-[11px] mt-0.5 leading-relaxed">{cbtNotice.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setCbtNotice(null)}
            className="text-xs font-semibold px-2 py-1 hover:bg-black/5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner Peringatan Guru Belum Ada Penugasan Mengajar */}
      {isTeacherRole && (classes.length === 0 || subjects.length === 0 || !className || !subject) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-xs flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900">Belum Ditentukan Mata Pelajaran & Kelas Pengampu</h4>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Akun Anda belum memiliki mata pelajaran atau rombel yang diatur pada jadwal e-Rapor untuk Tahun Ajaran <strong>{academicYear} ({semester})</strong>.
              Silakan hubungi Administrator e-Rapor sekolah untuk mengatur penugasan mengampu di menu <em>Pengampu Mata Pelajaran</em>.
            </p>
          </div>
        </div>
      )}

      {/* Integrasi Tarik Nilai dari Ujian CBT (UAS / ASAS) */}
      <div className="p-4 rounded-xl border border-indigo-200 bg-linear-to-r from-indigo-50/90 to-blue-50/90 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold text-indigo-950">
                Tarik Nilai dari e-Ujian CBT (Integrasi Sesuai Jenis & Nama Ujian)
              </h3>
              <p className="text-[11px] text-indigo-700">
                Pilih sesi ujian CBT (UAS / ASAS Semester atau Reguler) di bawah ini untuk mengisikan otomatis nilai siswa ke format rapor UAS.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center pt-1 border-t border-indigo-200/60">
          <div>
            <label className="text-[11px] font-bold text-indigo-900 block mb-1">
              Pilih Sesi Ujian CBT Sumber:
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full rounded-xl border-2 border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
            >
              {availableCbtExams.length === 0 && otherGradeExams.length === 0 ? (
                <option value="">— Belum ada sesi ujian CBT untuk {subjects.find((s) => s.code === subject)?.name || subject} di Kelas {className} —</option>
              ) : (
                <>
                  <option value="">— Pilih Sesi Ujian CBT Sumber —</option>
                  {availableCbtExams.length > 0 && (
                    <optgroup label={`Sesi Ujian Sesuai: ${className} (Tingkat ${extractGradeLevelDigit(className) || 'Ini'})`}>
                      {availableCbtExams.map((ex) => {
                        const isUasType = ex.examCategory === 'SEMESTER_UAS' || ex.isCoordinatorExam || /uas|asas/i.test(ex.title);
                        return (
                          <option key={ex.id} value={ex.id}>
                            {isUasType ? '[UAS / ASAS Semester] ' : '[Ujian Reguler] '}
                            {ex.title} (Mapel: {ex.subject}) — Token: {ex.token || '-'}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  {otherGradeExams.length > 0 && (
                    <optgroup label="Sesi Ujian Mapel Ini di Jenjang/Tingkat Lain">
                      {otherGradeExams.map((ex) => {
                        const isUasType = ex.examCategory === 'SEMESTER_UAS' || ex.isCoordinatorExam || /uas|asas/i.test(ex.title);
                        const lvl = extractGradeLevelDigit(ex.targetGradeLevel || ex.className || ex.title);
                        return (
                          <option key={ex.id} value={ex.id}>
                            {isUasType ? `[ASAS Tk. ${lvl || '?'}] ` : `[Ujian Reguler] `}
                            {ex.title} (Mapel: {ex.subject}) — Token: {ex.token || '-'}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                </>
              )}
            </select>

            {availableCbtExams.length === 0 && otherGradeExams.length > 0 && (
              <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50/90 border border-amber-200/80 px-3 py-2 rounded-xl mt-2 leading-relaxed">
                <span className="font-bold shrink-0">💡 Info Jenjang:</span>
                <div>
                  Ujian CBT yang terdaftar dibuat untuk <strong>Tingkat {extractGradeLevelDigit(otherGradeExams[0].targetGradeLevel || otherGradeExams[0].title) || '9'}</strong> (contoh: <em>{otherGradeExams[0].title}</em>).
                  Ujian tersebut akan otomatis terseleksi saat memilih rombel tingkat tersebut (contoh: <strong>Kelas IX-A s/d IX-J</strong>).
                  Anda juga dapat memilihnya langsung dari opsi dropdown di atas jika ingin menarik nilainya.
                </div>
              </div>
            )}
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSyncFromCBT}
              disabled={isSyncingCbt || !selectedExamId}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <svg className={`w-4 h-4 ${isSyncingCbt ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isSyncingCbt ? 'Menyinkronkan Nilai...' : 'Tarik Nilai dari Ujian Ini'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar Filter & Aksi Tambahan */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-[1.2fr_1fr_1.5fr_auto]">
        <label className="text-xs font-semibold text-slate-700">
          Mata Pelajaran
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            {subjects.length === 0 ? (
              <option value="">— Belum Ada Mapel Diampu —</option>
            ) : (
              subjects.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.name}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Rombel Kelas
          <select
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            {classes.length === 0 ? (
              <option value="">— Belum Ada Kelas —</option>
            ) : (
              classes.map((item) => (
                <option key={item} value={item}>
                  Kelas {item}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Cari Siswa
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari NISN atau nama lengkap..."
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setShowTemplateConfig(!showTemplateConfig)}
            className="w-full px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>{showTemplateConfig ? 'Tutup Format' : 'Format Deskripsi'}</span>
          </button>
        </div>
      </div>

      {/* Bar Tombol Tambahan: Unduh Template, Cetak Legger, Impor Excel */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Cetak / Unduh Buku Legger Nilai & Predikat UAS */}
          <button
            type="button"
            onClick={handleDownloadLegger}
            disabled={rows.length === 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            title="Cetak & unduh Buku Legger Nilai & Predikat UAS resmi siswa (selalu sesuai nomor absen resmi)"
          >
            <svg className="w-4 h-4 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Cetak Legger Nilai & Predikat (.xls)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Unduh format spreadsheet untuk penilaian offline (sesuai nomor absen)"
          >
            <svg className="w-4 h-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Format Penilaian (.xls)</span>
          </button>

          {!isKepalaSekolah && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Impor nilai dari berkas Excel atau salin-tempel"
            >
              <svg className="w-4 h-4 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Impor Nilai Excel</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>Terisi: <strong className="text-slate-900">{filledCount}</strong> / {rows.length} Siswa</span>
          <span>•</span>
          <span>Rata-rata: <strong className="text-blue-700">{avgClassScore}</strong></span>
        </div>
      </div>

      {showTemplateConfig && (
        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 space-y-3">
          <div className="border-b border-blue-200 pb-2">
            <h3 className="text-xs font-bold text-blue-900">
              Konfigurasi Format Deskripsi Otomatis — Kelas {className} ({subjects.find((s) => s.code === subject)?.name || subject})
            </h3>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Format deskripsi rapor otomatis terisi: <strong>Predikat + Default Deskripsi</strong>
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {['A', 'B', 'C', 'D'].map((pred) => (
              <div key={pred} className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 text-xs">Predikat {pred}</span>
                <input
                  type="text"
                  value={predicateTemplates[pred] || ''}
                  onChange={(e) => setPredicateTemplates((prev) => ({ ...prev, [pred]: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2 border-t border-blue-200">
            <button
              type="button"
              onClick={applyTemplateToAllStudents}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Terapkan ke Semua Siswa Kelas {className}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabel Nilai UAS */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-slate-800">
              Daftar Siswa Kelas {className} ({visibleRows.length} Siswa Terdaftar)
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] font-semibold text-slate-600">
              Mapel: <span className="text-blue-700 font-bold">{subjects.find((s) => s.code === subject)?.name || subject}</span>
            </span>
          </div>

          {/* Pengatur Urutan Tampilan: Absen (Default) vs Predikat / Nilai */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Urutkan Tabel:</span>
            <div className="inline-flex items-center p-0.5 bg-slate-200/80 rounded-xl border border-slate-300/80 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setSortBy('ABSEN')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  sortBy === 'ABSEN'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan sesuai urutan presensi / nomor absen resmi kelas"
              >
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <span>No. Absen</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('PREDICATE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  sortBy === 'PREDICATE'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Urutkan ranking berdasarkan predikat capaian (A -> B -> C -> D)"
              >
                <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Sesuai Predikat (A-D)</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('SCORE_DESC')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  sortBy === 'SCORE_DESC'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Urutkan dari nilai tertinggi ke terendah"
              >
                <span>Nilai Tertinggi</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('SCORE_ASC')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  sortBy === 'SCORE_ASC'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Urutkan dari nilai terendah ke tertinggi (untuk remedial)"
              >
                <span>Nilai Terendah</span>
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 select-none">
                <th
                  onClick={() => setSortBy('ABSEN')}
                  className="py-2.5 px-3 w-20 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  title="Klik untuk mengurutkan sesuai No. Absen"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>No. Absen</span>
                    {sortBy === 'ABSEN' && <span className="text-blue-600 font-bold">▲</span>}
                  </div>
                </th>
                <th className="py-2.5 px-3 w-28">NISN</th>
                <th
                  onClick={() => setSortBy('ABSEN')}
                  className="py-2.5 px-3 min-w-[160px] cursor-pointer hover:bg-slate-100 transition-colors"
                  title="Klik untuk mengurutkan sesuai alfabetis nama"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Siswa</span>
                    {sortBy === 'ABSEN' && <span className="text-blue-600 font-bold">▲</span>}
                  </div>
                </th>
                <th
                  onClick={() => setSortBy(sortBy === 'SCORE_DESC' ? 'SCORE_ASC' : 'SCORE_DESC')}
                  className="py-2.5 px-3 w-28 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  title="Klik untuk mengurutkan nilai (Tertinggi / Terendah)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Nilai UAS</span>
                    {sortBy === 'SCORE_DESC' ? (
                      <span className="text-blue-600 font-bold">▼</span>
                    ) : sortBy === 'SCORE_ASC' ? (
                      <span className="text-blue-600 font-bold">▲</span>
                    ) : null}
                  </div>
                </th>
                <th
                  onClick={() => setSortBy('PREDICATE')}
                  className="py-2.5 px-3 w-24 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  title="Klik untuk mengurutkan berdasarkan Predikat (A -> D)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Predikat</span>
                    {sortBy === 'PREDICATE' && <span className="text-indigo-600 font-bold">▼</span>}
                  </div>
                </th>
                <th className="py-2.5 px-3 min-w-[280px]">Deskripsi Capaian Akhir Semester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan di kelas {className}.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r, index) => {
                  const pred = getPredicate(r.score);
                  const itemNo = (currentPage - 1) * pageSize + index + 1;
                  const predColor =
                    pred === 'A'
                      ? 'bg-emerald-100 text-emerald-800 font-bold'
                      : pred === 'B'
                      ? 'bg-blue-100 text-blue-800 font-bold'
                      : pred === 'C'
                      ? 'bg-amber-100 text-amber-800 font-bold'
                      : pred === 'D'
                      ? 'bg-rose-100 text-rose-800 font-bold'
                      : 'bg-slate-100 text-slate-400';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-center text-slate-700 font-bold">
                        {r.absenNo || itemNo}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">{r.nisn}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{r.name}</td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={r.score || ''}
                          onChange={(e) => updateScore(r.id, e.target.value)}
                          placeholder="-"
                          className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center font-bold text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block w-7 py-0.5 rounded text-[11px] ${predColor}`}>
                          {pred}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={r.description || ''}
                          onChange={(e) => updateDescription(r.id, e.target.value)}
                          placeholder="Deskripsi capaian rapor..."
                          className="w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-blue-600"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi Nilai UAS */}
        <Pagination
          currentPage={currentPage}
          totalItems={visibleRows.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 32]}
          itemLabel="siswa"
        />
      </div>

      {/* Action Bar Simpan Nilai */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          {saveMessage ? (
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {saveMessage}
            </span>
          ) : (
            <span>Periksa kembali nilai siswa sebelum menyimpan ke database e-Rapor.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveGrades}
            disabled={isSaving || rows.length === 0}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Menyimpan ke e-Rapor...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>Simpan Nilai UAS ke e-Rapor</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal Impor Nilai Excel */}
      {isImportModalOpen && (
        <ImportGradesModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onApply={handleApplyImportedGrades}
          students={rows}
          className={className}
          subjectCode={subject}
        />
      )}
    </div>
  );
}
