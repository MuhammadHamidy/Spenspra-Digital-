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
  const [newQuestionText, setNewQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOption, setCorrectOption] = useState('A');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

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

  const handleOpenQuestionEditor = async (exam) => {
    setActiveQuestionEditorExam(exam);
    const qs = await elearningApi.getExamQuestions(exam.id);
    setExamQuestions(qs || []);
    // Reset question form
    setNewQuestionText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectOption('A');
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) {
      alert('Teks soal tidak boleh kosong!');
      return;
    }

    setIsSavingQuestion(true);
    try {
      const newQ = {
        id: `q-${Date.now()}`,
        questionNumber: examQuestions.length + 1,
        type: newQuestionType,
        questionText: newQuestionText,
        options:
          newQuestionType === 'MCQ'
            ? [
                { key: 'A', text: optA || 'Opsi A' },
                { key: 'B', text: optB || 'Opsi B' },
                { key: 'C', text: optC || 'Opsi C' },
                { key: 'D', text: optD || 'Opsi D' },
              ]
            : [],
        correctOption: newQuestionType === 'MCQ' ? correctOption : '',
      };

      const updated = [...examQuestions, newQ];
      setExamQuestions(updated);

      if (activeQuestionEditorExam?.id) {
        await elearningApi.saveExamQuestions(activeQuestionEditorExam.id, updated);
      }

      setNewQuestionText('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
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
  };

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
        size="md"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Mata Pelajaran</label>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  const matched = subjects.find((s) => s.name === e.target.value);
                  setSubjectCode(matched?.code || 'MAPEL');
                }}
                className="w-full text-xs p-2.5 rounded-[6px] border border-neutral-300 bg-white"
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
                className="w-full text-xs p-2.5 rounded-[6px] border border-neutral-300 bg-white"
              >
                {classes.map((cls) => (
                  <option key={cls.id || cls.name} value={cls.name}>
                    Kelas {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
                className="w-full text-xs p-2.5 rounded-[6px] border border-neutral-300 bg-white font-medium"
              >
                <option value={1}>1x (Zero Tolerance - Standar Ketat)</option>
                <option value={2}>2x Pelanggaran</option>
                <option value={3}>3x Pelanggaran (Toleransi Standar)</option>
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

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={isSubmitting}
              onClick={() => setIsCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
            >
              Terbitkan Jadwal Ujian
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Question Editor */}
      <Modal
        isOpen={Boolean(activeQuestionEditorExam)}
        onClose={() => setActiveQuestionEditorExam(null)}
        title="Kelola Butir Soal Ujian"
        subtitle={activeQuestionEditorExam ? `${activeQuestionEditorExam.title} (${activeQuestionEditorExam.subject})` : ''}
        size="lg"
      >
        <div className="space-y-5">
          {/* Question List Preview */}
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
                Daftar Soal Tersimpan ({examQuestions.length} Butir)
              </h4>
              <span className="text-[11px] text-neutral-400">Tersimpan otomatis</span>
            </div>

            {examQuestions.length === 0 ? (
              <div className="p-4 rounded-[8px] bg-neutral-50 border border-neutral-200 text-center text-xs text-neutral-400">
                Belum ada butir soal pada ujian ini. Silakan tambahkan soal melalui formulir di bawah.
              </div>
            ) : (
              examQuestions.map((q, idx) => (
                <div key={q.id || idx} className="p-3.5 rounded-[8px] border border-neutral-200 bg-neutral-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary-600">Soal #{idx + 1} ({q.type})</span>
                    <div className="flex items-center gap-2">
                      {q.type === 'MCQ' && (
                        <span className="font-bold text-success-600 bg-success-50 px-2 py-0.5 rounded border border-success-200">
                          Kunci: {q.correctOption}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-danger-600 hover:text-danger-700 font-bold px-1.5 py-0.5 rounded hover:bg-danger-50 transition-colors cursor-pointer"
                        title="Hapus Soal"
                      >
                        ✕ Hapus
                      </button>
                    </div>
                  </div>
                  <p className="text-neutral-800 font-medium whitespace-pre-wrap">{q.questionText}</p>
                  {q.type === 'MCQ' && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600 pt-1">
                      {q.options?.map((opt) => (
                        <span key={opt.key} className={opt.key === q.correctOption ? 'font-bold text-success-700 bg-success-50/60 p-1 rounded' : 'p-1'}>
                          {opt.key}. {opt.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Form Tambah Butir Soal Baru */}
          <form onSubmit={handleAddQuestion} className="p-4 rounded-[8px] bg-neutral-50 border border-neutral-200 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900">+ Tambah Butir Soal Baru</h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">Tipe Soal</label>
                <select
                  value={newQuestionType}
                  onChange={(e) => setNewQuestionType(e.target.value)}
                  className="w-full text-xs p-2 rounded-[6px] border border-neutral-300 bg-white"
                >
                  <option value="MCQ">Pilihan Ganda (A, B, C, D)</option>
                  <option value="ESSAY">Uraian / Esai</option>
                </select>
              </div>

              {newQuestionType === 'MCQ' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">Kunci Jawaban Benar</label>
                  <select
                    value={correctOption}
                    onChange={(e) => setCorrectOption(e.target.value)}
                    className="w-full text-xs p-2 rounded-[6px] border border-neutral-300 bg-white font-bold"
                  >
                    <option value="A">Opsi A</option>
                    <option value="B">Opsi B</option>
                    <option value="C">Opsi C</option>
                    <option value="D">Opsi D</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700">Isi Pertanyaan / Soal</label>
              <textarea
                rows={2}
                placeholder="Tuliskan teks pertanyaan soal di sini..."
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                className="w-full text-xs p-2.5 rounded-[6px] border border-neutral-300"
                required
              />
            </div>

            {newQuestionType === 'MCQ' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Input placeholder="Teks Opsi A" value={optA} onChange={(e) => setOptA(e.target.value)} required />
                <Input placeholder="Teks Opsi B" value={optB} onChange={(e) => setOptB(e.target.value)} required />
                <Input placeholder="Teks Opsi C" value={optC} onChange={(e) => setOptC(e.target.value)} required />
                <Input placeholder="Teks Opsi D" value={optD} onChange={(e) => setOptD(e.target.value)} required />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm" loading={isSavingQuestion}>
                + Simpan Soal Ini
              </Button>
            </div>
          </form>

          <div className="flex justify-end pt-2 border-t border-neutral-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveQuestionEditorExam(null)}
            >
              Selesai & Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
