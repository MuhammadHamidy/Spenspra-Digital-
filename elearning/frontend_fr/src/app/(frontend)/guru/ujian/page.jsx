'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import AppIcon from '@/components/AppIcon';
import { elearningApi, generateRandomPin } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';
import mammoth from 'mammoth';

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return 'Sesuai Jadwal';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const MATH_SYMBOLS = ['²', '³', '√', 'π', '∞', '≤', '≥', '≠', '≈', '×', '÷', '±', '∑', '∫', 'Δ', 'α', 'β', '°'];

function parseQuestionImport(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, ' ').trim())
    .filter(Boolean);
  const questions = [];
  let current = null;
  let currentOption = null;

  const startQuestion = (line) => {
    const match = line.match(/^(?:soal\s*)?(\d+)\s*[\.\):\-]\s*(.+)$/i);
    const labeledMatch = line.match(/^(?:soal|pertanyaan)\s*[:\-]\s*(.+)$/i);
    if (!match && !labeledMatch) return false;
    if (current?.questionText && current.options.length >= 2) questions.push(current);
    current = {
      questionNumber: match ? Number(match[1]) : questions.length + 1,
      questionText: (match ? match[2] : labeledMatch[1]).trim(),
      options: [],
      correctOption: 'A',
      points: 10,
      stimulusText: '',
      imageUrl: '',
    };
    currentOption = null;
    return true;
  };

  lines.forEach((line) => {
    if (startQuestion(line)) return;
    if (!current) return;

    const stimulusMatch = line.match(/^(?:stimulus|wacana|teks\s*kasus)\s*[:\-]?\s*(.*)$/i);
    if (stimulusMatch) {
      current.stimulusText = stimulusMatch[1].trim();
      currentOption = null;
      return;
    }

    const answerMatch = line.match(/^(?:kunci|jawaban|answer)\s*[:\-]\s*([A-E])/i);
    if (answerMatch) {
      current.correctOption = answerMatch[1].toUpperCase();
      currentOption = null;
      return;
    }

    const pointsMatch = line.match(/^(?:poin|points|bobot|nilai)\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:poin)?$/i);
    if (pointsMatch) {
      current.points = Number(pointsMatch[1].replace(',', '.')) || 10;
      currentOption = null;
      return;
    }

    const optionImageMatch = line.match(/^(?:gambar|image)\s*([A-E])?\s*[:=]\s*(.+)$/i);
    if (optionImageMatch) {
      const optionKey = optionImageMatch[1]?.toUpperCase();
      const option = optionKey ? current.options.find((item) => item.key === optionKey) : null;
      const activeOption = currentOption ? current.options.find((item) => item.key === currentOption) : null;
      if (option || activeOption) (option || activeOption).imageUrl = optionImageMatch[2].trim();
      else current.imageUrl = optionImageMatch[2].trim();
      currentOption = null;
      return;
    }

    const optionMatch = line.match(/^([A-E])\s*[\.\):\-]\s*(.+)$/i);
    if (optionMatch) {
      const key = optionMatch[1].toUpperCase();
      current.options.push({ key, text: optionMatch[2].trim() });
      currentOption = key;
      return;
    }

    if (currentOption) {
      const option = current.options.find((item) => item.key === currentOption);
      if (option) option.text = `${option.text} ${line}`.trim();
    } else if (current.stimulusText && !current.options.length) {
      current.stimulusText = `${current.stimulusText} ${line}`.trim();
    } else {
      current.questionText = `${current.questionText} ${line}`.trim();
    }
  });

  if (current?.questionText && current.options.length >= 2) questions.push(current);
  return questions.map((question, index) => ({
    id: `q-import-${Date.now()}-${index}`,
    questionNumber: index + 1,
    type: 'MCQ',
    questionText: question.questionText,
    options: question.options,
    correctOption: question.correctOption,
    points: question.points || 10,
    stimulusText: question.stimulusText || undefined,
    imageUrl: question.imageUrl || undefined,
  }));
}

export default function TeacherExamsManagementPage() {
  const router = useRouter();
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
  const [examCategory, setExamCategory] = useState('SEMESTER_UAS'); // 'REGULAR' | 'SEMESTER_UAS'
  const [targetGradeLevel, setTargetGradeLevel] = useState('7'); // '7' | '8' | '9'
  const [supervisorPin, setSupervisorPin] = useState(() => generateRandomPin(6));
  const [examFilterTab, setExamFilterTab] = useState('ALL'); // 'ALL' | 'SEMESTER_UAS' | 'REGULAR'
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
  const [showScoreToStudent, setShowScoreToStudent] = useState(true);
  const [showAnswersToStudent, setShowAnswersToStudent] = useState(false);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatingExamId, setActivatingExamId] = useState(null);

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
  const [optE, setOptE] = useState('');
  const [optAImage, setOptAImage] = useState('');
  const [optBImage, setOptBImage] = useState('');
  const [optCImage, setOptCImage] = useState('');
  const [optDImage, setOptDImage] = useState('');
  const [optEImage, setOptEImage] = useState('');
  const [correctOption, setCorrectOption] = useState('A');
  const [correctOptions, setCorrectOptions] = useState(['A']); // Untuk Pilihan Ganda Kompleks (Multi-Select)
  const [trueFalseAnswer, setTrueFalseAnswer] = useState(true); // Untuk Benar / Salah
  const [matchingPairs, setMatchingPairs] = useState([
    { id: 1, left: '', right: '' },
    { id: 2, left: '', right: '' },
    { id: 3, left: '', right: '' },
  ]); // Untuk Menjodohkan / Pencocokan
  const [mcqPoints, setMcqPoints] = useState(10);
  const [essayPoints, setEssayPoints] = useState(10);
  const [essayRubric, setEssayRubric] = useState('');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [docxFileName, setDocxFileName] = useState('');
  const [isQuickEditMode, setIsQuickEditMode] = useState(false);
  const [bulkPoints, setBulkPoints] = useState(10);

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

  // Helper mendapatkan seluruh rombel paralel tingkat dari Master SSO (cth: Tingkat 7 -> 7A, 7B, 7C, dst.)
  const getParallelClassesForLevel = (lvl) => {
    if (!lvl) return [];
    const prefix = String(lvl).trim();
    return classes.filter((cls) => {
      const clean = String(cls.name || '').trim().replace(/^kelas\s*/i, '');
      return clean.startsWith(prefix);
    });
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
    setExamCategory('SEMESTER_UAS');
    setTargetGradeLevel('7');
    setSupervisorPin(generateRandomPin(6));
    setSubject(defaultSubj.name || '');
    setSubjectCode(defaultSubj.code || '');

    const relevantClasses = defaultSubj.name ? getClassesForSubject(defaultSubj.name) : classes;
    const defaultClass = relevantClasses[0]?.name || classes[0]?.name || '';
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const startStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const endObj = new Date(now.getTime() + 90 * 60 * 1000);
    const endStr = `${pad(endObj.getHours())}:${pad(endObj.getMinutes())}`;

    setToken(`ASAS${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    setExamDate(now.toISOString().split('T')[0]);
    setStartTime(startStr);
    setEndTime(endStr);
    setDurationMinutes(90);
    setMaxViolations(1);
    setShowScoreToStudent(true);
    setShowAnswersToStudent(false);
    setDescription('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (ex) => {
    setEditingExamId(ex.id);
    setTitle(ex.title || '');
    const isUas = ex.examCategory === 'SEMESTER_UAS' || ex.isCoordinatorExam || Boolean(ex.targetGradeLevel);
    setExamCategory(isUas ? 'SEMESTER_UAS' : 'REGULAR');
    setTargetGradeLevel(ex.targetGradeLevel || '7');
    setSupervisorPin(ex.supervisorPin || generateRandomPin(6));
    setSubject(ex.subject || subjects[0]?.name || 'Matematika');
    setSubjectCode(ex.subjectCode || subjects[0]?.code || 'MAT');
    setClassName(ex.className || classes[0]?.name || '7A');
    setToken(ex.token || '');
    setDurationMinutes(ex.durationMinutes || 60);
    setMaxViolations(ex.maxViolations || 1);
    setShowScoreToStudent(ex.showScoreToStudent !== false);
    setShowAnswersToStudent(Boolean(ex.showAnswersToStudent));
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

      const isUas = examCategory === 'SEMESTER_UAS';
      const parallelClasses = isUas ? getParallelClassesForLevel(targetGradeLevel).map((c) => c.name) : [];
      const effectiveClassName = isUas
        ? `Tingkat ${targetGradeLevel} (${parallelClasses.length > 0 ? parallelClasses.join(', ') : 'Semua Rombel'})`
        : className;

      const payload = {
        title: title.trim(),
        subject,
        course_name: subject,
        subjectCode,
        course_id: subjectCode,
        className: effectiveClassName,
        class_code: effectiveClassName,
        examCategory,
        exam_category: examCategory,
        targetGradeLevel: isUas ? targetGradeLevel : '',
        target_grade_level: isUas ? targetGradeLevel : '',
        targetClasses: isUas ? parallelClasses : [className],
        target_classes: isUas ? parallelClasses : [className],
        isCoordinatorExam: isUas,
        is_coordinator_exam: isUas,
        supervisorPin: isUas ? supervisorPin.trim().toUpperCase() : '',
        supervisor_pin: isUas ? supervisorPin.trim().toUpperCase() : '',
        teacherName,
        teacher_name: teacherName,
        teacherId,
        teacher_id: teacherId,
        token: token.trim().toUpperCase(),
        durationMinutes: Number(durationMinutes) || 60,
        maxViolations: Number(maxViolations) || 3,
        showScoreToStudent,
        show_score_to_student: showScoreToStudent,
        showAnswersToStudent: showScoreToStudent ? showAnswersToStudent : false,
        show_answers_to_student: showScoreToStudent ? showAnswersToStudent : false,
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
        await loadExams();
      } else {
        const createdExam = await elearningApi.createExam({
          ...payload,
          totalQuestions: 0,
          status: 'UPCOMING',
          isActive: true,
        });
        setIsCreateModalOpen(false);
        await loadExams();
        // Langsung arahkan guru ke halaman penuh pembuatan butir soal tanpa popup
        const targetExam = createdExam && (createdExam.id || createdExam._id)
          ? createdExam
          : { ...payload, id: createdExam?.id || `exam-${Date.now()}` };
        await handleOpenQuestionEditor(targetExam);
        return;
      }
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
    if (activatingExamId) return;
    setActivatingExamId(exam.id);
    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const startStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const endObj = new Date(now.getTime() + (Number(exam.durationMinutes) || 90) * 60 * 1000);
      const endStr = `${pad(endObj.getHours())}:${pad(endObj.getMinutes())}`;
      const todayDate = now.toISOString().split('T')[0];
      const startDT = `${todayDate}T${startStr}:00`;
      const endDT = `${todayDate}T${endStr}:00`;

      // 1. Optimistic update local state immediately so UI changes to ACTIVE instantly
      setExams((prev) =>
        prev.map((item) =>
          item.id === exam.id
            ? {
                ...item,
                status: 'ACTIVE',
                scheduledDate: todayDate,
                startTime: startStr,
                endTime: endStr,
                startDateTime: startDT,
                endDateTime: endDT,
              }
            : item
        )
      );

      // 2. Persist update to backend
      await elearningApi.updateExam(exam.id, {
        ...exam,
        status: 'ACTIVE',
        scheduledDate: todayDate,
        startTime: startStr,
        endTime: endStr,
        startDateTime: startDT,
        endDateTime: endDT,
        subject: exam.subject || exam.course_name,
        className: exam.className || exam.class_code,
        teacherName: exam.teacherName || exam.teacher_name,
      });

      await loadExams();
    } catch (err) {
      console.error(err);
      alert('Gagal mengaktifkan ujian: ' + err.message);
      await loadExams();
    } finally {
      setActivatingExamId(null);
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

  const resetQuestionForm = (keepPoints = false, customPoints = null) => {
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
    setOptE('');
    setOptAImage('');
    setOptBImage('');
    setOptCImage('');
    setOptDImage('');
    setOptEImage('');
    setCorrectOption('A');
    setCorrectOptions(['A']);
    setTrueFalseAnswer(true);
    setMatchingPairs([
      { id: 1, left: '', right: '' },
      { id: 2, left: '', right: '' },
      { id: 3, left: '', right: '' },
    ]);
    if (customPoints !== null && Number(customPoints) > 0) {
      setMcqPoints(Number(customPoints));
      setEssayPoints(Number(customPoints));
    } else if (!keepPoints) {
      setMcqPoints(10);
      setEssayPoints(10);
    }
    setEssayRubric('');
    setSaveSuccessMsg('');
  };

  const handleOpenQuestionEditor = async (exam) => {
    setActiveQuestionEditorExam(exam);
    const qs = await elearningApi.getExamQuestions(exam.id);
    const list = qs || [];
    setExamQuestions(list);
    const lastPts = list.length > 0 ? Number(list[0]?.points) || 10 : 10;
    resetQuestionForm(false, lastPts);
  };

  const updateQuestionInline = (questionId, patch) => {
    setExamQuestions((current) =>
      current.map((question) => (question.id === questionId ? { ...question, ...patch } : question))
    );
  };

  const updateQuestionOptionInline = (questionId, key, text) => {
    setExamQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) return question;
        const existingOptions = question.options || [];
        const hasOption = existingOptions.some((option) => option.key === key);
        const options = hasOption
          ? existingOptions.map((option) => (option.key === key ? { ...option, text } : option))
          : [...existingOptions, { key, text }];
        return { ...question, options };
      })
    );
  };

  const updateQuestionOptionImageInline = (questionId, key, imageUrl) => {
    setExamQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) return question;
        const existingOptions = question.options || [];
        const hasOption = existingOptions.some((option) => option.key === key);
        const options = hasOption
          ? existingOptions.map((option) => (option.key === key ? { ...option, imageUrl } : option))
          : [...existingOptions, { key, text: '', imageUrl }];
        return { ...question, options };
      })
    );
  };

  const handleSaveAllQuestions = async () => {
    if (!activeQuestionEditorExam || examQuestions.length === 0) return;
    setIsSavingQuestion(true);
    try {
      await elearningApi.saveExamQuestions(activeQuestionEditorExam.id, examQuestions);
      setSaveSuccessMsg(`Seluruh ${examQuestions.length} butir soal berhasil disimpan ke server!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (e) {
      alert('Gagal menyimpan seluruh soal: ' + e.message);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    const type = q.type || 'MCQ';
    setNewQuestionType(type);
    setNewQuestionText(q.questionText || '');
    setStimulusText(q.stimulusText || '');
    setIsStimulusOpen(Boolean(q.stimulusText));
    setImageUrl(q.imageUrl || '');
    setIsImageOpen(Boolean(q.imageUrl));
    setMcqPoints(q.points || 10);
    setEssayPoints(q.points || 10);

    if (type === 'MCQ' || type === 'COMPLEX_MCQ') {
      const optMap = (q.options || []).reduce((acc, curr) => ({ ...acc, [curr.key]: curr }), {});
      setOptA(optMap.A?.text || '');
      setOptB(optMap.B?.text || '');
      setOptC(optMap.C?.text || '');
      setOptD(optMap.D?.text || '');
      setOptE(optMap.E?.text || '');
      setOptAImage(optMap.A?.imageUrl || '');
      setOptBImage(optMap.B?.imageUrl || '');
      setOptCImage(optMap.C?.imageUrl || '');
      setOptDImage(optMap.D?.imageUrl || '');
      setOptEImage(optMap.E?.imageUrl || '');
      setCorrectOption(q.correctOption || 'A');
      let initCorrectOpts = [];
      if (Array.isArray(q.correctOptions) && q.correctOptions.length > 0) {
        initCorrectOpts = q.correctOptions;
      } else if (typeof q.correctOption === 'string' && q.correctOption && q.correctOption !== '-') {
        initCorrectOpts = q.correctOption.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      } else if (typeof q.correct_answer === 'string' && q.correct_answer && q.correct_answer !== '-') {
        initCorrectOpts = q.correct_answer.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      }
      if (initCorrectOpts.length === 0) initCorrectOpts = ['A'];
      setCorrectOptions(initCorrectOpts);
    } else if (type === 'TRUE_FALSE') {
      setTrueFalseAnswer(q.trueFalseAnswer !== undefined ? q.trueFalseAnswer : (q.correctOption === 'TRUE' || q.correctOption === 'BENAR'));
    } else if (type === 'MATCHING') {
      if (Array.isArray(q.matchingPairs) && q.matchingPairs.length > 0) {
        setMatchingPairs(q.matchingPairs);
      } else {
        setMatchingPairs([
          { id: 1, left: '', right: '' },
          { id: 2, left: '', right: '' },
          { id: 3, left: '', right: '' },
        ]);
      }
    } else {
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

  const handleOptionImageUpload = (setter) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran gambar opsi maksimal 2MB!');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) {
      alert('Teks pertanyaan / pernyataan soal tidak boleh kosong!');
      return;
    }

    const optionValues = [
      [optA, optAImage], [optB, optBImage], [optC, optCImage], [optD, optDImage],
    ];
    if (newQuestionType === 'MCQ') {
      if (optionValues.some(([text, image]) => !text.trim() && !image.trim())) {
        alert('Untuk soal pilihan ganda tunggal, mohon lengkapi semua Opsi A, B, C, dan D!');
        return;
      }
    }

    if (newQuestionType === 'COMPLEX_MCQ') {
      if (optionValues.some(([text, image]) => !text.trim() && !image.trim())) {
        alert('Untuk soal pilihan ganda kompleks, mohon lengkapi opsi A, B, C, dan D!');
        return;
      }
      if (!correctOptions || correctOptions.length === 0) {
        alert('Untuk pilihan ganda kompleks, centang minimal 1 atau lebih jawaban kunci benar!');
        return;
      }
    }

    if (newQuestionType === 'MATCHING') {
      const validPairs = matchingPairs.filter((p) => p.left.trim() && p.right.trim());
      if (validPairs.length < 2) {
        alert('Untuk soal menjodohkan / pencocokan, mohon isi minimal 2 pasang premis dan jawaban!');
        return;
      }
    }

    setIsSavingQuestion(true);
    try {
      const optionsList = [];
      if (newQuestionType === 'MCQ' || newQuestionType === 'COMPLEX_MCQ') {
        [
          ['A', optA, optAImage], ['B', optB, optBImage], ['C', optC, optCImage],
          ['D', optD, optDImage], ['E', optE, optEImage],
        ].forEach(([key, text, optionImage]) => {
          if (text.trim() || optionImage.trim()) {
            optionsList.push({ key, text: text.trim(), imageUrl: optionImage.trim() || undefined });
          }
        });
      }

      const validPairs = matchingPairs
        .filter((p) => p.left.trim() && p.right.trim())
        .map((p, idx) => ({ id: p.id || idx + 1, left: p.left.trim(), right: p.right.trim() }));

      const targetPoints = Number(newQuestionType === 'ESSAY' ? essayPoints : mcqPoints) || 10;

      const newQ = {
        id: editingQuestionId || `q-${Date.now()}`,
        questionNumber: editingQuestionId
          ? (examQuestions.find((q) => q.id === editingQuestionId)?.questionNumber || examQuestions.length + 1)
          : examQuestions.length + 1,
        type: newQuestionType,
        questionText: newQuestionText.trim(),
        stimulusText: stimulusText.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        options: optionsList,
        correctOption: newQuestionType === 'MCQ'
          ? correctOption
          : (newQuestionType === 'COMPLEX_MCQ'
              ? (correctOptions && correctOptions.length > 0 ? correctOptions.join(',') : 'A')
              : (newQuestionType === 'TRUE_FALSE' ? (trueFalseAnswer ? 'TRUE' : 'FALSE') : '')),
        correctOptions: newQuestionType === 'COMPLEX_MCQ' ? correctOptions : undefined,
        trueFalseAnswer: newQuestionType === 'TRUE_FALSE' ? trueFalseAnswer : undefined,
        matchingPairs: newQuestionType === 'MATCHING' ? validPairs : undefined,
        points: targetPoints,
        essayRubric: newQuestionType === 'ESSAY' ? essayRubric.trim() || undefined : undefined,
      };

      let updated;
      if (editingQuestionId) {
        updated = examQuestions.map((q) => (q.id === editingQuestionId ? { ...q, ...newQ } : q));
        setSaveSuccessMsg(`Soal #${newQ.questionNumber} berhasil diperbarui!`);
      } else {
        updated = [...examQuestions, newQ];
        const labels = {
          MCQ: 'Pilihan Ganda',
          COMPLEX_MCQ: 'PG Kompleks',
          TRUE_FALSE: 'Benar/Salah',
          MATCHING: 'Menjodohkan',
          ESSAY: 'Esai',
        };
        setSaveSuccessMsg(
          `Soal #${newQ.questionNumber} (${labels[newQuestionType] || 'Soal'}) tersimpan!`
        );
      }

      setExamQuestions(updated);

      if (activeQuestionEditorExam?.id) {
        await elearningApi.saveExamQuestions(activeQuestionEditorExam.id, updated);
      }

      setTimeout(() => setSaveSuccessMsg(''), 4000);
      resetQuestionForm(true, targetPoints);
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

  const handleApplyPointsToAll = () => {
    const points = Number(bulkPoints);
    if (!Number.isFinite(points) || points < 1) {
      alert('Poin harus berupa angka minimal 1.');
      return;
    }
    setExamQuestions((current) => current.map((question) => ({ ...question, points })));
    setSaveSuccessMsg(`Poin ${points} diterapkan ke ${examQuestions.length} soal. Klik Simpan ke Server.`);
  };

  const handleDeleteAllQuestions = () => {
    if (examQuestions.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Semua Soal?',
      message: `Semua ${examQuestions.length} soal pada ujian ini akan dihapus dan tidak dapat dibatalkan.`,
      confirmText: 'Hapus Semua',
      cancelText: 'Batal',
      isDanger: true,
      onConfirm: async () => {
        setIsSavingQuestion(true);
        try {
          await elearningApi.saveExamQuestions(activeQuestionEditorExam.id, []);
          setExamQuestions([]);
          resetQuestionForm();
          setIsQuickEditMode(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setSaveSuccessMsg('Semua soal berhasil dihapus.');
        } catch (error) {
          alert('Gagal menghapus semua soal: ' + error.message);
        } finally {
          setIsSavingQuestion(false);
        }
      },
    });
  };

  const handleImportQuestions = async () => {
    const imported = parseQuestionImport(importText);
    if (imported.length === 0) {
      alert('Tidak ada soal yang terbaca. Gunakan format nomor soal lalu opsi A), B), C), D).');
      return;
    }
    setIsImporting(true);
    try {
      const updated = [...examQuestions, ...imported].map((question, index) => ({
        ...question,
        questionNumber: index + 1,
      }));
      setExamQuestions(updated);
      await elearningApi.saveExamQuestions(activeQuestionEditorExam.id, updated);
      setImportText('');
      setIsImportOpen(false);
      setSaveSuccessMsg(`${imported.length} soal pilihan ganda berhasil diimpor.`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (error) {
      alert(`Gagal mengimpor soal: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportDocx = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Pilih file Word .docx. Format .doc lama belum didukung.');
      return;
    }

    setDocxFileName(file.name);
    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: mammoth.images.imgElement((image) =>
            image.read('base64').then((base64) => ({
              src: `data:${image.contentType};base64,${base64}`,
            }))
          ),
        }
      );
      const body = new DOMParser().parseFromString(result.value, 'text/html').body;
      const lines = [];
      body.querySelectorAll('p, li, tr').forEach((element) => {
        element.querySelectorAll('img').forEach((image) => {
          lines.push(`GAMBAR: ${image.getAttribute('src') || ''}`);
        });
        const text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) lines.push(text);
      });

      const imported = parseQuestionImport(lines.join('\n'));
      if (imported.length === 0) {
        throw new Error('Struktur soal tidak dikenali. Gunakan nomor soal atau label SOAL, lalu opsi A-E.');
      }
      const updated = [...examQuestions, ...imported].map((question, index) => ({
        ...question,
        questionNumber: index + 1,
      }));
      setExamQuestions(updated);
      await elearningApi.saveExamQuestions(activeQuestionEditorExam.id, updated);
      setSaveSuccessMsg(`${imported.length} soal dari ${file.name} berhasil diimpor.`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (error) {
      alert(`Gagal membaca file Word: ${error.message}`);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  if (activeQuestionEditorExam) {
    const mcqCount = examQuestions.filter((q) => q.type !== 'ESSAY').length;
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
              <AppIcon name="arrow-left" color="grey" size={14} />
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
                <span className="inline-flex items-center gap-1 text-neutral-500">
                  <AppIcon name="timer" color="grey" size={13} />
                  {activeQuestionEditorExam.durationMinutes || activeQuestionEditorExam.duration_minutes || 60} Menit
                </span>
                <span>•</span>
                <span className="text-neutral-700 font-semibold">{examQuestions.length} Butir Soal ({mcqCount} Objektif, {essayCount} Esai)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            {examQuestions.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAllQuestions}
                loading={isSavingQuestion}
                className="cursor-pointer font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                <AppIcon name="sync" color="white" size={14} />
                <span>Simpan ke Server ({examQuestions.length} Soal)</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              className="cursor-pointer font-bold flex items-center gap-1.5"
            >
              <AppIcon name="upload" color="blue" size={14} />
              <span>Impor Soal Word/Teks</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseQuestionEditor}
              className="cursor-pointer font-bold flex items-center gap-1.5"
            >
              <AppIcon name="tick" color="grey" size={14} />
              <span>Selesai & Kembali</span>
            </Button>
          </div>
        </div>

        {/* Studio: form dan daftar soal menggunakan lebar penuh agar mudah diedit */}
        <div className="space-y-6">
          {/* LEFT COLUMN: Input Form */}
          <div className="space-y-5">
            <Card className="border border-neutral-200 bg-white shadow-xs p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    editingQuestionId ? 'bg-amber-600 text-white' : 'bg-primary-600 text-white'
                  }`}>
                    {editingQuestionId ? <AppIcon name="edit" color="white" size={14} /> : `#${examQuestions.length + 1}`}
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
                  <span className="text-xs font-bold text-success-700 bg-success-50 border border-success-200 px-2.5 py-1 rounded-lg animate-in fade-in flex items-center gap-1">
                    <AppIcon name="circle-tick" color="green" size={14} />
                    {saveSuccessMsg}
                  </span>
                )}
              </div>

              <form onSubmit={handleAddQuestion} className="space-y-4">
                {/* 1. Tipe Soal (Segmented Toggle 5 Variasi Soal) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800">Pilih Variasi Tipe Soal:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {[
                      { key: 'MCQ', iconName: 'radio-button-active', badge: 'PG', title: 'Pilihan Ganda', desc: '1 Kunci Benar' },
                      { key: 'COMPLEX_MCQ', iconName: 'checkbox', badge: 'PGK', title: 'PG Kompleks', desc: 'Banyak Kunci Benar' },
                      { key: 'TRUE_FALSE', iconName: 'survey', badge: 'B/S', title: 'Benar / Salah', desc: 'Pernyataan Logis' },
                      { key: 'MATCHING', iconName: 'link', badge: 'Jodoh', title: 'Pencocokan', desc: 'Menjodohkan' },
                      { key: 'ESSAY', iconName: 'edit', badge: 'Esai', title: 'Soal Uraian', desc: 'Jawaban Bebas' },
                    ].map((t) => {
                      const isSel = newQuestionType === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setNewQuestionType(t.key)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSel
                              ? 'border-primary-500 bg-primary-50/80 ring-2 ring-primary-500/20 text-primary-950 font-medium shadow-xs'
                              : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <AppIcon name={t.iconName} color={isSel ? 'blue' : 'grey'} size={18} />
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isSel ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600'
                            }`}>
                              {t.badge}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-xs text-neutral-900 leading-tight">{t.title}</p>
                            <p className="text-[10px] text-neutral-500 mt-0.5">{t.desc}</p>
                          </div>
                        </button>
                      );
                    })}
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
                      <AppIcon name="file" color={isStimulusOpen || stimulusText ? 'yellow' : 'grey'} size={14} />
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
                      <AppIcon name="camera" color={isImageOpen || imageUrl ? 'blue' : 'grey'} size={14} />
                      <span>{isImageOpen || imageUrl ? 'Gambar Soal (Aktif)' : '+ Tambah Gambar / Diagram'}</span>
                    </button>
                  </div>
                </div>

                {/* Optional Box 1: Wacana / Teks Kasus / Stimulus */}
                {(isStimulusOpen || stimulusText) && (
                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/90 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <AppIcon name="file" color="yellow" size={14} />
                        <span>Wacana / Stimulus Kasus / Cuplikan Kode / Bacaan</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setStimulusText('');
                          setIsStimulusOpen(false);
                        }}
                        className="text-[11px] text-danger-600 hover:text-danger-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <AppIcon name="close-cancel" color="red" size={12} />
                        <span>Hapus Wacana</span>
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
                        <AppIcon name="camera" color="blue" size={14} />
                        <span>Gambar / Diagram / Flowchart Pendukung Soal</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl('');
                          setIsImageOpen(false);
                        }}
                        className="text-[11px] text-danger-600 hover:text-danger-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <AppIcon name="close-cancel" color="red" size={12} />
                        <span>Hapus Gambar</span>
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
                        : newQuestionType === 'TRUE_FALSE'
                        ? 'Tuliskan pernyataan yang akan dinilai oleh siswa apakah BENAR atau SALAH... Contoh: Sudut siku-siku memiliki besar 90 derajat.'
                        : newQuestionType === 'MATCHING'
                        ? 'Tuliskan instruksi penjodohan... Contoh: Pasangkan istilah perangkat keras komputer di sebelah kiri dengan fungsinya di sebelah kanan!'
                        : newQuestionType === 'COMPLEX_MCQ'
                        ? 'Tuliskan pertanyaan pilihan ganda kompleks di sini... (Siswa dapat mencentang lebih dari 1 pilihan yang benar).'
                        : 'Tuliskan pertanyaan pilihan ganda di sini...'
                    }
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-neutral-300 bg-white font-sans leading-relaxed focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    required
                  />
                  <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <span className="mr-1 text-[10px] font-bold text-slate-500">Simbol matematika:</span>
                    {MATH_SYMBOLS.map((symbol) => (
                      <button
                        key={symbol}
                        type="button"
                        onClick={() => setNewQuestionText((current) => `${current}${symbol}`)}
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-primary-300 hover:bg-primary-50"
                        title={`Tambahkan ${symbol}`}
                      >
                        {symbol}
                      </button>
                    ))}
                    <span className="ml-1 text-[10px] text-slate-400">Simbol lain dapat langsung ditempel dari Word/LaTeX.</span>
                  </div>
                </div>

                {/* 4A. Form Khusus Pilihan Ganda Tunggal: Opsi A, B, C, D & 1 Kunci */}
                {newQuestionType === 'MCQ' && (
                  <div className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-xs font-bold text-neutral-800">
                        Opsi Pilihan Jawaban & Tentukan Kunci Jawaban Benar:
                      </label>
                      <span className="text-[11px] text-neutral-500 font-medium">
                        Klik tombol huruf untuk memilih 1 kunci benar
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { key: 'A', value: optA, setter: setOptA, image: optAImage, imageSetter: setOptAImage, imageUpload: handleOptionImageUpload(setOptAImage) },
                        { key: 'B', value: optB, setter: setOptB, image: optBImage, imageSetter: setOptBImage, imageUpload: handleOptionImageUpload(setOptBImage) },
                        { key: 'C', value: optC, setter: setOptC, image: optCImage, imageSetter: setOptCImage, imageUpload: handleOptionImageUpload(setOptCImage) },
                        { key: 'D', value: optD, setter: setOptD, image: optDImage, imageSetter: setOptDImage, imageUpload: handleOptionImageUpload(setOptDImage) },
                        { key: 'E', value: optE, setter: setOptE, image: optEImage, imageSetter: setOptEImage, imageUpload: handleOptionImageUpload(setOptEImage), optional: true },
                      ].map((opt) => {
                        const isCorrect = correctOption === opt.key;
                        return (
                          <div
                            key={opt.key}
                            className={`flex flex-wrap items-center gap-2 p-2 rounded-xl border transition-all ${
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
                              placeholder={`Teks Jawaban Opsi ${opt.key}${opt.optional ? ' (Opsional)...' : '...'}`}
                              value={opt.value}
                              onChange={(e) => opt.setter(e.target.value)}
                              className="min-w-[180px] flex-1 text-xs bg-transparent border-0 focus:outline-hidden p-1 font-medium text-neutral-800"
                              required={!opt.optional && !opt.image}
                            />
                            <div className="flex w-full items-center gap-2 pl-11">
                              <input
                                type="url"
                                value={opt.image || ''}
                                onChange={(e) => opt.imageSetter(e.target.value)}
                                placeholder={`URL gambar opsi ${opt.key} (opsional)`}
                                className="min-w-0 flex-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-[10px] text-sky-900 outline-none focus:border-sky-500"
                              />
                              <label className="cursor-pointer rounded-md border border-sky-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-sky-700 hover:bg-sky-50">
                                Unggah
                                <input type="file" accept="image/*" className="hidden" onChange={opt.imageUpload} />
                              </label>
                            </div>
                            {opt.image && (
                              <img src={opt.image} alt={`Gambar opsi ${opt.key}`} className="ml-11 max-h-16 max-w-24 rounded border border-sky-200 object-contain" />
                            )}

                            {isCorrect && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success-600 text-white shrink-0 mr-1 inline-flex items-center gap-1">
                                <AppIcon name="tick" color="white" size={10} />
                                <span>KUNCI BENAR</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bobot Skor */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary-50/70 border border-primary-200">
                      <div>
                        <label className="text-xs font-bold text-neutral-800">
                          Bobot Skor / Nilai Butir Soal Ini:
                        </label>
                        <p className="text-[11px] text-neutral-500">
                          Poin otomatis yang didapat siswa jika menjawab benar
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={mcqPoints}
                          onChange={(e) => setMcqPoints(e.target.value)}
                          className="w-20 text-xs font-bold p-2 text-center rounded-lg border border-primary-300 bg-white"
                        />
                        <span className="text-xs font-semibold text-neutral-600">Poin</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4B. Form Khusus Pilihan Ganda Kompleks (Multi-Select Checkbox) */}
                {newQuestionType === 'COMPLEX_MCQ' && (
                  <div className="p-4 rounded-xl bg-primary-50/40 border border-primary-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                        <AppIcon name="checkbox" color="blue" size={14} />
                        <span>Opsi Jawaban & Centang Semua Kunci yang Benar (Bisa Lebih Dari 1):</span>
                      </label>
                      <span className="text-[11px] text-primary-700 font-semibold">
                        {correctOptions.length} Opsi Terpilih Sebagai Kunci
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { key: 'A', value: optA, setter: setOptA, image: optAImage, imageSetter: setOptAImage, imageUpload: handleOptionImageUpload(setOptAImage) },
                        { key: 'B', value: optB, setter: setOptB, image: optBImage, imageSetter: setOptBImage, imageUpload: handleOptionImageUpload(setOptBImage) },
                        { key: 'C', value: optC, setter: setOptC, image: optCImage, imageSetter: setOptCImage, imageUpload: handleOptionImageUpload(setOptCImage) },
                        { key: 'D', value: optD, setter: setOptD, image: optDImage, imageSetter: setOptDImage, imageUpload: handleOptionImageUpload(setOptDImage) },
                        { key: 'E', value: optE, setter: setOptE, image: optEImage, imageSetter: setOptEImage, imageUpload: handleOptionImageUpload(setOptEImage), optional: true },
                      ].map((opt) => {
                        const isChecked = correctOptions.includes(opt.key);
                        return (
                          <div
                            key={opt.key}
                            className={`flex flex-wrap items-center gap-2 p-2 rounded-xl border transition-all ${
                              isChecked
                                ? 'bg-primary-50 border-primary-400 ring-1 ring-primary-400'
                                : 'bg-white border-neutral-300'
                            }`}
                          >
                            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setCorrectOptions((prev) =>
                                    prev.includes(opt.key)
                                      ? (prev.length > 1 ? prev.filter((k) => k !== opt.key) : prev)
                                      : [...prev, opt.key]
                                  );
                                }}
                                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                              />
                              <span className="font-bold text-xs text-neutral-800">{opt.key}</span>
                            </label>

                            <input
                              type="text"
                              placeholder={`Teks Pernyataan / Opsi ${opt.key}${opt.optional ? ' (Opsional)...' : '...'}`}
                              value={opt.value}
                              onChange={(e) => opt.setter(e.target.value)}
                              className="min-w-[180px] flex-1 text-xs bg-transparent border-0 focus:outline-hidden p-1 font-medium text-neutral-800"
                              required={!opt.optional && !opt.image}
                            />
                            <div className="flex w-full items-center gap-2 pl-11">
                              <input
                                type="url"
                                value={opt.image || ''}
                                onChange={(e) => opt.imageSetter(e.target.value)}
                                placeholder={`URL gambar opsi ${opt.key} (opsional)`}
                                className="min-w-0 flex-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-[10px] text-sky-900 outline-none focus:border-sky-500"
                              />
                              <label className="cursor-pointer rounded-md border border-sky-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-sky-700 hover:bg-sky-50">
                                Unggah
                                <input type="file" accept="image/*" className="hidden" onChange={opt.imageUpload} />
                              </label>
                            </div>
                            {opt.image && (
                              <img src={opt.image} alt={`Gambar opsi ${opt.key}`} className="ml-11 max-h-16 max-w-24 rounded border border-sky-200 object-contain" />
                            )}

                            {isChecked && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-600 text-white shrink-0 mr-1 inline-flex items-center gap-1">
                                <AppIcon name="tick" color="white" size={10} />
                                <span>KUNCI BENAR</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bobot Skor */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-primary-200">
                      <div>
                        <label className="text-xs font-bold text-neutral-800">
                          Bobot Skor Butir Soal PG Kompleks:
                        </label>
                        <p className="text-[11px] text-neutral-500">
                          Siswa memperoleh poin jika mencentang seluruh kombinasi opsi yang benar
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={mcqPoints}
                          onChange={(e) => setMcqPoints(e.target.value)}
                          className="w-20 text-xs font-bold p-2 text-center rounded-lg border border-primary-300 bg-white"
                        />
                        <span className="text-xs font-semibold text-neutral-600">Poin</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4C. Form Khusus Benar / Salah (True / False) */}
                {newQuestionType === 'TRUE_FALSE' && (
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <AppIcon name="survey" color="green" size={14} />
                        <span>Tentukan Kunci Kebenaran dari Pernyataan Soal:</span>
                      </label>
                      <span className="text-[11px] text-emerald-800 font-semibold">
                        Kunci: {trueFalseAnswer ? 'BENAR (TRUE)' : 'SALAH (FALSE)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setTrueFalseAnswer(true)}
                        className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          trueFalseAnswer
                            ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/30'
                            : 'bg-white border-neutral-300 hover:border-emerald-300 text-neutral-700'
                        }`}
                      >
                        <AppIcon name="tick" color={trueFalseAnswer ? 'white' : 'green'} size={16} />
                        <div className="text-left">
                          <p className="font-bold text-xs sm:text-sm leading-tight">BENAR (TRUE)</p>
                          <p className={`text-[10px] ${trueFalseAnswer ? 'text-emerald-100' : 'text-neutral-500'}`}>Pernyataan di atas bernilai benar</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTrueFalseAnswer(false)}
                        className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          !trueFalseAnswer
                            ? 'bg-rose-600 border-rose-700 text-white shadow-sm ring-2 ring-rose-500/30'
                            : 'bg-white border-neutral-300 hover:border-rose-300 text-neutral-700'
                        }`}
                      >
                        <AppIcon name="close-cancel" color={!trueFalseAnswer ? 'white' : 'red'} size={16} />
                        <div className="text-left">
                          <p className="font-bold text-xs sm:text-sm leading-tight">SALAH (FALSE)</p>
                          <p className={`text-[10px] ${!trueFalseAnswer ? 'text-rose-100' : 'text-neutral-500'}`}>Pernyataan di atas bernilai salah</p>
                        </div>
                      </button>
                    </div>

                    {/* Bobot Skor */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-200">
                      <div>
                        <label className="text-xs font-bold text-neutral-800">
                          Bobot Skor Butir Soal Benar/Salah:
                        </label>
                        <p className="text-[11px] text-neutral-500">
                          Poin otomatis yang didapat jika siswa memilih nilai kebenaran yang tepat
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={mcqPoints}
                          onChange={(e) => setMcqPoints(e.target.value)}
                          className="w-20 text-xs font-bold p-2 text-center rounded-lg border border-emerald-300 bg-white"
                        />
                        <span className="text-xs font-semibold text-neutral-600">Poin</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4D. Form Khusus Menjodohkan / Pencocokan (Matching Pairs) */}
                {newQuestionType === 'MATCHING' && (
                  <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-200 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-xs font-bold text-violet-950 flex items-center gap-1.5">
                        <AppIcon name="link" color="blue" size={14} />
                        <span>Daftar Pasangan Menjodohkan (Premis Kiri ↔ Pasangan Kanan):</span>
                      </label>
                      <span className="text-[11px] text-violet-800 font-medium">
                        Minimal 2 pasangan pencocokan
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {matchingPairs.map((pair, idx) => (
                        <div
                          key={pair.id || idx}
                          className="p-2.5 rounded-xl bg-white border border-violet-200 flex flex-col sm:flex-row sm:items-center gap-2"
                        >
                          <span className="w-6 h-6 rounded-md bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>

                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder={`Premis / Soal Kiri ${idx + 1}...`}
                              value={pair.left}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMatchingPairs((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, left: val } : p))
                                );
                              }}
                              className="w-full text-xs p-2 rounded-lg border border-neutral-300 focus:outline-hidden focus:border-violet-500 font-medium"
                              required
                            />
                          </div>

                          <span className="text-violet-500 font-black text-sm text-center shrink-0 hidden sm:inline">↔</span>

                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder={`Jawaban Cocok Kanan ${idx + 1}...`}
                              value={pair.right}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMatchingPairs((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, right: val } : p))
                                );
                              }}
                              className="w-full text-xs p-2 rounded-lg border border-neutral-300 focus:outline-hidden focus:border-violet-500 font-medium"
                              required
                            />
                          </div>

                          {matchingPairs.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setMatchingPairs((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-danger-600 hover:text-danger-800 p-1.5 rounded hover:bg-danger-50 font-bold text-xs shrink-0 cursor-pointer flex items-center justify-center"
                              title="Hapus Pasangan Ini"
                            >
                              <AppIcon name="close-cancel" color="red" size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMatchingPairs((prev) => [
                          ...prev,
                          { id: Date.now(), left: '', right: '' },
                        ]);
                      }}
                      className="text-xs font-bold text-violet-700 hover:text-violet-900 bg-white hover:bg-violet-100 border border-violet-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <AppIcon name="circle-add" color="blue" size={14} />
                      <span>Tambah Pasangan Menjodohkan</span>
                    </button>

                    {/* Bobot Skor */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-violet-200">
                      <div>
                        <label className="text-xs font-bold text-neutral-800">
                          Total Bobot Skor Soal Menjodohkan:
                        </label>
                        <p className="text-[11px] text-neutral-500">
                          Poin dihitung secara proporsional berdasarkan jumlah pasangan yang dicocokkan dengan tepat
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={mcqPoints}
                          onChange={(e) => setMcqPoints(e.target.value)}
                          className="w-20 text-xs font-bold p-2 text-center rounded-lg border border-violet-300 bg-white"
                        />
                        <span className="text-xs font-semibold text-neutral-600">Poin</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4E. Form Khusus Esai / Uraian */}
                {newQuestionType === 'ESSAY' && (
                  <div className="p-4 rounded-xl bg-primary-50/60 border border-primary-200 space-y-3.5">
                    <div className="flex items-center gap-2 text-primary-900 font-bold text-xs">
                      <AppIcon name="caution" color="blue" size={14} />
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
                          className="w-24 text-xs font-bold p-2.5 rounded-lg border border-primary-300 bg-white"
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
                        className="w-full text-xs p-3 rounded-lg border border-primary-300 bg-white font-sans leading-relaxed focus:outline-hidden"
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
                    className="font-bold min-h-[42px] cursor-pointer flex items-center gap-1.5"
                    loading={isSavingQuestion}
                  >
                    {editingQuestionId ? (
                      <>
                        <AppIcon name="tick" color="white" size={14} />
                        <span>Simpan Perubahan Soal</span>
                      </>
                    ) : (
                      <>
                        <AppIcon name="circle-add" color="white" size={14} />
                        <span>Simpan Butir Soal #{examQuestions.length + 1}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* RIGHT COLUMN: Daftar Soal Tersimpan */}
          <div className="space-y-4">
            <Card className="border border-neutral-200 bg-white shadow-xs p-4 sm:p-5 space-y-4">
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

              {examQuestions.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-[10px] font-bold text-neutral-500">
                      Atur poin semua soal
                      <input
                        type="number"
                        min="1"
                        value={bulkPoints}
                        onChange={(event) => setBulkPoints(event.target.value)}
                        className="mt-1 block w-24 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs font-bold outline-none focus:border-primary-500"
                      />
                    </label>
                    <Button type="button" variant="outline" size="sm" onClick={handleApplyPointsToAll} className="cursor-pointer font-bold">
                      Terapkan Poin
                    </Button>
                    <button
                      type="button"
                      onClick={() => setIsQuickEditMode((current) => !current)}
                      className={`rounded-lg border px-3 py-2 text-[10px] font-bold transition ${
                        isQuickEditMode
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                      }`}
                    >
                      {isQuickEditMode ? 'Tutup Edit Cepat' : 'Edit Cepat Semua'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAllQuestions}
                    className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-[10px] font-bold text-danger-700 transition hover:bg-danger-100"
                  >
                    Hapus Semua Soal
                  </button>
                </div>
              )}

              {/* Scrollable Questions List */}
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {examQuestions.length === 0 ? (
                  <div className="p-6 rounded-xl bg-neutral-50 border border-dashed border-neutral-300 text-center space-y-2">
                    <div className="flex justify-center">
                      <AppIcon name="document-book" color="grey" size={32} />
                    </div>
                    <p className="text-xs font-bold text-neutral-600">Belum Ada Butir Soal</p>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Silakan isi formulir di sebelah kiri untuk menyusun butir soal ujian ini.
                    </p>
                  </div>
                ) : isQuickEditMode ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-900">
                      Ubah soal, opsi, kunci, dan poin langsung di tabel ini. Klik <strong>Simpan Semua Perubahan</strong> setelah selesai.
                    </div>
                    {examQuestions.map((q, idx) => {
                      const optionMap = (q.options || []).reduce((result, option) => {
                        result[option.key] = option;
                        return result;
                      }, {});
                      const isChoiceQuestion = q.type === 'MCQ' || q.type === 'COMPLEX_MCQ';
                      return (
                        <div key={q.id || idx} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-2xs">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-white">#{idx + 1}</span>
                            <span className="text-[10px] font-semibold text-neutral-500">
                              {q.type === 'MCQ' ? 'Pilihan Ganda' : q.type === 'COMPLEX_MCQ' ? 'PG Kompleks' : q.type}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="ml-auto rounded p-1 text-danger-600 hover:bg-danger-50"
                              title="Hapus soal"
                            >
                              <AppIcon name="close-cancel" color="red" size={13} />
                            </button>
                          </div>
                          <textarea
                            value={q.questionText || ''}
                            onChange={(event) => updateQuestionInline(q.id, { questionText: event.target.value })}
                            rows={2}
                            className="mb-2 w-full rounded-lg border border-neutral-300 p-2 text-xs text-neutral-800 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200"
                            placeholder="Teks pertanyaan"
                          />
                          {isChoiceQuestion && (
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {['A', 'B', 'C', 'D', 'E'].map((key) => (
                                <div key={key} className="flex flex-wrap items-center gap-1.5">
                                  <span className="w-5 shrink-0 text-center text-[10px] font-bold text-neutral-500">{key}</span>
                                  <input
                                    value={optionMap[key]?.text || ''}
                                    onChange={(event) => updateQuestionOptionInline(q.id, key, event.target.value)}
                                    className="min-w-0 flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-[11px] outline-none focus:border-primary-500"
                                    placeholder={`Opsi ${key}`}
                                  />
                                  <input
                                    type="url"
                                    value={optionMap[key]?.imageUrl || ''}
                                    onChange={(event) => updateQuestionOptionImageInline(q.id, key, event.target.value)}
                                    className="w-full rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-[10px] outline-none focus:border-sky-500"
                                    placeholder={`URL gambar opsi ${key} (opsional)`}
                                  />
                                  {optionMap[key]?.imageUrl && (
                                    <img src={optionMap[key].imageUrl} alt={`Gambar opsi ${key}`} className="ml-6 max-h-12 max-w-20 rounded border border-sky-200 object-contain" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <label className="text-[10px] font-bold text-neutral-500">
                              Kunci
                              <input
                                value={Array.isArray(q.correctOptions) ? q.correctOptions.join(', ') : q.correctOption || ''}
                                onChange={(event) => {
                                  const value = event.target.value.toUpperCase().replace(/[^A-E, ]/g, '');
                                  updateQuestionInline(q.id, {
                                    correctOption: q.type === 'COMPLEX_MCQ' ? value.replace(/\s/g, '') : value.trim().charAt(0),
                                    correctOptions: q.type === 'COMPLEX_MCQ'
                                      ? value.split(',').map((item) => item.trim()).filter(Boolean)
                                      : undefined,
                                  });
                                }}
                                className="mt-1 w-full rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-800 outline-none focus:border-emerald-500"
                                placeholder="A"
                              />
                            </label>
                            <label className="text-[10px] font-bold text-neutral-500">
                              Poin
                              <input
                                type="number"
                                min="1"
                                value={q.points || 10}
                                onChange={(event) => updateQuestionInline(q.id, { points: Number(event.target.value) || 1 })}
                                className="mt-1 w-full rounded-md border border-primary-200 bg-primary-50 px-2 py-1.5 text-xs font-bold text-primary-800 outline-none focus:border-primary-500"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleSaveAllQuestions}
                      loading={isSavingQuestion}
                      className="w-full cursor-pointer font-bold"
                    >
                      Simpan Semua Perubahan
                    </Button>
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
                            q.type === 'MCQ'
                              ? 'bg-primary-100 text-primary-800'
                              : q.type === 'COMPLEX_MCQ'
                              ? 'bg-blue-100 text-blue-800'
                              : q.type === 'TRUE_FALSE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : q.type === 'MATCHING'
                              ? 'bg-violet-100 text-violet-800'
                              : 'bg-secondary-100 text-secondary-800'
                          }`}>
                            {q.type === 'MCQ'
                              ? 'Pilihan Ganda'
                              : q.type === 'COMPLEX_MCQ'
                              ? 'PG Kompleks'
                              : q.type === 'TRUE_FALSE'
                              ? 'Benar / Salah'
                              : q.type === 'MATCHING'
                              ? 'Menjodohkan'
                              : 'Esai'}
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
                          {q.type === 'COMPLEX_MCQ' && (
                            <span className="font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200 text-[10px]">
                              Kunci: {Array.isArray(q.correctOptions) ? q.correctOptions.join(', ') : q.correctOption}
                            </span>
                          )}
                          {q.type === 'TRUE_FALSE' && (
                            <span className={`font-bold px-2 py-0.5 rounded border text-[10px] ${
                              q.trueFalseAnswer || q.correctOption === 'TRUE'
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                : 'text-rose-700 bg-rose-50 border-rose-200'
                            }`}>
                              Kunci: {q.trueFalseAnswer || q.correctOption === 'TRUE' ? 'BENAR' : 'SALAH'}
                            </span>
                          )}
                          {q.type === 'MATCHING' && (
                            <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200 text-[10px]">
                              {Array.isArray(q.matchingPairs) ? q.matchingPairs.length : 0} Pasang
                            </span>
                          )}
                          <span className="font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 text-[10px]">
                            {q.points || 10} Poin
                          </span>

                          <button
                            type="button"
                            onClick={() => handleEditQuestion(q)}
                            className="text-primary-600 hover:text-primary-800 font-bold p-1 hover:bg-primary-50 rounded transition-colors cursor-pointer text-xs"
                            title="Edit Soal Ini"
                          >
                            <AppIcon name="edit" color="blue" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-danger-600 hover:text-danger-700 font-bold p-1 hover:bg-danger-50 rounded transition-colors cursor-pointer text-xs"
                            title="Hapus Soal"
                          >
                            <AppIcon name="close-cancel" color="red" size={13} />
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

                      {/* Detail Preview Tiap Tipe Soal */}
                      {(q.type === 'MCQ' || q.type === 'COMPLEX_MCQ') && (
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-neutral-600 pt-1">
                          {q.options?.map((opt) => {
                            const isKey = q.type === 'MCQ'
                              ? opt.key === q.correctOption
                              : Array.isArray(q.correctOptions) && q.correctOptions.includes(opt.key);
                            return (
                              <span
                                key={opt.key}
                                className={`truncate px-1.5 py-0.5 rounded ${
                                  isKey
                                    ? 'font-bold text-success-700 bg-success-100/70 border border-success-200'
                                    : 'bg-white border border-neutral-200'
                                }`}
                              >
                                <strong>{opt.key}.</strong> {opt.text}
                                {opt.imageUrl && (
                                  <img src={opt.imageUrl} alt={`Gambar opsi ${opt.key}`} className="mt-1 max-h-12 max-w-full rounded object-contain" />
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'MATCHING' && Array.isArray(q.matchingPairs) && (
                        <div className="space-y-1 pt-1">
                          {q.matchingPairs.slice(0, 3).map((p, i) => (
                            <div key={i} className="text-[11px] flex items-center justify-between bg-white border border-violet-100 px-2 py-0.5 rounded">
                              <span className="font-semibold text-neutral-800 truncate max-w-[120px]">{p.left}</span>
                              <span className="text-violet-500 font-bold px-1">↔</span>
                              <span className="text-neutral-600 truncate max-w-[120px]">{p.right}</span>
                            </div>
                          ))}
                          {q.matchingPairs.length > 3 && (
                            <p className="text-[10px] text-neutral-400 italic text-right">+{q.matchingPairs.length - 3} pasangan lainnya...</p>
                          )}
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
                  className="w-full font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  onClick={handleCloseQuestionEditor}
                >
                  <AppIcon name="tick" color="grey" size={14} />
                  <span>Selesai & Simpan Semua</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {isImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
                <div>
                  <h2 className="font-bold text-neutral-900">Impor Soal Pilihan Ganda</h2>
                  <p className="text-[11px] text-neutral-500">
                    Tempel dari Word, Notepad, atau Excel dengan kolom soal, opsi, kunci, dan poin yang terpisah.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="text-neutral-500 hover:text-neutral-900 text-xl"
                >
                  ×
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-[11px] text-blue-900">
                  Format yang disarankan (setiap bagian memiliki label sendiri):
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-white/70 p-2 font-mono text-[10px] leading-relaxed">
{`SOAL: Ibu kota Indonesia adalah ...
A: Bandung
B: Jakarta
C: Surabaya
D: Medan
KUNCI: B
POIN: 5`}
                  </pre>
                  Format lama bernomor seperti <strong>1. Soal</strong>, <strong>A) Opsi</strong>,
                  <strong>Kunci: B</strong>, dan <strong>Poin: 5</strong> tetap didukung.
                </div>
                <label className="flex cursor-pointer flex-col gap-1 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/50 p-4 text-center hover:bg-primary-50">
                  <span className="text-xs font-bold text-primary-800">Pilih file Word (.docx)</span>
                  <span className="text-[10px] text-primary-600">
                    Sistem mencoba mendeteksi stimulus, soal, opsi, kunci, poin, dan gambar tertanam.
                  </span>
                  {docxFileName && <span className="text-[10px] font-semibold text-emerald-700">{docxFileName}</span>}
                  <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleImportDocx} className="hidden" />
                </label>
                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  rows={14}
                  placeholder={'SOAL: Ibu kota Indonesia adalah ...\nA: Bandung\nB: Jakarta\nC: Surabaya\nD: Medan\nKUNCI: B\nPOIN: 5'}
                  className="w-full rounded-xl border border-neutral-300 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsImportOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleImportQuestions}
                    loading={isImporting}
                  >
                    Impor & Simpan Soal
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          {...confirmModal}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  if (isCreateModalOpen || isEditModalOpen) {
    return (
      <div className="space-y-6 w-full max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
        {/* Top Navigation Header */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!isSubmitting) {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }
              }}
              className="p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-bold text-xs flex items-center gap-1.5 transition-all hover:-translate-x-0.5 cursor-pointer shrink-0"
              title="Kembali ke Daftar Ujian"
            >
              <AppIcon name="arrow-left" color="grey" size={14} />
              <span>Daftar Ujian</span>
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-neutral-900 tracking-tight">
                {editingExamId ? 'Edit Jadwal & Sesi e-Ujian' : 'Buat Jadwal & Sesi e-Ujian Baru'}
              </h1>
              <p className="text-xs text-neutral-500">
                Pengaturan jadwal pelaksanaan, token CBT, dan toleransi anti-cheat browser lockdown.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isSubmitting) {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
              }
            }}
            disabled={isSubmitting}
          >
            Batal
          </Button>
        </div>

        {/* Full Form Card (Tanpa Popup Modal) */}
        <Card className="border border-neutral-200 bg-white shadow-xs p-6 sm:p-8">
          <form onSubmit={handleSaveExam} className="space-y-5">
            {/* Pilihan Kategori Ujian: UAS/ASAS Koordinator vs Ujian Reguler */}
            <div className="space-y-2 pb-2 border-b border-neutral-100">
              <label className="text-xs font-bold text-neutral-800">Jenis / Kategori Ujian:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setExamCategory('SEMESTER_UAS');
                    if (!supervisorPin) setSupervisorPin(generateRandomPin(6));
                    if (!editingExamId && !token) {
                      setToken(`ASAS${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer flex items-start gap-3.5 ${
                    examCategory === 'SEMESTER_UAS'
                      ? 'border-[#4B3B78] bg-[#4B3B78]/5 ring-2 ring-[#4B3B78]/20 shadow-xs text-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600 shadow-2xs'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    examCategory === 'SEMESTER_UAS' ? 'bg-[#4B3B78] text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <AppIcon name="medal" color={examCategory === 'SEMESTER_UAS' ? 'white' : 'blue'} size={18} />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-xs sm:text-sm text-slate-900">Ujian UAS / ASAS Semester (Koordinator)</p>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        examCategory === 'SEMESTER_UAS' ? 'border-[#4B3B78] bg-[#4B3B78]' : 'border-slate-300 bg-white'
                      }`}>
                        {examCategory === 'SEMESTER_UAS' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      1 Guru PJ membuat soal untuk seluruh rombel paralel tingkat (7, 8, atau 9). Nilai otomatis siap disinkron ke e-Rapor UAS.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExamCategory('REGULAR')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer flex items-start gap-3.5 ${
                    examCategory === 'REGULAR'
                      ? 'border-[#4B3B78] bg-[#4B3B78]/5 ring-2 ring-[#4B3B78]/20 shadow-xs text-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600 shadow-2xs'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    examCategory === 'REGULAR' ? 'bg-[#4B3B78] text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <AppIcon name="course" color={examCategory === 'REGULAR' ? 'white' : 'blue'} size={18} />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-xs sm:text-sm text-slate-900">Ujian Reguler / Harian</p>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        examCategory === 'REGULAR' ? 'border-[#4B3B78] bg-[#4B3B78]' : 'border-slate-300 bg-white'
                      }`}>
                        {examCategory === 'REGULAR' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Ulangan harian atau kuis mandiri per rombel kelas yang diajar guru bersangkutan.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Nama / Judul Ujian</label>
              <Input
                type="text"
                placeholder={examCategory === 'SEMESTER_UAS' ? "Contoh: Asesmen Sumatif Akhir Semester (ASAS) Ganjil 2026/2027" : "Contoh: Penilaian Harian Bab 1 Algoritma & Pemrograman"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800">Mata Pelajaran (Diampu di SSO)</label>
                  <span className="text-[10px] text-primary-700 font-bold bg-primary-50 px-1.5 py-0.5 rounded">
                    Sesuai Penugasan SSO
                  </span>
                </div>
                {subjects.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-snug flex items-start gap-2">
                    <AppIcon name="caution" color="red" size={16} className="mt-0.5 shrink-0" />
                    <span>Akun Anda belum memiliki mata pelajaran pengampu yang diatur oleh Administrator di SSO / e-Rapor. Hubungi Administrator untuk mengatur penugasan mapel Anda.</span>
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

              {examCategory === 'SEMESTER_UAS' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800">Target Jenjang Tingkat (Paralel)</label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Koordinator Mapel
                    </span>
                  </div>
                  <select
                    value={targetGradeLevel}
                    onChange={(e) => setTargetGradeLevel(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white font-bold text-primary-700"
                  >
                    <option value="7">Tingkat 7 (Semua Kelas 7)</option>
                    <option value="8">Tingkat 8 (Semua Kelas 8)</option>
                    <option value="9">Tingkat 9 (Semua Kelas 9)</option>
                  </select>
                  <p className="text-[10px] text-neutral-500 leading-relaxed">
                    Rombel terdaftar di SSO: <strong>{getParallelClassesForLevel(targetGradeLevel).map((c) => c.name).join(', ') || 'Belum ada rombel di SSO'}</strong>
                  </p>
                </div>
              ) : (
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
              )}
            </div>

            {/* Jadwal Pelaksanaan */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <AppIcon name="schedule" color="blue" size={16} />
                  <span>Waktu Pelaksanaan Ujian:</span>
                </label>
                <span className="text-[11px] text-neutral-500 font-medium">Ujian dibuka otomatis pada jadwal ini</span>
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
                <label className="text-xs font-bold text-neutral-800">
                  {examCategory === 'SEMESTER_UAS' ? 'Token Masuk Serentak 1 Sekolah' : 'Token Ujian'}
                </label>
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

            {/* PIN Buka Kunci Pengawas Acak Dinamis Sistem */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <AppIcon name="lock" color="green" size={16} />
                  <span>PIN Buka Kunci Pengawas (Acak Dinamis Sistem):</span>
                </p>
                {examCategory === 'SEMESTER_UAS' && (
                  <button
                    type="button"
                    onClick={() => setSupervisorPin(generateRandomPin(6))}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 underline cursor-pointer"
                    title="Buat PIN acak baru"
                  >
                    <AppIcon name="sync" color="green" size={13} />
                    <span>Acak Ulang PIN</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value.toUpperCase())}
                  className="w-36 px-3 py-1.5 rounded-lg border border-emerald-300 bg-white font-mono font-black text-sm tracking-widest text-center text-emerald-900 uppercase"
                  required
                />
                <p className="text-[11px] text-emerald-800 leading-snug">
                  PIN ini seragam satu sekolah untuk seluruh ruang ujian pada sesi ini. Pengawas dapat membukanya langsung di HP siswa tanpa perlu kata sandi statis.
                </p>
              </div>
            </div>

            {/* Opsi Publikasi Skor & Lembar Jawaban ke Siswa */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <AppIcon name="survey" color="purple" size={16} />
                <span>Publikasi Nilai & Pembahasan ke Siswa:</span>
              </label>

              <div className="space-y-2.5">
                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={showScoreToStudent}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setShowScoreToStudent(checked);
                      if (!checked) setShowAnswersToStudent(false);
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-neutral-300 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-neutral-800">Tampilkan Skor / Nilai Akhir ke Siswa</p>
                    <p className="text-[11px] text-neutral-500">
                      Jika dicentang, siswa akan langsung melihat jumlah soal benar dan skor akhir setelah menekan tombol Selesai Ujian.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
                  showScoreToStudent
                    ? 'border-neutral-200 bg-white hover:bg-neutral-50/80 cursor-pointer'
                    : 'border-neutral-100 bg-neutral-100/60 opacity-60 cursor-not-allowed'
                }`}>
                  <input
                    type="checkbox"
                    disabled={!showScoreToStudent}
                    checked={showScoreToStudent && showAnswersToStudent}
                    onChange={(e) => setShowAnswersToStudent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-neutral-300 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-neutral-800">Buka Lembar Jawaban & Pembahasan</p>
                    <p className="text-[11px] text-neutral-500">
                      Jika dicentang, siswa dapat meninjau butir soal, jawaban yang telah dipilih, serta kunci jawaban yang benar setelah ujian selesai.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Petunjuk Pengerjaan (Opsional)</label>
              <textarea
                rows={3}
                placeholder="Instruksi tambahan bagi peserta sebelum memulai ujian..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-3 rounded-[8px] border border-neutral-300 leading-relaxed"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-neutral-200">
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
                className="w-full sm:w-auto min-h-[42px] font-bold shadow-xs flex items-center justify-center gap-2"
                loading={isSubmitting}
                disabled={isSubmitting || subjects.length === 0}
              >
                {editingExamId ? (
                  <span>Simpan Perubahan Jadwal</span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span>Simpan & Lanjut Buat Butir Soal</span>
                    <AppIcon name="arrow-right" color="white" size={14} />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  const uasCount = exams.filter((e) => e.examCategory === 'SEMESTER_UAS' || e.isCoordinatorExam || e.targetGradeLevel).length;
  const regularCount = exams.filter((e) => e.examCategory !== 'SEMESTER_UAS' && !e.isCoordinatorExam && !e.targetGradeLevel).length;

  const filteredExams = exams.filter((ex) => {
    const isUas = ex.examCategory === 'SEMESTER_UAS' || ex.isCoordinatorExam || Boolean(ex.targetGradeLevel);
    if (examFilterTab === 'SEMESTER_UAS') return isUas;
    if (examFilterTab === 'REGULAR') return !isUas;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Bank Soal & Jadwal e-Ujian (CBT)
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Kelola ujian reguler atau paket UAS / ASAS serentak tingkat sekolah terintegrasi SSO & e-Rapor.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto justify-center shadow-xs cursor-pointer flex items-center gap-1.5 font-bold whitespace-nowrap shrink-0"
        >
          <AppIcon name="circle-add" color="white" size={16} />
          <span>Buat Jadwal Ujian</span>
        </Button>
      </div>

      {/* Filter Tabs Segmented Control (Responsive Horizontal Scroll on Mobile) */}
      <div className="max-w-full overflow-x-auto pb-1">
        <div className="bg-slate-100 p-1.5 rounded-2xl inline-flex items-center gap-1.5 border border-slate-200/90 shadow-2xs min-w-max">
          <button
            type="button"
            onClick={() => setExamFilterTab('ALL')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              examFilterTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Semua Ujian</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              examFilterTab === 'ALL' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/80 text-slate-600'
            }`}>
              {exams.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setExamFilterTab('SEMESTER_UAS')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              examFilterTab === 'SEMESTER_UAS'
                ? 'bg-[#4B3B78] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#4B3B78] hover:bg-white/60'
            }`}
          >
            <AppIcon name="medal" color={examFilterTab === 'SEMESTER_UAS' ? 'white' : 'blue'} size={14} />
            <span>UAS / ASAS Semester</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              examFilterTab === 'SEMESTER_UAS' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
            }`}>
              {uasCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setExamFilterTab('REGULAR')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              examFilterTab === 'REGULAR'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <AppIcon name="course" color={examFilterTab === 'REGULAR' ? 'purple' : 'grey'} size={14} />
            <span>Ujian Reguler / Harian</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              examFilterTab === 'REGULAR' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/80 text-slate-600'
            }`}>
              {regularCount}
            </span>
          </button>
        </div>
      </div>

      {/* MOBILE & TABLET VIEW (< lg): Clean Responsive Cards without text collisions */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <Card className="p-8 text-center text-neutral-400 border border-neutral-200 bg-white rounded-2xl">
            <div className="flex flex-col items-center justify-center gap-2">
              <AppIcon name="sync" color="grey" size={24} className="animate-spin" />
              <p className="text-xs font-medium">Memuat daftar ujian...</p>
            </div>
          </Card>
        ) : filteredExams.length === 0 ? (
          <Card className="p-8 text-center text-neutral-400 border border-neutral-200 bg-white rounded-2xl">
            <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
              <AppIcon name="document-book" color="grey" size={32} />
              <p className="text-xs font-bold text-neutral-700">Belum Ada Jadwal Ujian CBT</p>
              <p className="text-[11px] text-neutral-400">
                Klik tombol &ldquo;Buat Jadwal Ujian&rdquo; di atas untuk membuat sesi ujian baru.
              </p>
            </div>
          </Card>
        ) : (
          filteredExams.map((ex) => {
            const currentStatus = getExamStatus(ex);
            const isUas = ex.examCategory === 'SEMESTER_UAS' || ex.isCoordinatorExam || Boolean(ex.targetGradeLevel);
            const examDateStr = ex.scheduledDate || (ex.startDateTime ? ex.startDateTime.split('T')[0] : '');

            return (
              <Card
                key={ex.id}
                noPadding
                className="p-4 sm:p-5 border border-neutral-200 bg-white shadow-xs rounded-2xl space-y-4"
              >
                {/* Top bar: Category Badge + Status Pill */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {isUas ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-200 whitespace-nowrap">
                      <AppIcon name="medal" color="blue" size={13} />
                      <span>ASAS TK. {ex.targetGradeLevel || '7'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 whitespace-nowrap">
                      <AppIcon name="course" color="grey" size={13} />
                      <span>Ujian Reguler</span>
                    </span>
                  )}

                  {currentStatus === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>Sedang Berlangsung</span>
                    </span>
                  ) : currentStatus === 'UPCOMING' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                      <span>Akan Datang</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                      <span>Selesai</span>
                    </span>
                  )}
                </div>

                {/* Title & Subject/Class */}
                <div className="space-y-1">
                  <h3 className="font-bold text-sm sm:text-base text-neutral-900 leading-snug break-words">
                    {ex.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600 font-medium">
                    <span className="text-primary-700 font-bold">{ex.subject}</span>
                    <span className="text-neutral-300">•</span>
                    <span>
                      {isUas ? `Semua Rombel Tk. ${ex.targetGradeLevel}` : `Kelas ${ex.className}`}
                    </span>
                  </div>
                  {ex.description && (
                    <p className="text-[11px] text-neutral-400 line-clamp-2 pt-0.5">
                      {ex.description}
                    </p>
                  )}
                </div>

                {/* 2-Column Info Box: Jadwal & Token/PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
                      <AppIcon name="schedule" color="grey" size={14} />
                      <span className="whitespace-nowrap">{formatDateDisplay(examDateStr)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-600 font-mono text-[11px]">
                      <AppIcon name="timer" color="grey" size={14} />
                      <span className="whitespace-nowrap">{ex.startTime || '08:00'} - {ex.endTime || '09:30'} WIB</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-sans font-bold text-[10px] whitespace-nowrap">
                        {ex.durationMinutes || 90} Mnt
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-col sm:items-end justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Token</span>
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-white text-slate-800 border border-slate-300 tracking-wider select-all">
                        {ex.token}
                      </span>
                    </div>
                    {ex.supervisorPin && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">PIN</span>
                        <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 tracking-wider select-all">
                          {ex.supervisorPin}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons Footer */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  {currentStatus !== 'ACTIVE' ? (
                    <button
                      type="button"
                      disabled={activatingExamId === ex.id}
                      onClick={() => handleStartExamNow(ex)}
                      className="flex-1 min-w-[110px] px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs border border-emerald-700/40 transition-all cursor-pointer whitespace-nowrap"
                    >
                      {activatingExamId === ex.id ? (
                        <>
                          <AppIcon name="sync" color="white" size={13} className="animate-spin" />
                          <span>Mengaktifkan...</span>
                        </>
                      ) : (
                        <>
                          <AppIcon name="play" color="white" size={13} />
                          <span>Aktifkan</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEndExamNow(ex)}
                      className="flex-1 min-w-[100px] px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs border border-rose-700/40 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <AppIcon name="close-cancel" color="white" size={13} />
                      <span>Tutup Sesi</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenQuestionEditor(ex)}
                    className="flex-1 min-w-[125px] px-3.5 py-2.5 rounded-xl bg-[#4B3B78] hover:bg-[#3D2E66] active:bg-[#30264F] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs border border-[#3D2E66]/50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <AppIcon name="edit" color="white" size={14} />
                    <span>Kelola Soal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/guru/monitoring')}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-400 text-slate-700 hover:text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <AppIcon name="survey" color="blue" size={15} />
                    <span>Hasil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(ex)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-400 text-slate-600 hover:text-amber-700 shadow-2xs transition-all cursor-pointer flex items-center justify-center shrink-0"
                    title="Edit Jadwal & Konfigurasi"
                  >
                    <AppIcon name="edit" color="grey" size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteExam(ex.id, ex.title)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-400 text-slate-600 hover:text-rose-700 shadow-2xs transition-all cursor-pointer flex items-center justify-center shrink-0"
                    title="Hapus Ujian"
                  >
                    <AppIcon name="delete" color="red" size={15} />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* DESKTOP VIEW (>= lg): Balanced 5-Column Exam Table with Zero Text Collisions */}
      <Card noPadding className="hidden lg:block overflow-hidden border border-neutral-200 bg-white shadow-xs rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/90 text-neutral-500 font-bold border-b border-neutral-200 uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Sesi Ujian & Sasaran</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Jadwal & Waktu</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Akses CBT</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AppIcon name="sync" color="grey" size={24} className="animate-spin" />
                      <p className="text-xs font-medium">Memuat daftar ujian...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <AppIcon name="document-book" color="grey" size={32} />
                      <p className="text-xs font-bold text-neutral-700">Belum Ada Jadwal Ujian CBT</p>
                      <p className="text-[11px] text-neutral-400">
                        Klik tombol &ldquo;Buat Jadwal Ujian&rdquo; di atas untuk membuat sesi ujian baru.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExams.map((ex) => {
                  const currentStatus = getExamStatus(ex);
                  const isUas = ex.examCategory === 'SEMESTER_UAS' || ex.isCoordinatorExam || Boolean(ex.targetGradeLevel);
                  const examDateStr = ex.scheduledDate || (ex.startDateTime ? ex.startDateTime.split('T')[0] : '');

                  return (
                    <tr key={ex.id} className="hover:bg-neutral-50/60 transition-colors">
                      {/* 1. Sesi Ujian & Sasaran */}
                      <td className="py-3.5 px-4 max-w-[300px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isUas ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-200 whitespace-nowrap">
                                <AppIcon name="medal" color="blue" size={11} />
                                <span>ASAS TK. {ex.targetGradeLevel || '7'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200 whitespace-nowrap">
                                <AppIcon name="course" color="grey" size={11} />
                                <span>Reguler</span>
                              </span>
                            )}
                            <span className="text-xs font-bold text-primary-700 whitespace-nowrap">{ex.subject}</span>
                            <span className="text-neutral-300">•</span>
                            <span className="text-[11px] text-neutral-600 font-medium whitespace-nowrap">
                              {isUas ? `Semua Rombel Tk. ${ex.targetGradeLevel}` : `Kelas ${ex.className}`}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-neutral-900 leading-snug truncate" title={ex.title}>
                            {ex.title}
                          </h3>

                          {ex.description && (
                            <p className="text-[11px] text-neutral-400 truncate max-w-[280px]" title={ex.description}>
                              {ex.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 2. Jadwal & Waktu */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
                            <AppIcon name="schedule" color="grey" size={14} />
                            <span>{formatDateDisplay(examDateStr)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-neutral-600 font-mono text-[11px]">
                            <AppIcon name="timer" color="grey" size={14} />
                            <span>{ex.startTime || '08:00'} - {ex.endTime || '09:30'} WIB</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-sans font-bold text-[10px] border border-slate-200/80">
                              {ex.durationMinutes || 90} Mnt
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Akses CBT */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider w-10">Token</span>
                            <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs tracking-wider select-all">
                              {ex.token}
                            </span>
                          </div>
                          {ex.supervisorPin && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider w-10">PIN</span>
                              <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs tracking-wider select-all">
                                {ex.supervisorPin}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Status Badge (Single Line, Non-Wrapping) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {currentStatus === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs select-none whitespace-nowrap">
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>Sedang Berlangsung</span>
                          </span>
                        ) : currentStatus === 'UPCOMING' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs select-none whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                            <span>Akan Datang</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/90 shadow-2xs select-none whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                            <span>Selesai</span>
                          </span>
                        )}
                      </td>

                      {/* 5. Aksi (Grup Tombol Berafordansi Jelas & Non-Wrapping) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {currentStatus !== 'ACTIVE' ? (
                            <button
                              type="button"
                              disabled={activatingExamId === ex.id}
                              onClick={() => handleStartExamNow(ex)}
                              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] border border-emerald-700/40 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
                              title="Aktifkan & buka sesi ujian sekarang untuk siswa"
                            >
                              {activatingExamId === ex.id ? (
                                <>
                                  <AppIcon name="sync" color="white" size={13} className="animate-spin" />
                                  <span>Mengaktifkan...</span>
                                </>
                              ) : (
                                <>
                                  <AppIcon name="play" color="white" size={13} />
                                  <span>Aktifkan</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEndExamNow(ex)}
                              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] border border-rose-700/40 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
                              title="Tutup & selesaikan sesi ujian sekarang"
                            >
                              <AppIcon name="close-cancel" color="white" size={13} />
                              <span>Tutup</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenQuestionEditor(ex)}
                            className="px-3 py-2 rounded-xl bg-[#4B3B78] hover:bg-[#3D2E66] active:bg-[#30264F] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] border border-[#3D2E66]/50 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
                            title="Kelola Butir Soal"
                          >
                            <AppIcon name="edit" color="white" size={14} />
                            <span>Kelola Soal</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => router.push('/guru/monitoring')}
                            className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-400 text-slate-700 hover:text-blue-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
                            title="Lihat hasil pengerjaan & lembar jawaban siswa"
                          >
                            <AppIcon name="survey" color="blue" size={14} />
                            <span>Hasil</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(ex)}
                            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-400 text-slate-600 hover:text-amber-700 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0"
                            title="Edit Jadwal & Konfigurasi"
                          >
                            <AppIcon name="edit" color="grey" size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteExam(ex.id, ex.title)}
                            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-400 text-slate-600 hover:text-rose-700 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0"
                            title="Hapus Ujian"
                          >
                            <AppIcon name="delete" color="red" size={14} />
                          </button>
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

      {/* Confirmation Modal */}
      <ConfirmModal
        {...confirmModal}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
