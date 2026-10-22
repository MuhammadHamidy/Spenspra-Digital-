'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { gradeApi } from '@/lib/gradeApi';
import { exportToExcelXml } from '@/lib/excelExport';
import { getSchoolAcademicPeriod } from '@/lib/academicPeriod';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';
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

const DigitalSignatureModal = dynamic(() => import('@/components/DigitalSignatureModal'), {
  ssr: false,
  loading: () => null,
});

export default function WaliKelasRaporPage() {
  const [selectedClass, setSelectedClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [isAdminOrKepalaSekolah, setIsAdminOrKepalaSekolah] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isWalas, setIsWalas] = useState(false);
  const [isCheckingWalas, setIsCheckingWalas] = useState(true);
  const [gradesData, setGradesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [academicYear, setAcademicYear] = useState(() => getSchoolAcademicPeriod().year);
  const [semester, setSemester] = useState(() => getSchoolAcademicPeriod().semester);
  const [schoolKkm, setSchoolKkm] = useState(() => getSchoolAcademicPeriod().kkm);
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
    const period = getSchoolAcademicPeriod();
    if (period?.year) setAcademicYear(period.year);
    if (period?.semester) setSemester(period.semester);

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

      if (isPrivileged) {
        setIsWalas(true);
      }

      classApiAdapter.getAll().then((classes) => {
        if (Array.isArray(classes) && classes.length > 0) {
          const unique = [...new Set(classes.map((c) => (c.class_code || c.name || '').replace(/^Kelas\s*/i, '').trim()).filter(Boolean))].sort();
          if (unique.length > 0) {
            setAvailableClasses(unique);
            if (isPrivileged) {
              setSelectedClass((prev) => (prev && unique.includes(prev) ? prev : unique[0]));
            }
          }
        }
      });

      const directClass = user.className || user.class_name;

      accountApiAdapter.getTeachers().then((teachers) => {
        if (Array.isArray(teachers)) {
          setAllTeachers(teachers);
          const me = teachers.find(
            (t) =>
              t.id === user.id ||
              (user.nimNip && t.nim_nip === user.nimNip) ||
              (t.full_name && user.fullName && t.full_name.toLowerCase() === user.fullName.toLowerCase())
          );

          if (isPrivileged) {
            setIsWalas(true);
            setIsCheckingWalas(false);
            return;
          }

          const assignedClass = me?.class_name || directClass;
          if (assignedClass) {
            const clean = assignedClass.replace(/^Kelas\s*/i, '').trim();
            setSelectedClass(clean);
            setIsWalas(true);
          } else {
            setIsWalas(false);
            setSelectedClass('');
          }
        } else {
          if (!isPrivileged) {
            if (directClass) {
              const clean = directClass.replace(/^Kelas\s*/i, '').trim();
              setSelectedClass(clean);
              setIsWalas(true);
            } else {
              setIsWalas(false);
              setSelectedClass('');
            }
          }
        }
        setIsCheckingWalas(false);
      }).catch(() => {
        if (!isPrivileged) {
          if (directClass) {
            const clean = directClass.replace(/^Kelas\s*/i, '').trim();
            setSelectedClass(clean);
            setIsWalas(true);
          } else {
            setIsWalas(false);
            setSelectedClass('');
          }
        }
        setIsCheckingWalas(false);
      });
    } else {
      setIsCheckingWalas(false);
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
    if (!className) {
      setIsLoading(false);
      setGradesData([]);
      return;
    }
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
      const isPassed = avgScore >= schoolKkm;
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
  }, [gradesData, selectedClass, attendanceMap, schoolKkm]);

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

  const attendanceStorageKey = `spenspra_attendance_${selectedClass}_${academicYear.replace('/', '_')}_${semester}`;

  useEffect(() => {
    if (!selectedClass) return;
    try {
      const stored = localStorage.getItem(`spenspra_attendance_${selectedClass}_${academicYear.replace('/', '_')}_${semester}`);
      if (stored) {
        setAttendanceMap(JSON.parse(stored));
      }
    } catch (e) {}
  }, [selectedClass, academicYear, semester]);

  const handleOpenAttendanceModal = () => {
    const initialMap = {};
    studentsSummary.forEach((s) => {
      initialMap[s.id] = {
        hadir: s.attendance?.hadir ?? 58,
        sakit: s.attendance?.sakit ?? 0,
        izin: s.attendance?.izin ?? 0,
        alfa: s.attendance?.alfa ?? 0,
      };
    });
    setTempAttendance(initialMap);
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendance = () => {
    const updated = {
      ...attendanceMap,
      ...tempAttendance,
    };
    setAttendanceMap(updated);
    try {
      localStorage.setItem(attendanceStorageKey, JSON.stringify(updated));
    } catch (e) {}
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

  const handleSaveSignature = async ({ signatureData, signatureType, notes, approverRole, principalName, principalNip, signatoryTitle }) => {
    try {
      const user = tokenStorage.getUser();
      const finalPrincipalName = principalName?.trim() || user?.fullName || user?.full_name || (approverRole === 'ADMIN' ? 'Administrator Kurikulum' : 'Kepala Sekolah SMPN 1 Prambon');
      const finalPrincipalNip = principalNip?.trim() || user?.nimNip || user?.nip || '';

      const payload = {
        class_name: selectedClass,
        academic_year: academicYear,
        semester: semester.toUpperCase(),
        assessment_type: 'PTS',
        principal_id: user?.id || '',
        principal_name: finalPrincipalName,
        principal_nip: finalPrincipalNip,
        approver_role: approverRole || 'KEPALA_SEKOLAH',
        signatory_title: signatoryTitle || (approverRole === 'ADMIN' ? 'Administrator / Tim Kurikulum' : 'Kepala SMP Negeri 1 Prambon'),
        signature_type: signatureType,
        signature_data: signatureData,
        status: 'APPROVED',
        notes: notes || (approverRole === 'ADMIN' ? 'Disahkan oleh Administrator Kurikulum SMPN 1 Prambon' : 'Disahkan oleh Kepala Sekolah SMPN 1 Prambon'),
      };

      const res = await gradeApi.saveEndorsement(payload);
      if (res?.success) {
        setEndorsement(payload);
        setIsSignatureModalOpen(false);
      } else {
        alert(res?.error?.message || 'Gagal menyimpan pengesahan ke server');
      }
    } catch (err) {
      alert(`Terjadi kesalahan saat menyimpan pengesahan: ${err.message}`);
    }
  };

  if (isCheckingWalas) {
    return (
      <div className="max-w-7xl mx-auto py-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Memeriksa penugasan wali kelas...</p>
        </div>
      </div>
    );
  }

  if (!isWalas && !isAdminOrKepalaSekolah) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 md:p-12 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
            Akses Terkunci
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-3">
            Anda Belum Ditugaskan Sebagai Wali Kelas
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
            Halaman Rekapitulasi dan Buku Nilai Wali Kelas hanya dapat diakses oleh Bapak/Ibu Guru yang telah ditugaskan secara resmi sebagai Wali Kelas untuk Tahun Ajaran <strong>{academicYear} ({semester})</strong>.
          </p>
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 max-w-md mx-auto text-left text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Nama Guru: {teacherName}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>NIP: {teacherNip}</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              Jika Anda merupakan wali kelas aktif pada tahun ajaran ini, silakan hubungi <strong>Administrator e-Rapor</strong> untuk memperbarui penugasan kelas Anda di menu <em>Data Guru & Walas</em>.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        isAdminOrKepalaSekolah={isAdminOrKepalaSekolah}
        onOpenSignature={() => setIsSignatureModalOpen(true)}
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
        kkm={schoolKkm}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        isAdminOrKepalaSekolah={isAdminOrKepalaSekolah}
        availableClasses={availableClasses}
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
        isAdminOrKepalaSekolah={isAdminOrKepalaSekolah}
        onOpenSignature={() => setIsSignatureModalOpen(true)}
      />

      {/* 4. Tabel Nilai & Paginasi */}
      <WaliKelasStudentTable
        kkm={schoolKkm}
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

      {/* 8. Modal Pengesahan Rapor Kepala Sekolah (TTD & Stempel) */}
      {isSignatureModalOpen && (
        <DigitalSignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          onSaveSignature={handleSaveSignature}
          className={selectedClass}
          initialSignature={endorsement?.signature_data || ''}
          principalName={endorsement?.principal_name || tokenStorage.getUser()?.fullName || tokenStorage.getUser()?.full_name || ''}
          principalNip={endorsement?.principal_nip || tokenStorage.getUser()?.nimNip || tokenStorage.getUser()?.nip || ''}
        />
      )}
    </div>
  );
}
