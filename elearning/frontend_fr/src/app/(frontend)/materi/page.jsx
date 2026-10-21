'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function MaterialsAndSubjectHubPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation State: null = list of mapel cards, object = active subject detail
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeTab, setActiveTab] = useState('MATERI'); // 'MATERI' | 'TUGAS' | 'UJIAN'

  // Filter & Search on Mapel Cards
  const [searchMapel, setSearchMapel] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals for Students & Viewers
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const [activeSubmitModal, setActiveSubmitModal] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionFile, setSubmissionFile] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Exam Token Modal for Students
  const [activeExamModal, setActiveExamModal] = useState(null);
  const [inputToken, setInputToken] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Modals for Teachers (Guru)
  const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matSubject, setMatSubject] = useState('');
  const [matSubjectCode, setMatSubjectCode] = useState('');
  const [matClass, setMatClass] = useState('7A');
  const [matType, setMatType] = useState('PDF');
  const [matDescription, setMatDescription] = useState('');
  const [matFileUrl, setMatFileUrl] = useState('');
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);

  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [tugTitle, setTugTitle] = useState('');
  const [tugSubject, setTugSubject] = useState('');
  const [tugSubjectCode, setTugSubjectCode] = useState('');
  const [tugClass, setTugClass] = useState('7A');
  const [tugDueDate, setTugDueDate] = useState('');
  const [tugMaxScore, setTugMaxScore] = useState(100);
  const [tugDescription, setTugDescription] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
  const [exTitle, setExTitle] = useState('');
  const [exSubject, setExSubject] = useState('');
  const [exSubjectCode, setExSubjectCode] = useState('');
  const [exClass, setExClass] = useState('7A');
  const [exDuration, setExDuration] = useState(60);
  const [exToken, setExToken] = useState('');
  const [exViolations, setExViolations] = useState(3);
  const [exDescription, setExDescription] = useState('');
  const [isSavingExam, setIsSavingExam] = useState(false);

  useEffect(() => {
    const u = tokenStorage.getUser();
    setUser(u);
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [subjList, matList, assList, exmList, clsList] = await Promise.all([
        elearningApi.getSubjects(),
        elearningApi.getMaterials(),
        elearningApi.getAssignments(),
        elearningApi.getExams(),
        elearningApi.getClasses(),
      ]);
      setSubjects(subjList || []);
      setMaterials(matList || []);
      setAssignments(assList || []);
      setExams(exmList || []);
      setClasses(clsList || []);
    } catch (err) {
      console.error('Failed to load learning data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Role helpers
  const role = String(user?.roleName || user?.role || user?.role_name || '').toUpperCase();
  const isSiswa = role.includes('SISWA') || role.includes('STUDENT');
  const isGuru = !isSiswa && !role.includes('KEPALA');

  // Matcher helper between an item (material/assignment/exam) and a subject
  const matchesSubject = (item, subj) => {
    if (!item || !subj) return false;
    const itemSubjName = (item.subject || '').trim().toLowerCase();
    const itemSubjCode = (item.subjectCode || '').trim().toUpperCase();
    const targetName = (subj.name || '').trim().toLowerCase();
    const targetCode = (subj.code || '').trim().toUpperCase();

    return (
      (targetName && itemSubjName === targetName) ||
      (targetCode && itemSubjCode === targetCode) ||
      (targetName && itemSubjName.includes(targetName)) ||
      (targetCode && itemSubjName.includes(targetCode))
    );
  };

  // Compute counters per subject
  const subjectStats = useMemo(() => {
    const stats = {};
    const safeSubjs = Array.isArray(subjects) ? subjects : [];
    const safeMats = Array.isArray(materials) ? materials : [];
    const safeAss = Array.isArray(assignments) ? assignments : [];
    const safeExms = Array.isArray(exams) ? exams : [];

    safeSubjs.forEach((subj) => {
      const matCount = safeMats.filter((m) => matchesSubject(m, subj)).length;
      const assCount = safeAss.filter((a) => matchesSubject(a, subj)).length;
      const exmCount = safeExms.filter((e) => matchesSubject(e, subj)).length;
      stats[subj.code] = { matCount, assCount, exmCount };
    });
    return stats;
  }, [subjects, materials, assignments, exams]);

  // Filtered Subject Cards
  const filteredSubjects = useMemo(() => {
    const safeSubjs = Array.isArray(subjects) ? subjects : [];
    return safeSubjs.filter((s) => {
      const matchCat = categoryFilter === 'ALL' || s.category === categoryFilter;
      const q = searchMapel.toLowerCase();
      const matchQuery =
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q));

      return matchCat && matchQuery;
    });
  }, [subjects, categoryFilter, searchMapel]);

  // Selected Subject Data
  const currentSubjectMaterials = useMemo(() => {
    if (!selectedSubject) return [];
    const safeMats = Array.isArray(materials) ? materials : [];
    return safeMats.filter((m) => matchesSubject(m, selectedSubject));
  }, [selectedSubject, materials]);

  const currentSubjectAssignments = useMemo(() => {
    if (!selectedSubject) return [];
    const safeAss = Array.isArray(assignments) ? assignments : [];
    return safeAss.filter((a) => matchesSubject(a, selectedSubject));
  }, [selectedSubject, assignments]);

  const currentSubjectExams = useMemo(() => {
    if (!selectedSubject) return [];
    const safeExms = Array.isArray(exams) ? exams : [];
    return safeExms.filter((e) => matchesSubject(e, selectedSubject));
  }, [selectedSubject, exams]);

  // Form open helpers for Guru
  const handleOpenCreateMaterial = (defaultSubj = null) => {
    const target = defaultSubj || selectedSubject || subjects[0] || { name: 'Matematika', code: 'MAT' };
    setMatTitle('');
    setMatSubject(target.name);
    setMatSubjectCode(target.code);
    setMatClass('7A');
    setMatType('PDF');
    setMatDescription('');
    setMatFileUrl('');
    setIsCreateMaterialOpen(true);
  };

  const handleOpenCreateAssignment = (defaultSubj = null) => {
    const target = defaultSubj || selectedSubject || subjects[0] || { name: 'Matematika', code: 'MAT' };
    setTugTitle('');
    setTugSubject(target.name);
    setTugSubjectCode(target.code);
    setTugClass('7A');
    setTugDueDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().slice(0, 16));
    setTugMaxScore(100);
    setTugDescription('');
    setIsCreateAssignmentOpen(true);
  };

  const handleOpenCreateExam = (defaultSubj = null) => {
    const target = defaultSubj || selectedSubject || subjects[0] || { name: 'Matematika', code: 'MAT' };
    setExTitle('');
    setExSubject(target.name);
    setExSubjectCode(target.code);
    setExClass('7A');
    setExDuration(60);
    setExToken(Math.random().toString(36).substring(2, 8).toUpperCase());
    setExViolations(3);
    setExDescription('');
    setIsCreateExamOpen(true);
  };

  // Submit Handlers for Guru
  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    if (!matTitle.trim()) {
      alert('Judul materi wajib diisi!');
      return;
    }
    setIsSavingMaterial(true);
    try {
      await elearningApi.createMaterial({
        title: matTitle,
        subject: matSubject,
        subjectCode: matSubjectCode,
        className: matClass,
        teacherName: user?.fullName || user?.full_name || 'Bapak/Ibu Guru',
        type: matType,
        description: matDescription,
        fileUrl: matFileUrl || (matType === 'VIDEO' ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' : '/docs/modul-pembelajaran.pdf'),
        fileName: matType === 'VIDEO' ? null : `${matTitle.replace(/\s+/g, '_')}.pdf`,
      });
      setIsCreateMaterialOpen(false);
      loadAllData();
      alert('Materi pembelajaran berhasil ditambahkan!');
    } catch (err) {
      alert('Gagal menambah materi: ' + err.message);
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!tugTitle.trim()) {
      alert('Judul tugas wajib diisi!');
      return;
    }
    setIsSavingAssignment(true);
    try {
      await elearningApi.createAssignment({
        title: tugTitle,
        subject: tugSubject,
        subjectCode: tugSubjectCode,
        className: tugClass,
        teacherName: user?.fullName || user?.full_name || 'Bapak/Ibu Guru',
        dueDate: new Date(tugDueDate).toISOString(),
        maxScore: Number(tugMaxScore) || 100,
        description: tugDescription,
        totalStudents: 32,
      });
      setIsCreateAssignmentOpen(false);
      loadAllData();
      alert('Tugas mandiri berhasil dibuat!');
    } catch (err) {
      alert('Gagal membuat tugas: ' + err.message);
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!exTitle.trim() || !exToken.trim()) {
      alert('Judul dan Token Ujian wajib diisi!');
      return;
    }
    setIsSavingExam(true);
    try {
      await elearningApi.createExam({
        title: exTitle,
        subject: exSubject,
        subjectCode: exSubjectCode,
        className: exClass,
        teacherName: user?.fullName || user?.full_name || 'Bapak/Ibu Guru',
        token: exToken.trim().toUpperCase(),
        durationMinutes: Number(exDuration) || 60,
        totalQuestions: 5,
        maxViolations: Number(exViolations) || 3,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        description: exDescription,
      });
      setIsCreateExamOpen(false);
      loadAllData();
      alert('Jadwal ujian berhasil diterbitkan! Guru dapat menyusun butir soal di menu e-Ujian.');
    } catch (err) {
      alert('Gagal menerbitkan ujian: ' + err.message);
    } finally {
      setIsSavingExam(false);
    }
  };

  // Student Actions
  const handleOpenSubmitAssignment = (item) => {
    setActiveSubmitModal(item);
    setSubmissionNotes('');
    setSubmissionFile('');
    setSubmitSuccess('');
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!submissionNotes.trim() && !submissionFile.trim()) {
      alert('Harap masukkan catatan jawaban atau tautan berkas tugas!');
      return;
    }
    setIsSubmittingTask(true);
    try {
      await elearningApi.submitAssignment(activeSubmitModal.id, {
        studentId: user?.id || 'std-demo',
        studentName: user?.fullName || user?.full_name || 'Siswa Spenspra',
        notes: submissionNotes,
        fileUrl: submissionFile,
      });
      setSubmitSuccess('Tugas berhasil dikumpulkan!');
      setTimeout(() => {
        setActiveSubmitModal(null);
        loadAllData();
      }, 1200);
    } catch (err) {
      alert('Gagal mengumpulkan: ' + err.message);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleStartExam = (exam) => {
    setActiveExamModal(exam);
    setInputToken('');
    setTokenError('');
  };

  const handleVerifyExamToken = (e) => {
    e.preventDefault();
    if (!inputToken.trim()) {
      setTokenError('Token tidak boleh kosong!');
      return;
    }
    if (activeExamModal.token && inputToken.trim().toUpperCase() !== activeExamModal.token.toUpperCase()) {
      setTokenError('Token ujian salah! Silakan tanyakan kepada pengawas atau guru.');
      return;
    }
    // Valid token, navigate to CBT session
    router.push(`/ujian/${activeExamModal.id}?token=${encodeURIComponent(inputToken.trim().toUpperCase())}`);
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'VIDEO':
        return <span className="px-2 py-0.5 rounded-[999px] bg-danger-100 text-danger-700 text-[10px] font-bold">Video Edukasi</span>;
      case 'SLIDE':
        return <span className="px-2 py-0.5 rounded-[999px] bg-accent-100 text-amber-800 text-[10px] font-bold">Slide Presentasi</span>;
      case 'PDF':
      default:
        return <span className="px-2 py-0.5 rounded-[999px] bg-secondary-100 text-secondary-700 text-[10px] font-bold">Modul / Buku PDF</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ================= VIEW 1: GRID KARTU MATA PELAJARAN ================= */}
      {!selectedSubject ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-[999px] bg-primary-100 text-primary-700 text-xs font-bold">
                  Ruang Belajar Digital
                </span>
                <span className="text-xs text-neutral-400">SMPN 1 Prambon</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight mt-1">
                Materi & Mata Pelajaran
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                Pilih kartu mata pelajaran di bawah untuk mengakses modul materi, tugas pengerjaan, dan jadwal kuis/ujian.
              </p>
            </div>

            {/* Teacher Quick Action Buttons */}
            {isGuru && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenCreateMaterial()}
                  className="shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  + Materi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenCreateAssignment()}
                  className="cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  + Tugas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenCreateExam()}
                  className="cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  + Ujian
                </Button>
              </div>
            )}
          </div>

          {/* Filter and Search Bar */}
          <Card noPadding className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-[999px] text-xs font-semibold transition-all cursor-pointer ${
                  categoryFilter === 'ALL'
                    ? 'bg-primary-500 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Semua Kategori ({subjects.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('Umum')}
                className={`px-3 py-1.5 rounded-[999px] text-xs font-semibold transition-all cursor-pointer ${
                  categoryFilter === 'Umum'
                    ? 'bg-primary-500 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Kelompok Umum
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('Muatan Lokal')}
                className={`px-3 py-1.5 rounded-[999px] text-xs font-semibold transition-all cursor-pointer ${
                  categoryFilter === 'Muatan Lokal'
                    ? 'bg-primary-500 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Muatan Lokal
              </button>
            </div>

            <div className="w-full md:w-72 shrink-0">
              <Input
                type="search"
                placeholder="Cari mata pelajaran atau kode..."
                value={searchMapel}
                onChange={(e) => setSearchMapel(e.target.value)}
                className="text-xs"
              />
            </div>
          </Card>

          {/* Subject Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 bg-neutral-100 rounded-[12px] animate-pulse" />
              ))}
            </div>
          ) : filteredSubjects.length === 0 ? (
            <Card noPadding className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3 text-xl">
                🔍
              </div>
              <p className="text-sm font-bold text-neutral-700">Tidak ada mata pelajaran yang cocok</p>
              <p className="text-xs text-neutral-500 mt-1">
                Ubah kata kunci pencarian atau bersihkan filter kategori.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubjects.map((subj) => {
                const stat = subjectStats[subj.code] || { matCount: 0, assCount: 0, exmCount: 0 };
                return (
                  <div
                    key={subj.id || subj.code}
                    onClick={() => {
                      setSelectedSubject(subj);
                      setActiveTab('MATERI');
                    }}
                    className="group bg-white rounded-[12px] border border-neutral-200 p-5 hover:border-primary-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                  >
                    {/* Top colored accent line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 to-primary-600 opacity-80 group-hover:opacity-100 transition-opacity" />

                    <div className="space-y-3">
                      {/* Top Bar: Icon & Category */}
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-[10px] bg-primary-50 text-primary-600 flex items-center justify-center text-xl font-bold shadow-2xs group-hover:scale-105 transition-transform">
                          {subj.icon || '📚'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-[6px] bg-neutral-100 text-neutral-700">
                            {subj.code}
                          </span>
                          <span className="text-[10px] font-medium text-neutral-500 px-2 py-0.5 rounded-[999px] bg-neutral-50 border border-neutral-200">
                            {subj.category || 'Umum'}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 group-hover:text-primary-600 transition-colors">
                          {subj.name}
                        </h3>
                        <p className="text-xs text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
                          {subj.description || `Mata pelajaran resmi SMPN 1 Prambon sesuai capaian pembelajaran.`}
                        </p>
                      </div>
                    </div>

                    {/* Stats Counters & Action */}
                    <div className="pt-4 mt-3 border-t border-neutral-100 space-y-3">
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div className="p-1.5 rounded-[6px] bg-neutral-50">
                          <p className="text-[10px] text-neutral-400 font-medium">Materi</p>
                          <p className="text-xs font-bold text-neutral-800">{stat.matCount}</p>
                        </div>
                        <div className="p-1.5 rounded-[6px] bg-neutral-50">
                          <p className="text-[10px] text-neutral-400 font-medium">Tugas</p>
                          <p className="text-xs font-bold text-neutral-800">{stat.assCount}</p>
                        </div>
                        <div className="p-1.5 rounded-[6px] bg-neutral-50">
                          <p className="text-[10px] text-neutral-400 font-medium">Ujian</p>
                          <p className="text-xs font-bold text-neutral-800">{stat.exmCount}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold text-primary-600 group-hover:text-primary-700">
                        <span>Buka Ruang Belajar</span>
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= VIEW 2: DETAIL RUANG BELAJAR MAPEL TERPILIH ================= */
        <div className="space-y-6">
          {/* Header with Back Button */}
          <div className="bg-white rounded-[12px] border border-neutral-200 p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubject(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-primary-600 transition-colors cursor-pointer py-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Kembali ke Daftar Mata Pelajaran</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-[12px] bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold shadow-2xs">
                    {selectedSubject.icon || '📚'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-200">
                        {selectedSubject.code}
                      </span>
                      <span className="text-xs font-medium text-neutral-500">
                        {selectedSubject.category || 'Kurikulum Merdeka'}
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight mt-0.5">
                      {selectedSubject.name}
                    </h1>
                  </div>
                </div>
              </div>

              {/* Action for Guru inside this Subject */}
              {isGuru && (
                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenCreateMaterial(selectedSubject)}
                    className="shadow-sm cursor-pointer"
                  >
                    + Tambah Materi Mapel Ini
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenCreateAssignment(selectedSubject)}
                    className="cursor-pointer"
                  >
                    + Beri Tugas Mapel Ini
                  </Button>
                </div>
              )}
            </div>

            {/* Navigation Tabs (Mobile First) */}
            <div className="flex items-center gap-2 border-t border-neutral-100 pt-4 mt-5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('MATERI')}
                className={`px-4 py-2 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  activeTab === 'MATERI'
                    ? 'bg-primary-500 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <span>📚 Modul & Materi</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'MATERI' ? 'bg-primary-700 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                  {currentSubjectMaterials.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('TUGAS')}
                className={`px-4 py-2 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  activeTab === 'TUGAS'
                    ? 'bg-primary-500 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <span>📝 Tugas & PR</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'TUGAS' ? 'bg-primary-700 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                  {currentSubjectAssignments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('UJIAN')}
                className={`px-4 py-2 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  activeTab === 'UJIAN'
                    ? 'bg-primary-500 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <span>⏱️ e-Ujian & Kuis CBT</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'UJIAN' ? 'bg-primary-700 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                  {currentSubjectExams.length}
                </span>
              </button>
            </div>
          </div>

          {/* ================= TAB 1: MATERI ================= */}
          {activeTab === 'MATERI' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-800">
                  Daftar Materi Pembelajaran ({currentSubjectMaterials.length})
                </h2>
                {isGuru && (
                  <button
                    type="button"
                    onClick={() => handleOpenCreateMaterial(selectedSubject)}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 cursor-pointer"
                  >
                    + Tambah Materi Baru
                  </button>
                )}
              </div>

              {currentSubjectMaterials.length === 0 ? (
                <Card noPadding className="p-12 text-center bg-white">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3 text-xl">
                    📂
                  </div>
                  <p className="text-sm font-bold text-neutral-700">Belum ada materi untuk mata pelajaran ini</p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                    Bapak/Ibu Guru pengampu belum mengunggah dokumen modul atau video pembelajaran untuk mata pelajaran ini.
                  </p>
                  {isGuru && (
                    <div className="mt-4">
                      <Button variant="primary" size="sm" onClick={() => handleOpenCreateMaterial(selectedSubject)}>
                        Unggah Materi Sekarang
                      </Button>
                    </div>
                  )}
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentSubjectMaterials.map((item) => (
                    <Card
                      key={item.id}
                      noPadding
                      className="p-5 flex flex-col justify-between hover:border-primary-300 hover:shadow-md transition-all group bg-white"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                            Kelas {item.className || 'Semua'}
                          </span>
                          {getTypeBadge(item.type)}
                        </div>

                        <h3 className="text-sm font-bold text-neutral-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {item.title}
                        </h3>

                        <p className="text-xs text-neutral-500 line-clamp-3 leading-relaxed">
                          {item.description || 'Pelajari materi ini dengan saksama untuk mendukung pemahaman topik.'}
                        </p>

                        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                          <span className="truncate max-w-[150px]">
                            Oleh: {item.teacherName || 'Guru Pengampu'}
                          </span>
                          <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Baru'}</span>
                        </div>
                      </div>

                      <div className="pt-4 mt-2">
                        {item.type === 'VIDEO' ? (
                          <Button
                            variant="danger"
                            size="sm"
                            className="w-full cursor-pointer"
                            onClick={() => setActiveVideoModal(item)}
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Tonton Video
                          </Button>
                        ) : (
                          <a
                            href={item.fileUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                          >
                            <Button variant="outline" size="sm" className="w-full cursor-pointer">
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Unduh Dokumen Modul
                            </Button>
                          </a>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: TUGAS ================= */}
          {activeTab === 'TUGAS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-800">
                  Daftar Tugas & PR ({currentSubjectAssignments.length})
                </h2>
                {isGuru && (
                  <button
                    type="button"
                    onClick={() => handleOpenCreateAssignment(selectedSubject)}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 cursor-pointer"
                  >
                    + Beri Tugas Baru
                  </button>
                )}
              </div>

              {currentSubjectAssignments.length === 0 ? (
                <Card noPadding className="p-12 text-center bg-white">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3 text-xl">
                    📝
                  </div>
                  <p className="text-sm font-bold text-neutral-700">Tidak ada tugas aktif untuk mata pelajaran ini</p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                    Saat ini belum ada lembar tugas atau pekerjaan rumah yang ditugaskan oleh guru.
                  </p>
                  {isGuru && (
                    <div className="mt-4">
                      <Button variant="primary" size="sm" onClick={() => handleOpenCreateAssignment(selectedSubject)}>
                        Buat Tugas Baru
                      </Button>
                    </div>
                  )}
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentSubjectAssignments.map((task) => (
                    <Card
                      key={task.id}
                      noPadding
                      className="p-5 flex flex-col justify-between hover:border-primary-300 hover:shadow-md transition-all bg-white group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                            Kelas {task.className || '7A'}
                          </span>
                          <span className="text-[11px] font-bold text-neutral-600">
                            Skor Maks: {task.maxScore || 100}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-neutral-900 group-hover:text-primary-600 transition-colors">
                            {task.title}
                          </h3>
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-3 leading-relaxed">
                            {task.description || 'Kerjakan tugas sesuai arahan bapak/ibu guru pengampu.'}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-[8px] bg-neutral-50 border border-neutral-100 flex items-center justify-between text-xs">
                          <span className="text-neutral-500">Tenggat Waktu:</span>
                          <span className="font-bold text-danger-600">
                            {task.dueDate ? new Date(task.dueDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Segera'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 mt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-neutral-400">
                          Guru: {task.teacherName || 'Guru Pengampu'}
                        </span>

                        {isSiswa ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenSubmitAssignment(task)}
                            className="cursor-pointer"
                          >
                            Kumpulkan Tugas
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/guru/tugas')}
                            className="cursor-pointer"
                          >
                            Kelola Penilaian
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: UJIAN CBT ================= */}
          {activeTab === 'UJIAN' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-800">
                  Daftar e-Ujian & Kuis CBT ({currentSubjectExams.length})
                </h2>
                {isGuru && (
                  <button
                    type="button"
                    onClick={() => handleOpenCreateExam(selectedSubject)}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 cursor-pointer"
                  >
                    + Buat Jadwal Ujian
                  </button>
                )}
              </div>

              {currentSubjectExams.length === 0 ? (
                <Card noPadding className="p-12 text-center bg-white">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3 text-xl">
                    ⏱️
                  </div>
                  <p className="text-sm font-bold text-neutral-700">Tidak ada jadwal ujian untuk mata pelajaran ini</p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                    Belum ada sesi ujian daring CBT atau kuis yang dijadwalkan oleh guru pengampu.
                  </p>
                  {isGuru && (
                    <div className="mt-4">
                      <Button variant="primary" size="sm" onClick={() => handleOpenCreateExam(selectedSubject)}>
                        Terbitkan Jadwal Ujian
                      </Button>
                    </div>
                  )}
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentSubjectExams.map((ex) => (
                    <Card
                      key={ex.id}
                      noPadding
                      className="p-5 flex flex-col justify-between hover:border-primary-300 hover:shadow-md transition-all bg-white group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                            Kelas {ex.className || '7A'}
                          </span>
                          <StatusBadge status={ex.status || 'ACTIVE'} label={ex.status === 'ACTIVE' ? 'Sesi Aktif' : 'Akan Datang'} />
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-neutral-900 group-hover:text-primary-600 transition-colors">
                            {ex.title}
                          </h3>
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                            {ex.description || 'Ujian berbasis komputer (CBT) dengan sistem anti-cheat terintegrasi.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-neutral-50 text-neutral-600">
                            <span className="text-[10px] text-neutral-400 block">Durasi</span>
                            <span className="font-bold text-neutral-800">{ex.durationMinutes} Menit</span>
                          </div>
                          <div className="p-2 rounded bg-neutral-50 text-neutral-600">
                            <span className="text-[10px] text-neutral-400 block">Toleransi</span>
                            <span className="font-bold text-danger-600">Maks. {ex.maxViolations || 3}x Keluar</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {isGuru ? `Token: ${ex.token}` : 'Butuh Token Sesi'}
                        </span>

                        {isSiswa ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleStartExam(ex)}
                            className="cursor-pointer"
                          >
                            Mulai Ujian
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/guru/ujian')}
                            className="cursor-pointer"
                          >
                            Kelola Soal
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: TONTON VIDEO ================= */}
      <Modal
        isOpen={Boolean(activeVideoModal)}
        onClose={() => setActiveVideoModal(null)}
        title={activeVideoModal?.title || 'Video Pembelajaran'}
        subtitle={activeVideoModal ? `${activeVideoModal.subject} • ${activeVideoModal.teacherName || 'Guru Pengampu'}` : ''}
        size="lg"
      >
        <div className="space-y-4">
          <div className="aspect-video w-full rounded-[8px] overflow-hidden bg-neutral-900 shadow-sm">
            {activeVideoModal?.videoUrl ? (
              <iframe
                src={activeVideoModal.videoUrl}
                title={activeVideoModal.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xs">
                Video player placeholder
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            {activeVideoModal?.description}
          </p>
        </div>
      </Modal>

      {/* ================= MODAL: KUMPULKAN TUGAS (SISWA) ================= */}
      <Modal
        isOpen={Boolean(activeSubmitModal)}
        onClose={() => !isSubmittingTask && setActiveSubmitModal(null)}
        title="Kumpulkan Tugas Mandiri"
        subtitle={activeSubmitModal?.title || ''}
        size="md"
      >
        <form onSubmit={handleSubmitAssignment} className="space-y-4">
          {submitSuccess ? (
            <div className="p-4 rounded-[8px] bg-success-50 text-success-800 text-xs font-bold text-center">
              ✅ {submitSuccess}
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800">Catatan Jawaban / Ringkasan</label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan ringkasan hasil pengerjaan tugas atau jawaban singkat Anda..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-[6px] border border-neutral-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800">Tautan Berkas / Link Drive (Opsional)</label>
                <Input
                  type="url"
                  placeholder="https://drive.google.com/... atau tautan dokumen tugas"
                  value={submissionFile}
                  onChange={(e) => setSubmissionFile(e.target.value)}
                />
                <p className="text-[11px] text-neutral-400">
                  Pastikan tautan Google Drive / Cloud Anda dapat diakses oleh guru pengampu.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSubmitModal(null)}
                  disabled={isSubmittingTask}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isSubmittingTask}
                >
                  Kirimkan Tugas Sekarang
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* ================= MODAL: VERIFIKASI TOKEN UJIAN (SISWA) ================= */}
      <Modal
        isOpen={Boolean(activeExamModal)}
        onClose={() => setActiveExamModal(null)}
        title="Masuk Sesi e-Ujian (CBT)"
        subtitle={activeExamModal ? `${activeExamModal.title} (${activeExamModal.subject})` : ''}
        size="sm"
      >
        <form onSubmit={handleVerifyExamToken} className="space-y-4">
          <div className="p-3 rounded-[8px] bg-primary-50 border border-primary-200 text-xs text-primary-900 space-y-1">
            <p className="font-bold">Ketentuan Selama Ujian:</p>
            <ul className="list-disc list-inside text-[11px] space-y-0.5 text-primary-800">
              <li>Durasi pengerjaan: {activeExamModal?.durationMinutes} Menit.</li>
              <li>Sistem mencatat bila Anda berpindah aplikasi atau tab.</li>
              <li>Maksimal toleransi: {activeExamModal?.maxViolations || 3}x peringatan.</li>
            </ul>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Masukkan Token Sesi Ujian</label>
            <Input
              type="text"
              placeholder="CONTOH: MTK7A"
              value={inputToken}
              onChange={(e) => {
                setInputToken(e.target.value.toUpperCase());
                setTokenError('');
              }}
              className="font-mono uppercase font-bold text-center tracking-widest text-base"
              autoFocus
              required
            />
            {tokenError && (
              <p className="text-xs text-danger-600 font-medium">{tokenError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveExamModal(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Mulai Mengerjakan Ujian
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: BUAT MATERI BARU (GURU) ================= */}
      <Modal
        isOpen={isCreateMaterialOpen}
        onClose={() => !isSavingMaterial && setIsCreateMaterialOpen(false)}
        title="Tambah Materi Pembelajaran Baru"
        subtitle="Materi akan langsung dapat dipelajari oleh siswa di ruang belajar mapel ini."
        size="md"
      >
        <form onSubmit={handleSaveMaterial} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Judul Materi Pembelajaran</label>
            <Input
              type="text"
              placeholder="Contoh: Bab 2 - Teorema Pythagoras dan Aplikasinya"
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Mata Pelajaran</label>
              <select
                value={matSubject}
                onChange={(e) => {
                  setMatSubject(e.target.value);
                  const matched = subjects.find((s) => s.name === e.target.value);
                  setMatSubjectCode(matched?.code || 'MAPEL');
                }}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white"
              >
                {subjects.map((s) => (
                  <option key={s.id || s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Sasaran Rombel / Kelas</label>
              <select
                value={matClass}
                onChange={(e) => setMatClass(e.target.value)}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white"
              >
                <option value="Semua">Semua Kelas</option>
                {classes.map((cls) => (
                  <option key={cls.id || cls.name} value={cls.name}>
                    Kelas {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Format Materi</label>
              <select
                value={matType}
                onChange={(e) => setMatType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white"
              >
                <option value="PDF">Dokumen PDF / Modul</option>
                <option value="SLIDE">Slide Presentasi PPT</option>
                <option value="VIDEO">Video Edukasi (YouTube / Link)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Tautan Berkas / Video</label>
              <Input
                type="text"
                placeholder={matType === 'VIDEO' ? 'https://www.youtube.com/watch?v=...' : 'https://drive.google.com/...'}
                value={matFileUrl}
                onChange={(e) => setMatFileUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Deskripsi / Capaian Pembelajaran</label>
            <textarea
              rows={3}
              placeholder="Jelaskan ringkasan materi, capaian pembelajaran, atau instruksi bagi siswa..."
              value={matDescription}
              onChange={(e) => setMatDescription(e.target.value)}
              className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full sm:w-auto min-h-[42px]"
              disabled={isSavingMaterial}
              onClick={() => setIsCreateMaterialOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto min-h-[42px] font-bold"
              loading={isSavingMaterial}
            >
              Terbitkan Materi
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: BUAT TUGAS BARU (GURU) ================= */}
      <Modal
        isOpen={isCreateAssignmentOpen}
        onClose={() => !isSavingAssignment && setIsCreateAssignmentOpen(false)}
        title="Buat Lembar Tugas & PR Baru"
        subtitle="Tugas akan muncul di kalender tugas siswa sesuai mata pelajaran ini."
        size="md"
      >
        <form onSubmit={handleSaveAssignment} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Judul Tugas / Pekerjaan Rumah</label>
            <Input
              type="text"
              placeholder="Contoh: Latihan 10 Soal Persamaan Linier Satu Variabel"
              value={tugTitle}
              onChange={(e) => setTugTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Mata Pelajaran</label>
              <select
                value={tugSubject}
                onChange={(e) => {
                  setTugSubject(e.target.value);
                  const matched = subjects.find((s) => s.name === e.target.value);
                  setTugSubjectCode(matched?.code || 'MAPEL');
                }}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white"
              >
                {subjects.map((s) => (
                  <option key={s.id || s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Kelas / Rombel</label>
              <select
                value={tugClass}
                onChange={(e) => setTugClass(e.target.value)}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white"
              >
                {classes.map((cls) => (
                  <option key={cls.id || cls.name} value={cls.name}>
                    Kelas {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Tenggat Waktu (Deadline)</label>
              <Input
                type="datetime-local"
                value={tugDueDate}
                onChange={(e) => setTugDueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Nilai Maksimal</label>
              <Input
                type="number"
                value={tugMaxScore}
                onChange={(e) => setTugMaxScore(e.target.value)}
                min="10"
                max="100"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Petunjuk & Instruksi Pengerjaan</label>
            <textarea
              rows={3}
              placeholder="Tuliskan instruksi langkah pengerjaan, format berkas yang diterima, atau ketentuan lainnya..."
              value={tugDescription}
              onChange={(e) => setTugDescription(e.target.value)}
              className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full sm:w-auto min-h-[42px]"
              disabled={isSavingAssignment}
              onClick={() => setIsCreateAssignmentOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto min-h-[42px] font-bold"
              loading={isSavingAssignment}
            >
              Terbitkan Tugas
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: BUAT UJIAN BARU (GURU) ================= */}
      <Modal
        isOpen={isCreateExamOpen}
        onClose={() => !isSavingExam && setIsCreateExamOpen(false)}
        title="Jadwalkan Sesi e-Ujian (CBT)"
        subtitle="Setelah jadwal dibuat, Bapak/Ibu dapat mengelola butir soal melalui menu Bank Soal."
        size="md"
      >
        <form onSubmit={handleSaveExam} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Nama Sesi Ujian / Kuis</label>
            <Input
              type="text"
              placeholder="Contoh: Penilaian Tengah Semester (PTS) Ganjil"
              value={exTitle}
              onChange={(e) => setExTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Mata Pelajaran</label>
              <select
                value={exSubject}
                onChange={(e) => {
                  setExSubject(e.target.value);
                  const matched = subjects.find((s) => s.name === e.target.value);
                  setExSubjectCode(matched?.code || 'MAPEL');
                }}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white"
              >
                {subjects.map((s) => (
                  <option key={s.id || s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Kelas Peserta</label>
              <select
                value={exClass}
                onChange={(e) => setExClass(e.target.value)}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white"
              >
                {classes.map((cls) => (
                  <option key={cls.id || cls.name} value={cls.name}>
                    Kelas {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Token Ujian</label>
              <Input
                type="text"
                placeholder="TOKEN"
                value={exToken}
                onChange={(e) => setExToken(e.target.value.toUpperCase())}
                className="font-mono uppercase font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Durasi (Menit)</label>
              <Input
                type="number"
                value={exDuration}
                onChange={(e) => setExDuration(e.target.value)}
                min="10"
                max="180"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Batas Toleransi</label>
              <Input
                type="number"
                value={exViolations}
                onChange={(e) => setExViolations(e.target.value)}
                min="1"
                max="10"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Keterangan / Kisi-kisi</label>
            <textarea
              rows={2}
              placeholder="Catatan tambahan untuk siswa yang akan mengikuti ujian..."
              value={exDescription}
              onChange={(e) => setExDescription(e.target.value)}
              className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full sm:w-auto min-h-[42px]"
              disabled={isSavingExam}
              onClick={() => setIsCreateExamOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto min-h-[42px] font-bold"
              loading={isSavingExam}
            >
              Jadwalkan & Terbitkan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
