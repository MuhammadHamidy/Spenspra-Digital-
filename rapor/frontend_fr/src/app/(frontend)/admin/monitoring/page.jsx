'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Modal from '@/components/Modal';
import DigitalSignatureModal from '@/components/DigitalSignatureModal';
import ConfirmModal from '@/components/ConfirmModal';
import { gradeApi } from '@/lib/gradeApi';
import { deadlineApiAdapter } from '@/lib/features/deadlines/infrastructure/deadlineApiAdapter';
import { exportToExcelXml } from '@/lib/excelExport';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { attendanceApi } from '@/lib/attendanceApi';
import { getSchoolAcademicPeriod } from '@/lib/academicPeriod';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';

function AdminMonitoringContent() {
  const searchParams = useSearchParams();
  const [academicSummary, setAcademicSummary] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [searchTeacher, setSearchTeacher] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Tab Utama: Progres Guru vs Pengesahan Kepala Sekolah vs Matriks Kelengkapan (dikontrol via Sidebar sub-menu)
  const [activeTab, setActiveTab] = useState('TEACHERS'); // 'TEACHERS' | 'ENDORSEMENTS' | 'MATRIX'
  const [matrixFilterGrade, setMatrixFilterGrade] = useState('ALL'); // 'ALL' | '7' | '8' | '9'
  const [matrixToast, setMatrixToast] = useState('');

  // Sinkronisasi activeTab dengan URL search params dari navigasi sub-menu Sidebar
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam) {
      const upper = tabParam.toUpperCase();
      if (['TEACHERS', 'MATRIX', 'ENDORSEMENTS'].includes(upper)) {
        setActiveTab(upper);
      }
    }
  }, [searchParams]);

  // Pengesahan Rapor States
  const [endorsements, setEndorsements] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedClassForEndorsement, setSelectedClassForEndorsement] = useState('');
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState(() => getSchoolAcademicPeriod().year);
  const [semester, setSemester] = useState(() => getSchoolAcademicPeriod().semester);
  const [schoolKkm, setSchoolKkm] = useState(() => getSchoolAcademicPeriod().kkm);
  const [savedSignatureData, setSavedSignatureData] = useState('');

  // Modal Deadline State
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [formType, setFormType] = useState('PTS');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formIsOpen, setFormIsOpen] = useState(true);
  const [formAnnouncement, setFormAnnouncement] = useState('');
  const [isSubmittingDeadline, setIsSubmittingDeadline] = useState(false);
  const [deadlineSuccessMsg, setDeadlineSuccessMsg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resSummary, resDeadlines, resEndorsements, resClasses, resCourses] = await Promise.all([
        gradeApi.getMonitoringSummary(schoolKkm),
        deadlineApiAdapter.getDeadlines(),
        gradeApi.getEndorsements({ academicYear, semester }).catch(() => ({ data: [] })),
        attendanceApi.getClasses().catch(() => ({ data: [] })),
        attendanceApi.getCourses().catch(() => ({ data: [] })),
      ]);

      if (resSummary?.success && resSummary?.data) {
        setAcademicSummary(resSummary.data);
      }
      setDeadlines(Array.isArray(resDeadlines) ? resDeadlines : []);
      setEndorsements(Array.isArray(resEndorsements?.data) ? resEndorsements.data : []);

      // Ekstraksi kelas dinamis langsung dari database
      let clsList = [];
      if (resClasses?.success && Array.isArray(resClasses.data) && resClasses.data.length > 0) {
        clsList = [...new Set(resClasses.data.map((c) => c.class_code || c.name || c.id).filter(Boolean))].sort();
      }
      if (clsList.length === 0 && resSummary?.data?.classes && Array.isArray(resSummary.data.classes)) {
        clsList = [...new Set(resSummary.data.classes.map((c) => c.class_name).filter(Boolean))].sort();
      }
      if (clsList.length === 0) {
        try {
          const masterRombel = await classApiAdapter.getMasterRombel();
          if (Array.isArray(masterRombel) && masterRombel.length > 0) {
            clsList = masterRombel;
          }
        } catch {}
      }
      if (clsList.length === 0) {
        clsList = [
          '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I', '7J',
          '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '8I', '8J',
          '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H', '9I', '9J'
        ];
      }
      setAvailableClasses(clsList);

      // Ekstraksi mapel dinamis langsung dari database
      if (resCourses?.success && Array.isArray(resCourses.data) && resCourses.data.length > 0) {
        setAvailableCourses(resCourses.data.map((c) => ({ code: c.code, name: c.name })));
      }
    } catch (err) {
      console.warn('Gagal memuat monitoring summary / deadlines / endorsements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState(null);

  const handleDeleteTeacherGrades = (teacher) => {
    setDeleteConfirmConfig({
      title: 'Hapus Progres Nilai',
      message: `Apakah Anda yakin ingin menghapus seluruh data nilai yang diinput oleh Guru ${teacher.name} (${teacher.subjectName})? Tindakan ini akan menghapus data nilai tersebut dari database.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await gradeApi.deleteGrades({
            teacherId: teacher.id,
            subjectCode: teacher.subjectCode !== '-' ? teacher.subjectCode : undefined,
          });
          await loadData();
        } catch (err) {
          alert('Gagal menghapus nilai: ' + err.message);
        } finally {
          setDeleteConfirmConfig(null);
        }
      },
    });
  };

  const handleResetAllDummyGrades = () => {
    setDeleteConfirmConfig({
      title: 'Bersihkan Seluruh Nilai Uji Coba',
      message: 'Apakah Anda yakin ingin membersihkan SELURUH data nilai di e-Rapor? Seluruh nilai siswa di database akan di-reset menjadi kosong.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await gradeApi.deleteGrades({ all: true });
          await loadData();
        } catch (err) {
          alert('Gagal membersihkan nilai: ' + err.message);
        } finally {
          setDeleteConfirmConfig(null);
        }
      },
    });
  };

  useEffect(() => {
    loadData();
  }, [academicYear, semester]);

  const handleOpenSignatureModal = (cls) => {
    setSelectedClassForEndorsement(cls);
    setIsSignatureModalOpen(true);
  };

  const handleSaveSignature = async ({ signatureData, signatureType, notes, principalName, principalNip }) => {
    try {
      const user = tokenStorage.getUser();
      const finalPrincipalName = principalName?.trim() || user?.fullName || user?.full_name || 'Kepala Sekolah SMPN 1 Prambon';
      const finalPrincipalNip = principalNip?.trim() || user?.nimNip || user?.nip || '';

      const allTargetClasses = availableClasses.length > 0 ? availableClasses : [
        '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I', '7J',
        '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '8I', '8J',
        '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H', '9I', '9J'
      ];
      const targetClasses = selectedClassForEndorsement === 'ALL'
        ? allTargetClasses
        : [selectedClassForEndorsement];

      const savePromises = targetClasses.map((cls) => {
        const payload = {
          class_name: cls,
          academic_year: academicYear,
          semester: semester,
          assessment_type: 'PTS',
          principal_id: user?.id || '',
          principal_name: finalPrincipalName,
          principal_nip: finalPrincipalNip,
          signature_type: signatureType,
          signature_data: signatureData,
          status: 'APPROVED',
          notes: notes || 'Disahkan oleh Kepala Sekolah SMPN 1 Prambon',
        };
        return gradeApi.saveEndorsement(payload);
      });

      const results = await Promise.all(savePromises);
      const isAllSuccess = results.every((r) => r && r.success);

      if (isAllSuccess || results.some((r) => r && r.success)) {
        setSavedSignatureData(signatureData);
        setIsSignatureModalOpen(false);
        const successText = selectedClassForEndorsement === 'ALL'
          ? `Seluruh rapor rombel (${allTargetClasses.join(', ')}) berhasil disahkan sekaligus oleh ${finalPrincipalName}!`
          : `Rapor Kelas ${selectedClassForEndorsement} berhasil disahkan oleh ${finalPrincipalName}!`;
        setDeadlineSuccessMsg(successText);
        setTimeout(() => setDeadlineSuccessMsg(''), 5000);
        await loadData();
      } else {
        alert(results[0]?.error?.message || 'Gagal menyimpan pengesahan ke server');
      }
    } catch (err) {
      console.error('Gagal mengesahkan rapor:', err);
      alert(`Terjadi kesalahan saat menyimpan pengesahan: ${err.message}`);
    }
  };

  const handleExportMonitoringExcel = () => {
    exportToExcelXml({
      filename: `Rekap_Monitoring_Nilai_Spenspra_${academicYear.replace('/', '-')}_${semester}.xls`,
      sheetName: 'Monitoring Guru',
      title: 'REKAPITULASI PROGRES PENGISIAN NILAI GURU',
      subtitle: `SMP NEGERI 1 PRAMBON • TAHUN AJARAN ${academicYear} SEMESTER ${semester}`,
      metadata: [
        { label: 'Total Guru Pengampu', value: totalGuru },
        { label: 'Guru Selesai Input', value: `${completedGuru} Guru` },
        { label: 'Guru Sedang Mengisi', value: `${inProgressGuru} Guru` },
        { label: 'Guru Belum Mulai', value: `${notStartedGuru} Guru` },
        { label: 'Rata-rata Nilai Sekolah', value: rataRataSekolah },
        { label: 'Tanggal Rekap', value: new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }) },
      ],
      headers: ['No', 'Nama Guru', 'Mata Pelajaran', 'Rombel Diampu', 'Target Siswa', 'Siswa Ternilai', 'Persentase (%)', 'Status', 'Rerata Nilai', 'Pembaruan Terakhir'],
      rows: teacherList.map((t, idx) => [
        idx + 1,
        t.name,
        `${t.subjectCode} - ${t.subjectName}`,
        t.classes.join(', '),
        t.targetStudents,
        t.gradedStudents,
        t.percent,
        t.status === 'COMPLETED' ? 'SELESAI' : t.status === 'IN_PROGRESS' ? 'SEDANG MENGISI' : 'BELUM MULAI',
        t.averageScore,
        t.lastUpdated,
      ]),
    });
  };

  // Format list guru beserta progres penilaiannya
  const teacherList = useMemo(() => {
    if (academicSummary && Array.isArray(academicSummary.teachers)) {
      return academicSummary.teachers.map((t, idx) => {
        const classes = t.classes && t.classes.length > 0 ? t.classes : ['7A'];
        // Asumsi standar rombel SMP 32 siswa per kelas
        const targetStudents = 32 * classes.length;
        const graded = t.graded_count || 0;
        const percent = targetStudents > 0 ? Math.min(100, Math.round((graded / targetStudents) * 100)) : 0;

        let status = 'NOT_STARTED';
        if (percent >= 100 || (graded > 0 && graded >= 30)) {
          status = 'COMPLETED';
        } else if (graded > 0) {
          status = 'IN_PROGRESS';
        }

        return {
          id: t.teacher_id || `t-${idx}`,
          name: t.teacher_name || 'Guru Pengampu',
          subjectCode: t.subject_code || '-',
          subjectName: t.subject_name || t.subject_code || 'Mata Pelajaran',
          classes: classes,
          targetStudents,
          gradedStudents: graded,
          percent,
          status,
          averageScore: t.average_score ? Number(t.average_score.toFixed(1)) : 0,
          lastUpdated: t.last_updated
            ? new Date(t.last_updated).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
            : 'Belum ada aktivitas',
        };
      });
    }
    return [];
  }, [academicSummary]);

  const filteredTeachers = useMemo(() => {
    return teacherList.filter((t) => {
      const q = searchTeacher.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.subjectName.toLowerCase().includes(q) ||
        t.subjectCode.toLowerCase().includes(q) ||
        t.classes.some((c) => c.toLowerCase().includes(q));

      const matchClass =
        selectedClass === 'ALL' || t.classes.some((c) => c.startsWith(selectedClass));

      const matchStatus =
        filterStatus === 'ALL' || t.status === filterStatus;

      return matchSearch && matchClass && matchStatus;
    });
  }, [teacherList, searchTeacher, selectedClass, filterStatus]);

  // Statistik Ringkasan
  const totalGuru = teacherList.length;
  const completedGuru = teacherList.filter((t) => t.status === 'COMPLETED').length;
  const inProgressGuru = teacherList.filter((t) => t.status === 'IN_PROGRESS').length;
  const notStartedGuru = teacherList.filter((t) => t.status === 'NOT_STARTED').length;

  const totalNilaiMasuk = academicSummary?.total_grades ?? 0;
  const rataRataSekolah = academicSummary?.average_score ? Number(academicSummary.average_score.toFixed(1)) : 0;

  // Daftar Mapel Resmi untuk Matriks Kurikulum (Dinamis dari Backend)
  const OFFICIAL_MATRIX_SUBJECTS = useMemo(() => {
    if (availableCourses.length > 0) return availableCourses;
    return [
      { code: 'PAI', name: 'Pend. Agama Islam' },
      { code: 'PP', name: 'Pendidikan Pancasila' },
      { code: 'BI', name: 'Bahasa Indonesia' },
      { code: 'MAT', name: 'Matematika' },
      { code: 'IPA', name: 'Ilmu Pengetahuan Alam' },
      { code: 'IPS', name: 'Ilmu Pengetahuan Sosial' },
      { code: 'BIG', name: 'Bahasa Inggris' },
      { code: 'PJOK', name: 'PJOK' },
      { code: 'INF', name: 'Informatika' },
      { code: 'SBP', name: 'Seni Budaya & Prakarya' },
      { code: 'BJ', name: 'Bahasa Jawa' },
      { code: 'BTQ', name: 'Baca Tulis Al Qur’an' },
    ];
  }, [availableCourses]);

  const ALL_CLASS_ROSTER = useMemo(() => {
    if (availableClasses.length > 0) return availableClasses;
    return [
      '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I', '7J',
      '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '8I', '8J',
      '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H', '9I', '9J'
    ];
  }, [availableClasses]);

  // Kalkulasi Matriks Kelengkapan Rombel x Mapel (Waka Kurikulum)
  const matrixData = useMemo(() => {
    const classes = ALL_CLASS_ROSTER.filter((cls) => {
      if (matrixFilterGrade === 'ALL') return true;
      return cls.startsWith(matrixFilterGrade);
    });

    let totalSlots = 0;
    let completedSlots = 0;
    let inProgressSlots = 0;
    let notStartedSlots = 0;

    const rows = classes.map((cls) => {
      const subjectStatus = {};
      let classCompletedCount = 0;

      OFFICIAL_MATRIX_SUBJECTS.forEach((subj) => {
        totalSlots++;
        const teacher = teacherList.find(
          (t) =>
            (t.subjectCode === subj.code || t.subjectName.toLowerCase().includes(subj.code.toLowerCase())) &&
            t.classes.some((c) => c.includes(cls) || cls.includes(c))
        );

        if (teacher) {
          if (teacher.status === 'COMPLETED' || teacher.percent >= 100) {
            subjectStatus[subj.code] = {
              status: 'COMPLETED',
              percent: 100,
              graded: 32,
              teacherName: teacher.name,
              score: teacher.averageScore,
            };
            completedSlots++;
            classCompletedCount++;
          } else if (teacher.status === 'IN_PROGRESS' || teacher.gradedStudents > 0) {
            subjectStatus[subj.code] = {
              status: 'IN_PROGRESS',
              percent: teacher.percent,
              graded: teacher.gradedStudents,
              teacherName: teacher.name,
              score: teacher.averageScore,
            };
            inProgressSlots++;
          } else {
            subjectStatus[subj.code] = {
              status: 'NOT_STARTED',
              percent: 0,
              graded: 0,
              teacherName: teacher.name,
              score: 0,
            };
            notStartedSlots++;
          }
        } else {
          subjectStatus[subj.code] = {
            status: 'NOT_STARTED',
            percent: 0,
            graded: 0,
            teacherName: 'Belum Ditugaskan',
            score: 0,
          };
          notStartedSlots++;
        }
      });

      const classProgress = Math.round((classCompletedCount / OFFICIAL_MATRIX_SUBJECTS.length) * 100);

      return {
        className: cls,
        subjects: subjectStatus,
        completedCount: classCompletedCount,
        totalSubjects: OFFICIAL_MATRIX_SUBJECTS.length,
        progressPercent: classProgress,
      };
    });

    const overallPercent = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

    return {
      rows,
      totalSlots,
      completedSlots,
      inProgressSlots,
      notStartedSlots,
      overallPercent,
    };
  }, [teacherList, matrixFilterGrade, OFFICIAL_MATRIX_SUBJECTS, ALL_CLASS_ROSTER]);

  const handleCopyWaReminder = () => {
    const incompleteTeachers = teacherList.filter((t) => t.status !== 'COMPLETED');
    const deadlineObj = deadlines.find((d) => d.type === 'PTS') || deadlines[0];
    const deadlineStr = deadlineObj?.deadline_at
      ? new Date(deadlineObj.deadline_at).toLocaleDateString('id-ID', { dateStyle: 'full' })
      : 'Sesuai jadwal kurikulum';

    let msg = `*📢 PENGINGAT KELENGKAPAN NILAI E-RAPOR SMP NEGERI 1 PRAMBON*\n`;
    msg += `Tahun Ajaran: ${academicYear} • Semester ${semester}\n`;
    msg += `Batas Waktu Pengisian: *${deadlineStr}*\n\n`;
    msg += `Yth. Bapak/Ibu Guru SMPN 1 Prambon,\n`;
    msg += `Mohon kerja samanya untuk segera menyelesaikan penginputan nilai e-Rapor pada rombel berikut:\n\n`;

    if (incompleteTeachers.length === 0) {
      msg += `Alhamdulillah, seluruh guru pengampu telah menyelesaikan input nilai (100% Tuntas).\n`;
    } else {
      incompleteTeachers.forEach((t, idx) => {
        const statusLabel = t.status === 'IN_PROGRESS' ? `Sedang Mengisi (${t.percent}%)` : `Belum Mulai (0%)`;
        msg += `${idx + 1}. *${t.name}* (${t.subjectName})\n   ↳ Rombel: Kelas ${t.classes.join(', ')} [${statusLabel}]\n`;
      });
    }

    msg += `\nNilai yang lengkap diperlukan untuk proses pencetakan rapor massal dan penandatanganan kepala sekolah.\n`;
    msg += `Terima kasih atas dedikasi dan kerja sama Bapak/Ibu sekalian.\n`;
    msg += `_Waka Kurikulum SMP Negeri 1 Prambon_`;

    navigator.clipboard.writeText(msg).then(() => {
      setMatrixToast('Pesan WhatsApp berhasil disalin ke clipboard! Siap dipaste ke grup guru.');
      setTimeout(() => setMatrixToast(''), 4500);
    });
  };

  const handleExportMatrixExcel = () => {
    const headers = [
      'No',
      'Kelas / Rombel',
      ...OFFICIAL_MATRIX_SUBJECTS.map((s) => s.code),
      'Mapel Tuntas',
      'Persentase Kelengkapan',
      'Status Rombel',
    ];

    const rows = matrixData.rows.map((r, idx) => [
      idx + 1,
      `Kelas ${r.className}`,
      ...OFFICIAL_MATRIX_SUBJECTS.map((s) => {
        const cell = r.subjects[s.code];
        if (cell?.status === 'COMPLETED') return '100% (SELESAI)';
        if (cell?.status === 'IN_PROGRESS') return `${cell.percent}% (${cell.graded}/32)`;
        return '0% (BELUM)';
      }),
      `${r.completedCount} / ${r.totalSubjects}`,
      `${r.progressPercent}%`,
      r.progressPercent >= 100 ? 'LENGKAP' : 'BELUM LENGKAP',
    ]);

    exportToExcelXml({
      filename: `Matriks_Kelengkapan_Nilai_Spenspra_${academicYear.replace('/', '-')}_${semester}.xls`,
      sheetName: 'Matriks Kelengkapan',
      title: 'MATRIKS MONITORING KELENGKAPAN NILAI ROMBEL & MAPEL',
      subtitle: `SMP NEGERI 1 PRAMBON • TAHUN AJARAN ${academicYear} SEMESTER ${semester}`,
      metadata: [
        { label: 'Tahun Ajaran / Semester', value: `${academicYear} (${semester})` },
        { label: 'Total Slot Rombel x Mapel', value: `${matrixData.totalSlots} Slot` },
        { label: 'Slot Tuntas', value: `${matrixData.completedSlots} Slot (${matrixData.overallPercent}%)` },
        { label: 'Slot Menunggu', value: `${matrixData.inProgressSlots + matrixData.notStartedSlots} Slot` },
        { label: 'Tanggal Rekap', value: new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }) },
      ],
      headers,
      rows,
    });
  };

  // Deadline handler
  const openCreateDeadlineModal = () => {
    setEditingDeadline(null);
    setFormType('PTS');
    setFormTitle('Penilaian Tengah Semester (PTS) Ganjil');
    setFormDate('');
    setFormIsOpen(true);
    setFormAnnouncement('');
    setIsDeadlineModalOpen(true);
  };

  const openEditDeadlineModal = (dl) => {
    setEditingDeadline(dl);
    setFormType(dl.type || 'PTS');
    setFormTitle(dl.title || '');
    // format date for datetime-local input
    if (dl.deadline_at) {
      const d = new Date(dl.deadline_at);
      const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setFormDate(isoLocal);
    } else {
      setFormDate('');
    }
    setFormIsOpen(dl.is_open ?? true);
    setFormAnnouncement(dl.announcement || '');
    setIsDeadlineModalOpen(true);
  };

  const handleDeleteDeadline = async (dl) => {
    const isConfirm = window.confirm(`Apakah Anda yakin ingin menghapus jadwal batas waktu "${dl.title}"?`);
    if (!isConfirm) return;

    try {
      const updated = await deadlineApiAdapter.deleteDeadline(dl.id || dl.type);
      setDeadlines(updated);
      setDeadlineSuccessMsg(`Jadwal batas waktu "${dl.title}" berhasil dihapus.`);
      setTimeout(() => setDeadlineSuccessMsg(''), 4000);
    } catch (err) {
      alert(`Gagal menghapus jadwal tenggat: ${err.message}`);
    }
  };

  const handleSaveDeadline = async (e) => {
    e.preventDefault();
    setIsSubmittingDeadline(true);

    try {
      const payload = {
        id: editingDeadline?.id || `dl-${formType.toLowerCase()}-${Date.now()}`,
        type: formType,
        title: formTitle.trim() || `Tenggat Penilaian ${formType}`,
        deadline_at: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
        is_open: formIsOpen,
        announcement: formAnnouncement.trim(),
        academic_year: '2026/2027',
        semester: '1',
      };

      await deadlineApiAdapter.saveDeadline(payload);
      setDeadlineSuccessMsg(editingDeadline ? `Batas waktu ${payload.type} berhasil diperbarui.` : `Batas waktu baru berhasil ditambahkan.`);
      const updated = await deadlineApiAdapter.getDeadlines();
      setDeadlines(updated);
      setIsDeadlineModalOpen(false);
      setTimeout(() => setDeadlineSuccessMsg(''), 4000);
    } catch (err) {
      alert(`Gagal menyimpan tenggat: ${err.message}`);
    } finally {
      setIsSubmittingDeadline(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Monitoring Akademik & Pengesahan Rapor
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              SMPN 1 Prambon
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Supervisi eksekutif Kepala Sekolah: pantau progres nilai guru, tenggat waktu, serta verifikasi & pengesahan tanda tangan digital rapor siswa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Selector Tahun Ajaran & Semester */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 pl-1.5 hidden sm:inline">Periode:</span>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-white text-slate-800 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs outline-none cursor-pointer text-xs hover:border-slate-300 transition"
            >
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="bg-white text-slate-800 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs outline-none cursor-pointer text-xs hover:border-slate-300 transition"
            >
              <option value="GANJIL">Ganjil</option>
              <option value="GENAP">Genap</option>
            </select>
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportMonitoringExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
              title="Unduh Rekap Monitoring Nilai ke Excel"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Ekspor Excel (.xls)</span>
            </button>

            {activeTab === 'TEACHERS' && (
              <button
                type="button"
                onClick={openCreateDeadlineModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#193D9B] hover:bg-[#153280] text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
                title="Atur Batas Waktu Pengisian Nilai Guru"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Tambah Batas Waktu</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Indikator Modul Sub-Menu Aktif (Navigasi via Sidebar) */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sub-Menu Aktif:</span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            {activeTab === 'TEACHERS' && (
              <>
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Progres Pengisian Nilai & Tenggat Guru</span>
              </>
            )}
            {activeTab === 'MATRIX' && (
              <>
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Matriks Kelengkapan Rombel (Waka Kurikulum)</span>
              </>
            )}
            {activeTab === 'ENDORSEMENTS' && (
              <>
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pengesahan Rapor Kepala Sekolah (Tanda Tangan Digital)</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {activeTab === 'MATRIX' && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              {matrixData.overallPercent}% Tuntas
            </span>
          )}
          {activeTab === 'ENDORSEMENTS' && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-bold border border-blue-200">
              {endorsements.length}/{ALL_CLASS_ROSTER.length} Disahkan
            </span>
          )}
        </div>
      </div>

      {deadlineSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{deadlineSuccessMsg}</span>
        </div>
      )}

      {/* Konten Tab 2: Pengesahan Rapor Kepala Sekolah */}
      {activeTab === 'ENDORSEMENTS' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 border-l-4 border-l-[#193D9B] rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#193D9B] border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#193D9B]"></span>
                Otoritas Pengesahan Eksekutif
              </span>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Verifikasi & Pengesahan Buku Rapor Sisipan
              </h2>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                Kepala Sekolah dapat membubuhkan tanda tangan resmi secara digital (melalui kanvas langsung atau unggah gambar) untuk mengesahkan lembar rapor siswa pada rombel bersangkutan atau seluruh rombel sekaligus.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenSignatureModal('ALL')}
              className="px-4 py-2.5 rounded-lg bg-[#193D9B] hover:bg-[#153280] text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Sahkan Sekaligus Semua Rombel ({ALL_CLASS_ROSTER[0]} - {ALL_CLASS_ROSTER[ALL_CLASS_ROSTER.length - 1]})</span>
            </button>
          </div>

          {/* Kartu Status Rombel Pengesahan */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_CLASS_ROSTER.map((cls) => {
              const itemEndorsement = endorsements.find((e) => e.class_name === cls || e.class_name === `Kelas ${cls}`);
              const isApproved = itemEndorsement && itemEndorsement.status === 'APPROVED';

              return (
                <div
                  key={cls}
                  className={`rounded-xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                    isApproved
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Rombel SMPN 1 Prambon
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">Kelas {cls}</h3>
                      </div>
                      {isApproved ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Disahkan</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Menunggu
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs py-2 border-y border-slate-100">
                      <div className="flex justify-between text-slate-600">
                        <span>Tahun Ajaran:</span>
                        <span className="font-semibold text-slate-800">{academicYear} ({semester})</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Penandatangan:</span>
                        <span className="font-semibold text-slate-800">
                          {isApproved
                            ? (itemEndorsement?.principal_name || 'Kepala Sekolah')
                            : '- (Menunggu Pengesahan)'}
                        </span>
                      </div>
                      {isApproved && itemEndorsement?.principal_nip && (
                        <div className="flex justify-between text-slate-600">
                          <span>NIP Kepala Sekolah:</span>
                          <span className="font-semibold text-slate-800 font-mono">
                            {itemEndorsement.principal_nip}
                          </span>
                        </div>
                      )}
                      {isApproved && itemEndorsement?.signed_at && (
                        <div className="flex justify-between text-slate-600">
                          <span>Waktu Pengesahan:</span>
                          <span className="text-slate-700">
                            {new Date(itemEndorsement.signed_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Preview Tanda Tangan */}
                    {isApproved && itemEndorsement?.signature_data && (
                      <div className="my-3 p-2 bg-white rounded-lg border border-emerald-200 flex items-center justify-center h-20">
                        <img
                          src={itemEndorsement.signature_data}
                          alt={`TTD Kelas ${cls}`}
                          className="max-h-16 max-w-full object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSignatureModal(cls)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                        isApproved
                          ? 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                          : 'bg-[#193D9B] hover:bg-[#153280] text-white'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>{isApproved ? 'Ubah Tanda Tangan' : 'Sahkan Rapor'}</span>
                    </button>
                    <a
                      href={`/wali-kelas?class=${cls}`}
                      className="py-2 px-3 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-50 text-xs font-semibold transition"
                    >
                      Buka Rapor
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Konten Tab 1: Progres Nilai Guru & Tenggat Waktu */}
      {activeTab === 'TEACHERS' && (
        <div className="space-y-6">

      {/* Kartu Status Tenggat Waktu */}
      {deadlines.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Belum ada jadwal batas waktu penilaian</p>
          <p className="text-xs text-slate-500 mt-1">
            Klik tombol &ldquo;Tambah Batas Waktu&rdquo; di atas untuk menetapkan jadwal pengisian nilai guru.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deadlines.map((dl) => {
            const deadlineDate = dl.deadline_at ? new Date(dl.deadline_at) : null;
            const isPassed = deadlineDate ? deadlineDate < new Date() : false;
            const isOpen = dl.is_open && !isPassed;

            return (
              <div
                key={dl.id || dl.type}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#193D9B] shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          {dl.type === 'PTS' ? 'Penilaian Tengah Semester (PTS)' : dl.type === 'UAS' ? 'Penilaian Akhir Semester (PAS)' : 'Penilaian Harian'}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-0.5">{dl.title}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isOpen && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                          {isPassed ? 'Telah Berakhir' : 'Ditutup'}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditDeadlineModal(dl)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-[#193D9B] hover:border-[#193D9B]/40 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
                        title="Ubah tenggat waktu"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>Ubah</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDeadline(dl)}
                        className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus jadwal tenggat ini"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Batas Pengisian</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {deadlineDate
                          ? deadlineDate.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) + ' WIB'
                          : 'Belum diatur'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[11px]">Visibilitas Guru</span>
                      <span className="font-medium text-slate-700 mt-0.5 block">
                        {isOpen ? 'Aktif di Dashboard' : 'Terkunci'}
                      </span>
                    </div>
                  </div>

                  {dl.announcement && (
                    <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2">
                      <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="leading-relaxed">{dl.announcement}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ringkasan Status Progres Guru */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Total Penugasan Mapel</span>
          <strong className="text-2xl font-bold text-slate-900 mt-1.5 block">{totalGuru}</strong>
          <span className="text-[11px] text-slate-400 mt-1 block">Guru pengampu aktif</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Selesai 100%</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <strong className="text-2xl font-bold text-emerald-700 mt-1.5 block">{completedGuru}</strong>
          <span className="text-[11px] text-slate-400 mt-1 block">Guru telah input lengkap</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Sedang Mengisi</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <strong className="text-2xl font-bold text-blue-700 mt-1.5 block">{inProgressGuru}</strong>
          <span className="text-[11px] text-slate-400 mt-1 block">Progres berjalan</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Belum Mengisi</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <strong className="text-2xl font-bold text-amber-700 mt-1.5 block">{notStartedGuru}</strong>
          <span className="text-[11px] text-slate-400 mt-1 block">Perlu diingatkan tenggat</span>
        </div>
      </div>

      {/* Filter & Bar Pencarian */}
      <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-[#193D9B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({teacherList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterStatus === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Selesai ({completedGuru})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterStatus === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Sedang Mengisi ({inProgressGuru})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('NOT_STARTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterStatus === 'NOT_STARTED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Belum Mengisi ({notStartedGuru})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetAllDummyGrades}
            className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Bersihkan seluruh data nilai dummy / uji coba dari database"
          >
            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Bersihkan Nilai Uji Coba</span>
          </button>
          <div className="w-full sm:w-80">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Cari guru atau mata pelajaran..."
                value={searchTeacher}
                onChange={(e) => setSearchTeacher(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#193D9B]/15 focus:border-[#193D9B] transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Pemantauan Progres Guru */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-4 font-semibold w-12 text-center">No</th>
                <th className="py-3 px-4 font-semibold">Guru Pengampu</th>
                <th className="py-3 px-4 font-semibold">Mata Pelajaran</th>
                <th className="py-3 px-4 font-semibold">Rombel Ajar</th>
                <th className="py-3 px-4 font-semibold w-48">Progres Pengisian Nilai</th>
                <th className="py-3 px-4 font-semibold text-center w-28">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Terakhir Update</th>
                <th className="py-3 px-4 font-semibold text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#193D9B] border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data monitoring progres...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-700">Tidak ada guru ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Coba ganti filter status atau kata kunci pencarian.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, idx) => (
                  <tr key={teacher.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center tabular-nums text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{teacher.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">ID: {teacher.id}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {teacher.subjectName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {teacher.classes.map((cls, cIdx) => (
                          <span
                            key={cIdx}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            Kelas {cls}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-slate-600">
                          <span>{teacher.gradedStudents} siswa ternilai</span>
                          <span className="font-bold tabular-nums">{teacher.percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              teacher.percent >= 100
                                ? 'bg-emerald-500'
                                : teacher.percent > 0
                                ? 'bg-blue-600'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${teacher.percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {teacher.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Selesai
                        </span>
                      ) : teacher.status === 'IN_PROGRESS' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Sedang Isi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Belum Mulai
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-slate-500 text-[11px]">
                      {teacher.lastUpdated}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteTeacherGrades(teacher)}
                        className="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] transition-colors cursor-pointer"
                        title="Hapus data nilai pengampu ini dari database"
                      >
                        Hapus Nilai
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}

      {/* Konten Tab 3: Matriks Kelengkapan Rombel x Mapel (Waka Kurikulum) */}
      {activeTab === 'MATRIX' && (
        <div className="space-y-6">
          {matrixToast && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
              <span className="text-base">📋</span>
              <span>{matrixToast}</span>
            </div>
          )}

          {/* Banner Hero Waka Kurikulum */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white">
                Dashboard Waka Kurikulum SMPN 1 Prambon
              </span>
              <h2 className="text-xl font-extrabold tracking-tight">
                Matriks Monitoring Kelengkapan Nilai Rombel & Mapel
              </h2>
              <p className="text-xs text-blue-100 leading-relaxed">
                Pantau status pengisian nilai di tiap mata pelajaran dan rombel secara terpadu. Pastikan seluruh nilai terisi 100% sebelum pembagian rapor ke wali murid.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyWaReminder}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
                title="Salin draf pengingat untuk diposting ke grup WhatsApp guru"
              >
                <span>📲 Salin Pesan Pengingat WA</span>
              </button>
              <button
                type="button"
                onClick={handleExportMatrixExcel}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Unduh Matriks (.xls)</span>
              </button>
            </div>
          </div>

          {/* Kartu Statistik Matriks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Total Slot Nilai
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {matrixData.totalSlots}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {matrixData.rows.length} Rombel × {OFFICIAL_MATRIX_SUBJECTS.length} Mapel
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                Tuntas / Lengkap
              </span>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {matrixData.completedSlots}
              </p>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">
                {matrixData.overallPercent}% tercapai
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                Sedang Mengisi
              </span>
              <p className="text-2xl font-black text-blue-700 mt-1">
                {matrixData.inProgressSlots}
              </p>
              <span className="text-[10px] text-blue-600 mt-0.5 block">
                Progres penginputan parsial
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">
                Belum Ada Nilai
              </span>
              <p className="text-2xl font-black text-rose-700 mt-1">
                {matrixData.notStartedSlots}
              </p>
              <span className="text-[10px] text-rose-600 mt-0.5 block">
                Menunggu guru memulai input
              </span>
            </div>
          </div>

          {/* Filter Tingkat Kelas & Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Tingkat:</span>
              <button
                type="button"
                onClick={() => setMatrixFilterGrade('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  matrixFilterGrade === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua Kelas (7–9)
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilterGrade('7')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  matrixFilterGrade === '7'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Kelas 7
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilterGrade('8')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  matrixFilterGrade === '8'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Kelas 8
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilterGrade('9')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  matrixFilterGrade === '9'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Kelas 9
              </button>
            </div>

            {/* Legend Status Matriks */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Lengkap (100%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0"></span>
                <span>Parsial (&lt;100%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400 shrink-0"></span>
                <span>Belum Ada (0%)</span>
              </div>
            </div>
          </div>

          {/* Tabel Matriks Interaktif */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-center text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
                  <tr>
                    <th className="py-3 px-3 text-left w-24">Rombel</th>
                    {OFFICIAL_MATRIX_SUBJECTS.map((subj) => (
                      <th key={subj.code} className="py-3 px-2 w-16" title={subj.name}>
                        <span className="block">{subj.code}</span>
                      </th>
                    ))}
                    <th className="py-3 px-3 w-28 text-right">Progres Rombel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matrixData.rows.map((row) => (
                    <tr key={row.className} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-left font-bold text-slate-900 bg-slate-50/60">
                        Kelas {row.className}
                      </td>

                      {OFFICIAL_MATRIX_SUBJECTS.map((subj) => {
                        const cell = row.subjects[subj.code];
                        const isCompleted = cell?.status === 'COMPLETED';
                        const isInProgress = cell?.status === 'IN_PROGRESS';

                        return (
                          <td
                            key={subj.code}
                            className="py-2.5 px-1.5 align-middle"
                            title={`${subj.name} (${row.className}): ${
                              isCompleted
                                ? '100% Lengkap'
                                : isInProgress
                                ? `Progres: ${cell.percent}% (${cell.graded}/32 siswa)`
                                : 'Belum Mulai'
                            } • Guru: ${cell?.teacherName || '-'}`}
                          >
                            {isCompleted ? (
                              <div className="w-8 h-8 mx-auto rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center justify-center text-xs">
                                ✓
                              </div>
                            ) : isInProgress ? (
                              <div className="w-8 h-8 mx-auto rounded-lg bg-amber-100 border border-amber-300 text-amber-800 font-bold flex items-center justify-center text-[10px]">
                                {cell.percent}%
                              </div>
                            ) : (
                              <div className="w-8 h-8 mx-auto rounded-lg bg-rose-50 border border-rose-200 text-rose-500 font-medium flex items-center justify-center text-[10px]">
                                0%
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-slate-800">
                            {row.completedCount} / {row.totalSubjects} Mapel
                          </span>
                          <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                row.progressPercent >= 100
                                  ? 'bg-emerald-500'
                                  : row.progressPercent > 50
                                  ? 'bg-blue-600'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${row.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Roster Tagihan Guru Belum Lengkap */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <span>⚠️ Daftar Guru Pengampu yang Perlu Ditindaklanjuti</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {teacherList.filter((t) => t.status !== 'COMPLETED').length} Guru
                </span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Gunakan tombol WA untuk mengingatkan guru secara personal
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {teacherList
                .filter((t) => t.status !== 'COMPLETED')
                .map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{t.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {t.status === 'IN_PROGRESS' ? 'Sedang Isi' : 'Belum Mulai'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {t.subjectName} ({t.subjectCode})
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.classes.map((cls, cIdx) => (
                          <span
                            key={cIdx}
                            className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white border border-slate-300 text-slate-700"
                          >
                            Kelas {cls}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Progres: <strong>{t.percent}%</strong>
                      </span>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Halo Bapak/Ibu ${t.name}, mohon kesediaannya untuk menyelesaikan input nilai e-Rapor ${t.subjectName} untuk Kelas ${t.classes.join(', ')}. Terima kasih!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold"
                      >
                        <span>Kirim WA</span>
                        <span>➔</span>
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Tenggat Waktu */}
      <Modal
        isOpen={isDeadlineModalOpen}
        onClose={() => setIsDeadlineModalOpen(false)}
        title={editingDeadline ? `Ubah Batas Waktu: ${formTitle || formType}` : 'Tambah Batas Waktu Penilaian'}
      >
        <form onSubmit={handleSaveDeadline} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Penilaian
              </label>
              <select
                value={formType}
                onChange={(e) => {
                  setFormType(e.target.value);
                  const existing = deadlines.find((d) => d.type === e.target.value);
                  if (existing) {
                    openEditDeadlineModal(existing);
                  } else {
                    setFormTitle(`Penilaian ${e.target.value === 'PTS' ? 'Tengah Semester (PTS)' : 'Akhir Semester (PAS)'}`);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#193D9B]/15 focus:border-[#193D9B]"
              >
                <option value="PTS">Penilaian Tengah Semester (PTS)</option>
                <option value="UAS">Penilaian Akhir Semester (PAS)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Penginputan
              </label>
              <select
                value={formIsOpen ? 'OPEN' : 'CLOSED'}
                onChange={(e) => setFormIsOpen(e.target.value === 'OPEN')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#193D9B]/15 focus:border-[#193D9B]"
              >
                <option value="OPEN">Dibuka (Guru dapat input nilai)</option>
                <option value="CLOSED">Ditutup (Input nilai dikunci)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Judul Periode Penilaian <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Contoh: Penilaian Tengah Semester (PTS) Ganjil TA 2026/2027"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#193D9B]/15 focus:border-[#193D9B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Batas Waktu Pengisian (Tanggal & Jam) <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#193D9B]/15 focus:border-[#193D9B]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Batas waktu ini akan diinformasikan pada dashboard dan portal input guru.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pengumuman / Catatan untuk Guru
            </label>
            <textarea
              rows={3}
              value={formAnnouncement}
              onChange={(e) => setFormAnnouncement(e.target.value)}
              placeholder="Contoh: Harap melengkapi nilai harian dan PTS sebelum batas waktu."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#193D9B]/15 focus:border-[#193D9B] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeadlineModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingDeadline}
              className="px-4 py-2 rounded-lg bg-[#193D9B] hover:bg-[#153280] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmittingDeadline ? 'Menyimpan...' : editingDeadline ? 'Simpan Perubahan' : 'Tambah Batas Waktu'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Pengesahan Rapor Kepala Sekolah */}
      <DigitalSignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={handleSaveSignature}
        className={selectedClassForEndorsement}
        initialSignature={
          (selectedClassForEndorsement === 'ALL'
            ? endorsements.find((e) => e.signature_data)?.signature_data
            : endorsements.find((e) => e.class_name === selectedClassForEndorsement || e.class_name === `Kelas ${selectedClassForEndorsement}`)?.signature_data) ||
          savedSignatureData
        }
        principalName={
          (selectedClassForEndorsement === 'ALL'
            ? endorsements.find((e) => e.principal_name)?.principal_name
            : endorsements.find((e) => e.class_name === selectedClassForEndorsement || e.class_name === `Kelas ${selectedClassForEndorsement}`)?.principal_name) ||
          tokenStorage.getUser()?.fullName ||
          tokenStorage.getUser()?.full_name ||
          ''
        }
        principalNip={
          (selectedClassForEndorsement === 'ALL'
            ? endorsements.find((e) => e.principal_nip)?.principal_nip
            : endorsements.find((e) => e.class_name === selectedClassForEndorsement || e.class_name === `Kelas ${selectedClassForEndorsement}`)?.principal_nip) ||
          tokenStorage.getUser()?.nimNip ||
          tokenStorage.getUser()?.nip ||
          ''
        }
      />

      {deleteConfirmConfig && (
        <ConfirmModal
          isOpen={true}
          title={deleteConfirmConfig.title}
          message={deleteConfirmConfig.message}
          type={deleteConfirmConfig.type || 'danger'}
          onConfirm={deleteConfirmConfig.onConfirm}
          onClose={() => setDeleteConfirmConfig(null)}
        />
      )}
    </div>
  );
}

export default function AdminMonitoringPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center p-8 text-slate-500 text-sm">
          <div className="inline-flex items-center gap-2">
            <span className="w-5 h-5 border-2 border-[#193D9B] border-t-transparent rounded-full animate-spin" />
            <span>Memuat Modul Monitoring & Supervisi...</span>
          </div>
        </div>
      }
    >
      <AdminMonitoringContent />
    </Suspense>
  );
}
