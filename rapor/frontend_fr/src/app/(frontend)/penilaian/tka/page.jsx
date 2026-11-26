'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { attendanceApi } from '@/lib/attendanceApi';
import { gradeApi } from '@/lib/gradeApi';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { getSchoolAcademicPeriod } from '@/lib/academicPeriod';
import { exportToExcelXml } from '@/lib/excelExport';
import { cbtAdapter } from '@/lib/cbtAdapter';
import Pagination from '@/components/Pagination';

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

const formatCleanNisn = (val) => {
  const cleaned = String(val || '')
    .trim()
    .replace(/^(?:siswa|student|nisn)[_\-\s]+/i, '');
  return cleaned || '-';
};

const SUBJECT_ALIAS_GROUPS = [
  ['pai', 'paibp', 'agama', 'agamaislam', 'pendidikanagamaislam', 'pendidikanagamaislamdanbudipekerti', 'paidanbudipekerti'],
  ['pkn', 'ppkn', 'pancasila', 'pendidikanpancasila', 'pendidikanpancasiladankewarganegaraan'],
  ['bin', 'bindo', 'bind', 'bahasaindonesia', 'bindonesia'],
  ['bing', 'binggris', 'bahasainggris', 'english'],
  ['mtk', 'mat', 'matematika'],
  ['ipa', 'ilmupengetahuanalam'],
  ['ips', 'ilmupengetahuansosial'],
  ['pjok', 'penjas', 'penjasorkes', 'pendidikanjasmani', 'olahraga'],
  ['sbk', 'sbp', 'seni', 'senibudaya', 'senibudayadanprakarya', 'prakarya'],
  ['inf', 'tik', 'informatika'],
  ['bjw', 'bjawa', 'bahasajawa', 'bahasadaerah', 'mulok'],
  ['bk', 'bp', 'bimbingankonseling'],
];

const getAliasGroupIdx = (val) => {
  if (!val) return -1;
  return SUBJECT_ALIAS_GROUPS.findIndex((grp) =>
    grp.some((alias) => val === alias || (val.length >= 4 && alias.length >= 4 && (val.includes(alias) || alias.includes(val))))
  );
};

export default function HasilTKAPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('ABSEN');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [academicYear, setAcademicYear] = useState(() => getSchoolAcademicPeriod().year);
  const [semester, setSemester] = useState(() => getSchoolAcademicPeriod().semester);

  const [availableTkaExams, setAvailableTkaExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const roleStr = String(currentUser?.role || currentUser?.roleName || currentUser?.role_name || '').toUpperCase();
  const isTeacherRole = Boolean(currentUser && (roleStr === 'GURU' || roleStr.includes('GURU') || roleStr.includes('TEACHER') || roleStr === 'PROKTOR'));
  const isKepalaSekolah = roleStr.includes('KEPALA');

  // 1. Muat master mapel & rombel pengampu guru
  useEffect(() => {
    const period = getSchoolAcademicPeriod();
    if (period?.year) setAcademicYear(period.year);
    if (period?.semester) setSemester(period.semester);

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
        const isTeacher = Boolean(user && (roleUpper === 'GURU' || roleUpper.includes('GURU') || roleUpper.includes('TEACHER') || roleUpper === 'PROKTOR'));

        if (clsRes.success && Array.isArray(clsRes.data)) {
          let teacherClasses = clsRes.data;
          if (isTeacher) {
            const myName = (user.fullName || user.full_name || '').toLowerCase();
            teacherClasses = clsRes.data.filter((c) =>
              c.dosen_id === user.id ||
              c.teacher_id === user.id ||
              (myName && c.teacher_name && c.teacher_name.toLowerCase().includes(myName)) ||
              (user.nimNip && (c.dosen_id?.includes(user.nimNip) || c.teacher_nip?.includes(user.nimNip)))
            );
          }

          setTeacherAssignments(teacherClasses);

          const classNames = [...new Set(teacherClasses.map((c) => c.class_code || c.name || c.id).filter(Boolean))];
          setClasses(classNames);
          setClassName((prev) => (classNames.includes(prev) ? prev : (classNames[0] || '')));

          if (isTeacher) {
            const normCode = (v) => String(v || '').toLowerCase().trim().replace(/^crs[-_]/i, '');
            const teacherCourseCodes = [...new Set(teacherClasses.map((c) => normCode(c.course_code || c.course_id)).filter(Boolean))];
            const teacherCourseNames = [...new Set(teacherClasses.map((c) => String(c.course_name || c.subject_name || '').toLowerCase().trim()).filter(Boolean))];
            const filteredSubjects = availableSubjects.filter((s) => {
              const sCode = normCode(s.code);
              const sName = String(s.name || '').toLowerCase().trim();
              if (sCode && teacherCourseCodes.includes(sCode)) return true;
              if (sName && teacherCourseNames.some((tn) => tn === sName || tn.includes(sName) || sName.includes(tn))) return true;
              return false;
            });
            setSubjects(filteredSubjects);
            setSubject((prev) => (filteredSubjects.some((s) => s.code === prev) ? prev : (filteredSubjects[0]?.code || '')));
          } else {
            setSubjects(availableSubjects);
            setSubject((prev) => (availableSubjects.some((s) => s.code === prev) ? prev : (availableSubjects[0]?.code || '')));
          }
        }
      } catch (err) {
        console.warn('Gagal memuat master data TKA:', err);
      }
    };

    fetchMasterData();
  }, []);

  // 2. Sinkronkan rombel kelas sesuai mapel yang dipilih
  useEffect(() => {
    if (!teacherAssignments || teacherAssignments.length === 0) return;
    const subLow = String(subject || '').toLowerCase().trim().replace(/^crs[-_]/i, '');
    const matched = subLow
      ? teacherAssignments.filter((c) => {
          const cc = String(c.course_code || c.course_id || '').toLowerCase().trim().replace(/^crs[-_]/i, '');
          return !cc || cc === subLow;
        })
      : teacherAssignments;
    const listToUse = matched.length > 0 ? matched : teacherAssignments;
    const scopedClasses = [...new Set(listToUse.map((c) => c.class_code || c.name || c.id).filter(Boolean))];
    setClasses(scopedClasses);
    setClassName((prev) => (scopedClasses.includes(prev) ? prev : (scopedClasses[0] || '')));
  }, [subject, teacherAssignments]);

  // 3. Muat daftar siswa kelas & nilai TKA tersimpan
  const loadRosterAndScores = useCallback(async () => {
    if (!className || !subject) {
      setRows([]);
      return;
    }
    try {
      const res = await gradeApi.getGrades({
        className,
        subjectCode: subject,
        assessmentType: 'TKA',
        academicYear,
        semester,
      });

      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) =>
          (a.student_name || '').localeCompare(b.student_name || '', 'id', { sensitivity: 'base' })
        );
        setRows(
          sorted.map((g, idx) => ({
            id: g.student_id,
            absenNo: idx + 1,
            nisn: formatCleanNisn(g.nisn),
            name: g.student_name || 'Siswa',
            className: g.class_name || className,
            score: g.score !== undefined && g.score !== null && Number(g.score) >= 0 ? String(g.score) : '',
            status: g.score !== undefined && g.score !== null && Number(g.score) >= 0 ? 'TERSIMPAN' : 'BELUM',
          }))
        );
        return;
      }

      const { accountApiAdapter } = await import('@/lib/features/auth/infrastructure/accountApiAdapter');
      const list = await accountApiAdapter.getStudents(className);
      if (Array.isArray(list) && list.length > 0) {
        const sorted = [...list].sort((a, b) =>
          (a.full_name || a.fullName || a.name || '').localeCompare(
            b.full_name || b.fullName || b.name || '',
            'id',
            { sensitivity: 'base' }
          )
        );
        setRows(
          sorted.map((s, idx) => ({
            id: s.id,
            absenNo: idx + 1,
            nisn: formatCleanNisn(s.nisn || s.nim_nip),
            name: s.full_name || s.fullName || s.name || 'Siswa',
            className,
            score: '',
            status: 'BELUM',
          }))
        );
      } else {
        setRows([]);
      }
    } catch (err) {
      console.warn('Gagal memuat siswa TKA:', err);
      setRows([]);
    }
  }, [className, subject, academicYear, semester]);

  useEffect(() => {
    loadRosterAndScores();
  }, [loadRosterAndScores]);

  // 4. Cari sesi ujian CBT khusus kategori TKA yang sesuai mapel & tingkat kelas guru
  useEffect(() => {
    const fetchTkaExams = async () => {
      if (!className || !subject) {
        setAvailableTkaExams([]);
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
        const normSubjectName = (s) =>
          String(s || '')
            .toLowerCase()
            .trim()
            .replace(/\([^)]*\)/g, '')
            .replace(/[^a-z0-9]/g, '');

        const curSubCodeNorm = normStr(subject).replace(/^crs/, '');
        const curSubNameNorm = normSubjectName(subjectName);

        const isTka = (ex) =>
          String(ex.examCategory || ex.exam_category || '').toUpperCase() === 'TKA' ||
          /\btka\b/i.test(String(ex.title || '')) ||
          /\btka\b/i.test(String(ex.token || ''));

        const checkSubMatch = (ex) => {
          const rawExSub = String(ex.subject || ex.course_name || '').trim();
          const exSub = normSubjectName(rawExSub);
          const exCode = normStr(ex.subjectCode || ex.course_id || '').replace(/^crs/, '');
          const isStaleInf = exCode === 'inf' && exSub && !exSub.includes('informatika') && !exSub.includes('tik');

          if (!isStaleInf && exCode && exCode !== 'mapel' && exCode !== 'umum' && curSubCodeNorm && exCode === curSubCodeNorm) {
            return true;
          }
          if (exSub && exSub !== 'umum' && exSub !== 'mapel' && curSubNameNorm) {
            if (exSub === curSubNameNorm) return true;
            if (exSub.length >= 4 && curSubNameNorm.length >= 4 && (exSub.includes(curSubNameNorm) || curSubNameNorm.includes(exSub))) {
              return true;
            }
          }
          const curGroup = getAliasGroupIdx(curSubNameNorm) !== -1 ? getAliasGroupIdx(curSubNameNorm) : getAliasGroupIdx(curSubCodeNorm);
          const exGroup = getAliasGroupIdx(exSub) !== -1 ? getAliasGroupIdx(exSub) : (!isStaleInf ? getAliasGroupIdx(exCode) : -1);
          return curGroup !== -1 && curGroup === exGroup;
        };

        const checkClassMatch = (ex) => {
          const exNorm = normalizeClassCode(ex.className || ex.class_code || '');
          const exGrade = extractGradeLevelDigit(ex.targetGradeLevel || ex.className || ex.class_code || ex.rawDescription || ex.title || '');
          if (exNorm && exNorm === cNorm) return true;
          if (Array.isArray(ex.targetClasses) && ex.targetClasses.some((tc) => normalizeClassCode(tc) === cNorm)) return true;
          if (classGrade && exGrade && classGrade === exGrade) return true;
          return false;
        };

        const filtered = (allExams || []).filter((ex) => isTka(ex) && checkSubMatch(ex) && checkClassMatch(ex));
        setAvailableTkaExams(filtered);
        setSelectedExamId(filtered[0]?.id || '');
      } catch (err) {
        console.warn('Gagal memuat ujian TKA:', err);
      }
    };

    fetchTkaExams();
  }, [className, subject, subjects]);

  // 5. Tarik hasil nilai TKA langsung dari CBT
  const handlePullTkaScores = async () => {
    if (!selectedExamId) {
      setNotice({ type: 'error', text: 'Pilih sesi ujian TKA terlebih dahulu.' });
      return;
    }
    setIsSyncing(true);
    setNotice(null);
    try {
      const sessions = await cbtAdapter.getExamSessions(selectedExamId);
      if (!sessions || sessions.length === 0) {
        setNotice({ type: 'info', text: 'Belum ada peserta yang mengumpulkan jawaban pada sesi TKA ini.' });
        return;
      }

      const normName = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanId = (v) => String(v || '').trim().replace(/^(?:siswa|student|nisn)[_\-\s]+/i, '').toLowerCase();

      let matchedCount = 0;
      setRows((prev) =>
        prev.map((row) => {
          const rId = cleanId(row.id);
          const rNisn = cleanId(row.nisn);
          const rName = normName(row.name);

          const sess = sessions.find((s) => {
            const sId = cleanId(s.studentId || s.student_id);
            const sNisn = cleanId(s.nisn || s.student_nisn || s.studentNISN);
            const sName = normName(s.studentName || s.student_name);
            if (rNisn && rNisn !== '-' && (sNisn === rNisn || sId === rNisn)) return true;
            if (rId && (sId === rId || sNisn === rId)) return true;
            if (rName && sName && (sName === rName || sName.includes(rName) || rName.includes(sName))) return true;
            return false;
          });

          if (sess && sess.score !== undefined && sess.score !== null) {
            matchedCount += 1;
            return {
              ...row,
              score: String(sess.score),
              status: sess.status === 'SUBMITTED' ? 'SELESAI CBT' : String(sess.status || 'CBT'),
            };
          }
          return row;
        })
      );

      setNotice({
        type: matchedCount > 0 ? 'success' : 'info',
        text: matchedCount > 0
          ? `Berhasil menarik nilai TKA untuk ${matchedCount} siswa kelas ${className}. Klik "Simpan Hasil TKA" untuk menyimpan permanen.`
          : `Tidak ditemukan peserta kelas ${className} pada sesi TKA yang dipilih.`,
      });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Gagal menarik nilai TKA dari CBT.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // 6. Simpan hasil TKA ke e-Rapor (assessmentType: 'TKA')
  const handleSaveTkaGrades = async () => {
    if (!className || !subject || rows.length === 0) return;
    setIsSaving(true);
    setNotice(null);
    try {
      const currentSubObj = subjects.find((s) => s.code === subject);
      const payload = rows
        .filter((r) => r.score !== '' && !Number.isNaN(Number(r.score)))
        .map((r) => ({
          student_id: r.id,
          student_name: r.name,
          nisn: r.nisn,
          class_name: className,
          subject_code: subject,
          subject_name: currentSubObj?.name || subject,
          assessment_type: 'TKA',
          academic_year: academicYear,
          semester,
          score: Number(r.score),
          description: 'Hasil Tes Kemampuan Akademik (TKA)',
        }));

      if (payload.length === 0) {
        setNotice({ type: 'info', text: 'Belum ada nilai TKA yang terisi untuk disimpan.' });
        return;
      }

      const res = await gradeApi.saveBulkGrades(payload);
      if (res?.success) {
        setNotice({ type: 'success', text: `Berhasil menyimpan ${payload.length} nilai TKA kelas ${className}.` });
      } else {
        throw new Error(res?.error?.message || 'Gagal menyimpan nilai TKA.');
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Gagal menyimpan nilai TKA.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Ekspor Excel
  const handleExportExcel = () => {
    const currentSubObj = subjects.find((s) => s.code === subject);
    const subLabel = currentSubObj?.name || subject || 'Mapel';
    exportToExcelXml({
      filename: `Hasil_TKA_${subLabel.replace(/\s+/g, '_')}_${className}.xls`,
      sheetName: 'Hasil TKA',
      columns: [
        { header: 'No', key: 'absenNo' },
        { header: 'NISN', key: 'nisn' },
        { header: 'Nama Siswa', key: 'name' },
        { header: 'Kelas', key: 'className' },
        { header: 'Skor TKA', key: 'score' },
        { header: 'Status', key: 'status' },
      ],
      rows: visibleRows.map((r) => ({
        absenNo: r.absenNo,
        nisn: r.nisn,
        name: r.name,
        className: r.className,
        score: r.score !== '' ? r.score : '-',
        status: r.status,
      })),
    });
  };

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter(
      (r) => !q || (r.name || '').toLowerCase().includes(q) || (r.nisn || '').toLowerCase().includes(q)
    );
    if (sortBy === 'SCORE_DESC') {
      list = [...list].sort((a, b) => (Number(b.score) || -1) - (Number(a.score) || -1));
    } else if (sortBy === 'SCORE_ASC') {
      list = [...list].sort((a, b) => (Number(a.score) || 999) - (Number(b.score) || 999));
    }
    return list;
  }, [rows, search, sortBy]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, currentPage, pageSize]);

  const stats = useMemo(() => {
    const scored = rows.filter((r) => r.score !== '' && !Number.isNaN(Number(r.score)));
    const vals = scored.map((r) => Number(r.score));
    const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '0';
    const max = vals.length > 0 ? Math.max(...vals) : 0;
    return { total: rows.length, done: scored.length, avg, max };
  }, [rows]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
              Terpisah dari UAS / ASAS
            </span>
            <span className="text-xs text-slate-500 font-medium">
              T.A. {academicYear} • Semester {semester}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Hasil Ujian TKA (Tes Kemampuan Akademik)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau, tarik nilai otomatis dari sesi CBT TKA, dan ekspor hasil TKA sesuai mata pelajaran &amp; rombel yang Anda ampu.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={visibleRows.length === 0}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Ekspor Excel
          </button>
          {!isKepalaSekolah && (
            <button
              type="button"
              onClick={handleSaveTkaGrades}
              disabled={isSaving || rows.length === 0}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Hasil TKA'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold text-slate-500">Total Siswa Rombel</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 p-4">
          <p className="text-[11px] font-semibold text-emerald-700">Sudah Ada Nilai TKA</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{stats.done}</p>
        </div>
        <div className="bg-white rounded-2xl border border-violet-200 p-4">
          <p className="text-[11px] font-semibold text-violet-700">Rata-Rata Skor TKA</p>
          <p className="text-2xl font-black text-violet-700 mt-1">{stats.avg}</p>
        </div>
        <div className="bg-white rounded-2xl border border-blue-200 p-4">
          <p className="text-[11px] font-semibold text-blue-700">Skor Tertinggi</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{stats.max}</p>
        </div>
      </div>

      {/* Panel Tarik Nilai TKA dari CBT */}
      <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-sm shrink-0">
            TKA
          </div>
          <div>
            <h2 className="text-sm font-bold text-violet-950">
              Tarik Hasil Ujian TKA dari e-Ujian CBT
            </h2>
            <p className="text-xs text-violet-800">
              Menampilkan khusus sesi ujian berkategori <strong>TKA</strong> yang sesuai dengan mata pelajaran dan jenjang kelas yang Anda ampu.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="flex-1 rounded-xl border border-violet-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {availableTkaExams.length === 0 ? (
              <option value="">Belum ada jadwal ujian TKA untuk mapel &amp; tingkat kelas ini</option>
            ) : (
              availableTkaExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} {ex.targetGradeLevel ? `(Tingkat ${ex.targetGradeLevel})` : ex.className ? `(${ex.className})` : ''}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            disabled={isSyncing || !selectedExamId}
            onClick={handlePullTkaScores}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer whitespace-nowrap"
          >
            {isSyncing ? 'Menarik Nilai...' : '↻ Tarik Nilai TKA'}
          </button>
        </div>

        {notice && (
          <div
            className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold border ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : notice.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-white border-violet-200 text-violet-900'
            }`}
          >
            {notice.text}
          </div>
        )}
      </div>

      {/* Filter Mapel, Rombel, Cari Siswa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Mata Pelajaran</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
          >
            {subjects.length === 0 ? (
              <option value="">Tidak ada mapel pengampu</option>
            ) : (
              subjects.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Rombel Kelas</label>
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
          >
            {classes.length === 0 ? (
              <option value="">Belum ada rombel</option>
            ) : (
              classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Urutkan</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
          >
            <option value="ABSEN">Urutan Absen (A–Z)</option>
            <option value="SCORE_DESC">Skor Tertinggi</option>
            <option value="SCORE_ASC">Skor Terendah</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Cari Siswa</label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari NISN atau nama..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
          />
        </div>
      </div>

      {/* Tabel Hasil TKA */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-3 px-4 w-14 text-center">No</th>
                <th className="py-3 px-4">NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 w-36 text-center">Skor TKA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Belum ada data siswa pada kelas/mapel ini.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-center font-bold text-slate-500">{row.absenNo}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{row.nisn}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{row.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          row.score !== ''
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {row.score !== '' ? row.status : 'Belum Ada Nilai'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        disabled={isKepalaSekolah}
                        value={row.score}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, score: val, status: val !== '' ? 'EDIT MANUAL' : 'BELUM' } : item
                            )
                          );
                        }}
                        placeholder="-"
                        className="w-24 text-center font-mono font-bold text-sm rounded-lg border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-100"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100">
          <Pagination
            currentPage={currentPage}
            totalItems={visibleRows.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setCurrentPage(1);
            }}
            pageSizeOptions={[15, 30, 50]}
            itemLabel="siswa"
          />
        </div>
      </div>
    </div>
  );
}
