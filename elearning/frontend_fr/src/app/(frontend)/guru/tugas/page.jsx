'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { elearningApi } from '@/lib/elearningApi';
import { tokenStorage } from '@/lib/common/tokenStorage';

export default function TeacherAssignmentsManagementPage() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeGradingAssignment, setActiveGradingAssignment] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  // Form State Create Assignment
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Matematika');
  const [subjectCode, setSubjectCode] = useState('MAT');
  const [className, setClassName] = useState('7A');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grading State
  const [submissionsList, setSubmissionsList] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');

  useEffect(() => {
    setUser(tokenStorage.getUser());
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const currentUser = tokenStorage.getUser();
      const [assData, teacherScope] = await Promise.all([
        elearningApi.getAssignments(),
        elearningApi.getTeacherScope(currentUser),
      ]);
      setAssignments(assData || []);
      const validSubjects = teacherScope?.subjects || [];
      const validClasses = teacherScope?.classes || [];
      setSubjects(validSubjects);
      setClasses(validClasses);
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

  const loadAssignments = async () => {
    try {
      const data = await elearningApi.getAssignments();
      setAssignments(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreateModal = () => {
    const defaultSubj = subjects[0] || { name: 'Informatika', code: 'INF' };
    setTitle('');
    setSubject(defaultSubj.name);
    setSubjectCode(defaultSubj.code);
    setClassName(classes[0]?.name || '9A');
    setDueDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().slice(0, 16));
    setMaxScore(100);
    setDescription('');
    setAttachmentUrl('');
    setIsCreateModalOpen(true);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Judul tugas wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    try {
      await elearningApi.createAssignment({
        title,
        subject,
        subjectCode,
        className,
        teacherName: user?.fullName || user?.full_name || 'Bapak/Ibu Guru',
        dueDate: new Date(dueDate).toISOString(),
        maxScore: Number(maxScore) || 100,
        description,
        attachmentUrl: attachmentUrl || null,
        totalStudents: 32,
      });
      setIsCreateModalOpen(false);
      loadAssignments();
    } catch (err) {
      alert('Gagal membuat tugas: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenGrading = async (assignment) => {
    setActiveGradingAssignment(assignment);
    const list = await elearningApi.getSubmissions(assignment.id);
    if (list && list.length > 0) {
      setSubmissionsList(list);
    } else {
      setSubmissionsList([
        {
          id: 'sub-01',
          studentName: 'Ahmad Raihan Pratama',
          submittedAt: '2026-10-20T09:15:00Z',
          notes: 'Sudah mengerjakan 10 soal di lembar kerja sesuai instruksi.',
          fileUrl: '/docs/jawaban-ahmad.pdf',
          score: 90,
          feedback: 'Penyelesaian aljabar sangat rapi dan teliti.',
          status: 'GRADED',
        },
        {
          id: 'sub-02',
          studentName: 'Anindya Putri Kirana',
          submittedAt: '2026-10-20T10:30:00Z',
          notes: 'Tugas matematika bab 1 terlampir via Google Drive.',
          fileUrl: 'https://drive.google.com/sample',
          score: null,
          feedback: '',
          status: 'SUBMITTED',
        },
      ]);
    }
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;

    const scoreNum = Number(gradeScore) || 0;
    await elearningApi.gradeSubmission(selectedSub.id, scoreNum, gradeFeedback);

    const updated = submissionsList.map((s) => {
      if (s.id === selectedSub.id) {
        return {
          ...s,
          score: scoreNum,
          feedback: gradeFeedback,
          status: 'GRADED',
        };
      }
      return s;
    });

    setSubmissionsList(updated);
    setSelectedSub(null);
    alert('Nilai dan umpan balik berhasil disimpan ke database!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Bank Tugas & Penilaian Siswa
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Buat tugas terstruktur, tentukan tenggat waktu, dan berikan nilai serta umpan balik bagi siswa.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreateModal}
          className="shadow-sm"
        >
          + Buat Tugas Baru
        </Button>
      </div>

      {/* Assignment Table */}
      <Card noPadding className="overflow-hidden border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Judul Penugasan</th>
                <th className="py-3 px-4">Mapel</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Tenggat Waktu</th>
                <th className="py-3 px-4 text-center">Progres Pengumpulan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    Memuat daftar tugas...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    Belum ada penugasan yang dibuat.
                  </td>
                </tr>
              ) : (
                assignments.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      <div className="space-y-0.5">
                        <p className="truncate max-w-[260px]">{item.title}</p>
                        <p className="text-[11px] text-neutral-400 truncate max-w-[260px]">{item.description}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-secondary-600 font-bold">{item.subject}</td>
                    <td className="py-3 px-4 text-neutral-600 font-medium">Kelas {item.className}</td>
                    <td className="py-3 px-4 text-neutral-600">
                      {new Date(item.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-primary-500">
                        {item.submittedCount} / {item.totalStudents || 32} Siswa
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} label={item.status === 'ACTIVE' ? 'Aktif' : 'Selesai'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleOpenGrading(item)}
                      >
                        Periksa & Nilai
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Create Assignment */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isSubmitting && setIsCreateModalOpen(false)}
        title="Buat Penugasan Baru"
        size="lg"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Judul Penugasan</label>
            <Input
              type="text"
              placeholder="Contoh: Latihan Soal Persamaan Linear Satu Variabel"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Tenggat Waktu</label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Nilai Maksimal</label>
              <Input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-800">Instruksi Pengerjaan</label>
            <textarea
              rows={3}
              placeholder="Jelaskan petunjuk pengerjaan dan format berkas yang diminta..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 focus:outline-hidden focus:border-primary-500"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-neutral-100">
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
              Simpan & Terbitkan Tugas
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Grading & Submissions */}
      <Modal
        isOpen={Boolean(activeGradingAssignment)}
        onClose={() => {
          setActiveGradingAssignment(null);
          setSelectedSub(null);
        }}
        title="Pemeriksaan & Penilaian Tugas Siswa"
        subtitle={activeGradingAssignment ? `${activeGradingAssignment.title} (${activeGradingAssignment.subject})` : ''}
        size="lg"
      >
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3">Waktu Kumpul</th>
                  <th className="py-2.5 px-3">Jawaban / Berkas</th>
                  <th className="py-2.5 px-3 text-center">Nilai</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {submissionsList.map((sub) => (
                  <tr key={sub.id} className="hover:bg-neutral-50/80">
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">{sub.studentName}</td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      {new Date(sub.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="text-[11px] text-neutral-600 line-clamp-1">{sub.notes}</p>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {sub.score !== null ? (
                        <span className="font-bold text-success-600 bg-success-50 px-2 py-0.5 rounded-[999px]">
                          {sub.score} Poin
                        </span>
                      ) : (
                        <span className="text-neutral-400 font-medium">Belum Dinilai</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => {
                          setSelectedSub(sub);
                          setGradeScore(sub.score || '');
                          setGradeFeedback(sub.feedback || '');
                        }}
                      >
                        Beri Nilai
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sub-form input nilai */}
          {selectedSub && (
            <form onSubmit={handleSaveGrade} className="p-4 rounded-[8px] bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-900">
                  Formulir Penilaian: {selectedSub.studentName}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="text-neutral-400 hover:text-neutral-700 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">Skor / Nilai (0-100)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Contoh: 85"
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">Umpan Balik Guru (Feedback)</label>
                  <Input
                    type="text"
                    placeholder="Bagus sekali, perbaiki penjelasan langkah 2..."
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="submit" variant="primary" size="md" className="w-full sm:w-auto font-bold">
                  Simpan Nilai Siswa
                </Button>
              </div>
            </form>
          )}

          <div className="flex justify-end pt-2 border-t border-neutral-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveGradingAssignment(null);
                setSelectedSub(null);
              }}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
