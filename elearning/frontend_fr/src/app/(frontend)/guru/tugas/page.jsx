'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
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

  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Konfirmasi',
    confirmVariant: 'primary',
    onConfirm: () => {},
  });

  // Form State Create Assignment
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [className, setClassName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentSize, setAttachmentSize] = useState('');
  const [externalLink, setExternalLink] = useState('');
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Ukuran berkas melebihi batas maksimal 15MB!');
      return;
    }

    setAttachmentName(file.name);
    setAttachmentSize((file.size / 1024).toFixed(1) + ' KB');

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachmentUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setAttachmentUrl('');
    setAttachmentName('');
    setAttachmentSize('');
  };

  const handleOpenCreateModal = () => {
    const defaultSubj = subjects[0] || { name: '', code: '' };
    setEditingAssignmentId(null);
    setTitle('');
    setSubject(defaultSubj.name || '');
    setSubjectCode(defaultSubj.code || '');
    setClassName(classes[0]?.name || '');
    setDueDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().slice(0, 16));
    setMaxScore(100);
    setDescription('');
    setAttachmentUrl('');
    setAttachmentName('');
    setAttachmentSize('');
    setExternalLink('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingAssignmentId(item.id);
    setTitle(item.title || '');
    setSubject(item.subject || subjects[0]?.name || '');
    setSubjectCode(item.subjectCode || subjects[0]?.code || 'MAPEL');
    setClassName(item.className || classes[0]?.name || '');
    let formattedDue = '';
    if (item.dueDate) {
      try {
        formattedDue = new Date(item.dueDate).toISOString().slice(0, 16);
      } catch {
        formattedDue = '';
      }
    }
    setDueDate(formattedDue || new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().slice(0, 16));
    setMaxScore(item.maxScore || 100);
    setDescription(item.description || '');
    setAttachmentUrl(item.attachmentUrl || '');
    setAttachmentName(item.attachmentName || '');
    setAttachmentSize(item.attachmentSize || '');
    setExternalLink(item.attachmentUrl && item.attachmentUrl.startsWith('http') ? item.attachmentUrl : '');
    setIsCreateModalOpen(true);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Judul tugas wajib diisi!');
      return;
    }
    if (!subject) {
      alert('Mata pelajaran wajib dipilih!');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalAttachmentUrl = attachmentUrl || externalLink.trim() || null;
      const payload = {
        title: title.trim(),
        subject,
        subjectCode,
        className,
        teacherId: user?.id || null,
        teacherName: user?.fullName || user?.full_name || 'Bapak/Ibu Guru',
        dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
        maxScore: Number(maxScore) || 100,
        description: description.trim(),
        attachmentUrl: finalAttachmentUrl,
        attachmentName: attachmentName || (externalLink ? 'Tautan Tambahan' : null),
        attachmentSize: attachmentSize || null,
        totalStudents: 32,
      };

      if (editingAssignmentId) {
        await elearningApi.updateAssignment(editingAssignmentId, payload);
      } else {
        await elearningApi.createAssignment(payload);
      }

      setIsCreateModalOpen(false);
      setEditingAssignmentId(null);
      loadAssignments();
    } catch (err) {
      alert('Gagal menyimpan tugas: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const nextStatus = item.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';
      await elearningApi.updateAssignment(item.id, { status: nextStatus });
      loadAssignments();
    } catch (e) {
      alert('Gagal mengubah status tugas: ' + e.message);
    }
  };

  const handleDeleteAssignment = (item) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Tugas',
      message: `Apakah Anda yakin ingin menghapus tugas "${item.title}"? Seluruh pengumpulan jawaban siswa untuk tugas ini juga akan terhapus.`,
      confirmText: 'Ya, Hapus Tugas',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await elearningApi.deleteAssignment(item.id);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          loadAssignments();
        } catch (e) {
          alert('Gagal menghapus tugas: ' + e.message);
        }
      },
    });
  };

  const formatDueDateSafe = (dStr) => {
    if (!dStr) return '-';
    const d = new Date(dStr);
    return isNaN(d.getTime())
      ? '-'
      : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };

  const handleOpenGrading = async (assignment) => {
    setActiveGradingAssignment(assignment);
    try {
      const list = await elearningApi.getSubmissions(assignment.id);
      setSubmissionsList(Array.isArray(list) ? list : []);
    } catch {
      setSubmissionsList([]);
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
    alert('Nilai dan umpan balik berhasil disimpan!');
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
                      <p className="truncate max-w-[260px] font-bold">{item.title}</p>
                      {item.description && (
                        <p className="text-[11px] text-neutral-400 truncate max-w-[260px]">{item.description}</p>
                      )}
                      {item.attachmentName && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-primary-600 font-medium">
                          📎 {item.attachmentName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-secondary-700 font-bold">{item.subject || 'Mata Pelajaran'}</td>
                  <td className="py-3 px-4 text-neutral-700 font-medium">
                    {item.className ? `Kelas ${item.className}` : 'Semua Kelas'}
                  </td>
                  <td className="py-3 px-4 text-neutral-600">
                    {formatDueDateSafe(item.dueDate)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-primary-600">
                      {item.submittedCount || 0} / {item.totalStudents || 32} Siswa
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={item.status || 'ACTIVE'} label={item.status === 'COMPLETED' ? 'Selesai' : 'Aktif'} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => handleOpenGrading(item)}
                        className="font-bold"
                        title="Periksa dan beri nilai lembar kerja siswa"
                      >
                        Periksa & Nilai
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleOpenEditModal(item)}
                        title="Edit rincian tugas"
                      >
                        Edit
                      </Button>
                      <Button
                        variant={item.status === 'COMPLETED' ? 'outline' : 'ghost'}
                        size="xs"
                        onClick={() => handleToggleStatus(item)}
                        className="text-[11px]"
                        title={item.status === 'COMPLETED' ? 'Buka kembali pengumpulan tugas' : 'Tutup pengumpulan tugas'}
                      >
                        {item.status === 'COMPLETED' ? 'Buka' : 'Tutup'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteAssignment(item)}
                        className="text-danger-600 hover:text-danger-800 hover:bg-danger-50 text-[11px]"
                        title="Hapus tugas ini"
                      >
                        Hapus
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

    {/* Modal Create/Edit Assignment */}
    <Modal
      isOpen={isCreateModalOpen}
      onClose={() => !isSubmitting && setIsCreateModalOpen(false)}
      title={editingAssignmentId ? 'Edit Penugasan' : 'Buat Penugasan Baru'}
      size="lg"
    >
      <form onSubmit={handleSaveAssignment} className="space-y-4">
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
              {subjects.length === 0 ? (
                <div className="p-2.5 rounded-[8px] bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-snug">
                  ⚠️ Akun Anda belum memiliki mata pelajaran pengampu yang diatur oleh Administrator di SSO / e-Rapor.
                </div>
              ) : (
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
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800">Kelas / Rombel</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                disabled={subjects.length === 0}
                className="w-full text-xs p-2.5 rounded-[8px] border border-neutral-300 bg-white disabled:bg-neutral-100 disabled:text-neutral-400"
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

          {/* Upload Berkas / Lembar Kerja Guru */}
          <div className="space-y-2 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <span>📎</span>
                <span>Upload Berkas / Lembar Kerja (LKPD / PDF / Dokumen)</span>
              </label>
              <span className="text-[10px] text-neutral-500 font-medium">Maks. 15MB</span>
            </div>

            {attachmentUrl ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-primary-200 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl">📑</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      {attachmentName || 'Berkas Terlampir'}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      {attachmentSize || 'Siap diunduh siswa'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-xs text-danger-600 hover:text-danger-800 font-bold px-2 py-1 rounded hover:bg-danger-50 transition-colors"
                >
                  ✕ Hapus Berkas
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-neutral-300 hover:border-primary-400 rounded-lg bg-white cursor-pointer transition-colors group">
                <svg className="w-6 h-6 text-neutral-400 group-hover:text-primary-500 mb-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-xs font-semibold text-neutral-700 group-hover:text-primary-600">
                  Klik untuk pilih berkas dari komputer / HP
                </p>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Mendukung PDF, Word (DOC/DOCX), Excel, PPT, Gambar, atau ZIP
                </p>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                  className="hidden"
                />
              </label>
            )}

            <div className="pt-1 space-y-1">
              <label className="text-[11px] font-semibold text-neutral-600">
                Atau cantumkan tautan eksternal (Google Drive / Canva / YouTube):
              </label>
              <Input
                type="url"
                placeholder="https://drive.google.com/file/d/... atau https://canva.com/..."
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                className="text-xs"
              />
            </div>
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
              disabled={isSubmitting || subjects.length === 0}
            >
              {editingAssignmentId ? 'Simpan Perubahan' : 'Simpan & Terbitkan Tugas'}
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
        subtitle={
          activeGradingAssignment
            ? `${activeGradingAssignment.title} (${activeGradingAssignment.subject || activeGradingAssignment.subjectName || 'Mata Pelajaran'}) - Kelas ${activeGradingAssignment.className || '-'}`
            : ''
        }
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
                {submissionsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <div className="flex flex-col items-center justify-center space-y-1.5 text-neutral-400">
                        <span className="text-3xl">📭</span>
                        <p className="text-xs font-bold text-neutral-700">Belum Ada Pengumpulan Tugas</p>
                        <p className="text-[11px] text-neutral-400 max-w-sm">
                          Siswa di Kelas {activeGradingAssignment?.className || ''} belum ada yang mengumpulkan lembar jawaban untuk tugas ini.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  submissionsList.map((sub) => (
                    <tr key={sub.id} className="hover:bg-neutral-50/80">
                      <td className="py-2.5 px-3 font-semibold text-neutral-900">
                        {sub.studentName}
                        {sub.nisn && <span className="block text-[10px] text-neutral-400 font-normal">NISN: {sub.nisn}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500">
                        {sub.submittedAt
                          ? `${new Date(sub.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="text-[11px] text-neutral-700 line-clamp-2">{sub.notes || '-'}</p>
                        {sub.fileUrl && (
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={sub.fileName || 'berkas-tugas-siswa'}
                            className="inline-flex items-center gap-1 text-[11px] text-primary-600 hover:text-primary-800 font-bold mt-1 bg-primary-50 px-2 py-0.5 rounded border border-primary-100"
                          >
                            📎 {sub.fileName || 'Unduh / Lihat Berkas Siswa'}
                          </a>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {sub.score !== null && sub.score !== undefined ? (
                          <span className="font-bold text-success-700 bg-success-50 border border-success-200 px-2.5 py-0.5 rounded-[999px]">
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
                  ))
                )}
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

      {/* Confirmation Modal */}
      <ConfirmModal
        {...confirmModal}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
