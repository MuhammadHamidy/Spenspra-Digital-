'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { gradeApi } from '@/lib/gradeApi';
import { attendanceApi } from '@/lib/attendanceApi';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { deadlineApiAdapter } from '@/lib/features/deadlines/infrastructure/deadlineApiAdapter';
import Pagination from '@/components/Pagination';
import { exportToExcelXml } from '@/lib/excelExport';
import Modal from '@/components/Modal';
import ImportGradesModal from '@/components/ImportGradesModal';
import { getSchoolAcademicPeriod } from '@/lib/academicPeriod';

const PREDICATE_LABELS = {
  A: 'Sangat baik dalam',
  B: 'Baik dalam',
  C: 'Cukup dalam',
  D: 'Kurang dalam',
};

const INITIAL_PREDICATE_DESCRIPTIONS = {
  A: 'Sangat baik dalam memahami materi pembelajaran dan mampu menyelesaikannya secara mandiri.',
  B: 'Baik dalam memahami materi pembelajaran dan mampu menyelesaikannya dengan tepat.',
  C: 'Cukup dalam memahami materi pembelajaran, masih memerlukan latihan dan penguatan.',
  D: 'Kurang dalam memahami materi pembelajaran, perlu bimbingan dan pendampingan intensif.',
};

const getPredicate = (score) => {
  if (score === '' || score === null || score === undefined || Number.isNaN(Number(score))) return '-';
  if (Number(score) < 0) return '-';
  if (Number(score) >= 86) return 'A';
  if (Number(score) >= 76) return 'B';
  if (Number(score) >= 66) return 'C';
  return 'D';
};

export default function PenilaianPTSPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [allClassAllocations, setAllClassAllocations] = useState([]);
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [rows, setRows] = useState([]);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showTemplateConfig, setShowTemplateConfig] = useState(true);
  const [predicateTemplates, setPredicateTemplates] = useState(INITIAL_PREDICATE_DESCRIPTIONS);
  const [quickTopic, setQuickTopic] = useState('');
  const [ptsDeadline, setPtsDeadline] = useState(null);

  // Filter Tahun Ajaran & Semester sinkron otomatis dengan Super Admin
  const [academicYear, setAcademicYear] = useState(() => getSchoolAcademicPeriod().year);
  const [semester, setSemester] = useState(() => getSchoolAcademicPeriod().semester);

  // Kunci Nilai & Audit Log States
  const [isLocked, setIsLocked] = useState(false);
  const [lockDetails, setLockDetails] = useState(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [changeLogs, setChangeLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [revisiReason, setRevisiReason] = useState('');

  // Import Excel & Autosave Safeguard States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('CLOUD_SAVED'); // 'CLOUD_SAVED' | 'LOCAL_DRAFT' | 'SAVING' | 'OFFLINE'
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [draftRecovery, setDraftRecovery] = useState(null);

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
      const dl = list.find((d) => d.type === 'PTS');
      if (dl) setPtsDeadline(dl);
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
          setAllClassAllocations(clsRes.data);
          let teacherClasses = clsRes.data;
          // Filter ketat jika pengguna adalah GURU
          if (isTeacherRole) {
            const myName = (user.fullName || user.full_name || '').toLowerCase();
            const filtered = clsRes.data.filter((c) =>
              c.dosen_id === user.id ||
              c.teacher_id === user.id ||
              (myName && c.teacher_name && c.teacher_name.toLowerCase().includes(myName)) ||
              (user.nimNip && (c.dosen_id?.includes(user.nimNip) || c.teacher_nip?.includes(user.nimNip)))
            );
            // Jangan fallback ke semua kelas jika guru belum ditugaskan!
            teacherClasses = filtered;
          }

          setTeacherAssignments(teacherClasses);

          const classNames = [...new Set(teacherClasses.map((c) => c.class_code || c.name || c.id).filter(Boolean))];
          setClasses(classNames);

          // Filter mapel yang diampu guru
          if (isTeacherRole) {
            const teacherCourseCodes = [...new Set(teacherClasses.map((c) => c.course_code || c.course_id).filter(Boolean))];
            const filteredSubjects = availableSubjects.filter((s) =>
              teacherCourseCodes.some((tc) => tc === s.code || tc === `crs-${s.code.toLowerCase()}`)
            );
            // Hanya mapel yang benar-benar ditugaskan admin!
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

  // Filter rombel/kelas secara dinamis sesuai mata pelajaran yang dipilih
  const classesForSubject = useMemo(() => {
    if (!subject) return [];
    const sourceList = isTeacherRole ? teacherAssignments : (allClassAllocations.length ? allClassAllocations : teacherAssignments);
    if (sourceList && sourceList.length > 0) {
      const target = subject.toLowerCase().trim();
      const matched = sourceList.filter((tc) => {
        const cCode = String(tc.course_code || tc.course_id || '').toLowerCase().trim();
        const cName = String(tc.course_name || '').toLowerCase().trim();
        return (
          cCode === target ||
          cCode === `crs-${target}` ||
          (cCode && cCode.includes(target)) ||
          (cName && cName.includes(target))
        );
      });
      const result = [...new Set(matched.map((c) => c.class_code || c.name || c.id).filter(Boolean))].sort();
      if (result.length > 0) return result;
    }
    return isTeacherRole ? [] : classes;
  }, [subject, isTeacherRole, classes, teacherAssignments, allClassAllocations]);

  // Otomatis pilih kelas pertama yang valid untuk mata pelajaran yang aktif
  useEffect(() => {
    if (classesForSubject.length > 0) {
      if (!className || !classesForSubject.includes(className)) {
        setClassName(classesForSubject[0]);
      }
    } else {
      setClassName('');
    }
  }, [classesForSubject, className]);

  const getTopicStorageKey = useCallback((cls, sbj, yr, sm) => {
    return `spenspra_pts_topic_${cls || ''}_${sbj || ''}_${String(yr || '').replace('/', '_')}_${sm || ''}`;
  }, []);

  // Simpan template di ref agar formatDescription stabil (tidak memicu reload data berulang)
  const predicateTemplatesRef = useRef(predicateTemplates);
  useEffect(() => {
    predicateTemplatesRef.current = predicateTemplates;
  }, [predicateTemplates]);

  const formatDescription = useCallback((predicate, customTemplates = null) => {
    if (!predicate || predicate === '-') return '';
    const activeTemplates = customTemplates || predicateTemplatesRef.current;
    const template = activeTemplates[predicate] || INITIAL_PREDICATE_DESCRIPTIONS[predicate] || '';
    // Pastikan tidak ada prefix "A: ", "B: ", "C: ", "D: "
    return template.replace(/^[A-D]:\s*/i, '').trim();
  }, []);

  // Bersihkan timer penyimpanan lokal saat unmount
  useEffect(() => {
    return () => {
      if (localDraftTimerRef.current) {
        clearTimeout(localDraftTimerRef.current);
      }
    };
  }, []);

  const loadStudentsAndGrades = useCallback(async () => {
    setSaved(false);
    setSaveMessage('');
    if (!className || !subject) {
      setRows([]);
      setIsLocked(false);
      setLockDetails(null);
      return;
    }
    try {
      const [res, lockRes] = await Promise.all([
        gradeApi.getGrades({
          className,
          subjectCode: subject,
          assessmentType: 'PTS',
          academicYear,
          semester,
        }),
        gradeApi.getGradeLocks({
          className,
          subjectCode: subject,
          assessmentType: 'PTS',
          academicYear,
          semester,
        }),
      ]);

      if (lockRes?.success && lockRes.data && lockRes.data.is_locked) {
        setIsLocked(true);
        setLockDetails(lockRes.data);
      } else {
        setIsLocked(false);
        setLockDetails(null);
      }

      // 1. Pulihkan materi pokok / TP dari localStorage akun guru
      const topicKey = getTopicStorageKey(className, subject, academicYear, semester);
      let loadedTopic = '';
      try {
        loadedTopic = localStorage.getItem(topicKey) || '';
      } catch {}

      // 2. Jika di localStorage kosong (misal baru login di perangkat baru), ekstrak dari deskripsi nilai siswa di database
      if (!loadedTopic && res.success && Array.isArray(res.data) && res.data.length > 0) {
        for (const g of res.data) {
          if (g.description) {
            const m = g.description.match(/^(?:Sangat baik dalam|Baik dalam|Cukup dalam|Kurang dalam)\s+(.+)$/i);
            if (m && m[1]) {
              const candidate = m[1].trim();
              if (!candidate.startsWith('memahami materi pembelajaran')) {
                loadedTopic = candidate;
                try { localStorage.setItem(topicKey, loadedTopic); } catch {}
                break;
              }
            }
          }
        }
      }

      setQuickTopic(loadedTopic);
      const tTrim = loadedTopic.trim();
      const effectiveTemplates = {
        A: tTrim ? `Sangat baik dalam ${tTrim}` : INITIAL_PREDICATE_DESCRIPTIONS.A,
        B: tTrim ? `Baik dalam ${tTrim}` : INITIAL_PREDICATE_DESCRIPTIONS.B,
        C: tTrim ? `Cukup dalam ${tTrim}` : INITIAL_PREDICATE_DESCRIPTIONS.C,
        D: tTrim ? `Kurang dalam ${tTrim}` : INITIAL_PREDICATE_DESCRIPTIONS.D,
      };
      setPredicateTemplates(effectiveTemplates);

      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setRows(
          res.data.map((g) => {
            const hasScore = g.score !== undefined && g.score !== null && Number(g.score) >= 0;
            const pred = hasScore ? getPredicate(g.score) : '-';
            const defaultDesc = pred !== '-' ? (effectiveTemplates[pred] || formatDescription(pred, effectiveTemplates)) : '';
            const cleanDesc = g.description ? g.description.replace(/^[A-D]:\s*/i, '').trim() : '';
            return {
              id: g.student_id,
              person_id: g.person_id || null,
              nisn: g.nisn,
              name: g.student_name,
              className: g.class_name,
              score: hasScore ? String(g.score) : '',
              description: cleanDesc || defaultDesc,
            };
          })
        );
      } else {
        setRows([]);
      }
    } catch (err) {
      console.warn('Gagal memuat nilai dari server:', err);
      setRows([]);
    }
  }, [className, subject, academicYear, semester, formatDescription, getTopicStorageKey]);

  useEffect(() => {
    loadStudentsAndGrades();
  }, [loadStudentsAndGrades]);

  useEffect(() => {
    setCurrentPage(1);
  }, [className, subject, academicYear, semester, search]);

  const visibleRows = rows.filter(
    (row) =>
      !search || row.name.toLowerCase().includes(search.toLowerCase()) || row.nisn.includes(search)
  );

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, currentPage, pageSize]);

  const draftKey = `spenspra_draft_pts_${className}_${subject}_${academicYear.replace('/', '_')}_${semester}`;

  const localDraftTimerRef = useRef(null);

  const saveDraftLocally = useCallback((currentRows) => {
    if (localDraftTimerRef.current) {
      clearTimeout(localDraftTimerRef.current);
    }
    localDraftTimerRef.current = setTimeout(() => {
      try {
        const dataToSave = {
          rows: currentRows,
          timestamp: new Date().toISOString(),
          count: currentRows.filter((r) => r.score !== '' && r.score !== null).length,
        };
        localStorage.setItem(draftKey, JSON.stringify(dataToSave));
        setSaveStatus('LOCAL_DRAFT');
        setLastSavedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.warn('Gagal menyimpan draf lokal ke cache browser:', err);
      }
    }, 300);
  }, [draftKey]);

  // Cek apakah ada draf lokal tersimpan saat berganti kelas/mapel
  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft);
        if (parsed.timestamp && parsed.count > 0 && Array.isArray(parsed.rows)) {
          const draftDate = new Date(parsed.timestamp);
          setDraftRecovery({
            time: draftDate.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
            count: parsed.count,
            rows: parsed.rows,
          });
        } else {
          setDraftRecovery(null);
        }
      } else {
        setDraftRecovery(null);
      }
    } catch {
      setDraftRecovery(null);
    }
  }, [draftKey]);

  // Peringatan sebelum meninggalkan halaman jika belum disimpan ke server e-Rapor
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveStatus === 'LOCAL_DRAFT') {
        e.preventDefault();
        e.returnValue = 'Perubahan nilai Anda tersimpan di cache lokal namun belum disimpan ke database e-Rapor. Yakin ingin keluar?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  const handleRestoreDraft = () => {
    if (draftRecovery?.rows && Array.isArray(draftRecovery.rows)) {
      setRows(draftRecovery.rows);
      setSaveStatus('LOCAL_DRAFT');
      setDraftRecovery(null);
      setSaved(true);
      setSaveMessage('Draf lokal berhasil dipulihkan dari cache browser!');
    }
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setDraftRecovery(null);
  };

  const handleTopicChange = (e) => {
    const val = e.target.value;
    setQuickTopic(val);

    // Simpan permanen ke localStorage setiap pergantian isian materi pokok / TP
    if (className && subject) {
      const topicKey = getTopicStorageKey(className, subject, academicYear, semester);
      try {
        localStorage.setItem(topicKey, val);
      } catch (err) {
        console.warn('Gagal menyimpan materi pokok ke localStorage:', err);
      }
    }

    const topicTrim = val.trim();
    const newTemplates = {
      A: topicTrim ? `Sangat baik dalam ${topicTrim}` : INITIAL_PREDICATE_DESCRIPTIONS.A,
      B: topicTrim ? `Baik dalam ${topicTrim}` : INITIAL_PREDICATE_DESCRIPTIONS.B,
      C: topicTrim ? `Cukup dalam ${topicTrim}` : INITIAL_PREDICATE_DESCRIPTIONS.C,
      D: topicTrim ? `Kurang dalam ${topicTrim}` : INITIAL_PREDICATE_DESCRIPTIONS.D,
    };
    setPredicateTemplates(newTemplates);

    // Otomatis terapkan ke semua siswa yang sudah memiliki nilai & simpan ke cache lokal
    setRows((current) => {
      const updated = current.map((row) => {
        const pred = getPredicate(row.score);
        if (pred && pred !== '-') {
          return {
            ...row,
            description: newTemplates[pred],
          };
        }
        return row;
      });
      saveDraftLocally(updated);
      return updated;
    });
  };

  const updateScore = (id, value) => {
    if (isLocked || isKepalaSekolah) return;
    let cleanVal = value;
    if (cleanVal !== '') {
      const num = Number(cleanVal);
      if (!isNaN(num)) {
        if (num > 100) cleanVal = '100';
        else if (num < 0) cleanVal = '0';
        else cleanVal = String(num);
      }
    }
    const predicate = getPredicate(cleanVal);
    const autoDesc = cleanVal === '' ? '' : formatDescription(predicate);
    setRows((current) => {
      const updated = current.map((row) =>
        row.id === id
          ? { ...row, score: cleanVal, description: autoDesc }
          : row
      );
      saveDraftLocally(updated);
      return updated;
    });
    setSaved(false);
  };

  const updateDescription = (id, description) => {
    if (isLocked || isKepalaSekolah) return;
    setRows((current) => {
      const updated = current.map((row) => (row.id === id ? { ...row, description } : row));
      saveDraftLocally(updated);
      return updated;
    });
    setSaved(false);
  };

  const applyTemplateToAllStudents = () => {
    if (isLocked || isKepalaSekolah) return;

    // Simpan materi pokok / TP ke cache browser
    if (className && subject) {
      try {
        localStorage.setItem(getTopicStorageKey(className, subject, academicYear, semester), quickTopic);
      } catch {}
    }

    const updated = rows.map((row) => {
      const predicate = getPredicate(row.score);
      return {
        ...row,
        description: formatDescription(predicate),
      };
    });
    setRows(updated);
    saveDraftLocally(updated);
    setSaved(false);

    const filled = updated.filter((r) => r.score !== '' && r.score !== null).length;
    alert(
      `Deskripsi berhasil disimpan untuk ${filled} siswa kelas ${className}.\n\n` +
      'Klik tombol "Simpan Nilai USTS" agar nilai & deskripsi tersimpan ke database e-Rapor.'
    );
  };

  const handleToggleLock = async (targetLockState, reason = '') => {
    try {
      const currentUser = tokenStorage.getUser();
      const res = await gradeApi.setGradeLock({
        class_name: className,
        subject_code: subject,
        assessment_type: 'PTS',
        academic_year: academicYear,
        semester: semester,
        is_locked: targetLockState,
        locked_by_id: currentUser?.id,
        locked_by_name: currentUser?.fullName || 'Guru Pengampu',
        notes: reason || (targetLockState ? 'Finalisasi nilai oleh guru pengampu' : 'Buka kunci untuk revisi nilai'),
      });
      if (res.success) {
        setIsLocked(targetLockState);
        setLockDetails(res.data);
        setShowUnlockModal(false);
        setUnlockReason('');
        setSaveMessage(targetLockState ? 'Nilai berhasil difinalisasi & dikunci.' : 'Kunci nilai berhasil dibuka.');
        setSaved(true);
      }
    } catch (err) {
      console.error('Gagal mengubah status kunci nilai:', err);
    }
  };

  const handleOpenLogs = async () => {
    setShowLogsModal(true);
    setIsLoadingLogs(true);
    try {
      const res = await gradeApi.getGradeLogs({
        className,
        subjectCode: subject,
        assessmentType: 'PTS',
        academicYear,
        semester,
      });
      if (res.success && Array.isArray(res.data)) {
        setChangeLogs(res.data);
      } else {
        setChangeLogs([]);
      }
    } catch (err) {
      setChangeLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleDownloadTemplate = () => {
    const currentSubjectObj = subjects.find((item) => item.code === subject);
    const subjectName = currentSubjectObj ? currentSubjectObj.name : subject;
    const currentUser = tokenStorage.getUser();

    exportToExcelXml({
      filename: `Format_Nilai_PTS_${className}_${subject}_${academicYear.replace('/', '-')}_${semester}.xls`,
      sheetName: `Format PTS ${className}`,
      title: 'FORMAT PENGISIAN NILAI OFFLINE (UJIAN SUMATIF TENGAH SEMESTER)',
      subtitle: `SMP NEGERI 1 PRAMBON • TAHUN AJARAN ${academicYear} SEMESTER ${semester}`,
      metadata: [
        { label: 'Kelas / Rombel', value: `Kelas ${className}` },
        { label: 'Mata Pelajaran', value: `${subject} - ${subjectName}` },
        { label: 'Guru Pengampu', value: currentUser?.fullName || currentUser?.full_name || 'Guru Pengampu' },
        { label: 'Panduan', value: 'Isi kolom Nilai USTS dengan angka 0-100. Setelah selesai, impor kembali via sistem.' },
        { label: 'Tanggal Cetak Format', value: new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }) },
      ],
      headers: ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Nilai USTS (0-100)', 'Panduan Predikat', 'Deskripsi Capaian (Opsional)'],
      rows: rows.map((r, idx) => {
        const scoreVal = r.score !== '' && r.score !== null && !isNaN(Number(r.score)) ? Number(r.score) : '';
        return [
          idx + 1,
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

  const handleApplyImportedGrades = (updates) => {
    if (isLocked) {
      alert('Nilai untuk kelas ini telah dikunci/finalisasi.');
      return;
    }
    setRows((prev) => {
      const updated = prev.map((row) => {
        const match = updates.find((u) => u.studentId === row.id || (u.nisn && u.nisn === row.nisn));
        if (match && match.score !== null) {
          const score = match.score;
          const pred = getPredicate(score);
          const autoDesc = formatDescription(pred);
          return {
            ...row,
            score,
            description: match.description?.trim() || autoDesc,
          };
        }
        return row;
      });
      saveDraftLocally(updated);
      return updated;
    });
    setSaveStatus('LOCAL_DRAFT');
    setSaved(true);
    setSaveMessage(`Berhasil mengimpor nilai untuk ${updates.length} siswa. Data diamankan di draf lokal. Klik "Simpan Nilai USTS" untuk menyinkronkan ke database.`);
  };

  const handleSaveGrades = async () => {
    if (isLocked) {
      alert('Nilai untuk kelas dan mata pelajaran ini telah dikunci/finalisasi. Silakan ajukan pembukaan kunci terlebih dahulu.');
      return;
    }
    if (localDraftTimerRef.current) {
      clearTimeout(localDraftTimerRef.current);
      localDraftTimerRef.current = null;
    }
    setIsSaving(true);
    setSaved(false);
    setSaveMessage('');

    const currentUser = tokenStorage.getUser();
    const currentSubjectObj = subjects.find((item) => item.code === subject);
    const subjectName = currentSubjectObj ? currentSubjectObj.name : subject;

    const payload = {
      class_name: className,
      subject_code: subject,
      subject_name: subjectName,
      assessment_type: 'PTS',
      academic_year: academicYear,
      semester: semester,
      teacher_id: currentUser?.id || '',
      teacher_name: currentUser?.fullName || currentUser?.full_name || 'Guru Pengampu',
      grades: rows.map((r) => {
        const hasScore = r.score !== '' && r.score !== null && !isNaN(Number(r.score));
        const numScore = hasScore ? Number(r.score) : null;
        const pred = hasScore ? getPredicate(numScore) : '-';
        let desc = r.description;
        if (!desc && pred !== '-') {
          desc = formatDescription(pred);
        }
        return {
          student_id: r.id,
          person_id: r.person_id,
          nisn: r.nisn,
          student_name: r.name,
          score: numScore,
          description: hasScore && numScore >= 0 ? (desc || '') : '',
        };
      }),
    };

    if (payload.grades.length === 0) {
      setIsSaving(false);
      setSaveMessage('Belum ada siswa di kelas ini.');
      setSaved(true);
      return;
    }

    try {
      const res = await gradeApi.saveBulkGrades(payload);
      if (res.success) {
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setSaveStatus('CLOUD_SAVED');
        setLastSavedTime(timeStr);
        try { localStorage.removeItem(draftKey); } catch {}
        setSaveMessage(`Berhasil menyimpan ${res.data?.saved || payload.grades.length} nilai siswa ke database e-Rapor.`);
      } else {
        setSaveStatus('LOCAL_DRAFT');
        setSaveMessage(`Tersimpan lokal (${payload.grades.length} siswa). Server respons: ${res.error?.message || 'OK'}`);
      }
    } catch (err) {
      setSaveStatus('OFFLINE');
      setSaveMessage(`Tersimpan lokal (${payload.grades.length} siswa). Server offline.`);
    } finally {
      setIsSaving(false);
      setSaved(true);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Input Nilai USTS</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Input nilai Ujian Sumatif Tengah Semester (USTS) berdasarkan mata pelajaran yang diampu guru.
            Predikat dan deskripsi capaian kompetensi dibuat otomatis dari perolehan nilai.
          </p>
        </div>
      </div>

      {/* Banner Tenggat Pengisian Nilai PTS */}
      {ptsDeadline && (
        <div
          className={`p-4 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 shadow-xs ${
            ptsDeadline.is_open
              ? 'bg-white border-slate-200'
              : 'bg-rose-50/70 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#193D9B] shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900">{ptsDeadline.title}</h4>
                {!ptsDeadline.is_open && (
                  <span className="text-[11px] font-semibold text-rose-600">
                    (Ditutup)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Batas Pengisian:{' '}
                <span className="font-semibold text-slate-800">
                  {ptsDeadline.deadline_at
                    ? new Date(ptsDeadline.deadline_at).toLocaleString('id-ID', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      }) + ' WIB'
                    : 'Belum diatur'}
                </span>
                {ptsDeadline.announcement && ` • ${ptsDeadline.announcement}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner Pemulihan Draf Tersimpan Lokal (Autosave Safeguard) */}
      {draftRecovery && (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/80 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              💾
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-900">
                Ditemukan Draf Nilai Tersimpan Otomatis ({draftRecovery.time})
              </h4>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Terdapat <strong>{draftRecovery.count} nilai siswa</strong> yang belum tersinkronisasi ke server dari sesi sebelumnya. Ingin memulihkan data tersebut?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Abaikan Draf
            </button>
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Pulihkan Draf Sekarang</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner Status Penguncian Nilai & Mode Kepala Sekolah */}
      {isLocked ? (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-200 text-amber-900">
                  Nilai Terkunci / Final
                </span>
                <h4 className="text-xs font-bold text-slate-900">
                  Kelas {className} — {subject} ({academicYear} {semester})
                </h4>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Nilai telah difinalisasi oleh <strong>{lockDetails?.locked_by_name || 'Guru'}</strong>
                {lockDetails?.locked_at && ` pada ${new Date(lockDetails.locked_at).toLocaleString('id-ID')}`}.
                Pengubahan nilai dinonaktifkan untuk menjaga integritas data.
              </p>
            </div>
          </div>
          {!isKepalaSekolah && (
            <button
              type="button"
              onClick={() => setShowUnlockModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <span>Buka Kunci Nilai</span>
            </button>
          )}
        </div>
      ) : isKepalaSekolah ? (
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/80 text-blue-900 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base shrink-0">👑</span>
            <div>
              <p className="font-bold text-slate-900">Mode Supervisi & Pemantauan Kepala Sekolah (Hanya Lihat)</p>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Kepala Sekolah memiliki wewenang untuk meninjau dan memonitor nilai siswa seluruh kelas. Penginputan nilai hanya dapat dilakukan oleh Guru Mata Pelajaran pengampu.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg bg-white border border-blue-200 text-blue-800 font-bold text-xs shadow-2xs">
            Hak Akses: Read-Only
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Status Nilai: <strong>Mode Draft / Terbuka</strong>. Guru masih dapat menginput dan mengubah nilai siswa.</span>
          </div>
          <button
            type="button"
            onClick={() => handleToggleLock(true)}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Finalisasi & Kunci Nilai</span>
          </button>
        </div>
      )}

      {/* Banner Peringatan Guru Belum Ada Penugasan Mengajar */}
      {currentUser && (currentUser.role === 'GURU' || currentUser.roleName === 'GURU') && (classes.length === 0 || subjects.length === 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-xs flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900">Belum Ada Penugasan Mata Pelajaran & Kelas</h4>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Akun Anda belum memiliki mata pelajaran atau rombel yang diatur pada jadwal e-Rapor untuk Tahun Ajaran <strong>{academicYear} ({semester})</strong>.
              Sistem tidak akan memasukkan data kelas atau mapel secara sembarangan. Silakan hubungi Administrator e-Rapor sekolah untuk mengatur penugasan mengampu di menu <em>Pengampu Mata Pelajaran</em>.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar Filter & Aksi Tambahan */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[0.9fr_0.9fr_1.2fr_0.8fr_1.2fr]">
        <label className="text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between">
            <span>Tahun Ajaran</span>
            {currentUser && (currentUser.role === 'GURU' || currentUser.roleName === 'GURU') && (
              <span className="text-[10px] text-blue-600 font-normal">Terkunci Super Admin</span>
            )}
          </div>
          <select
            value={academicYear}
            disabled={Boolean(currentUser && (currentUser.role === 'GURU' || currentUser.roleName === 'GURU'))}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
          >
            <option value="2024/2025">{`2024/2025 ${academicYear === '2024/2025' ? '(Aktif)' : '(Arsip)'}`}</option>
            <option value="2025/2026">{`2025/2026 ${academicYear === '2025/2026' ? '(Aktif)' : ''}`}</option>
            <option value="2026/2027">{`2026/2027 ${academicYear === '2026/2027' ? '(Aktif)' : ''}`}</option>
            {academicYear && !['2024/2025', '2025/2026', '2026/2027'].includes(academicYear) && (
              <option value={academicYear}>{`${academicYear} (Aktif)`}</option>
            )}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between">
            <span>Semester</span>
            {currentUser && (currentUser.role === 'GURU' || currentUser.roleName === 'GURU') && (
              <span className="text-[10px] text-blue-600 font-normal">Terkunci Super Admin</span>
            )}
          </div>
          <select
            value={semester}
            disabled={Boolean(currentUser && (currentUser.role === 'GURU' || currentUser.roleName === 'GURU'))}
            onChange={(e) => setSemester(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
          >
            <option value="GANJIL">Ganjil</option>
            <option value="GENAP">Genap</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Mata Pelajaran
          <select value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            {subjects.length === 0 ? (
              <option value="">— Belum Ada Mapel Diampu —</option>
            ) : (
              subjects.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)
            )}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Rombel
          <select value={className} onChange={(event) => setClassName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            {classesForSubject.length === 0 ? (
              <option value="">— Belum Ada Kelas —</option>
            ) : (
              classesForSubject.map((item) => <option key={item} value={item}>Kelas {item}</option>)
            )}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Cari Siswa
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari NISN atau nama..." className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
      </div>

      {/* Tombol Bar Tombol Cepat: Excel, Import, Log, Template */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Unduh format spreadsheet untuk penilaian offline di rumah"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Unduh Template Penilaian (.xls)</span>
          </button>

          {!isKepalaSekolah && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Impor nilai dari berkas Excel atau salin-tempel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Impor Nilai Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenLogs}
            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Log Perubahan Nilai</span>
          </button>
        </div>

        {!isKepalaSekolah && (
          <button
            type="button"
            onClick={() => setShowTemplateConfig(!showTemplateConfig)}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showTemplateConfig ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
            <span>{showTemplateConfig ? 'Sembunyikan Pengaturan Deskripsi' : 'Buka Pengaturan Deskripsi'}</span>
          </button>
        )}
      </div>

      {/* Panel Pengaturan Template Deskripsi Capaian (Redesain & Button di Bawah) */}
      {showTemplateConfig && (
        <section className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-blue-950">
                  Pengaturan Default Deskripsi Capaian — Kelas {className} ({subjects.find((s) => s.code === subject)?.name || subject})
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Tersimpan Otomatis
                </span>
              </div>
              <p className="text-xs text-blue-800/80 mt-1">
                Ketikkan ringkasan <strong>Materi Pokok / Tujuan Pembelajaran (TP)</strong> pada kotak di bawah. Uraian capaian otomatis dirangkai untuk semua predikat (A, B, C, D) dan tersimpan permanen di akun Anda.
              </p>
            </div>
          </div>

          {/* Input Materi Pokok / TP Lebih Luas (Multi-line Textarea) */}
          <div className="rounded-xl bg-white p-4 border border-blue-200 shadow-2xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="input-materi-tp" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#193D9B]" />
                <span>Materi Pokok / Tujuan Pembelajaran (TP):</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Ketik materi pokok di sini — otomatis diaplikasikan ke semua predikat
              </span>
            </div>
            <textarea
              id="input-materi-tp"
              rows={3}
              disabled={isLocked || isKepalaSekolah}
              value={quickTopic}
              onChange={handleTopicChange}
              placeholder="Contoh: memahami makna ghibah, tabayun dan ruksah di kehidupan sehari-hari serta mampu mempraktikkan sikap bijak bermedia sosial"
              className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#193D9B] focus:ring-2 focus:ring-blue-100 transition font-medium leading-relaxed resize-y shadow-inner"
            />
          </div>

          {/* Pratinjau 4 Rentang Predikat (Otomatis Terisi & Sesuai Kurikulum Merdeka) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Predikat A */}
            <div className="rounded-xl bg-white p-3 border border-emerald-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Predikat A (86–100) • Sangat Baik
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">Otomatis Terisi</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 min-h-[46px] flex items-center">
                {predicateTemplates.A}
              </p>
            </div>

            {/* Predikat B */}
            <div className="rounded-xl bg-white p-3 border border-blue-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                  Predikat B (76–85) • Baik
                </span>
                <span className="text-[10px] text-blue-700 font-semibold">Otomatis Terisi</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 min-h-[46px] flex items-center">
                {predicateTemplates.B}
              </p>
            </div>

            {/* Predikat C */}
            <div className="rounded-xl bg-white p-3 border border-amber-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                  Predikat C (66–75) • Cukup
                </span>
                <span className="text-[10px] text-amber-700 font-semibold">Otomatis Terisi</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 min-h-[46px] flex items-center">
                {predicateTemplates.C}
              </p>
            </div>

            {/* Predikat D */}
            <div className="rounded-xl bg-white p-3 border border-rose-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                  Predikat D (0–65) • Kurang
                </span>
                <span className="text-[10px] text-rose-700 font-semibold">Otomatis Terisi</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium bg-rose-50/50 p-2.5 rounded-lg border border-rose-100 min-h-[46px] flex items-center">
                {predicateTemplates.D}
              </p>
            </div>
          </div>

          {/* Bottom Action Bar: Button Pindah ke Bawah */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-blue-200">
            <span className="text-[11px] text-slate-500 font-medium">
              💡 Deskripsi di atas otomatis digunakan saat nilai siswa diinput. Klik &quot;Simpan Deskripsi&quot; untuk menyimpan deskripsi ke seluruh siswa kelas {className}.
            </span>
            <button
              id="btn-simpan-deskripsi"
              type="button"
              disabled={isLocked || isKepalaSekolah}
              onClick={applyTemplateToAllStudents}
              className="px-4 py-2 rounded-xl bg-[#193D9B] hover:bg-[#153280] disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-2"
              title="Simpan deskripsi ke seluruh siswa kelas"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Simpan Deskripsi</span>
            </button>
          </div>
        </section>
      )}

      {isTeacherRole && (classes.length === 0 || subjects.length === 0 || !className || !subject) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-xl">
            ⚠️
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Belum Ditentukan Mata Pelajaran & Kelas Pengampu
          </h3>
          <p className="text-xs text-amber-800 max-w-lg mx-auto leading-relaxed">
            Akun Anda belum memiliki mata pelajaran atau rombongan belajar pengampu aktif pada Tahun Ajaran <strong>{academicYear} ({semester})</strong>.
            Anda tidak dapat menginputkan nilai siswa sebelum Administrator e-Rapor menetapkan penugasan mata pelajaran pengampu Anda di menu <em>Pengampu Mata Pelajaran</em>.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Kelas {className} <span className="font-normal text-slate-500">• {subjects.find((item) => item.code === subject)?.name}</span>
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {visibleRows.length} siswa terdata • Tahun {academicYear} Semester {semester}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {saveStatus === 'LOCAL_DRAFT' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Draf tersimpan di cache</span>
                  {lastSavedTime && <span className="text-[11px] text-amber-600 font-normal">({lastSavedTime} WIB)</span>}
                </span>
              ) : saveStatus === 'CLOUD_SAVED' && lastSavedTime ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold shadow-2xs">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Tersimpan di database ({lastSavedTime} WIB)</span>
                </span>
              ) : null}

              {isKepalaSekolah ? (
                <span className="rounded-lg bg-blue-100 border border-blue-200 px-3.5 py-2 text-xs font-bold text-blue-900 flex items-center gap-1.5 shadow-2xs">
                  <span>👑</span>
                  <span>Mode Pantau Kepala Sekolah</span>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isSaving || isLocked}
                  onClick={handleSaveGrades}
                  className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-xs transition flex items-center gap-1.5 ${
                    isLocked
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-[#193D9B] hover:bg-[#153280] cursor-pointer disabled:opacity-50'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Simpan Nilai USTS</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          {saved && (
            <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">
              {saveMessage || 'Nilai USTS berhasil disimpan.'}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="w-12 px-4 py-3 text-center">No</th>
                  <th className="px-3 py-3">NISN</th>
                  <th className="px-3 py-3">Nama lengkap</th>
                  <th className="w-32 px-3 py-3">Nilai</th>
                  <th className="w-36 px-3 py-3">Predikat</th>
                  <th className="min-w-[340px] px-3 py-3">Deskripsi capaian</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, index) => {
                  const predicate = getPredicate(row.score);
                  const itemNo = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={row.id} className="border-b border-slate-100 align-top last:border-0 hover:bg-blue-50/30">
                      <td className="px-4 py-3 text-center text-xs font-semibold text-slate-400">{itemNo}</td>
                      <td className="px-3 py-3 text-xs font-medium text-slate-600 font-mono">{row.nisn}</td>
                      <td className="px-3 py-3 text-xs font-semibold text-slate-900">{row.name}</td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          disabled={isLocked || isKepalaSekolah}
                          value={row.score}
                          onChange={(event) => updateScore(row.id, event.target.value)}
                          className={`w-20 rounded-lg border px-2.5 py-2 text-center text-sm font-bold outline-none ${
                            isLocked || isKepalaSekolah
                              ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-600'
                              : 'border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                          }`}
                          aria-label={`Nilai ${row.name}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex min-w-8 justify-center rounded-md px-2 py-1 text-xs font-bold ${predicate === 'A' ? 'bg-emerald-100 text-emerald-800' : predicate === 'B' ? 'bg-blue-100 text-blue-800' : predicate === 'C' ? 'bg-amber-100 text-amber-800' : predicate === 'D' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'}`}>{predicate}</span>
                          {predicate !== '-' && (
                            <span className="text-[10px] font-medium text-slate-500 leading-tight">
                              {PREDICATE_LABELS[predicate]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          value={row.description}
                          disabled={isLocked || isKepalaSekolah}
                          onChange={(event) => updateDescription(row.id, event.target.value)}
                          rows={2}
                          placeholder="Deskripsi capaian kompetensi..."
                          className={`w-full resize-y rounded-lg border px-3 py-2 text-xs leading-5 outline-none ${
                            isLocked || isKepalaSekolah
                              ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-600'
                              : 'border-slate-300 text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                          }`}
                          aria-label={`Deskripsi ${row.name}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleRows.length === 0 && <p className="px-4 py-10 text-center text-xs text-slate-500">Siswa tidak ditemukan pada rombel ini.</p>}

          {/* Paginasi Data Siswa */}
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
      )}
      <p className="text-[11px] text-slate-400">Rentang predikat: A (86–100), B (76–85), C (66–75), D (0–65).</p>

      {/* Modal Buka Kunci Nilai */}
      {showUnlockModal && (
        <Modal
          isOpen={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          title="Buka Kunci Nilai untuk Revisi"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Anda akan membuka status penguncian nilai <strong>Kelas {className} — {subject} ({academicYear} {semester})</strong>.
              Setiap perubahan nilai yang dilakukan setelah pembukaan kunci akan tercatat otomatis di <strong>Audit Trail (Log Perubahan)</strong>.
            </p>
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Alasan / Catatan Pembukaan Kunci:
              </label>
              <textarea
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Contoh: Koreksi nilai tugas siswa setelah remidi atau perbaikan teknis"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleToggleLock(false, unlockReason)}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs cursor-pointer"
              >
                Konfirmasi Buka Kunci
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Riwayat Log Perubahan Nilai */}
      {showLogsModal && (
        <Modal
          isOpen={showLogsModal}
          onClose={() => setShowLogsModal(false)}
          title={`Riwayat Log Perubahan Nilai • Kelas ${className} (${subject})`}
        >
          <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto">
            {isLoadingLogs ? (
              <p className="text-center py-8 text-slate-500">Memuat log perubahan...</p>
            ) : changeLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <svg className="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Belum ada riwayat perubahan nilai yang tercatat untuk rombel dan mapel ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {changeLogs.map((log) => (
                  <div key={log.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">{log.student_name}</span>
                      <span>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold font-mono">
                        {log.old_score !== null ? log.old_score : '-'}
                      </span>
                      <span className="text-slate-400">➔</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold font-mono">
                        {log.new_score !== null ? log.new_score : '-'}
                      </span>
                      <span className="text-slate-600 ml-2">Diubah oleh: <strong>{log.changed_by_name || 'Guru'}</strong></span>
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                        &quot;{log.reason}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-900 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Impor Nilai Excel */}
      {isImportModalOpen && (
        <ImportGradesModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          currentRows={rows}
          className={className}
          subjectName={subjects.find((item) => item.code === subject)?.name || subject}
          subjectCode={subject}
          onApplyGrades={handleApplyImportedGrades}
        />
      )}
    </div>
  );
}
