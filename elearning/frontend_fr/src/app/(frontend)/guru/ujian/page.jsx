'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function TeacherExamsManagementPage() {
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeQuestionEditorExam, setActiveQuestionEditorExam] = useState(null);

  // Form State: Create Exam
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Matematika');
  const [subjectCode, setSubjectCode] = useState('MAT');
  const [className, setClassName] = useState('7A');
  const [token, setToken] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxViolations, setMaxViolations] = useState(1);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Question Editor State
  const [examQuestions, setExamQuestions] = useState([]);
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
    setUser(tokenStorage.getUser());
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [exData, subjData, clsData] = await Promise.all([
        elearningApi.getExams(),
        elearningApi.getSubjects(),
        elearningApi.getClasses(),
      ]);
      setExams(exData || []);
      setSubjects(subjData || []);
      setClasses(clsData || []);
      if (subjData && subjData.length > 0) {
        setSubject(subjData[0].name);
        setSubjectCode(subjData[0].code);
      }
      if (clsData && clsData.length > 0) {
        setClassName(clsData[0].name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
    const defaultSubj = subjects[0] || { name: 'Matematika', code: 'MAT' };
    setTitle('');
    setSubject(defaultSubj.name);
    setSubjectCode(defaultSubj.code);
    setClassName('7A');
    setToken(Math.random().toString(36).substring(2, 8).toUpperCase());
    setDurationMinutes(60);
    setMaxViolations(1);
    setDescription('');
    setIsCreateModalOpen(true);
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!title.trim() || !token.trim()) {
      alert('Judul dan Token ujian wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    try {
      await elearningApi.createExam({
        title,
        subject,
        subjectCode,
        className,
        teacherName: user?.fullName || user?.full_name || 'Bapak/Ibu Guru',
        token: token.trim().toUpperCase(),
        durationMinutes: Number(durationMinutes) || 60,
        totalQuestions: 0,
        maxViolations: Number(maxViolations) || 3,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        description,
      });
      setIsCreateModalOpen(false);
      loadExams();
    } catch (err) {
      alert('Gagal membuat ujian: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetQuestionForm = () => {
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
    setExamQuestions(qs || []);
    resetQuestionForm();
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

      const updated = [...examQuestions, newQ];
      setExamQuestions(updated);

      if (activeQuestionEditorExam?.id) {
        await elearningApi.saveExamQuestions(activeQuestionEditorExam.id, updated);
      }

      setSaveSuccessMsg(
        `✓ Soal #${newQ.questionNumber} (${newQuestionType === 'MCQ' ? 'Pilihan Ganda' : 'Esai'}) tersimpan!`
      );
      setTimeout(() => setSaveSuccessMsg(''), 4000);

      // Reset form but retain question type
      setStimulusText('');
      setIsStimulusOpen(false);
      setImageUrl('');
      setIsImageOpen(false);
      setNewQuestionText('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setEssayRubric('');
    } catch (err) {
      alert('Gagal menambahkan soal: ' + err.message);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!confirm('Hapus butir soal ini?')) return;
    const filtered = examQuestions
      .filter((q) => q.id !== qId)
      .map((q, idx) => ({ ...q, questionNumber: idx + 1 }));

    setExamQuestions(filtered);
    if (activeQuestionEditorExam?.id) {
      await elearningApi.saveExamQuestions(activeQuestionEditorExam.id, filtered);
    }
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
              onClick={() => {
                setActiveQuestionEditorExam(null);
                loadExams();
              }}
              className="p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-bold text-xs flex items-center gap-1.5 transition-all hover:-translate-x-0.5 cursor-pointer shrink-0"
              title="Kembali ke Daftar Ujian"
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
                  {activeQuestionEditorExam.subject}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 font-medium">
                <span className="bg-neutral-100 px-2 py-0.5 rounded font-semibold text-neutral-700">
                  Kelas {activeQuestionEditorExam.className}
                </span>
                <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold text-amber-800">
                  Token: {activeQuestionEditorExam.token}
                </span>
                <span className="text-neutral-500">⏱️ {activeQuestionEditorExam.durationMinutes} Menit</span>
                <span>•</span>
                <span className="text-neutral-700 font-semibold">{examQuestions.length} Butir Soal ({mcqCount} PG, {essayCount} Esai)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveQuestionEditorExam(null);
                loadExams();
              }}
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
                  <span className="w-7 h-7 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold text-xs">
                    #{examQuestions.length + 1}
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-neutral-900">
                      Form Input Butir Soal Baru
                    </h2>
                    <p className="text-[11px] text-neutral-500">
                      Tentukan tipe soal (Pilihan Ganda atau Esai), lalu lengkapi pertanyaan di bawah.
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
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={resetQuestionForm}
                    className="cursor-pointer"
                  >
                    Reset Form
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="font-bold min-h-[42px] cursor-pointer"
                    loading={isSavingQuestion}
                  >
                    + Simpan Butir Soal #{examQuestions.length + 1}
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
                      className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 hover:bg-neutral-50 transition-colors space-y-2 text-xs"
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
                  onClick={() => {
                    setActiveQuestionEditorExam(null);
                    loadExams();
                  }}
                >
                  ✓ Selesai & Simpan Semua
                </Button>
              </div>
            </Card>
          </div>
        </div>
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
                <th className="py-3 px-4">Mapel</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4 font-mono">Token Ujian</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4">Anti-Cheat</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    Memuat daftar ujian...
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    Belum ada jadwal ujian CBT yang dibuat.
                  </td>
                </tr>
              ) : (
                exams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      <div className="space-y-0.5">
                        <p className="truncate max-w-[240px] font-bold">{ex.title}</p>
                        <p className="text-[11px] text-neutral-400 truncate max-w-[240px]">{ex.description || 'Ujian CBT Sekolah'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-primary-600">
                      <span className="font-mono text-[10px] mr-1 px-1.5 py-0.5 rounded bg-primary-50 text-primary-700">
                        {ex.subjectCode || 'MAPEL'}
                      </span>
                      {ex.subject}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-600">Kelas {ex.className}</td>
                    <td className="py-3 px-4 font-mono font-bold text-neutral-800 tracking-wider">
                      <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200">
                        {ex.token}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{ex.durationMinutes} Menit</td>
                    <td className="py-3 px-4 font-bold text-danger-600">
                      Maks. {ex.maxViolations || 3}x
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={ex.status || 'ACTIVE'} label={ex.status === 'ACTIVE' ? 'Aktif' : 'Akan Datang'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleOpenQuestionEditor(ex)}
                          className="cursor-pointer"
                        >
                          Kelola Soal
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Create Exam */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isSubmitting && setIsCreateModalOpen(false)}
        title="Buat Jadwal & Sesi e-Ujian Baru"
        subtitle="Ujian akan menggunakan browser lockdown anti-cheat secara otomatis."
        size="lg"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
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
              <label className="text-xs font-bold text-neutral-800">Mata Pelajaran</label>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  const matched = subjects.find((s) => s.name === e.target.value);
                  setSubjectCode(matched?.code || 'MAPEL');
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
                value={className}
                onChange={(e) => setClassName(e.target.value)}
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
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                className="font-mono uppercase font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Durasi (Menit)</label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                min="10"
                max="180"
                required
              />
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
              className="w-full text-xs p-2.5 rounded-[6px] border border-neutral-300"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full sm:w-auto min-h-[42px]"
              disabled={isSubmitting}
              onClick={() => setIsCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto min-h-[42px] font-bold"
              loading={isSubmitting}
            >
              Terbitkan Jadwal Ujian
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
