'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { gradeApi } from '@/lib/gradeApi';
import { exportToExcelXml } from '@/lib/excelExport';
import WaliKelasHeaderBanner from '@/features/wali-kelas/components/WaliKelasHeaderBanner';
import WaliKelasStatsBar from '@/features/wali-kelas/components/WaliKelasStatsBar';
import WaliKelasToolbar from '@/features/wali-kelas/components/WaliKelasToolbar';
import WaliKelasStudentTable, { SUBJECT_COLUMNS } from '@/features/wali-kelas/components/WaliKelasStudentTable';

// Lazy loading modals agar tidak membebani initial bundle
const StudentReportModal = dynamic(() => import('@/components/StudentReportModal'), {
  ssr: false,
  loading: () => null,
});

const BulkStudentReportModal = dynamic(() => import('@/components/BulkStudentReportModal'), {
  ssr: false,
  loading: () => null,
});

const AttendanceModal = dynamic(() => import('@/features/wali-kelas/components/AttendanceModal'), {
  ssr: false,
  loading: () => null,
});

const AVAILABLE_CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B'];

export default function WaliKelasRaporPage() {
  const [selectedClass, setSelectedClass] = useState('7A');
  const [isAdminOrKepalaSekolah, setIsAdminOrKepalaSekolah] = useState(false);
  const [gradesData, setGradesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [semester, setSemester] = useState('Genap');
  const [endorsement, setEndorsement] = useState(null);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [isBulkPrintModalOpen, setIsBulkPrintModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data Wali Kelas (Otomatis dari SSO)
  const [teacherName, setTeacherName] = useState('-');
  const [teacherNip, setTeacherNip] = useState('-');

  // Kehadiran Siswa
  const [attendanceMap, setAttendanceMap] = useState({});
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [tempAttendance, setTempAttendance] = useState({});
  const [attendanceSaveNotice, setAttendanceSaveNotice] = useState(false);
  const [allTeachers, setAllTeachers] = useState([]);

  useEffect(() => {
    const user = tokenStorage.getUser();
    if (user) {
      if (user.fullName || user.full_name) {
        setTeacherName(user.fullName || user.full_name);
      }
      if (user.nimNip || user.nip) {
        setTeacherNip(user.nimNip || user.nip);
      }
      const roleStr = String(user.role || user.roleName || user.role_id || '').toUpperCase();
      const isPrivileged = roleStr.includes('ADMIN') || roleStr.includes('KEPALA');
      setIsAdminOrKepalaSekolah(isPrivileged);

      const directClass = user.className || user.class_name;
      if (directClass) {
        const clean = directClass.replace(/^Kelas\s*/i, '');
        setSelectedClass(clean);
      }

      accountApiAdapter.getTeachers().then((teachers) => {
        if (Array.isArray(teachers)) {
          setAllTeachers(teachers);
          const me = teachers.find(
            (t) =>
              t.id === user.id ||
              (user.nimNip && t.nim_nip === user.nimNip) ||
              (t.full_name && user.fullName && t.full_name.toLowerCase() === user.fullName.toLowerCase())
          );
          if (me && me.class_name) {
            const clean = me.class_name.replace(/^Kelas\s*/i, '');
            setSelectedClass(clean);
          }
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isAdminOrKepalaSekolah && allTeachers.length > 0) {
      const cleanClass = selectedClass.replace(/^Kelas\s*/i, '').trim();
      const walas = allTeachers.find((t) => {
        const c = (t.class_name || t.className || '').replace(/^Kelas\s*/i, '').trim();
        return c.toLowerCase() === cleanClass.toLowerCase();
      });
      if (walas) {
        setTeacherName(walas.full_name || walas.fullName || `Wali Kelas ${cleanClass}`);
        setTeacherNip(walas.nim_nip || walas.nip || '-');
      } else {
        setTeacherName(`Wali Kelas ${cleanClass}`);
        setTeacherNip('-');
      }
    }
  }, [selectedClass, isAdminOrKepalaSekolah, allTeachers]);

  const fetchClassGrades = useCallback(async (className, year, sem) => {
    setIsLoading(true);
    const cleanClass = className.replace(/^Kelas\s*/i, '');
    const currentYear = year || academicYear;
    const currentSem = sem || semester;

    try {
      const [res, ssoStudents, endRes] = await Promise.all([
        gradeApi.getGrades({
          className: cleanClass,
          assessmentType: 'PTS',
          academicYear: currentYear,
          semester: currentSem.toUpperCase(),
        }),
        accountApiAdapter.getStudents().catch(() => []),
        gradeApi.getEndorsements({
          academicYear: currentYear,
          semester: currentSem.toUpperCase(),
        }).catch(() => ({ data: [] })),
      ]);

      if (endRes?.success && Array.isArray(endRes.data)) {
        const found = endRes.data.find(
          (e) => e.class_name === cleanClass || e.class_name === `Kelas ${cleanClass}`
        );
        setEndorsement(found || null);
      } else {
        setEndorsement(null);
      }

      let loadedGrades = [];
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        loadedGrades = res.data;
      }

      const matchingSsoStudents = (Array.isArray(ssoStudents) ? ssoStudents : []).filter((s) => {
        const sClass = (s.class_name || s.className || '').replace(/^Kelas\s*/i, '').trim();
        return sClass.toLowerCase() === cleanClass.toLowerCase() ||
               (cleanClass === '7A' && (sClass === 'VII-A' || sClass === 'VII A'));
      });

      const existingStudentIds = new Set(loadedGrades.map((g) => g.student_id || g.nisn));
      matchingSsoStudents.forEach((student) => {
        const sid = student.id || student.nisn;
        if (!existingStudentIds.has(sid)) {
          loadedGrades.push({
            student_id: student.id,
            person_id: student.person_id || null,
            nisn: student.nisn || student.nim_nip || '-',
            student_name: student.full_name || student.fullName || student.name,
            class_name: cleanClass,
            score: -1,
            subject_code: '',
            predicate: '-',
            description: '',
          });
        }
      });

      setGradesData(loadedGrades);
    } catch (err) {
      console.warn('Gagal memuat nilai kelas dari e-Rapor API:', err);
      try {
        const ssoStudents = await accountApiAdapter.getStudents();
        const fallback = (Array.isArray(ssoStudents) ? ssoStudents : [])
          .filter((s) => {
            const sClass = (s.class_name || s.className || '').replace(/^Kelas\s*/i, '').trim();
            return sClass.toLowerCase() === cleanClass.toLowerCase() ||
                   (cleanClass === '7A' && (sClass === 'VII-A' || sClass === 'VII A'));
          })
          .map((s) => ({
            student_id: s.id,
            person_id: s.person_id || null,
            nisn: s.nisn || s.nim_nip || '-',
            student_name: s.full_name || s.fullName || s.name,
            class_name: cleanClass,
            score: -1,
            subject_code: '',
            predicate: '-',
            description: '',
          }));
        setGradesData(fallback);
      } catch {
        setGradesData([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [academicYear, semester]);

  useEffect(() => {
    fetchClassGrades(selectedClass, academicYear, semester);
  }, [selectedClass, academicYear, semester, fetchClassGrades]);

  const studentsSummary = useMemo(() => {
    const studentMap = {};

    gradesData.forEach((item) => {
      const sId = item.student_id || item.nisn;
      if (!sId) return;
      if (!studentMap[sId]) {
        studentMap[sId] = {
          id: sId,
          nisn: item.nisn || '-',
          name: item.student_name || 'Siswa',
          className: item.class_name || selectedClass,
          scores: {},
          descriptions: {},
        };
      }
      if (typeof item.score === 'number' && item.score >= 0) {
        studentMap[sId].scores[item.subject_code] = item.score;
      }
      if (item.description) {
        studentMap[sId].descriptions[item.subject_code] = item.description;
      }
    });

    const studentsList = Object.values(studentMap).map((student) => {
      const scoreValues = Object.values(student.scores).filter((v) => typeof v === 'number');
      const totalScore = scoreValues.reduce((acc, curr) => acc + curr, 0);
      const avgScore = scoreValues.length > 0 ? Number((totalScore / scoreValues.length).toFixed(1)) : 0;
      const isComplete = SUBJECT_COLUMNS.every((col) => student.scores[col.code] !== undefined);
      const isPassed = avgScore >= 75;
      const att = attendanceMap[student.id] || { hadir: 58, sakit: 0, izin: 0, alfa: 0 };

      return {
        ...student,
        totalScore,
        avgScore,
        isComplete,
        isPassed,
        attendance: att,
      };
    });

    studentsList.sort((a, b) => {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      return a.name.localeCompare(b.name);
    });

    return studentsList.map((student, idx) => ({
      ...student,
      rank: student.avgScore > 0 ? idx + 1 : '-',
    }));
  }, [gradesData, selectedClass, attendanceMap]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return studentsSummary;
    const q = searchQuery.toLowerCase();
    return studentsSummary.filter(
      (s) => s.name.toLowerCase().includes(q) || s.nisn.includes(q)
    );
  }, [studentsSummary, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, searchQuery]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const totalStudents = studentsSummary.length;
  const classAverage =
    totalStudents > 0
      ? Number((studentsSummary.reduce((acc, s) => acc + s.avgScore, 0) / totalStudents).toFixed(1))
      : 0;
  const passedStudents = studentsSummary.filter((s) => s.isPassed).length;
  const remedialStudents = totalStudents - passedStudents;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const headers = [
      'No',
      'NISN',
      'Nama Siswa',
      'Kelas',
      ...SUBJECT_COLUMNS.map((c) => c.label),
      'Total Nilai',
      'Rata-rata',
      'Peringkat',
      'Hadir',
      'Sakit',
      'Izin',
      'Alfa',
      'Status KKM (75)',
    ];

    const rows = studentsSummary.map((s, idx) => {
      const subjectScores = SUBJECT_COLUMNS.map((c) => {
        const val = s.scores[c.code];
        return typeof val === 'number' ? val : '-';
      });
      return [
        idx + 1,
        s.nisn,
        s.name,
        `Kelas ${selectedClass}`,
        ...subjectScores,
        s.totalScore,
        s.avgScore,
        s.rank,
        s.attendance?.hadir ?? 58,
        s.attendance?.sakit ?? 0,
        s.attendance?.izin ?? 0,
        s.attendance?.alfa ?? 0,
        s.isPassed ? 'TUNTAS' : 'REMEDIAL',
      ];
    });

    exportToExcelXml({
      filename: `Buku_Nilai_Kelas_${selectedClass}_${academicYear.replace('/', '-')}_${semester}.xls`,
      sheetName: `Kelas ${selectedClass}`,
      title: 'BUKU INDUK REKAPITULASI NILAI KELAS',
      subtitle: `SMP NEGERI 1 PRAMBON • TAHUN AJARAN ${academicYear} SEMESTER ${semester.toUpperCase()}`,
      metadata: [
        { label: 'Kelas Binaan', value: `Kelas ${selectedClass}` },
        { label: 'Wali Kelas', value: `${teacherName} (NIP. ${teacherNip})` },
        { label: 'Status Pengesahan', value: endorsement?.status === 'APPROVED' ? 'DISAHKAN KEPALA SEKOLAH' : 'BELUM DISAHKAN' },
        { label: 'Rata-rata Kelas', value: classAverage },
        { label: 'Tanggal Unduh', value: new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }) },
      ],
      headers,
      rows,
    });
  };

  const handleOpenAttendanceModal = () => {
    const initialMap = {};
    studentsSummary.forEach((s) => {
      initialMap[s.id] = {
        hadir: s.attendance?.hadir ?? 58,
        sakit: s.attendance?.sakit ?? 1,
        izin: s.attendance?.izin ?? 1,
        alfa: s.attendance?.alfa ?? 0,
      };
    });
    setTempAttendance(initialMap);
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendance = () => {
    setAttendanceMap((prev) => ({
      ...prev,
      ...tempAttendance,
    }));
    setIsAttendanceModalOpen(false);
    setAttendanceSaveNotice(true);
    setTimeout(() => setAttendanceSaveNotice(false), 4000);
  };

  const updateTempAttendanceItem = (studentId, field, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setTempAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { hadir: 60, sakit: 0, izin: 0, alfa: 0 }),
        [field]: num,
      },
    }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* 1. Header Banner */}
      <WaliKelasHeaderBanner
        selectedClass={selectedClass}
        teacherName={teacherName}
        teacherNip={teacherNip}
        academicYear={academicYear}
        semester={semester}
        setAcademicYear={setAcademicYear}
        setSemester={setSemester}
        endorsement={endorsement}
      />

      {/* Notifikasi Penyimpanan Kehadiran */}
      {attendanceSaveNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Data kehadiran siswa berhasil disimpan dan otomatis masuk ke lembar Rapor Sisipan!</span>
          </div>
          <button type="button" onClick={() => setAttendanceSaveNotice(false)} className="text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* 2. Filter & Stat Bar */}
      <WaliKelasStatsBar
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        isAdminOrKepalaSekolah={isAdminOrKepalaSekolah}
        availableClasses={AVAILABLE_CLASSES}
        totalStudents={totalStudents}
        classAverage={classAverage}
        passedStudents={passedStudents}
        remedialStudents={remedialStudents}
      />

      {/* 3. Action Toolbar */}
      <WaliKelasToolbar
        onOpenAttendance={handleOpenAttendanceModal}
        onPrint={handlePrint}
        onExportExcel={handleExportExcel}
        onBulkPrint={() => setIsBulkPrintModalOpen(true)}
      />

      {/* 4. Tabel Nilai & Paginasi */}
      <WaliKelasStudentTable
        isLoading={isLoading}
        selectedClass={selectedClass}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        paginatedStudents={paginatedStudents}
        filteredStudentsCount={filteredStudents.length}
        currentPage={currentPage}
        pageSize={pageSize}
        setCurrentPage={setCurrentPage}
        setPageSize={setPageSize}
        onSelectStudentForReport={setSelectedStudentForReport}
      />

      {/* 5. Modal Input Kehadiran Siswa (Lazy Loaded) */}
      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        selectedClass={selectedClass}
        studentsSummary={studentsSummary}
        tempAttendance={tempAttendance}
        updateTempAttendanceItem={updateTempAttendanceItem}
        onSaveAttendance={handleSaveAttendance}
      />

      {/* 6. Modal Pratinjau & Cetak Rapor Siswa (Lazy Loaded) */}
      {selectedStudentForReport && (
        <StudentReportModal
          isOpen={Boolean(selectedStudentForReport)}
          onClose={() => setSelectedStudentForReport(null)}
          student={selectedStudentForReport}
          selectedClass={selectedClass}
          teacherName={teacherName}
          teacherNip={teacherNip}
          reportDate=""
          academicYear={academicYear}
          semester={semester}
          endorsement={endorsement}
        />
      )}

      {/* 7. Modal Cetak Massal Rapor 1 Rombel */}
      {isBulkPrintModalOpen && (
        <BulkStudentReportModal
          isOpen={isBulkPrintModalOpen}
          onClose={() => setIsBulkPrintModalOpen(false)}
          students={studentsSummary}
          selectedClass={selectedClass}
          teacherName={teacherName}
          teacherNip={teacherNip}
          endorsement={endorsement}
          academicYear={academicYear}
          semester={semester}
        />
      )}
    </div>
  );
}
