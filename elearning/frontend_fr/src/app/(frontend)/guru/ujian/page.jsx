'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function TeacherExamsManagementPage() {
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [activeQuestionEditorExam, setActiveQuestionEditorExam] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya, Lanjutkan',
    cancelText: 'Batal',
    isDanger: true,
    onConfirm: null,
  });

  // Form State: Create / Edit Exam
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Matematika');
  const [subjectCode, setSubjectCode] = useState('MAT');
  const [className, setClassName] = useState('7A');
  const [token, setToken] = useState('');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxViolations, setMaxViolations] = useState(1);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Question Editor State
  const [examQuestions, setExamQuestions] = useState([]);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [newQuestionType, setNewQuestionType] = useState('MCQ');
  const [isStimulusOpen, setIsStimulusOpen] = useState(false);
  const [stimulusText, setStimulusText] = useState('');
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOption, setCorrectOption] = useState('A');
  const [essayPoints, setEssayPoints] = useState(10);
  const [essayRubric, setEssayRubric] = useState('');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const currentUser = tokenStorage.getUser();
      setUser(currentUser);
      const [exData, teacherScope] = await Promise.all([
        elearningApi.getExams(),
        elearningApi.getTeacherScope(currentUser),
      ]);
      setExams(exData || []);

      const validSubjects = teacherScope?.subjects || [];
      const validClasses = teacherScope?.classes || [];
      setSubjects(validSubjects);
      setClasses(validClasses);
      setAssignments(teacherScope?.assignments || []);

      if (validSubjects.length > 0) {
        setSubject(validSubjects[0].name);
        setSubjectCode(validSubjects[0].code);
      }
      if (validClasses.length > 0) {
        setClassName(validClasses[0].name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getClassesForSubject = (subjName) => {
    if (!subjName || !assignments || assignments.length === 0) return classes;
    const target = subjName.toLowerCase().trim();
    const matched = assignments.filter((a) => {
      const cName = String(a.course_name || '').toLowerCase().trim();
      const cCode = String(a.course_code || '').toLowerCase().trim();
      return cName === target || cCode === target || cName.includes(target);
    });
    if (matched.length === 0) return classes;
    const classCodes = new Set(matched.map((m) => String(m.class_code || '').replace(/^Kelas\s*/i, '').trim().toUpperCase()));
    const filtered = classes.filter((c) => {
      const clean = String(c.name || '').replace(/^Kelas\s*/i, '').trim().toUpperCase();
      return classCodes.has(clean);
    });
    return filtered.length > 0 ? filtered : classes;
  };

  const loadExams = async () => {
    try {
      const data = await elearningApi.getExams();
      setExams(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreateModal = () => {
    const defaultSubj = subjects[0] || { name: '', code: '' };
    setEditingExamId(null);
    setTitle('');
    setSubject(defaultSubj.name || '');
    setSubjectCode(defaultSubj.code || '');

    const relevantClasses = defaultSubj.name ? getClassesForSubject(defaultSubj.name) : classes;
    const defaultClass = relevantClasses[0]?.name || classes[0]?.name || '';
    setClassName(defaultClass);

    setToken(Math.random().toString(36).substring(2, 8).toUpperCase());
    setExamDate(new Date().toISOString().split('T')[0]);
    setStartTime('08:00');
    setEndTime('09:30');
    setDurationMinutes(60);
    setMaxViolations(1);
    setDescription('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (ex) => {
    setEditingExamId(ex.id);
    setTitle(ex.title || '');
    setSubject(ex.subject || subjects[0]?.name || 'Matematika');
    setSubjectCode(ex.subjectCode || subjects[0]?.code || 'MAT');
    setClassName(ex.className || classes[0]?.name || '7A');
    setToken(ex.token || '');
    setDurationMinutes(ex.durationMinutes || 60);
    setMaxViolations(ex.maxViolations || 1);
    if (ex.startDateTime) {
      const [d, t] = ex.startDateTime.split('T');
      setExamDate(d || new Date().toISOString().split('T')[0]);
      setStartTime(t ? t.slice(0, 5) : '08:00');
    } else {
      setExamDate(ex.scheduledDate || new Date().toISOString().split('T')[0]);
      setStartTime(ex.startTime || '08:00');
    }
    if (ex.endDateTime) {
      const [, t] = ex.endDateTime.split('T');
      setEndTime(t ? t.slice(0, 5) : '09:30');
    } else {
      setEndTime(ex.endTime || '09:30');
    }
    setDescription(ex.description || '');
    setIsEditModalOpen(true);
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!title.trim() || !token.trim()) {
      alert('Judul dan Token ujian wajib diisi!');
      return;
    }

    const startDateTime = `${examDate}T${startTime}:00`;
    const endDateTime = `${examDate}T${endTime}:00`;

    setIsSubmitting(true);
    try {
      const teacherName = user?.fullName || user?.full_name || user?.nama || user?.name || 'Bapak/Ibu Guru';
      const teacherId = String(user?.id || user?.nip || user?.username || '');

      const payload = {
        title: title.trim(),
        subject,
        course_name: subject,
        subjectCode,
        course_id: subjectCode,
        className,
        class_code: className,
        teacherName,
        teacher_name: teacherName,
        teacherId,
        teacher_id: teacherId,
        token: token.trim().toUpperCase(),
        durationMinutes: Number(durationMinutes) || 60,
        maxViolations: Number(maxViolations) || 3,
        scheduledDate: examDate,
        startTime,
        endTime,
        startDateTime,
        endDateTime,
        description: description.trim(),
      };

      if (editingExamId) {
        await elearningApi.updateExam(editingExamId, payload);
        setIsEditModalOpen(false);
      } else {
        await elearningApi.createExam({
          ...payload,
          totalQuestions: 0,
          status: 'UPCOMING',
          isActive: true,
        });
        setIsCreateModalOpen(false);
      }
      loadExams();
    } catch (err) {
      alert('Gagal menyimpan jadwal ujian: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExamStatus = (ex) => {
    if (ex.status === 'COMPLETED') return 'COMPLETED';
    if (ex.status === 'ACTIVE') return 'ACTIVE';
    if (ex.startDateTime && ex.endDateTime) {
      const now = new Date();
      const start = new Date(ex.startDateTime);
      const end = new Date(ex.endDateTime);
      if (now < start) return 'UPCOMING';
      if (now >= start && now <= end) return 'ACTIVE';
      if (now > end) return 'COMPLETED';
    }
    return ex.status || 'ACTIVE';
  };

  const handleStartExamNow = async (exam) => {
    try {
      await elearningApi.updateExam(exam.id, {
        status: 'ACTIVE',
        subject: exam.subject || exam.course_name,
        className: exam.className || exam.class_code,
        teacherName: exam.teacherName || exam.teacher_name,
      });
      loadExams();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndExamNow = (exam) => {
    setConfirmModal({
      isOpen: true,
      title: 'Tutup & Selesaikan Sesi Ujian?',
      message: `Tutup sesi ujian "${exam.title}" sekarang? Siswa tidak akan dapat mengakses atau mengirimkan jawaban lagi.`,
      confirmText: 'Ya, Tutup Ujian',
      cancelText: 'Batal',
      isDanger: true,
      onConfirm: async () => {
        try {
          await elearningApi.updateExam(exam.id, {
            status: 'COMPLETED',
            subject: exam.subject || exam.course_name,
            className: exam.className || exam.class_code,
          });
          await loadExams();
        } catch (err) {
          console.error(err);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteExam = (examId, examTitle) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Jadwal Ujian?',
      message: `Hapus jadwal ujian "${examTitle}" beserta seluruh butir soalnya? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus Ujian',
      cancelText: 'Batal',
      isDanger: true,
      onConfirm: async () => {
        try {
          await elearningApi.deleteExam(examId);
          await loadExams();
        } catch (err) {
          console.error(err);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleCloseQuestionEditor = () => {
    setActiveQuestionEditorExam(null);
    setEditingQuestionId(null);
    resetQuestionForm();
    loadExams();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeQuestionEditorExam) {
        handleCloseQuestionEditor();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestionEditorExam]);

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setNewQuestionType('MCQ');
    setIsStimulusOpen(false);
    setStimulusText('');
    setIsImageOpen(false);
    setImageUrl('');
    setNewQuestionText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectOption('A');
    setEssayPoints(10);
    setEssayRubric('');
    setSaveSuccessMsg('');
  };

  const handleOpenQuestionEditor = async (exam) => {
    setActiveQuestionEditorExam(exam);
    const qs = await elearningApi.getExamQuestions(exam.id);
    const list = qs || [];
    setExamQuestions(list);
    resetQuestionForm();

    // Otomatis sinkronisasi soal lokal ke database server jika ada
    if (list.length > 0 && exam?.id) {
      elearningApi.saveExamQuestions(exam.id, list).catch(() => {});
    }
  };

  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setNewQuestionType(q.type || 'MCQ');
    setNewQuestionText(q.questionText || '');
    setStimulusText(q.stimulusText || '');
    setIsStimulusOpen(Boolean(q.stimulusText));
    setImageUrl(q.imageUrl || '');
    setIsImageOpen(Boolean(q.imageUrl));
    if (q.type === 'MCQ') {
      const optMap = (q.options || []).reduce((acc, curr) => ({ ...acc, [curr.key]: curr.text }), {});
      setOptA(optMap['A'] || '');
      setOptB(optMap['B'] || '');
      setOptC(optMap['C'] || '');
      setOptD(optMap['D'] || '');
      setCorrectOption(q.correctOption || 'A');
    } else {
      setEssayPoints(q.points || 10);
      setEssayRubric(q.essayRubric || '');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran berkas gambar maksimal 2MB!');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result);
      setIsImageOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) {
      alert('Teks pertanyaan soal tidak boleh kosong!');
      return;
    }

    if (newQuestionType === 'MCQ') {
      if (!optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
        alert('Untuk soal pilihan ganda, mohon lengkapi semua Opsi A, B, C, dan D!');
        return;
      }
    }

    setIsSavingQuestion(true);
    try {
      const newQ = {
        id: `q-${Date.now()}`,
        questionNumber: examQuestions.length + 1,
        type: newQuestionType,
        questionText: newQuestionText.trim(),
        stimulusText: stimulusText.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        options:
          newQuestionType === 'MCQ'
            ? [
                { key: 'A', text: optA.trim() || 'Opsi A' },
                { key: 'B', text: optB.trim() || 'Opsi B' },
                { key: 'C', text: optC.trim() || 'Opsi C' },
                { key: 'D', text: optD.trim() || 'Opsi D' },
              ]
            : [],
        correctOption: newQuestionType === 'MCQ' ? correctOption : '',
        points: newQuestionType === 'ESSAY' ? Number(essayPoints) || 10 : undefined,
        essayRubric: newQuestionType === 'ESSAY' ? essayRubric.trim() || undefined : undefined,
      };

      let updated;
      if (editingQuestionId) {
        updated = examQuestions.map((q) =>
          q.id === editingQuestionId
            ? { ...q, ...newQ, id: editingQuestionId, questionNumber: q.questionNumber }
            : q
        );
        setSaveSuccessMsg(`✓ Soal #${examQuestions.find(q => q.id === editingQuestionId)?.questionNumber || ''} berhasil diperbarui!`);
      } else {
        updated = [...examQuestions, newQ];
        setSaveSuccessMsg(
          `✓ Soal #${newQ.questionNumber} (${newQuestionType === 'MCQ' ? 'Pilihan Ganda' : 'Esai'}) tersimpan!`
        );
      }

      setExamQuestions(updated);

      if (activeQuestionEditorExam?.id) {
        await elearningApi.saveExamQuestions(activeQuestionEditorExam.id, updated);
      }

      setTimeout(() => setSaveSuccessMsg(''), 4000);
      resetQuestionForm();
    } catch (err) {
      alert('Gagal menyimpan soal: ' + err.message);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = (qId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Butir Soal?',
      message: 'Hapus butir soal ini dari bank soal ujian?',
      confirmText: 'Hapus Soal',
      cancelText: 'Batal',
      isDanger: true,
      onConfirm: async () => {
        const filtered = examQuestions
          .filter((q) => q.id !== qId)
          .map((q, idx) => ({ ...q, questionNumber: idx + 1 }));

        setExamQuestions(filtered);
        if (activeQuestionEditorExam?.id) {
          await elearningApi.saveExamQuestions(activeQuestionEditorExam.id, filtered);
        }
        if (editingQuestionId === qId) {
          resetQuestionForm();
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  if (activeQuestionEditorExam) {
    const mcqCount = examQuestions.filter((q) => q.type === 'MCQ').length;
    const essayCount = examQuestions.filter((q) => q.type === 'ESSAY').length;

    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
        {/* Top Sticky Header */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={handleCloseQuestionEditor}
              className="p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-bold text-xs flex items-center gap-1.5 transition-all hover:-translate-x-0.5 cursor-pointer shrink-0"
              title="Kembali ke Daftar Ujian (Esc)"
            >
              <span>←</span>
              <span className="hidden sm:inline">Daftar Ujian</span>
            </button>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-neutral-900 tracking-tight">
                  Kelola Butir Soal: {activeQuestionEditorExam.title}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-200">
                  {activeQuestionEditorExam.subject || activeQuestionEditorExam.course_name || 'Mata Pelajaran'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 font-medium">
                <span className="bg-neutral-100 px-2 py-0.5 rounded font-semibold text-neutral-700">
                  Kelas {activeQuestionEditorExam.className || activeQuestionEditorExam.class_code || 'Semua'}
                </span>
                <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold text-amber-800">
                  Token: {activeQuestionEditorExam.token}
                </span>
                <span className="text-neutral-500">
                  ⏱️ {activeQuestionEditorExam.durationMinutes || activeQuestionEditorExam.duration_minutes || 60} Menit
                </span>
                <span>•</span>
                <span className="text-neutral-700 font-semibold">{examQuestions.length} Butir Soal ({mcqCount} PG, {essayCount} Esai)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            {examQuestions.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  try {
                    setIsSavingQuestion(true);
                    await elearningApi.saveExamQuestions(activeQuestionEditorExam.id, examQuestions);
                    setSaveSuccessMsg(`✓ Seluruh ${examQuestions.length} butir soal berhasil disimpan ke server!`);
                    setTimeout(() => setSaveSuccessMsg(''), 4000);
                  } catch (e) {
                    alert('Gagal sinkronisasi: ' + e.message);
                  } finally {
                    setIsSavingQuestion(false);
                  }
                }}
                loading={isSavingQuestion}
                className="cursor-pointer font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                ☁️ Simpan ke Server ({examQuestions.length} Soal)
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseQuestionEditor}
              className="cursor-pointer font-bold"
            >
              ✓ Selesai & Kembali
            </Button>
          </div>
        </div>

        {/* 2-Column Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Input Form */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            <Card className="border border-neutral-200 bg-white shadow-xs p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    editingQuestionId ? 'bg-amber-600 text-white' : 'bg-primary-600 text-white'
                  }`}>
                    {editingQuestionId ? '✏️' : `#${examQuestions.length + 1}`}
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-neutral-900">
                      {editingQuestionId ? 'Edit Butir Soal' : 'Form Input Butir Soal Baru'}
                    </h2>
                    <p className="text-[11px] text-neutral-500">
                      {editingQuestionId ? 'Ubah konten soal, opsi jawaban, atau bobot nilai di bawah ini.' : 'Tentukan tipe soal (Pilihan Ganda atau Esai), lalu lengkapi pertanyaan di bawah.'}
                    </p>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <span className="text-xs font-bold text-success-700 bg-success-50 border border-success-200 px-2.5 py-1 rounded-lg animate-in fade-in">
                    {saveSuccessMsg}
                  </span>
                )}
              </div>

              <form onSubmit={handleAddQuestion} className="space-y-4">
                {/* 1. Tipe Soal (Segmented Toggle) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800">Pilih Tipe Soal:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewQuestionType('MCQ')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        newQuestionType === 'MCQ'
                          ? 'border-primary-500 bg-primary-50/70 ring-2 ring-primary-500/20 text-primary-950 font-medium'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        newQuestionType === 'MCQ' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        PG
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs sm:text-sm text-neutral-900">Pilihan Ganda (A, B, C, D)</p>
                          {newQuestionType === 'MCQ' && <span className="text-primary-600 font-bold text-xs">✓</span>}
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-snug">
                          Siswa memilih 1 opsi jawaban benar yang otomatis dinilai sistem CBT.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewQuestionType('ESSAY')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        newQuestionType === 'ESSAY'
                          ? 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-500/20 text-purple-950 font-medium'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        newQuestionType === 'ESSAY' ? 'bg-purple-600 text-white' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        ✍️
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs sm:text-sm text-neutral-900">Soal Esai / Uraian</p>
                          {newQuestionType === 'ESSAY' && <span className="text-purple-600 font-bold text-xs">✓</span>}
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-snug">
                          Jawaban teks bebas, penjelasan studi kasus, atau sub-soal (a, b, c).
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Optional Toolbar Buttons (Wacana Stimulus & Gambar) */}
                <div className="pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-neutral-500 mr-1">Elemen Tambahan:</span>
                    <button
                      type="button"
                      onClick={() => setIsStimulusOpen((prev) => !prev)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isStimulusOpen || stimulusText
                          ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold shadow-2xs'
                          : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <span>📑</span>
                      <span>{isStimulusOpen || stimulusText ? 'Wacana / Teks Kasus (Aktif)' : '+ Tambah Wacana / Teks Kasus'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsImageOpen((prev) => !prev)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isImageOpen || imageUrl
                          ? 'bg-sky-50 text-sky-900 border-sky-300 font-bold shadow-2xs'
                          : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <span>🖼️</span>
                      <span>{isImageOpen || imageUrl ? 'Gambar Soal (Aktif)' : '+ Tambah Gambar / Diagram'}</span>
                    </button>
                  </div>
                </div>

                {/* Optional Box 1: Wacana / Teks Kasus / Stimulus */}
                {(isStimulusOpen || stimulusText) && (
                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/90 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <span>📑</span>
                        <span>Wacana / Stimulus Kasus / Cuplikan Kode / Bacaan</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setStimulusText('');
                          setIsStimulusOpen(false);
                        }}
                        className="text-[11px] text-danger-600 hover:text-danger-700 font-bold hover:underline cursor-pointer"
                      >
                        ✕ Hapus Wacana
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Tuliskan teks wacana, studi kasus, atau cuplikan kode di sini...&#10;Contoh: Denda Keterlambatan Buku Perpustakaan&#10;Perpustakaan SMPN 1 Prambon menerapkan aturan denda Rp 500 per hari..."
                      value={stimulusText}
                      onChange={(e) => setStimulusText(e.target.value)}
                      className="w-full text-xs p-3 rounded-lg border border-amber-300 bg-white font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    />
                    <p className="text-[10px] text-amber-700">
                      Wacana ini akan tampil di bagian atas pertanyaan sebagai bahan acuan siswa.
                    </p>
                  </div>
                )}

                {/* Optional Box 2: Gambar / Diagram / Grafik */}
                {(isImageOpen || imageUrl) && (
                  <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/90 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                        <span>🖼️</span>
                        <span>Gambar / Diagram / Flowchart Pendukung Soal</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl('');
                          setIsImageOpen(false);
                        }}
                        className="text-[11px] text-danger-600 hover:text-danger-700 font-bold hover:underline cursor-pointer"
                      >
                        ✕ Hapus Gambar
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="text-xs text-neutral-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-sky-800 hover:file:bg-sky-200 cursor-pointer"
                      />
                      <Input
                        type="text"
                        placeholder="Atau tempel URL gambar langsung (https://...)"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="text-xs bg-white"
                      />
                    </div>
                    {imageUrl && (
                      <div className="relative mt-2 inline-block">
                        <img
                          src={imageUrl}
                          alt="Preview Gambar Soal"
                          className="max-h-48 rounded-lg border border-sky-200 object-contain bg-white p-1.5 shadow-2xs"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Teks Pertanyaan Utama */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800">
                      Teks Pertanyaan Soal <span className="text-danger-600">*</span>
                    </label>
                    <span className="text-[11px] text-neutral-400">
                      {newQuestionType === 'ESSAY' ? 'Mendukung sub-soal poin a, b, c' : 'Pertanyaan utama'}
                    </span>
                  </div>
                  <textarea
                    rows={newQuestionType === 'ESSAY' ? 5 : 3}
                    placeholder={
                      newQuestionType === 'ESSAY'
                        ? 'Tuliskan pertanyaan esai di sini. Jika soal memiliki sub-pertanyaan, gunakan format terstruktur:&#10;a. Berdasarkan teks di atas, hitunglah denda yang harus dibayar!&#10;b. Tuliskan pseudocode algoritma untuk menghitung total denda!&#10;c. Gambarkan flowchart alur programnya!'
                        : 'Tuliskan pertanyaan pilihan ganda di sini...'
                    }
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-neutral-300 bg-white font-sans leading-relaxed focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    required
                  />
                </div>

                {/* 4A. Form Khusus Pilihan Ganda: Opsi A, B, C, D & Kunci */}
                {newQuestionType === 'MCQ' && (
                  <div className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-xs font-bold text-neutral-800">
                        Opsi Pilihan Jawaban & Tentukan Kunci Jawaban Benar:
                      </label>
                      <span className="text-[11px] text-neutral-500 font-medium">
                        Klik tombol huruf untuk memilih kunci benar
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { key: 'A', value: optA, setter: setOptA },
                        { key: 'B', value: optB, setter: setOptB },
                        { key: 'C', value: optC, setter: setOptC },
                        { key: 'D', value: optD, setter: setOptD },
                      ].map((opt) => {
                        const isCorrect = correctOption === opt.key;
                        return (
                          <div
                            key={opt.key}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                              isCorrect
                                ? 'bg-success-50/70 border-success-400 ring-1 ring-success-400'
                                : 'bg-white border-neutral-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setCorrectOption(opt.key)}
                              className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                isCorrect
                                  ? 'bg-success-600 text-white shadow-2xs'
                                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                              }`}
                              title={`Pilih ${opt.key} sebagai Kunci Jawaban Benar`}
                            >
                              {opt.key}
                            </button>

                            <input
                              type="text"
                              placeholder={`Teks Jawaban Opsi ${opt.key}...`}
                              value={opt.value}
                              onChange={(e) => opt.setter(e.target.value)}
                              className="w-full text-xs bg-transparent border-0 focus:outline-hidden p-1 font-medium text-neutral-800"
                              required
                            />

                            {isCorrect && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success-600 text-white shrink-0 mr-1">
                                ✓ KUNCI BENAR
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4B. Form Khusus Esai / Uraian */}
                {newQuestionType === 'ESSAY' && (
                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-3.5">
                    <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                      <span>💡</span>
                      <span>Konfigurasi Jawaban Uraian / Esai</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-800">
                        Bobot Poin / Nilai Soal Ini
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={essayPoints}
                          onChange={(e) => setEssayPoints(e.target.value)}
                          className="w-24 text-xs font-bold p-2.5 rounded-lg border border-purple-300 bg-white"
                        />
                        <span className="text-xs text-neutral-500 font-medium">Poin (standar 10-25 poin)</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-neutral-800">
                          Pedoman Penilaian / Kunci Jawaban Acuan Guru (Opsional)
                        </label>
                        <span className="text-[10px] text-neutral-400">Tidak terlihat oleh siswa</span>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Tuliskan poin-poin jawaban yang diharapkan dari siswa sebagai acuan koreksi..."
                        value={essayRubric}
                        onChange={(e) => setEssayRubric(e.target.value)}
                        className="w-full text-xs p-3 rounded-lg border border-purple-300 bg-white font-sans leading-relaxed focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}

                {/* 5. Tombol Submit Form */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                  {editingQuestionId ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={resetQuestionForm}
                      className="cursor-pointer font-bold text-neutral-600"
                    >
                      Batal Edit
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={resetQuestionForm}
                      className="cursor-pointer"
                    >
                      Reset Form
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant={editingQuestionId ? 'secondary' : 'primary'}
                    size="md"
                    className="font-bold min-h-[42px] cursor-pointer"
                    loading={isSavingQuestion}
                  >
                    {editingQuestionId ? '💾 Simpan Perubahan Soal' : `+ Simpan Butir Soal #${examQuestions.length + 1}`}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* RIGHT COLUMN: Daftar Soal Tersimpan */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <Card className="border border-neutral-200 bg-white shadow-xs p-4 sm:p-5 space-y-4 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900 uppercase tracking-wider">
                    Daftar Soal Tersimpan
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Total {examQuestions.length} Butir ({mcqCount} PG, {essayCount} Esai)
                  </p>
                </div>
              </div>

              {/* Scrollable Questions List */}
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {examQuestions.length === 0 ? (
                  <div className="p-6 rounded-xl bg-neutral-50 border border-dashed border-neutral-300 text-center space-y-2">
                    <span className="text-2xl">📋</span>
                    <p className="text-xs font-bold text-neutral-600">Belum Ada Butir Soal</p>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Silakan isi formulir di sebelah kiri untuk menyusun butir soal ujian ini.
                    </p>
                  </div>
                ) : (
                  examQuestions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className={`p-3.5 rounded-xl border transition-all space-y-2 text-xs ${
                        editingQuestionId === q.id
                          ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-400/30'
                          : 'border-neutral-200 bg-neutral-50/60 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold px-2 py-0.5 rounded bg-neutral-800 text-white text-[10px]">
                            #{idx + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            q.type === 'MCQ' ? 'bg-primary-100 text-primary-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {q.type === 'MCQ' ? 'Pilihan Ganda' : 'Esai'}
                          </span>
                          {q.stimulusText && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              +Wacana
                            </span>
                          )}
                          {q.imageUrl && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                              +Gambar
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {q.type === 'MCQ' && (
                            <span className="font-bold text-success-700 bg-success-50 px-2 py-0.5 rounded border border-success-200 text-[10px]">
                              Kunci: {q.correctOption}
                            </span>
                          )}
                          {q.type === 'ESSAY' && (
                            <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[10px]">
                              {q.points || 10} Poin
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(q)}
                            className="text-primary-600 hover:text-primary-800 font-bold p-1 hover:bg-primary-50 rounded transition-colors cursor-pointer text-xs"
                            title="Edit Soal Ini"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-danger-600 hover:text-danger-700 font-bold p-1 hover:bg-danger-50 rounded transition-colors cursor-pointer text-xs"
                            title="Hapus Soal"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {q.imageUrl && (
                        <div className="pt-1">
                          <img
                            src={q.imageUrl}
                            alt="Preview Soal"
                            className="max-h-24 rounded border border-neutral-200 object-contain bg-white p-1"
                          />
                        </div>
                      )}

                      <p className="text-neutral-800 font-medium line-clamp-3 leading-relaxed">
                        {q.questionText}
                      </p>

                      {q.type === 'MCQ' && (
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-neutral-600 pt-1">
                          {q.options?.map((opt) => (
                            <span
                              key={opt.key}
                              className={`truncate px-1.5 py-0.5 rounded ${
                                opt.key === q.correctOption
                                  ? 'font-bold text-success-700 bg-success-100/70 border border-success-200'
                                  : 'bg-white border border-neutral-200'
                              }`}
                            >
                              <strong>{opt.key}.</strong> {opt.text}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-neutral-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full font-bold cursor-pointer"
                  onClick={handleCloseQuestionEditor}
                >
                  ✓ Selesai & Simpan Semua
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <ConfirmModal
          {...confirmModal}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Bank Soal & Jadwal e-Ujian (CBT)
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Susun butir soal pilihan ganda & esai, tentukan token sesi, dan atur toleransi pelanggaran anti-cheat.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreateModal}
          className="shadow-sm cursor-pointer"
        >
          + Buat Jadwal Ujian
        </Button>
      </div>

      {/* Exam Table */}
      <Card noPadding className="overflow-hidden border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Nama Sesi Ujian</th>
                <th className="py-3 px-4">Mapel & Kelas</th>
                <th className="py-3 px-4">Jadwal Pelaksanaan</th>
                <th className="py-3 px-4 font-mono">Token</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    Memuat daftar ujian...
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    Belum ada jadwal ujian CBT yang dibuat. Klik tombol "+ Buat Jadwal Ujian" di atas.
                  </td>
                </tr>
              ) : (
                exams.map((ex) => {
                  const currentStatus = getExamStatus(ex);
                  return (
                    <tr key={ex.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        <div className="space-y-0.5">
                          <p className="truncate max-w-[220px] font-bold text-neutral-900">{ex.title}</p>
                          <p className="text-[11px] text-neutral-400 truncate max-w-[220px]">{ex.description || 'Ujian CBT Sekolah'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-primary-700">{ex.subject}</p>
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-600">
                            Kelas {ex.className}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-700">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-neutral-800">
                            📅 {ex.scheduledDate || (ex.startDateTime ? ex.startDateTime.split('T')[0] : 'Sesuai Jadwal')}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            ⏰ {ex.startTime || '08:00'} - {ex.endTime || '09:30'} WIB
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-neutral-800">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {ex.token}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600 font-medium">
                        {ex.durationMinutes} Menit
                      </td>
                      <td className="py-3 px-4">
                        {currentStatus === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            Sedang Berlangsung
                          </span>
                        ) : currentStatus === 'UPCOMING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            ⏳ Akan Datang
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
                            ✓ Selesai
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {currentStatus === 'UPCOMING' && (
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => handleStartExamNow(ex)}
                              className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              title="Mulai sesi ujian sekarang lebih awal"
                            >
                              ▶ Mulai
                            </Button>
                          )}
                          {(currentStatus === 'ACTIVE' || currentStatus === 'UPCOMING') && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleEndExamNow(ex)}
                              className="cursor-pointer border-danger-300 text-danger-700 hover:bg-danger-50 font-bold"
                              title="Tutup & selesaikan sesi ujian sekarang"
                            >
                              ⏹ Tutup
                            </Button>
                          )}
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => handleOpenQuestionEditor(ex)}
                            className="cursor-pointer font-bold"
                          >
                            Kelola Soal
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenEditModal(ex)}
                            className="cursor-pointer"
                            title="Edit Jadwal & Konfigurasi"
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleDeleteExam(ex.id, ex.title)}
                            className="cursor-pointer border-danger-200 text-danger-600 hover:bg-danger-50"
                            title="Hapus Ujian"
                          >
                            🗑️
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Create & Edit Exam */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
          }
        }}
        title={editingExamId ? 'Edit Jadwal & Sesi e-Ujian' : 'Buat Jadwal & Sesi e-Ujian Baru'}
        subtitle="Ujian akan menggunakan browser lockdown anti-cheat secara otomatis."
        size="lg"
      >
        <form onSubmit={handleSaveExam} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Nama / Judul Ujian</label>
            <Input
              type="text"
              placeholder="Contoh: Penilaian Akhir Semester (PAS) Ganjil 2026/2027"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800">Mata Pelajaran (Diampu)</label>
                <span className="text-[10px] text-primary-700 font-bold bg-primary-50 px-1.5 py-0.5 rounded">
                  Sesuai Penugasan Guru
                </span>
              </div>
              {subjects.length === 0 ? (
                <div className="p-2.5 rounded-[8px] bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-snug">
                  ⚠️ Akun Anda belum memiliki mata pelajaran pengampu yang diatur oleh Administrator di SSO / e-Rapor. Hubungi Administrator untuk mengatur penugasan mapel Anda.
                </div>
              ) : (
                <select
                  value={subject}
                  onChange={(e) => {
                    const newSubj = e.target.value;
                    setSubject(newSubj);
                    const matched = subjects.find((s) => s.name === newSubj);
                    setSubjectCode(matched?.code || 'MAPEL');
                    const relevantClasses = getClassesForSubject(newSubj);
                    if (relevantClasses.length > 0 && !relevantClasses.some((c) => c.name === className)) {
                      setClassName(relevantClasses[0].name);
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white font-medium"
                >
                  {subjects.map((s) => (
                    <option key={s.id || s.code} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Target Kelas / Rombel</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                disabled={subjects.length === 0}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white font-medium disabled:bg-neutral-100 disabled:text-neutral-400"
              >
                {getClassesForSubject(subject).map((cls) => (
                  <option key={cls.id || cls.name} value={cls.name}>
                    Kelas {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Jadwal Pelaksanaan */}
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <span>📅</span>
                <span>Waktu Pelaksanaan Ujian:</span>
              </label>
              <span className="text-[10px] text-neutral-500 font-medium">Ujian mulai otomatis pada jam ini</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700">Tanggal Ujian</label>
                <Input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700">Jam Mulai</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700">Batas Selesai / Deadline</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Token Ujian</label>
              <Input
                type="text"
                placeholder="TOKEN"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                className="font-mono uppercase font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Durasi Pengerjaan</label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  min="10"
                  max="180"
                  required
                />
                <span className="text-xs text-neutral-500 font-medium">Menit</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Toleransi Anti-Cheat</label>
              <select
                value={maxViolations}
                onChange={(e) => setMaxViolations(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white font-medium truncate"
              >
                <option value={1}>1x (Zero Tolerance - Ketat)</option>
                <option value={2}>2x Pelanggaran</option>
                <option value={3}>3x Pelanggaran (Standar)</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>🔐</span>
              <span>PIN Buka Kunci Pengawas:</span>
            </p>
            <p className="text-emerald-800 leading-relaxed">
              Jika layar siswa terkunci karena membuka notifikasi atau keluar jendela, Pengawas dapat membukanya langsung di HP siswa dengan memasukkan <strong>Token Ujian ({token || '...'})</strong> atau PIN Master <strong>SPENSPRA</strong>.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Petunjuk Pengerjaan</label>
            <textarea
              rows={2}
              placeholder="Instruksi tambahan bagi peserta sebelum memulai ujian..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full sm:w-auto min-h-[42px]"
              disabled={isSubmitting}
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
              }}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto min-h-[42px] font-bold"
              loading={isSubmitting}
              disabled={isSubmitting || subjects.length === 0}
            >
              {editingExamId ? 'Simpan Perubahan' : 'Terbitkan Jadwal Ujian'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        {...confirmModal}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
